import { NextRequest, NextResponse } from "next/server";
import { uploadToB2, getB2PublicUrl } from "@/lib/b2-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "Missing file or path" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to B2
    const result = await uploadToB2(buffer, path, file.type);

    return NextResponse.json({
      url: result.url,
      path: result.path,
      size: result.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// Get presigned URL for direct browser upload (optional, for larger files)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const contentType = searchParams.get("contentType") || "application/octet-stream";

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // For now, just return the public URL format
    // Client will use POST to actually upload
    return NextResponse.json({
      publicUrl: getB2PublicUrl(path),
    });
  } catch (error) {
    console.error("Get URL error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get URL" },
      { status: 500 }
    );
  }
}

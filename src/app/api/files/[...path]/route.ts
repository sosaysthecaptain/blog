import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// B2 credentials
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET = process.env.B2_BUCKET_NAME || "dirigible-content";

// Cache auth token to avoid re-authenticating on every request
let cachedAuth: {
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
  expiresAt: number;
} | null = null;

async function getB2Auth() {
  // Return cached auth if still valid (with 5 min buffer)
  if (cachedAuth && Date.now() < cachedAuth.expiresAt - 5 * 60 * 1000) {
    return cachedAuth;
  }

  const authResponse = await fetch(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString("base64")}`,
      },
    }
  );

  if (!authResponse.ok) {
    throw new Error(`B2 auth failed: ${authResponse.statusText}`);
  }

  const authData = await authResponse.json();

  cachedAuth = {
    apiUrl: authData.apiUrl,
    authorizationToken: authData.authorizationToken,
    downloadUrl: authData.downloadUrl,
    // B2 tokens are valid for 24 hours
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };

  return cachedAuth;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    if (!B2_KEY_ID || !B2_APP_KEY) {
      return NextResponse.json(
        { error: "B2 credentials not configured" },
        { status: 500 }
      );
    }

    const { path } = await params;
    const filePath = path.join("/");

    // Get B2 auth
    const auth = await getB2Auth();

    // Download file from B2
    const fileUrl = `${auth.downloadUrl}/file/${B2_BUCKET}/${filePath}`;

    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: auth.authorizationToken,
      },
    });

    if (!fileResponse.ok) {
      if (fileResponse.status === 404) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    // Get content type from response or guess from extension
    const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";

    // Stream the response back
    const blob = await fileResponse.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch file" },
      { status: 500 }
    );
  }
}

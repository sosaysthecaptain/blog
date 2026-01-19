/**
 * Backblaze B2 Storage utilities
 * Uses S3-compatible API for uploads/downloads
 */

// B2 S3-compatible endpoint (us-west-004 region based on key prefix 005)
const B2_ENDPOINT = "s3.us-west-004.backblazeb2.com";
const B2_BUCKET = process.env.B2_BUCKET_NAME || "dirigible-content";

// These should only be used server-side
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;

export interface B2UploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * Get the public URL for a file in B2
 * Requires bucket to be configured with "allPublic" access
 */
export function getB2PublicUrl(path: string): string {
  // Direct B2 public URL - bucket must be set to public
  // Format: https://f{region-code}.backblazeb2.com/file/{bucket-name}/{path}
  // For us-west-004, region code is 005
  return `https://f005.backblazeb2.com/file/${B2_BUCKET}/${path}`;
}

/**
 * Generate a presigned URL for uploading (to be used from client)
 * This needs to be called from a server API route
 */
export async function generateUploadUrl(
  path: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; headers: Record<string, string> }> {
  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error("B2 credentials not configured");
  }

  // For S3-compatible uploads, we need to generate a presigned URL
  // Using AWS Signature Version 4
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const region = "us-west-004";
  const service = "s3";

  const credential = `${B2_KEY_ID}/${dateString}/${region}/${service}/aws4_request`;

  // For simplicity, we'll use a direct upload approach via the B2 native API
  // which is more straightforward for presigned uploads

  // First, authorize with B2
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
  const { apiUrl, authorizationToken, allowed } = authData;
  let bucketId = allowed?.bucketId;

  // If bucketId is null (master key), we need to list buckets to find it
  if (!bucketId) {
    const listBucketsResponse = await fetch(
      `${apiUrl}/b2api/v2/b2_list_buckets`,
      {
        method: "POST",
        headers: {
          Authorization: authorizationToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: authData.accountId, bucketName: B2_BUCKET }),
      }
    );

    if (!listBucketsResponse.ok) {
      throw new Error(`Failed to list buckets: ${listBucketsResponse.statusText}`);
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets?.find((b: { bucketName: string }) => b.bucketName === B2_BUCKET);
    if (!bucket) {
      throw new Error(`Bucket ${B2_BUCKET} not found`);
    }
    bucketId = bucket.bucketId;
  }

  // Get upload URL
  const uploadUrlResponse = await fetch(
    `${apiUrl}/b2api/v2/b2_get_upload_url`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
    }
  );

  if (!uploadUrlResponse.ok) {
    throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
  }

  const uploadData = await uploadUrlResponse.json();

  return {
    uploadUrl: uploadData.uploadUrl,
    headers: {
      Authorization: uploadData.authorizationToken,
      "Content-Type": contentType,
      "X-Bz-File-Name": encodeURIComponent(path),
      "X-Bz-Content-Sha1": "do_not_verify", // Client will compute if needed
    },
  };
}

/**
 * Upload a file directly to B2 (server-side only)
 */
export async function uploadToB2(
  file: Buffer | Uint8Array,
  path: string,
  contentType: string
): Promise<B2UploadResult> {
  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error("B2 credentials not configured");
  }

  // Authorize
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
  const { apiUrl, authorizationToken, allowed } = authData;
  let bucketId = allowed?.bucketId;

  // If bucketId is null (master key), we need to list buckets to find it
  if (!bucketId) {
    const listBucketsResponse = await fetch(
      `${apiUrl}/b2api/v2/b2_list_buckets`,
      {
        method: "POST",
        headers: {
          Authorization: authorizationToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: authData.accountId, bucketName: B2_BUCKET }),
      }
    );

    if (!listBucketsResponse.ok) {
      throw new Error(`Failed to list buckets: ${listBucketsResponse.statusText}`);
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets?.find((b: { bucketName: string }) => b.bucketName === B2_BUCKET);
    if (!bucket) {
      throw new Error(`Bucket ${B2_BUCKET} not found`);
    }
    bucketId = bucket.bucketId;
  }

  // Get upload URL
  const uploadUrlResponse = await fetch(
    `${apiUrl}/b2api/v2/b2_get_upload_url`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
    }
  );

  if (!uploadUrlResponse.ok) {
    const errorText = await uploadUrlResponse.text();
    throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText} - ${errorText}`);
  }

  const uploadData = await uploadUrlResponse.json();

  // Compute SHA1 hash
  const crypto = await import("crypto");
  const sha1 = crypto.createHash("sha1").update(file).digest("hex");

  // Upload file
  const uploadResponse = await fetch(uploadData.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadData.authorizationToken,
      "Content-Type": contentType,
      "Content-Length": file.length.toString(),
      "X-Bz-File-Name": encodeURIComponent(path),
      "X-Bz-Content-Sha1": sha1,
    },
    body: new Uint8Array(file) as BodyInit,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
  }

  const result = await uploadResponse.json();

  return {
    url: getB2PublicUrl(path),
    path,
    size: result.contentLength,
  };
}

/**
 * Delete a file from B2
 */
export async function deleteFromB2(path: string): Promise<void> {
  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error("B2 credentials not configured");
  }

  // Authorize
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
  const { apiUrl, authorizationToken, allowed } = authData;
  let bucketId = allowed?.bucketId;

  // If bucketId is null (master key), we need to list buckets to find it
  if (!bucketId) {
    const listBucketsResponse = await fetch(
      `${apiUrl}/b2api/v2/b2_list_buckets`,
      {
        method: "POST",
        headers: {
          Authorization: authorizationToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: authData.accountId, bucketName: B2_BUCKET }),
      }
    );

    if (!listBucketsResponse.ok) {
      throw new Error(`Failed to list buckets: ${listBucketsResponse.statusText}`);
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets?.find((b: { bucketName: string }) => b.bucketName === B2_BUCKET);
    if (!bucket) {
      throw new Error(`Bucket ${B2_BUCKET} not found`);
    }
    bucketId = bucket.bucketId;
  }

  // List file versions to get fileId
  const listResponse = await fetch(
    `${apiUrl}/b2api/v2/b2_list_file_names`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId,
        prefix: path,
        maxFileCount: 1,
      }),
    }
  );

  if (!listResponse.ok) {
    throw new Error(`Failed to list files: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const file = listData.files.find((f: { fileName: string }) => f.fileName === path);

  if (!file) {
    console.warn(`File not found in B2: ${path}`);
    return;
  }

  // Delete file
  const deleteResponse = await fetch(
    `${apiUrl}/b2api/v2/b2_delete_file_version`,
    {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: path,
        fileId: file.fileId,
      }),
    }
  );

  if (!deleteResponse.ok) {
    throw new Error(`Delete failed: ${deleteResponse.statusText}`);
  }
}

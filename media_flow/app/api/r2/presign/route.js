import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 speaks the S3 API. region is always "auto" for R2.
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const ALLOWED = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/quicktime"],
};

const MAX_BYTES = {
  image: 100 * 1024 * 1024, // 100 MB
  video: 2 * 1024 * 1024 * 1024, // 2 GB
};

// This route sits behind Clerk middleware (it is not in the public-route list),
// so only an authenticated editor can reach it.
export async function POST(request) {
  try {
    const { filename, contentType, kind, projectId, size } = await request.json();

    if (!filename || !contentType || !kind) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["image", "video"].includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!ALLOWED[kind].includes(contentType)) {
      return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
    }
    if (typeof size === "number" && size > MAX_BYTES[kind]) {
      const label = kind === "image" ? "100 MB" : "2 GB";
      return NextResponse.json({ error: `File exceeds the ${label} limit` }, { status: 413 });
    }

    // Build a collision-proof object key, grouped by project.
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `projects/${projectId || "misc"}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // 15-minute window — plenty for a 2 GB upload, short enough to be safe.
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("R2 presign error:", err);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}

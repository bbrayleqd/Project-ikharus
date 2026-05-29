import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Same R2 client config as the presign route.
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Behind Clerk middleware — only authenticated editors can hit this.
export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Hard safety check: only delete files that live in OUR R2 bucket.
    // Legacy Cloudinary URLs from before the migration would be silently no-op'd.
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    if (!publicBase || !url.startsWith(publicBase + "/")) {
      // Not our R2 bucket — treat as no-op so legacy URLs don't break callers.
      return NextResponse.json({ skipped: true, reason: "not-r2-url" });
    }

    // Extract the object key (the part after the public host).
    const key = url.slice(publicBase.length + 1);
    if (!key) {
      return NextResponse.json({ error: "Empty object key" }, { status: 400 });
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));

    return NextResponse.json({ deleted: true, key });
  } catch (err) {
    console.error("R2 delete error:", err);
    return NextResponse.json({ error: "Failed to delete object" }, { status: 500 });
  }
}

"use client";
import { useRef, useState } from "react";

/**
 * R2Upload — drop-in replacement for CldUploadWidget.
 * Render-prop API:  <R2Upload ...>{({ open, uploading, progress, error }) => ...}</R2Upload>
 *   open()      -> opens the native file picker
 *   uploading   -> boolean
 *   progress    -> 0..100
 *   error       -> string | null
 * Calls onSuccess(publicUrl) when the file is live on R2.
 */

const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  video: "video/mp4,video/quicktime,.mp4,.mov",
};

const MAX_BYTES = {
  image: 100 * 1024 * 1024, // 100 MB
  video: 2 * 1024 * 1024 * 1024, // 2 GB
};

const LIMIT_LABEL = { image: "100 MB", video: "2 GB" };

// Browsers sometimes leave file.type empty (esp. .mov) — fall back to extension.
function contentTypeFor(file, kind) {
  if (file.type) return file.type;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    mp4: "video/mp4", mov: "video/quicktime",
  };
  return map[ext] || (kind === "image" ? "image/jpeg" : "video/mp4");
}

export default function R2Upload({ kind = "video", projectId, onSuccess, children }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const open = () => {
    if (uploading) return;
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;

    if (file.size > MAX_BYTES[kind]) {
      setError(`File too large — max ${LIMIT_LABEL[kind]} for ${kind}.`);
      return;
    }

    const contentType = contentTypeFor(file, kind);

    try {
      setUploading(true);
      setProgress(0);

      // 1) Ask our server for a short-lived presigned PUT URL.
      const presignRes = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          kind,
          projectId,
          size: file.size,
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not get an upload URL");
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      // 2) Upload the bytes straight to R2 (bypasses our server — no size cap).
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        // Must match the Content-Type the URL was signed with, or R2 rejects it.
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // 3) Hand the permanent public URL back to the parent.
      onSuccess?.(publicUrl);
    } catch (err) {
      console.error("R2 upload failed:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        onChange={handleFile}
        style={{ display: "none" }}
      />
      {children({ open, uploading, progress, error })}
    </>
  );
}

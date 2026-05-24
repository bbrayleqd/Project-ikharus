"use client";
/**
 * ImageViewer.jsx — editor's read-only view of the image with client annotations
 */

import { useRef } from "react";

const COLOR_PIN     = "#E53E3E";
const COLOR_ELLIPSE = "#7C3AED";

export default function ImageViewer({ project, annotations = [] }) {
  const imgRef = useRef(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Image (read-only for editor) */}
      <div style={{ position: "relative", lineHeight: 0, borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <img
          ref={imgRef}
          src={project.mediaUrl}
          alt={project.name}
          style={{ width: "100%", display: "block", borderRadius: "var(--radius-xl)", maxHeight: "65vh", objectFit: "contain" }}
        />
      </div>

    </div>
  );
}
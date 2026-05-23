"use client";
/**
 * _components/ImageViewer.jsx
 * Image viewer with draggable ellipse annotation tool.
 *
 * Design Pattern: Decorator — the <img> is decorated with a <canvas>
 * overlay that handles ellipse drawing without touching the image itself.
 *
 * How it works:
 *  - User clicks "Add Annotation" to enter draw mode
 *  - On the canvas, mousedown starts an ellipse, mousemove resizes it,
 *    mouseup finalizes it and prompts for a comment
 *  - Each ellipse is stored in local state and re-drawn on every render
 *  - Clicking an existing ellipse selects it and shows its comment
 */

import { useRef } from "react";

const ELLIPSE_COLOR         = "#7C3AED";
const ELLIPSE_COLOR_ACTIVE  = "#2D9CDB";
const ELLIPSE_ALPHA         = 0.18;
const ELLIPSE_STROKE        = 2.5;

export default function ImageViewer({ project, annotations = [] }) {
  const imgRef = useRef(null);



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* ── Image (read-only for editor) ── */}
      <img
        ref={imgRef}
        src={project.mediaUrl}
        alt={project.name}
        style={{ width: "100%", display: "block", borderRadius: "var(--radius-xl)" }}
      />

      {/* ── Client annotations (read-only list) ── */}
      {annotations.length > 0 ? (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">Client annotations ({annotations.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {annotations.map((el, i) => (
              <div
                key={el.id}
                style={{
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          "var(--space-3)",
                  padding:      "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border:       "1px solid var(--color-border-default)",
                  background:   "var(--color-bg-surface-alt)",
                }}
              >
                <div style={{
                  width:          22,
                  height:         22,
                  borderRadius:   "var(--radius-full)",
                  background:     "#7C3AED",
                  color:          "#fff",
                  fontSize:       "11px",
                  fontWeight:     "bold",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                }}>
                  {i + 1}
                </div>
                <p style={{
                  fontSize:   "var(--text-sm)",
                  color:      "var(--color-text-primary)",
                  lineHeight: "var(--leading-relaxed)",
                  flex:       1,
                }}>
                  {el.comment}
                </p>
                <span className="badge badge--unresolved">Unresolved</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{
          padding:        "var(--space-5)",
          textAlign:      "center",
          color:          "var(--color-text-muted)",
          fontSize:       "var(--text-sm)",
          fontStyle:      "italic",
        }}>
          No client annotations yet. Share the token so your client can review.
        </div>
      )}
    </div>
  );
}
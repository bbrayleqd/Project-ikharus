"use client";
/**
 * ImageViewer.jsx — editor's read-only view of the image with client annotations
 * Renders ellipse and pin annotations on a canvas overlay.
 */

import { useRef, useEffect, useCallback, useState } from "react";

const COLOR_ELLIPSE        = "#7C3AED";
const COLOR_ELLIPSE_ACTIVE = "#0A84FF";
const COLOR_PIN            = "#E53E3E";
const COLOR_PIN_ACTIVE     = "#0A84FF";
const ALPHA                = 0.18;
const STROKE               = 2.5;
const PIN_RADIUS           = 7;

export default function ImageViewer({ project, annotations = [] }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selected, setSelected]   = useState(null);

  /* ── Draw all annotations on canvas ─────────────────────────── */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann, i) => {
      const isActive = i === selected;

      if (ann.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(ann.cx, ann.cy, ann.rx, ann.ry, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.lineWidth   = isActive ? STROKE + 1 : STROKE;
        ctx.setLineDash(isActive ? [6, 3] : []);
        ctx.stroke();
        ctx.fillStyle = isActive
          ? `rgba(10,132,255,${ALPHA})`
          : `rgba(124,58,237,${ALPHA})`;
        ctx.fill();
        ctx.setLineDash([]);
        ctx.font         = "bold 11px -apple-system, sans-serif";
        ctx.fillStyle    = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, ann.cx, ann.cy);

      } else if (ann.type === "pin") {
        // Halo
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, PIN_RADIUS + 2, 0, 2 * Math.PI);
        ctx.fillStyle = isActive
          ? "rgba(10,132,255,0.2)"
          : "rgba(229,62,62,0.15)";
        ctx.fill();
        // Pin body
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, PIN_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle   = isActive ? COLOR_PIN_ACTIVE : COLOR_PIN;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        // Number label
        ctx.font         = "bold 9px -apple-system, sans-serif";
        ctx.fillStyle    = "#fff";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, ann.x, ann.y);
      }
    });
  }, [annotations, selected]);

  useEffect(() => { redraw(); }, [redraw, imgLoaded]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(img);
    return () => ro.disconnect();
  }, [redraw]);

  /* ── Click to select annotation ──────────────────────────────── */
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCanvasClick = (e) => {
    const pos = getPos(e);
    let hit = -1;
    annotations.forEach((ann, i) => {
      if (ann.type === "ellipse") {
        const dx = (pos.x - ann.cx) / ann.rx;
        const dy = (pos.y - ann.cy) / ann.ry;
        if (dx * dx + dy * dy <= 1) hit = i;
      } else if (ann.type === "pin") {
        const dx = pos.x - ann.x;
        const dy = pos.y - ann.y;
        if (Math.sqrt(dx * dx + dy * dy) <= PIN_RADIUS + 4) hit = i;
      }
    });
    setSelected(hit >= 0 ? hit : null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Image + canvas overlay */}
      <div style={{
        position: "relative", lineHeight: 0,
        borderRadius: "var(--radius-xl)", overflow: "hidden",
      }}>
        <img
          ref={imgRef}
          src={project.mediaUrl}
          alt={project.name}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: "100%", display: "block",
            borderRadius: "var(--radius-xl)",
            maxHeight: "65vh", objectFit: "contain",
          }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            cursor: selected !== null ? "pointer" : "default",
            borderRadius: "var(--radius-xl)",
          }}
        />
        {annotations.length > 0 && (
          <div style={{
            position: "absolute", bottom: "var(--space-3)", left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.55)", color: "#fff",
            padding: "var(--space-1) var(--space-4)",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
            pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} — click to highlight
          </div>
        )}
      </div>

      {/* Annotation list */}
      {annotations.length > 0 ? (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">
            Client annotations ({annotations.length})
          </p>
          <div style={{
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
            maxHeight: "320px", overflowY: "auto", paddingRight: "var(--space-1)",
          }}>
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                onClick={() => setSelected(i === selected ? null : i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                  padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                  border: `1px solid ${i === selected
                    ? "var(--color-primary)"
                    : "var(--color-border-default)"}`,
                  background: i === selected
                    ? "var(--color-primary-glow)"
                    : "var(--color-bg-surface-alt)",
                  cursor: "pointer", transition: "all var(--transition-fast)",
                }}
              >
                {/* Number badge */}
                <div style={{
                  width: 22, height: 22, borderRadius: "var(--radius-full)",
                  background: ann.type === "pin" ? COLOR_PIN : COLOR_ELLIPSE,
                  color: "#fff", fontSize: "11px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>

                <p style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-primary)",
                  lineHeight: "var(--leading-relaxed)",
                  flex: 1, margin: 0,
                }}>
                  {ann.comment}
                </p>

                <span className={`badge ${ann.type === "pin" ? "badge--needs-action" : "badge--draft"}`}>
                  {ann.type === "pin" ? "Pin" : "Region"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{
          padding: "var(--space-5)", textAlign: "center",
          color: "var(--color-text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic",
        }}>
          No client annotations yet. Share the review link so your client can annotate.
        </div>
      )}
    </div>
  );
}
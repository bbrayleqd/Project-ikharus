"use client";
/**
 * ImageAnnotator.jsx — updated with lock support & scrollable
 */

import { useState, useRef, useEffect, useCallback } from "react";

const COLOR_ELLIPSE        = "#7C3AED";
const COLOR_ELLIPSE_ACTIVE = "#0A84FF";
const COLOR_PIN            = "#E53E3E";
const COLOR_PIN_ACTIVE     = "#0A84FF";
const ALPHA                = 0.18;
const STROKE               = 2.5;
const PIN_RADIUS           = 7;

function EllipseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="12" cy="12" rx="10" ry="6"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="4"/><line x1="12" y1="14" x2="12" y2="21"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

export default function ImageAnnotator({
  imageUrl,
  projectName  = "Untitled Project",
  annotations  = [],
  onAnnotationSave,
  locked       = false,
  lockedReason = null,
}) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [tool,        setTool]        = useState(null);
  const [drawing,     setDrawing]     = useState(false);
  const [startPos,    setStartPos]    = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [comment,     setComment]     = useState("");
  const [selected,    setSelected]    = useState(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    annotations.forEach((ann, i) => {
      const isActive = i === selected;
      if (ann.type === "ellipse") {
        // Resolve coords: if normalized, scale by canvas; else legacy raw pixels.
        const cx = ann._normalized ? ann.cx * W : ann.cx;
        const cy = ann._normalized ? ann.cy * H : ann.cy;
        const rx = ann._normalized ? ann.rx * W : ann.rx;
        const ry = ann._normalized ? ann.ry * H : ann.ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.lineWidth   = isActive ? STROKE + 1 : STROKE;
        ctx.setLineDash(isActive ? [6, 3] : []);
        ctx.stroke();
        ctx.fillStyle   = isActive ? `rgba(10,132,255,${ALPHA})` : `rgba(124,58,237,${ALPHA})`;
        ctx.fill();
        ctx.setLineDash([]);
        ctx.font = "bold 11px -apple-system, sans-serif";
        ctx.fillStyle = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(i + 1, cx, cy);
      } else if (ann.type === "pin") {
        const x = ann._normalized ? ann.x * W : ann.x;
        const y = ann._normalized ? ann.y * H : ann.y;
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS + 2, 0, 2 * Math.PI);
        ctx.fillStyle = isActive ? `rgba(10,132,255,0.2)` : `rgba(229,62,62,0.15)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = isActive ? COLOR_PIN_ACTIVE : COLOR_PIN;
        ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = "bold 9px -apple-system, sans-serif";
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(i + 1, x, y);
      }
    });

    if (currentRect) {
      const { x1, y1, x2, y2 } = currentRect;
      const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;
      const rx = Math.max(Math.abs(x2 - x1) / 2, 1);
      const ry = Math.max(Math.abs(y2 - y1) / 2, 1);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = COLOR_ELLIPSE; ctx.lineWidth = STROKE;
      ctx.setLineDash([5, 3]); ctx.stroke();
      ctx.fillStyle = `rgba(124,58,237,${ALPHA})`; ctx.fill();
      ctx.setLineDash([]);
    }
  }, [annotations, currentRect, selected]);

  useEffect(() => { redraw(); }, [redraw, imgLoaded]);
  useEffect(() => {
    const img = imgRef.current; if (!img) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(img); return () => ro.disconnect();
  }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (!tool || locked) return;
    e.preventDefault();
    if (tool === "pin") {
      const pos = getPos(e);
      const W = canvasRef.current.width;
      const H = canvasRef.current.height;
      setPendingData({ type: "pin", x: pos.x / W, y: pos.y / H, _normalized: true });
      setTool(null); return;
    }
    const pos = getPos(e);
    setDrawing(true); setStartPos(pos);
    setCurrentRect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    setSelected(null);
  };

  const handlePointerMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentRect(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
  };

  const handlePointerUp = (e) => {
    if (!drawing) return;
    setDrawing(false);
    const pos = getPos(e);
    const rx = Math.abs(pos.x - startPos.x) / 2;
    const ry = Math.abs(pos.y - startPos.y) / 2;
    if (rx < 8 || ry < 8) { setCurrentRect(null); return; } // min size check still in px
    const cx = (startPos.x + pos.x) / 2;
    const cy = (startPos.y + pos.y) / 2;
    const W = canvasRef.current.width;
    const H = canvasRef.current.height;
    setPendingData({
      type: "ellipse",
      cx: cx / W, cy: cy / H,
      rx: rx / W, ry: ry / H,
      _normalized: true,
    });
    setCurrentRect(null); setTool(null);
  };

  const handleCanvasClick = (e) => {
    if (tool || drawing) return;
    const pos = getPos(e);
    const W = canvasRef.current.width;
    const H = canvasRef.current.height;
    let hit = -1;
    annotations.forEach((ann, i) => {
      if (ann.type === "ellipse") {
        const cx = ann._normalized ? ann.cx * W : ann.cx;
        const cy = ann._normalized ? ann.cy * H : ann.cy;
        const rx = ann._normalized ? ann.rx * W : ann.rx;
        const ry = ann._normalized ? ann.ry * H : ann.ry;
        const dx = (pos.x - cx) / rx; const dy = (pos.y - cy) / ry;
        if (dx * dx + dy * dy <= 1) hit = i;
      } else if (ann.type === "pin") {
        const x = ann._normalized ? ann.x * W : ann.x;
        const y = ann._normalized ? ann.y * H : ann.y;
        const dx = pos.x - x; const dy = pos.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= PIN_RADIUS + 4) hit = i;
      }
    });
    setSelected(hit >= 0 ? hit : null);
  };

  const handleSave = () => {
    if (!pendingData || !comment.trim() || locked) return;
    const ann = { ...pendingData, comment: comment.trim(), id: Date.now() };
    onAnnotationSave?.(ann);
    setPendingData(null); setComment("");
  };

  const handleCancel = () => {
    setPendingData(null); setComment(""); setCurrentRect(null); setTool(null);
  };

  const cursor = locked ? "default"
               : tool === "ellipse" ? "crosshair"
               : tool === "pin"     ? "cell"
               : selected !== null  ? "pointer" : "default";

  const pendingLabel = pendingData?.type === "pin" ? "Comment for this pin" : "Comment for this region";

  const lockedMessage = {
    submitted:    "Feedback submitted — waiting for next revision",
    maxRevisions: "Maximum revisions reached",
    final:        "Project marked as final",
  }[lockedReason] ?? "Annotations locked";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Image + canvas */}
      <div style={{ position: "relative", lineHeight: 0, borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <img
          ref={imgRef} src={imageUrl} alt={projectName}
          onLoad={() => setImgLoaded(true)}
          style={{ width: "100%", display: "block", borderRadius: "var(--radius-xl)" }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
          onClick={handleCanvasClick}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            cursor, borderRadius: "var(--radius-xl)", touchAction: "none",
          }}
        />
        {tool && !locked && (
          <div style={{
            position: "absolute", bottom: "var(--space-3)", left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,132,255,0.9)", color: "#fff",
            padding: "var(--space-1) var(--space-4)", borderRadius: "var(--radius-full)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
            pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            {tool === "ellipse" ? "Drag to draw a region" : "Click anywhere on the image"}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        {!locked ? (
          <>
            <button
              className={tool === "ellipse" ? "btn btn--primary" : "btn btn--secondary"}
              onClick={() => setTool(prev => prev === "ellipse" ? null : "ellipse")}
              style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <EllipseIcon />{tool === "ellipse" ? "Drawing region…" : "Draw region"}
            </button>
            <button
              className={tool === "pin" ? "btn btn--primary" : "btn btn--secondary"}
              onClick={() => setTool(prev => prev === "pin" ? null : "pin")}
              style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <PinIcon />{tool === "pin" ? "Click the image…" : "Drop pin"}
            </button>
            {tool && (
              <button className="btn btn--ghost" onClick={handleCancel}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)" }}>
                Cancel
              </button>
            )}
          </>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)",
            fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontStyle: "italic",
          }}>
            <LockIcon />{lockedMessage}
          </div>
        )}

        {annotations.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Comment input */}
      {pendingData && !locked && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label" style={{ marginBottom: "var(--space-3)" }}>{pendingLabel}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <textarea
              autoFocus className="form-input"
              placeholder="Describe the change needed here…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
              style={{ height: "80px", resize: "none", padding: "var(--space-3) var(--space-4)", lineHeight: "var(--leading-relaxed)" }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={handleCancel}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}
                disabled={!comment.trim()} style={{ opacity: !comment.trim() ? 0.5 : 1 }}>
                Save annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">Your annotations ({annotations.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {annotations.map((ann, i) => (
              <div key={ann.id}
                onClick={() => setSelected(i === selected ? null : i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                  padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                  border: `1px solid ${i === selected ? "var(--color-primary)" : "var(--color-border-default)"}`,
                  background: i === selected ? "var(--color-primary-glow)" : "var(--color-bg-surface-alt)",
                  cursor: "pointer", transition: "all var(--transition-fast)",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "var(--radius-full)",
                  background: ann.type === "pin" ? COLOR_PIN : COLOR_ELLIPSE,
                  color: "#fff", fontSize: "11px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", lineHeight: "var(--leading-relaxed)", flex: 1 }}>
                  {ann.comment}
                </p>
                <span className={`badge ${ann.type === "pin" ? "badge--needs-action" : "badge--draft"}`}>
                  {ann.type === "pin" ? "Pin" : "Region"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {annotations.length === 0 && !pendingData && !tool && (
        <div style={{
          textAlign: "center", padding: "var(--space-6)",
          color: "var(--color-text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic",
        }}>
          {locked
            ? "No annotations for this revision."
            : "Use \"Draw region\" to circle an area, or \"Drop pin\" to mark an exact spot."}
        </div>
      )}
    </div>
  );
}
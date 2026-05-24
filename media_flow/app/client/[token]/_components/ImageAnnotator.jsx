"use client";
/**
 * ImageAnnotator.jsx  —  client/[token]/_components/
 * Client-facing image annotation component.
 *
 * Design Pattern: Decorator — a <canvas> is layered on top of the <img>
 * so annotations are drawn without modifying the image itself.
 *
 * Two annotation tools:
 *   Ellipse — drag to draw an oval around an area (e.g. "fix this region")
 *   Pin     — single click to drop a point marker (e.g. "this exact pixel")
 *
 * Flow:
 *   1. Client clicks "Draw ellipse" or "Drop pin"
 *   2. They interact with the canvas (drag or click)
 *   3. A comment input appears — they type and save
 *   4. Annotation appears on canvas + in the list below
 *   5. onAnnotationSave(annotation) fires so parent can persist to Firestore
 *
 * Props:
 *   imageUrl         — Cloudinary URL of the uploaded image
 *   projectName
 *   annotations      — existing annotations array (from Firestore)
 *   onAnnotationSave(annotation) — called when client saves a note
 */

import { useState, useRef, useEffect, useCallback } from "react";

/* -- Constants ---------------------------------------------- */
const COLOR_ELLIPSE        = "#7C3AED";
const COLOR_ELLIPSE_ACTIVE = "#0A84FF";
const COLOR_PIN            = "#E53E3E";
const COLOR_PIN_ACTIVE     = "#0A84FF";
const ALPHA                = 0.18;
const STROKE               = 2.5;
const PIN_RADIUS           = 7;

/* -- Icons -------------------------------------------------- */
function EllipseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="12" cy="12" rx="10" ry="6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="4" />
      <line x1="12" y1="14" x2="12" y2="21" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/* -- Main Component ----------------------------------------- */
export default function ImageAnnotator({
  imageUrl,
  projectName  = "Untitled Project",
  annotations  = [],
  onAnnotationSave,
}) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const [imgLoaded,    setImgLoaded]    = useState(false);

  /* Tool state */
  const [tool,         setTool]         = useState(null);      // null | "ellipse" | "pin"
  const [drawing,      setDrawing]      = useState(false);
  const [startPos,     setStartPos]     = useState({ x: 0, y: 0 });
  const [currentRect,  setCurrentRect]  = useState(null);      // in-progress ellipse
  const [pendingData,  setPendingData]  = useState(null);      // waiting for comment
  const [comment,      setComment]      = useState("");
  const [selected,     setSelected]     = useState(null);      // index into annotations

  /* -- Canvas redraw ----------------------------------------
     Redraws all annotations from scratch every time they
     change — the Decorator Pattern approach.               */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Draw saved annotations */
    annotations.forEach((ann, i) => {
      const isActive = i === selected;

      if (ann.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(ann.cx, ann.cy, ann.rx, ann.ry, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.lineWidth   = isActive ? STROKE + 1 : STROKE;
        ctx.setLineDash(isActive ? [6, 3] : []);
        ctx.stroke();
        ctx.fillStyle   = isActive
          ? `rgba(10,132,255,${ALPHA})`
          : `rgba(124,58,237,${ALPHA})`;
        ctx.fill();
        ctx.setLineDash([]);

        /* Number label */
        ctx.font         = "bold 11px -apple-system, sans-serif";
        ctx.fillStyle    = isActive ? COLOR_ELLIPSE_ACTIVE : COLOR_ELLIPSE;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, ann.cx, ann.cy);

      } else if (ann.type === "pin") {
        /* Outer ring */
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, PIN_RADIUS + 2, 0, 2 * Math.PI);
        ctx.fillStyle = isActive
          ? `rgba(10,132,255,0.2)`
          : `rgba(229,62,62,0.15)`;
        ctx.fill();

        /* Solid dot */
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, PIN_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle   = isActive ? COLOR_PIN_ACTIVE : COLOR_PIN;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        /* Number label inside dot */
        ctx.font         = "bold 9px -apple-system, sans-serif";
        ctx.fillStyle    = "#fff";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, ann.x, ann.y);
      }
    });

    /* Draw in-progress ellipse */
    if (currentRect) {
      const { x1, y1, x2, y2 } = currentRect;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.max(Math.abs(x2 - x1) / 2, 1);
      const ry = Math.max(Math.abs(y2 - y1) / 2, 1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = COLOR_ELLIPSE;
      ctx.lineWidth   = STROKE;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.fillStyle   = `rgba(124,58,237,${ALPHA})`;
      ctx.fill();
      ctx.setLineDash([]);
    }
  }, [annotations, currentRect, selected]);

  useEffect(() => { redraw(); }, [redraw, imgLoaded]);

  /* Resize observer — redraw if image container resizes */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(img);
    return () => ro.disconnect();
  }, [redraw]);

  /* -- Canvas coordinate helper --------------------------- */
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    /* Support both mouse and touch events */
    const src = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  };

  /* -- Mouse / touch handlers ----------------------------- */
  const handlePointerDown = (e) => {
    if (!tool) return;
    e.preventDefault();

    if (tool === "pin") {
      /* Pin: single click — no drag needed */
      const pos = getPos(e);
      setPendingData({ type: "pin", x: pos.x, y: pos.y });
      setTool(null);
      return;
    }

    /* Ellipse: start drag */
    const pos = getPos(e);
    setDrawing(true);
    setStartPos(pos);
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
    const rx  = Math.abs(pos.x - startPos.x) / 2;
    const ry  = Math.abs(pos.y - startPos.y) / 2;

    /* Ignore tiny accidental drags */
    if (rx < 8 || ry < 8) {
      setCurrentRect(null);
      return;
    }

    const cx = (startPos.x + pos.x) / 2;
    const cy = (startPos.y + pos.y) / 2;
    setPendingData({ type: "ellipse", cx, cy, rx, ry });
    setCurrentRect(null);
    setTool(null);
  };

  /* Click existing annotation to select it */
  const handleCanvasClick = (e) => {
    if (tool || drawing) return;
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

  /* -- Save annotation ------------------------------------ */
  const handleSave = () => {
    if (!pendingData || !comment.trim()) return;
    const ann = { ...pendingData, comment: comment.trim(), id: Date.now() };
    onAnnotationSave?.(ann);
    setPendingData(null);
    setComment("");
  };

  const handleCancel = () => {
    setPendingData(null);
    setComment("");
    setCurrentRect(null);
    setTool(null);
  };

  /* -- Cursor style --------------------------------------- */
  const cursor = tool === "ellipse" ? "crosshair"
               : tool === "pin"     ? "cell"
               : selected !== null  ? "pointer"
               : "default";

  /* -- Pending label -------------------------------------- */
  const pendingLabel = pendingData?.type === "pin"
    ? "Comment for this pin"
    : "Comment for this region";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* -- Image + canvas overlay ---------------------- */}
      <div style={{ position: "relative", lineHeight: 0, borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <img
          ref={imgRef}
          src={imageUrl}
          alt={projectName}
          onLoad={() => setImgLoaded(true)}
          style={{ width: "100%", display: "block", borderRadius: "var(--radius-xl)" }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onClick={handleCanvasClick}
          style={{
            position:     "absolute",
            inset:        0,
            width:        "100%",
            height:       "100%",
            cursor,
            borderRadius: "var(--radius-xl)",
            touchAction:  "none",
          }}
        />

        {/* Active tool hint overlay */}
        {tool && (
          <div style={{
            position:       "absolute",
            bottom:         "var(--space-3)",
            left:           "50%",
            transform:      "translateX(-50%)",
            background:     "rgba(10,132,255,0.9)",
            color:          "#fff",
            padding:        "var(--space-1) var(--space-4)",
            borderRadius:   "var(--radius-full)",
            fontSize:       "var(--text-xs)",
            fontWeight:     "var(--font-medium)",
            pointerEvents:  "none",
            whiteSpace:     "nowrap",
          }}>
            {tool === "ellipse"
              ? "Drag to draw a region"
              : "Click anywhere on the image"}
          </div>
        )}
      </div>

      {/* -- Toolbar ------------------------------------- */}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <button
          className={tool === "ellipse" ? "btn btn--primary" : "btn btn--secondary"}
          onClick={() => setTool(prev => prev === "ellipse" ? null : "ellipse")}
          style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <EllipseIcon />
          {tool === "ellipse" ? "Drawing region…" : "Draw region"}
        </button>

        <button
          className={tool === "pin" ? "btn btn--primary" : "btn btn--secondary"}
          onClick={() => setTool(prev => prev === "pin" ? null : "pin")}
          style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          <PinIcon />
          {tool === "pin" ? "Click the image…" : "Drop pin"}
        </button>

        {/* Cancel active tool */}
        {tool && (
          <button
            className="btn btn--ghost"
            onClick={handleCancel}
            style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)" }}
          >
            Cancel
          </button>
        )}

        {/* Annotation count */}
        {annotations.length > 0 && (
          <span style={{
            marginLeft:  "auto",
            fontSize:    "var(--text-xs)",
            color:       "var(--color-text-muted)",
          }}>
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* -- Comment input — appears after drawing ------- */}
      {pendingData && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label" style={{ marginBottom: "var(--space-3)" }}>
            {pendingLabel}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <textarea
              autoFocus
              className="form-input"
              placeholder="Describe the change needed here…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
              style={{
                height:     "80px",
                resize:     "none",
                padding:    "var(--space-3) var(--space-4)",
                lineHeight: "var(--leading-relaxed)",
              }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={!comment.trim()}
                style={{ opacity: !comment.trim() ? 0.5 : 1 }}
              >
                Save annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Annotation list ----------------------------- */}
      {annotations.length > 0 && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">
            Your annotations ({annotations.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                onClick={() => setSelected(i === selected ? null : i)}
                style={{
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          "var(--space-3)",
                  padding:      "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border:       `1px solid ${i === selected
                    ? "var(--color-primary)"
                    : "var(--color-border-default)"}`,
                  background:   i === selected
                    ? "var(--color-primary-glow)"
                    : "var(--color-bg-surface-alt)",
                  cursor:       "pointer",
                  transition:   "all var(--transition-fast)",
                }}
              >
                {/* Number badge — purple for ellipse, red for pin */}
                <div style={{
                  width:          22,
                  height:         22,
                  borderRadius:   "var(--radius-full)",
                  background:     ann.type === "pin" ? COLOR_PIN : COLOR_ELLIPSE,
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
                  {ann.comment}
                </p>

                {/* Tool type badge */}
                <span className={`badge ${ann.type === "pin" ? "badge--needs-action" : "badge--draft"}`}>
                  {ann.type === "pin" ? "Pin" : "Region"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {annotations.length === 0 && !pendingData && !tool && (
        <div style={{
          textAlign:  "center",
          padding:    "var(--space-6)",
          color:      "var(--color-text-muted)",
          fontSize:   "var(--text-sm)",
          fontStyle:  "italic",
        }}>
          Use "Draw region" to circle an area, or "Drop pin" to mark an exact spot.
        </div>
      )}

    </div>
  );
}
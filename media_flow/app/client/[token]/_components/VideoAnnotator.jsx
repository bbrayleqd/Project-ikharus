"use client";
/**
 * VideoAnnotator.jsx
 * Client-facing video annotation component.
 *
 * Two annotation modes:
 *   - Frame  : marks a single timestamp (e.g. "at 0:42 the cut is too fast")
 *   - Range  : marks a duration span (e.g. "from 0:30 to 1:05 the audio is off")
 *
 * The timeline bar renders pin markers (▼) for frames and
 * filled range bars for durations.
 *
 * Props:
 *   videoUrl   — Cloudinary URL of the uploaded video
 *   projectName
 *   clientName
 *   onAnnotationSave(annotation) — called when client saves a note
 *   annotations  — existing annotations array (from Firestore)
 */

import { useState, useRef, useEffect, useCallback } from "react";

/* -- Helpers ------------------------------------------------ */
function fmt(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* -- Icons -------------------------------------------------- */
function FrameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function RangeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="8 7 3 12 8 17" />
      <polyline points="16 7 21 12 16 17" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

/* -- Main Component ----------------------------------------- */
export default function VideoAnnotator({
  videoUrl,
  projectName = "Untitled Project",
  clientName  = "Client",
  annotations = [],
  onAnnotationSave,
}) {
  const videoRef    = useRef(null);
  const timelineRef = useRef(null);

  /* Playback state */
  const [playing,   setPlaying]   = useState(false);
  const [currentT,  setCurrentT]  = useState(0);
  const [duration,  setDuration]  = useState(0);

  /* Annotation form state */
  const [mode,      setMode]      = useState("frame"); // "frame" | "range"
  const [comment,   setComment]   = useState("");
  const [frameAt,   setFrameAt]   = useState(null);   // seconds
  const [rangeStart,setRangeStart]= useState(null);   // seconds
  const [rangeEnd,  setRangeEnd]  = useState(null);   // seconds
  const [step,      setStep]      = useState("idle"); // "idle" | "marking" | "writing"
  const [selected,  setSelected]  = useState(null);   // index of selected annotation

  /* -- Playback sync ---------------------------------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentT(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onEnd  = () => setPlaying(false);
    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended",          onEnd);
    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended",          onEnd);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else         { v.play();  setPlaying(true);  }
  };

  const seekTo = useCallback((secs) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(secs, duration));
  }, [duration]);

  /* -- Timeline click → seek -------------------------------- */
  const handleTimelineClick = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const t    = pct * duration;

    /* If in marking mode, capture frame/range timestamps */
    if (step === "marking") {
      if (mode === "frame") {
        setFrameAt(t);
        seekTo(t);
        setStep("writing");
      } else {
        /* Range: first click = start, second click = end */
        if (rangeStart === null) {
          setRangeStart(t);
          seekTo(t);
        } else {
          const start = Math.min(rangeStart, t);
          const end   = Math.max(rangeStart, t);
          setRangeEnd(end);
          setRangeStart(start);
          seekTo(start);
          setStep("writing");
        }
      }
      return;
    }

    seekTo(t);
  };

  /* -- Begin marking ---------------------------------------- */
  const startMarking = (m) => {
    const v = videoRef.current;
    if (v) v.pause();
    setPlaying(false);
    setMode(m);
    setFrameAt(null);
    setRangeStart(null);
    setRangeEnd(null);
    setComment("");
    setStep("marking");
  };

  const cancelAnnotation = () => {
    setStep("idle");
    setFrameAt(null);
    setRangeStart(null);
    setRangeEnd(null);
    setComment("");
  };

  /* -- Save annotation -------------------------------------- */
  const saveAnnotation = () => {
    if (!comment.trim()) return;
    const ann = mode === "frame"
      ? { type: "frame", at: frameAt,   comment: comment.trim(), id: Date.now() }
      : { type: "range", start: rangeStart, end: rangeEnd, comment: comment.trim(), id: Date.now() };
    onAnnotationSave?.(ann);
    cancelAnnotation();
  };

  /* -- Derived values --------------------------------------- */
  const progress = duration ? (currentT / duration) * 100 : 0;

  /* Hint text shown during marking */
  const markingHint =
    mode === "frame"
      ? "Click on the timeline to mark the exact moment"
      : rangeStart === null
        ? "Click to set the START of the range"
        : "Click again to set the END of the range";

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      gap:           "var(--space-4)",
      fontFamily:    "var(--font-sans)",
    }}>

      {/* -- Video element ----------------------------------- */}
      <div style={{
        background:   "#000",
        borderRadius: "var(--radius-xl)",
        overflow:     "hidden",
        lineHeight:   0,
        position:     "relative",
      }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", display: "block" }}
        />

        {/* Frame/Range marking overlay hint */}
        {step === "marking" && (
          <div style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "rgba(10,132,255,0.08)",
            pointerEvents:  "none",
          }}>
            <div style={{
              background:   "rgba(10,132,255,0.9)",
              color:        "#fff",
              padding:      "var(--space-2) var(--space-5)",
              borderRadius: "var(--radius-full)",
              fontSize:     "var(--text-sm)",
              fontWeight:   "var(--font-medium)",
            }}>
              {markingHint}
            </div>
          </div>
        )}
      </div>

      {/* -- Custom controls --------------------------------- */}
      <div className="card" style={{ padding: "var(--space-4)", gap: "var(--space-3)", display: "flex", flexDirection: "column" }}>

        {/* Timeline bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{
            position:     "relative",
            height:       "8px",
            background:   "var(--color-border-default)",
            borderRadius: "var(--radius-full)",
            cursor:       step === "marking" ? "crosshair" : "pointer",
            userSelect:   "none",
          }}
        >
          {/* Playback fill */}
          <div style={{
            position:     "absolute",
            left:         0,
            top:          0,
            height:       "100%",
            width:        `${progress}%`,
            background:   "var(--color-primary)",
            borderRadius: "var(--radius-full)",
            transition:   "width 0.1s linear",
            pointerEvents:"none",
          }} />

          {/* Range selection preview (while marking) */}
          {mode === "range" && rangeStart !== null && rangeEnd === null && duration > 0 && (
            <div style={{
              position:   "absolute",
              top:        "-2px",
              height:     "12px",
              left:       `${(rangeStart / duration) * 100}%`,
              width:      "3px",
              background: "var(--color-primary)",
              borderRadius: "2px",
              pointerEvents: "none",
            }} />
          )}

          {/* Render saved annotations on timeline */}
          {duration > 0 && annotations.map((ann, i) => (
            ann.type === "frame" ? (
              /* Frame pin ▼ */
              <div
                key={ann.id}
                onClick={(e) => { e.stopPropagation(); setSelected(i); seekTo(ann.at); }}
                title={`${fmt(ann.at)} — ${ann.comment}`}
                style={{
                  position:    "absolute",
                  top:         "-6px",
                  left:        `${(ann.at / duration) * 100}%`,
                  transform:   "translateX(-50%)",
                  width:       0,
                  height:      0,
                  borderLeft:  "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop:   "8px solid var(--color-primary)",
                  cursor:      "pointer",
                  zIndex:      2,
                }}
              />
            ) : (
              /* Range bar */
              <div
                key={ann.id}
                onClick={(e) => { e.stopPropagation(); setSelected(i); seekTo(ann.start); }}
                title={`${fmt(ann.start)}–${fmt(ann.end)} — ${ann.comment}`}
                style={{
                  position:     "absolute",
                  top:          "0",
                  height:       "100%",
                  left:         `${(ann.start / duration) * 100}%`,
                  width:        `${((ann.end - ann.start) / duration) * 100}%`,
                  background:   "rgba(10,132,255,0.35)",
                  borderRadius: "var(--radius-full)",
                  cursor:       "pointer",
                  zIndex:       2,
                }}
              />
            )
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <button
            onClick={togglePlay}
            style={{
              width:          36,
              height:         36,
              borderRadius:   "var(--radius-full)",
              background:     "var(--color-primary)",
              color:          "#fff",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              border:         "none",
              cursor:         "pointer",
              transition:     "background var(--transition-fast)",
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span style={{
            fontSize:          "var(--text-xs)",
            color:             "var(--color-text-muted)",
            fontVariantNumeric:"tabular-nums",
            whiteSpace:        "nowrap",
          }}>
            {fmt(currentT)} / {fmt(duration)}
          </span>

          {/* Annotation mode buttons — only shown when idle */}
          {step === "idle" && (
            <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto" }}>
              <button
                className="btn btn--secondary"
                onClick={() => startMarking("frame")}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <FrameIcon />
                Mark frame
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => startMarking("range")}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <RangeIcon />
                Mark range
              </button>
            </div>
          )}

          {/* Cancel button while marking */}
          {step === "marking" && (
            <button
              className="btn btn--ghost"
              onClick={cancelAnnotation}
              style={{ fontSize: "var(--text-xs)", marginLeft: "auto" }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Range start indicator */}
        {mode === "range" && rangeStart !== null && rangeEnd === null && (
          <div style={{
            fontSize:   "var(--text-xs)",
            color:      "var(--color-primary)",
            fontStyle:  "italic",
          }}>
            Start set at {fmt(rangeStart)} — now click the timeline to set the end
          </div>
        )}
      </div>

      {/* -- Comment input — shown after marking ------------- */}
      {step === "writing" && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label" style={{ marginBottom: "var(--space-3)" }}>
            {mode === "frame"
              ? `Comment at ${fmt(frameAt)}`
              : `Comment for ${fmt(rangeStart)} → ${fmt(rangeEnd)}`
            }
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
                  saveAnnotation();
                }
              }}
              style={{
                height:   "80px",
                resize:   "none",
                padding:  "var(--space-3) var(--space-4)",
                lineHeight: "var(--leading-relaxed)",
              }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={cancelAnnotation}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={saveAnnotation}
                disabled={!comment.trim()}
                style={{ opacity: !comment.trim() ? 0.5 : 1 }}
              >
                Save annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Annotation list --------------------------------- */}
      {annotations.length > 0 && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">
            Your annotations ({annotations.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                onClick={() => {
                  setSelected(i === selected ? null : i);
                  seekTo(ann.type === "frame" ? ann.at : ann.start);
                }}
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
                {/* Type badge */}
                <div style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            "var(--space-1)",
                  padding:        "2px var(--space-2)",
                  borderRadius:   "var(--radius-sm)",
                  background:     "var(--color-primary-glow)",
                  color:          "var(--color-primary)",
                  fontSize:       "11px",
                  fontWeight:     "var(--font-semibold)",
                  whiteSpace:     "nowrap",
                  flexShrink:     0,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {ann.type === "frame"
                    ? fmt(ann.at)
                    : `${fmt(ann.start)} → ${fmt(ann.end)}`
                  }
                </div>

                <p style={{
                  fontSize:   "var(--text-sm)",
                  color:      "var(--color-text-primary)",
                  lineHeight: "var(--leading-relaxed)",
                  flex:       1,
                }}>
                  {ann.comment}
                </p>

                <span className={`badge ${ann.type === "range" ? "badge--draft" : "badge--unresolved"}`}>
                  {ann.type === "frame" ? "Frame" : "Range"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {annotations.length === 0 && step === "idle" && (
        <div style={{
          textAlign:  "center",
          padding:    "var(--space-6)",
          color:      "var(--color-text-muted)",
          fontSize:   "var(--text-sm)",
          fontStyle:  "italic",
        }}>
          Use "Mark frame" or "Mark range" above to leave feedback on the video.
        </div>
      )}

    </div>
  );
}
"use client";
/**
 * VideoAnnotator.jsx — updated with lock support & scrollable container
 *
 * Props:
 *   videoUrl, projectName, clientName
 *   annotations  — current revision annotations
 *   onAnnotationSave(annotation)
 *   locked       — boolean: annotations disabled
 *   lockedReason — "submitted" | "maxRevisions" | "final"
 */

import { useState, useRef, useEffect, useCallback } from "react";

function fmt(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function FrameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

function RangeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/>
    </svg>
  );
}

function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

export default function VideoAnnotator({
  videoUrl,
  projectName = "Untitled Project",
  clientName  = "Client",
  annotations = [],
  onAnnotationSave,
  locked       = false,
  lockedReason = null,
}) {
  const videoRef    = useRef(null);
  const timelineRef = useRef(null);

  const [playing,    setPlaying]    = useState(false);
  const [currentT,   setCurrentT]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [mode,       setMode]       = useState("frame");
  const [comment,    setComment]    = useState("");
  const [frameAt,    setFrameAt]    = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd,   setRangeEnd]   = useState(null);
  const [step,       setStep]       = useState("idle");
  const [selected,   setSelected]   = useState(null);
  // We wait for `canplaythrough` — the browser's signal that it has buffered
  // enough to reach the end at current download speed without stopping. The
  // browser keeps fetching ahead as needed once playback starts, so scrubbing
  // remains responsive. We can't force a full download via <video> alone;
  // Chrome deliberately caps preload at ~30% to save bandwidth.
  const [fullyLoaded, setFullyLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime  = () => setCurrentT(v.currentTime);
    const onMeta  = () => setDuration(v.duration);
    const onEnd   = () => setPlaying(false);
    const onPlay  = () => setPlaying(true);   // element tells us
    const onPause = () => setPlaying(false);  // no race
    const onReady = () => setFullyLoaded(true); // buffered enough to play through

    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended",          onEnd);
    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    v.addEventListener("canplaythrough", onReady);
    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended",          onEnd);
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("canplaythrough", onReady);
    };
  }, []);

  // Reset load state when the URL changes (new revision uploaded).
  useEffect(() => {
    setFullyLoaded(false);
  }, [videoUrl]);

  const togglePlay = () => {
    if (!fullyLoaded) return; // wait until the file is fully buffered
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // play() rejects if a seek/pause interrupts it before it resolves.
      // Catch it — purely cosmetic.
      const p = v.play();
      if (p?.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  };

  const seekTo = useCallback((secs) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(secs, duration));
  }, [duration]);

  const handleTimelineClick = (e) => {
    if (!fullyLoaded) return; // block seeks until fully buffered
    const rect = timelineRef.current.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const t    = pct * duration;
    if (step === "marking" && !locked) {
      if (mode === "frame") {
        setFrameAt(t); seekTo(t); setStep("writing");
      } else {
        if (rangeStart === null) { setRangeStart(t); seekTo(t); }
        else {
          const start = Math.min(rangeStart, t);
          const end   = Math.max(rangeStart, t);
          setRangeEnd(end); setRangeStart(start); seekTo(start); setStep("writing");
        }
      }
      return;
    }
    seekTo(t);
  };

  const startMarking = (m) => {
    if (locked || !fullyLoaded) return;
    const v = videoRef.current;
    if (v) v.pause();
    setPlaying(false);
    setMode(m); setFrameAt(null); setRangeStart(null); setRangeEnd(null); setComment(""); setStep("marking");
  };

  const cancelAnnotation = () => {
    setStep("idle"); setFrameAt(null); setRangeStart(null); setRangeEnd(null); setComment("");
  };

  const saveAnnotation = () => {
    if (!comment.trim() || locked) return;
    const ann = mode === "frame"
      ? { type: "frame", at: frameAt,   comment: comment.trim(), id: Date.now() }
      : { type: "range", start: rangeStart, end: rangeEnd, comment: comment.trim(), id: Date.now() };
    onAnnotationSave?.(ann);
    cancelAnnotation();
  };

  const progress = duration ? (currentT / duration) * 100 : 0;
  const markingHint = mode === "frame"
    ? "Click on the timeline to mark the exact moment"
    : rangeStart === null ? "Click to set the START of the range" : "Click again to set the END of the range";

  const lockedMessage = {
    submitted:    "Feedback submitted — waiting for next revision",
    maxRevisions: "Maximum revisions reached — annotations locked",
    final:        "Project marked as final — annotations locked",
  }[lockedReason] ?? "Annotations locked";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", fontFamily: "var(--font-sans)" }}>

      {/* -- Video -- */}
      <div style={{
        background: "#000", borderRadius: "var(--radius-xl)",
        overflow: "hidden", lineHeight: 0, position: "relative",
      }}>
        <video
          ref={videoRef}
          src={videoUrl}
          preload="auto"
          playsInline
          crossOrigin="anonymous"
          style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }}
        />
        {!fullyLoaded && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "var(--space-4)",
            background: "rgba(0,0,0,0.78)", color: "#fff",
            pointerEvents: "none", padding: "var(--space-6)",
          }}>
            <div style={{
              width: 56, height: 56,
              border: "3px solid rgba(255,255,255,0.18)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }} />
            <div style={{ textAlign: "center", lineHeight: 1.55 }}>
              <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)" }}>
                Preparing video for smooth playback
              </div>
              <div style={{ fontSize: "var(--text-xs)", opacity: 0.7, marginTop: 2 }}>
                Just a moment — buffering enough to scrub without stutters.
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {step === "marking" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(10,132,255,0.08)", pointerEvents: "none",
          }}>
            <div style={{
              background: "rgba(10,132,255,0.9)", color: "#fff",
              padding: "var(--space-2) var(--space-5)", borderRadius: "var(--radius-full)",
              fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
            }}>
              {markingHint}
            </div>
          </div>
        )}
      </div>

      {/* -- Controls -- */}
      <div className="card" style={{ padding: "var(--space-4)", gap: "var(--space-3)", display: "flex", flexDirection: "column" }}>
        {/* Timeline */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{
            position: "relative", height: "8px",
            background: "var(--color-border-default)", borderRadius: "var(--radius-full)",
            cursor: step === "marking" ? "crosshair" : "pointer", userSelect: "none",
          }}
        >
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${progress}%`, background: "var(--color-primary)",
            borderRadius: "var(--radius-full)", transition: "width 0.1s linear", pointerEvents: "none",
          }} />

          {/* Range preview while marking */}
          {mode === "range" && rangeStart !== null && rangeEnd === null && duration > 0 && (
            <div style={{
              position: "absolute", top: "-2px", height: "12px",
              left: `${(rangeStart / duration) * 100}%`, width: "3px",
              background: "var(--color-primary)", borderRadius: "2px", pointerEvents: "none",
            }} />
          )}

          {/* Annotation markers */}
          {duration > 0 && annotations.map((ann, i) => (
            ann.type === "frame" ? (
              <div key={ann.id}
                onClick={(e) => { e.stopPropagation(); setSelected(i); seekTo(ann.at); }}
                title={`${fmt(ann.at)} — ${ann.comment}`}
                style={{
                  position: "absolute", top: "-6px", left: `${(ann.at / duration) * 100}%`,
                  transform: "translateX(-50%)", width: 0, height: 0,
                  borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                  borderTop: "8px solid var(--color-primary)", cursor: "pointer", zIndex: 2,
                }}
              />
            ) : (
              <div key={ann.id}
                onClick={(e) => { e.stopPropagation(); setSelected(i); seekTo(ann.start); }}
                title={`${fmt(ann.start)}–${fmt(ann.end)} — ${ann.comment}`}
                style={{
                  position: "absolute", top: "0", height: "100%",
                  left: `${(ann.start / duration) * 100}%`,
                  width: `${((ann.end - ann.start) / duration) * 100}%`,
                  background: "rgba(10,132,255,0.35)", borderRadius: "var(--radius-full)",
                  cursor: "pointer", zIndex: 2,
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
              width: 36, height: 36, borderRadius: "var(--radius-full)",
              background: "var(--color-primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, border: "none", cursor: "pointer",
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span style={{
            fontSize: "var(--text-xs)", color: "var(--color-text-muted)",
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
          }}>
            {fmt(currentT)} / {fmt(duration)}
          </span>

          {/* Locked banner */}
          {locked && (
            <div style={{
              display: "flex", alignItems: "center", gap: "var(--space-2)",
              marginLeft: "auto", fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)", fontStyle: "italic",
            }}>
              <LockIcon />
              {lockedMessage}
            </div>
          )}

          {/* Annotation buttons when idle and not locked */}
          {step === "idle" && !locked && (
            <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto" }}>
              <button className="btn btn--secondary" onClick={() => startMarking("frame")}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <FrameIcon /> Mark frame
              </button>
              <button className="btn btn--secondary" onClick={() => startMarking("range")}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <RangeIcon /> Mark range
              </button>
            </div>
          )}

          {step === "marking" && (
            <button className="btn btn--ghost" onClick={cancelAnnotation}
              style={{ fontSize: "var(--text-xs)", marginLeft: "auto" }}>
              Cancel
            </button>
          )}
        </div>

        {mode === "range" && rangeStart !== null && rangeEnd === null && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontStyle: "italic" }}>
            Start set at {fmt(rangeStart)} — now click the timeline to set the end
          </div>
        )}
      </div>

      {/* Comment input */}
      {step === "writing" && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label" style={{ marginBottom: "var(--space-3)" }}>
            {mode === "frame" ? `Comment at ${fmt(frameAt)}` : `Comment for ${fmt(rangeStart)} → ${fmt(rangeEnd)}`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <textarea
              autoFocus className="form-input"
              placeholder="Describe the change needed here…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveAnnotation(); } }}
              style={{ height: "80px", resize: "none", padding: "var(--space-3) var(--space-4)", lineHeight: "var(--leading-relaxed)" }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={cancelAnnotation}>Cancel</button>
              <button className="btn btn--primary" onClick={saveAnnotation}
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
                onClick={() => { setSelected(i === selected ? null : i); seekTo(ann.type === "frame" ? ann.at : ann.start); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                  padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                  border: `1px solid ${i === selected ? "var(--color-primary)" : "var(--color-border-default)"}`,
                  background: i === selected ? "var(--color-primary-glow)" : "var(--color-bg-surface-alt)",
                  cursor: "pointer", transition: "all var(--transition-fast)",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: "var(--space-1)",
                  padding: "2px var(--space-2)", borderRadius: "var(--radius-sm)",
                  background: "var(--color-primary-glow)", color: "var(--color-primary)",
                  fontSize: "11px", fontWeight: "var(--font-semibold)",
                  whiteSpace: "nowrap", flexShrink: 0, fontVariantNumeric: "tabular-nums",
                }}>
                  {ann.type === "frame" ? fmt(ann.at) : `${fmt(ann.start)} → ${fmt(ann.end)}`}
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", lineHeight: "var(--leading-relaxed)", flex: 1 }}>
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

      {annotations.length === 0 && step === "idle" && (
        <div style={{
          textAlign: "center", padding: "var(--space-6)",
          color: "var(--color-text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic",
        }}>
          {locked
            ? "No annotations for this revision."
            : "Use \"Mark frame\" or \"Mark range\" above to leave feedback on the video."}
        </div>
      )}
    </div>
  );
}
"use client";
/**
 * VideoViewer.jsx  —  dashboard/_components/
 * Editor-facing read-only video player.
 *
 * Shows the uploaded video with the client's annotations
 * rendered on the timeline — frame pins (▼) and range bars.
 * Clicking any marker seeks to that timestamp.
 * All annotations are read-only — the editor cannot add or remove them.
 * Now with scrollable container for large videos.
 *
 * Props:
 *   project      — the full project object (needs mediaUrl, name)
 *   annotations  — array of annotation objects from Firestore
 *                  { type:"frame", at, comment, id }
 *                  { type:"range", start, end, comment, id }
 */

import { useState, useRef, useEffect, useCallback } from "react";

/* -- Helpers ------------------------------------------------ */
function fmt(secs) {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* -- Icons -------------------------------------------------- */
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
export default function VideoViewer({ project, annotations = [] }) {
  const videoRef    = useRef(null);
  const timelineRef = useRef(null);

  const [playing,  setPlaying]  = useState(false);
  const [currentT, setCurrentT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selected, setSelected] = useState(null); // index of selected annotation

  /* -- Playback sync ---------------------------------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime  = () => setCurrentT(v.currentTime);
    const onMeta  = () => setDuration(v.duration);
    const onEnd   = () => setPlaying(false);
    const onPlay  = () => setPlaying(true);   // let the element tell us
    const onPause = () => setPlaying(false);  // (no guessing → no race)
    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended",          onEnd);
    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended",          onEnd);
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
    };
  }, []);

  const seekTo = useCallback((secs) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(secs, duration));
  }, [duration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // play() returns a Promise that rejects with AbortError if a seek or
      // pause happens before it resolves. Catch and ignore — purely cosmetic.
      const p = v.play();
      if (p?.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  };

  /* -- Timeline click → seek -------------------------------- */
  const handleTimelineClick = (e) => {
    if (!duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    seekTo(pct * duration);
  };

  /* -- Select annotation + seek ----------------------------- */
  const handleSelectAnnotation = (ann, i) => {
    setSelected(i === selected ? null : i);
    seekTo(ann.type === "frame" ? ann.at : ann.start);
  };

  const progress = duration ? (currentT / duration) * 100 : 0;

  const frameAnnotations = annotations.filter(a => a.type === "frame");
  const rangeAnnotations = annotations.filter(a => a.type === "range");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* -- Video (scrollable container) -------------------- */}
      <div style={{
        background:   "#000",
        borderRadius: "var(--radius-xl)",
        overflow:     "auto",
        lineHeight:   0,
        maxHeight:    "600px",
        border:       "1px solid var(--color-border-default)",
      }}>
        <video
          ref={videoRef}
          src={project.mediaUrl}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          style={{
            width:     "100%",
            objectFit: "contain",
            display:   "block",
          }}
        />
      </div>

      {/* -- Controls + timeline ----------------------------- */}
      <div className="card" style={{
        padding:       "var(--space-4)",
        display:       "flex",
        flexDirection: "column",
        gap:           "var(--space-3)",
      }}>

        {/* Timeline bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{
            position:     "relative",
            height:       "8px",
            background:   "var(--color-border-default)",
            borderRadius: "var(--radius-full)",
            cursor:       "pointer",
            userSelect:   "none",
          }}
        >
          {/* Playback fill */}
          <div style={{
            position:      "absolute",
            left:          0,
            top:           0,
            height:        "100%",
            width:         `${progress}%`,
            background:    "var(--color-primary)",
            borderRadius:  "var(--radius-full)",
            transition:    "width 0.1s linear",
            pointerEvents: "none",
          }} />

          {/* Range bars */}
          {duration > 0 && rangeAnnotations.map((ann, i) => {
            const globalIndex = annotations.indexOf(ann);
            return (
              <div
                key={ann.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAnnotation(ann, globalIndex);
                }}
                title={`${fmt(ann.start)} → ${fmt(ann.end)}: ${ann.comment}`}
                style={{
                  position:     "absolute",
                  top:          0,
                  height:       "100%",
                  left:         `${(ann.start / duration) * 100}%`,
                  width:        `${((ann.end - ann.start) / duration) * 100}%`,
                  background:   globalIndex === selected
                    ? "rgba(10,132,255,0.6)"
                    : "rgba(10,132,255,0.3)",
                  borderRadius: "var(--radius-full)",
                  cursor:       "pointer",
                  zIndex:       2,
                  transition:   "background var(--transition-fast)",
                }}
              />
            );
          })}

          {/* Frame pins ▼ */}
          {duration > 0 && frameAnnotations.map((ann) => {
            const globalIndex = annotations.indexOf(ann);
            return (
              <div
                key={ann.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAnnotation(ann, globalIndex);
                }}
                title={`${fmt(ann.at)}: ${ann.comment}`}
                style={{
                  position:    "absolute",
                  top:         "-6px",
                  left:        `${(ann.at / duration) * 100}%`,
                  transform:   "translateX(-50%)",
                  width:       0,
                  height:      0,
                  borderLeft:  "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop:   globalIndex === selected
                    ? "8px solid var(--color-primary)"
                    : "8px solid #E53E3E",
                  cursor:      "pointer",
                  zIndex:      3,
                  transition:  "border-top-color var(--transition-fast)",
                }}
              />
            );
          })}
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
            fontSize:           "var(--text-xs)",
            color:              "var(--color-text-muted)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace:         "nowrap",
          }}>
            {fmt(currentT)} / {fmt(duration)}
          </span>

          {/* Annotation summary pills */}
          {annotations.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto" }}>
              {frameAnnotations.length > 0 && (
                <span className="badge badge--needs-action">
                  {frameAnnotations.length} frame{frameAnnotations.length !== 1 ? "s" : ""}
                </span>
              )}
              {rangeAnnotations.length > 0 && (
                <span className="badge badge--draft">
                  {rangeAnnotations.length} range{rangeAnnotations.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -- Annotation list --------------------------------- */}
      {annotations.length > 0 ? (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">
            Client feedback ({annotations.length})
          </p>
          <div style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "var(--space-2)",
            maxHeight:     "320px",
            overflowY:     "auto",
            paddingRight:  "var(--space-1)",
          }}>
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                onClick={() => handleSelectAnnotation(ann, i)}
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
                {/* Timestamp badge */}
                <div style={{
                  display:            "flex",
                  alignItems:         "center",
                  padding:            "2px var(--space-2)",
                  borderRadius:       "var(--radius-sm)",
                  background:         ann.type === "frame"
                    ? "rgba(229,62,62,0.1)"
                    : "var(--color-primary-glow)",
                  color:              ann.type === "frame"
                    ? "#E53E3E"
                    : "var(--color-primary)",
                  fontSize:           "11px",
                  fontWeight:         "var(--font-semibold)",
                  whiteSpace:         "nowrap",
                  flexShrink:         0,
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

                <span className={`badge ${ann.type === "frame" ? "badge--needs-action" : "badge--draft"}`}>
                  {ann.type === "frame" ? "Frame" : "Range"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{
          padding:   "var(--space-5)",
          textAlign: "center",
          color:     "var(--color-text-muted)",
          fontSize:  "var(--text-sm)",
          fontStyle: "italic",
        }}>
          No client feedback yet. Share the token so your client can review.
        </div>
      )}

    </div>
  );
}
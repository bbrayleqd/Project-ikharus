"use client";
import { useState } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function timeBasedProgress(loggedSeconds, maxSeconds) {
  if (!maxSeconds || maxSeconds <= 0) return 0;
  return Math.min(100, Math.round((loggedSeconds / maxSeconds) * 100));
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// State is LIFTED — loggedSeconds and workLog live in the project object
// inside page.js so they survive navigating back and forth to the dashboard.
//
// Props:
//   project          — full project object (needs maxDurationMins/Secs)
//   loggedSeconds    — total seconds logged so far (from project)
//   workLog          — array of past entries (from project)
//   onProgressUpdate — (newProgress, patch) → called on every Add

export default function WorkLogPanel({
  project,
  loggedSeconds = 0,
  workLog = [],
  onProgressUpdate,
  strategy = timeBasedProgress,
}) {
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");

  const maxSeconds = (project.maxDurationMins * 60) + (project.maxDurationSecs ?? 0);
  const progress   = strategy(loggedSeconds, maxSeconds);
  const isComplete = progress >= 100;

  const handleAddEntry = () => {
    const m     = parseInt(mins) || 0;
    const s     = parseInt(secs) || 0;
    const added = m * 60 + s;
    if (added <= 0) return;

    const newTotal    = Math.min(loggedSeconds + added, maxSeconds);
    const newProgress = strategy(newTotal, maxSeconds);

    const entry = {
      id:        Date.now(),
      label:     fmtDuration(added),
      seconds:   added,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Pass new progress AND the updated log back up to page.js
    onProgressUpdate(newProgress, {
      loggedSeconds: newTotal,
      workLog:       [entry, ...workLog],
    });

    setMins("");
    setSecs("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* ── Progress summary ── */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "baseline",
          marginBottom:   "var(--space-3)",
        }}>
          <p className="card-section-label" style={{ margin: 0 }}>Work progress</p>
          <span style={{
            fontSize:   "var(--text-sm)",
            fontWeight: "var(--font-semibold)",
            color:      isComplete ? "var(--color-status-delivered-text)" : "var(--color-primary)",
          }}>
            {fmtDuration(Math.min(loggedSeconds, maxSeconds))} / {fmtDuration(maxSeconds)}
          </span>
        </div>

        <div className="header-progress__bar">
          <div
            className="header-progress__fill"
            style={{
              width:      `${progress}%`,
              background: isComplete
                ? "var(--color-status-delivered-text)"
                : "var(--color-primary)",
            }}
          />
        </div>

        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          marginTop:      "var(--space-2)",
          fontSize:       "var(--text-xs)",
          color:          "var(--color-text-muted)",
        }}>
          <span>{workLog.length} {workLog.length === 1 ? "entry" : "entries"} logged</span>
          <span style={{
            fontWeight: "var(--font-semibold)",
            color:      isComplete
              ? "var(--color-status-delivered-text)"
              : "var(--color-text-secondary)",
          }}>
            {progress}%{isComplete && " — Ready to upload ✓"}
          </span>
        </div>
      </div>

      {/* ── Add entry form ── */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <p className="card-section-label">Log work session</p>

        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" htmlFor="log-mins">Minutes</label>
            <input
              id="log-mins"
              className="form-input"
              type="number"
              min={0}
              placeholder="0"
              value={mins}
              onChange={(e) => setMins(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
            />
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" htmlFor="log-secs">Seconds</label>
            <input
              id="log-secs"
              className="form-input"
              type="number"
              min={0}
              max={59}
              placeholder="0"
              value={secs}
              onChange={(e) => setSecs(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
            />
          </div>

          <button
            className="btn btn--primary"
            onClick={handleAddEntry}
            disabled={isComplete}
            style={{
              height:       40,
              paddingLeft:  "var(--space-5)",
              paddingRight: "var(--space-5)",
              opacity:      isComplete ? 0.4 : 1,
              cursor:       isComplete ? "not-allowed" : "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Session history ── */}
      {workLog.length > 0 && (
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <p className="card-section-label">Session history</p>
          <div style={{
            display:   "flex",
            flexDirection: "column",
            gap:       "var(--space-2)",
            maxHeight: "220px",
            overflowY: "auto",
            paddingRight: "var(--space-1)",
          }}>
            {workLog.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                  padding:        "var(--space-2) var(--space-3)",
                  background:     "var(--color-bg-surface-alt)",
                  borderRadius:   "var(--radius-md)",
                }}
              >
                <span style={{
                  fontSize:   "var(--text-sm)",
                  fontWeight: "var(--font-medium)",
                  color:      "var(--color-text-primary)",
                }}>
                  + {entry.label}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  {entry.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
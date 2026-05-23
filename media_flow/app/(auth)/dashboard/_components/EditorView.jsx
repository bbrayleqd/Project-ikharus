"use client";
import { useState }        from "react";
import { CldUploadWidget } from "next-cloudinary";
import { UserButton }      from "@clerk/nextjs";
import { useTheme }        from "../../../theme-provider";

import WorkLogPanel      from "./WorkLogPanel";
// ... (rest of imports)

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
import RevisionChecklist from "./RevisionChecklist";
import ImageViewer       from "./ImageViewer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeClass(status) {
  const map = {
    "In Progress":     "badge badge--draft",
    "Awaiting Upload": "badge badge--draft",
    "Needs Action":    "badge badge--needs-action",
    "Delivered":       "badge badge--delivered",
    "Unresolved":      "badge badge--unresolved",
  };
  return map[status] ?? "badge badge--draft";
}

function ProgressRing({ progress = 0, size = 40, stroke = 3 }) {
  const clamped = Math.min(100, Math.max(0, progress));
  const r       = (size - stroke * 2) / 2;
  const circ    = 2 * Math.PI * r;
  const offset  = circ - (clamped / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className="progress-ring" aria-label={`${progress}% complete`}>
      <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={r} />
      <circle className="progress-ring__fill"  cx={size / 2} cy={size / 2} r={r}
        strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorView({
  project,
  onBack,
  onProgressUpdate,
  onMediaUploaded,
}) {
  const { darkMode, toggleDarkMode } = useTheme();
  const isImage         = project.projectType === "image";
  const isReadyToUpload = isImage ? true : project.progress >= 100;
  const [token, setToken] = useState(null);

  const handleGenerateToken = () => {
    const clientSlug = project.client.toLowerCase().replace(/\s+/g, "");
    const generated  = `${clientSlug}_${Math.random().toString(36).slice(2, 8)}`;
    const mockUrl    = `${window.location.origin}/review/${generated}`;
    navigator.clipboard?.writeText(mockUrl).catch(() => {});
    setToken(generated);
    // TODO: write token + progress snapshot to Firestore
  };

  // RevisionChecklist passes back updatedTasks in the patch
  const handleChecklistUpdate = (newProgress, updatedTasks) => {
    onProgressUpdate(newProgress, { tasks: updatedTasks });
  };

  const uploadPreset  = "mediaflow_unsigned";
  const uploadOptions = isImage
    ? { resourceType: "image", clientAllowedFormats: ["jpg", "jpeg", "png", "webp"] }
    : { resourceType: "video", clientAllowedFormats: ["mp4", "mov"] };

  return (
    <div className="app-shell">

      {/* ── Header ── */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <button className="btn btn--ghost" onClick={onBack}
            style={{ fontSize: "var(--text-sm)" }}>
            ← Back
          </button>

          <span style={{
            fontWeight: "var(--font-semibold)",
            color:      "var(--color-text-primary)",
            fontSize:   "var(--text-lg)",
          }}>
            {project.name}
          </span>

          {/* Project type pill */}
          <span style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "var(--space-1)",
            padding:      "2px 10px",
            borderRadius: "var(--radius-full)",
            background:   isImage ? "rgba(124,58,237,0.1)" : "var(--color-primary-glow)",
            color:        isImage ? "#7C3AED" : "var(--color-primary)",
            fontSize:     "var(--text-xs)",
            fontWeight:   "var(--font-semibold)",
          }}>
            {isImage ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            )}
            {isImage ? "Image" : "Video"}
          </span>

          <span className={statusBadgeClass(project.status)}>
            {project.status}
          </span>
        </div>

        {/* Linear header progress bar */}
        <div className="header-progress"
          style={{ flex: 1, maxWidth: 300, margin: "0 var(--space-8)" }}>
          <div className="header-progress__bar">
            <div className="header-progress__fill" style={{
              width:      `${project.progress}%`,
              background: isImage ? "#7C3AED" : "var(--color-primary)",
            }} />
          </div>
          <span className="header-progress__pct">{project.progress}%</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <div style={{
            fontSize:      "var(--text-xs)",
            color:         "var(--color-text-secondary)",
            fontWeight:    "var(--font-semibold)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            Revisions: 0 / {project.maxRevisions}
          </div>

          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg-surface-alt)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-medium)",
              transition: "all var(--transition-fast)",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-default)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            aria-label="Toggle theme"
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center" }}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="app-main">
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1fr 320px",
          gap:                 "var(--space-6)",
          alignItems:          "start",
        }} className="editor-grid">

          {/* ── Left: media area ── */}
          <div>
            <div className="card" style={{
              padding:      0,
              marginBottom: "var(--space-4)",
            }}>
              {!project.mediaUrl ? (

                isReadyToUpload ? (
                  /* Upload unlocked */
                  <CldUploadWidget
                    uploadPreset={uploadPreset}
                    options={uploadOptions}
                    onSuccess={(res) => onMediaUploaded(res.info.secure_url)}
                  >
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        style={{
                          width:          "100%",
                          height:         "100%",
                          minHeight:      "55vh",
                          display:        "flex",
                          flexDirection:  "column",
                          alignItems:     "center",
                          justifyContent: "center",
                          gap:            "var(--space-4)",
                          background:     isImage
                            ? "rgba(124,58,237,0.07)"
                            : "var(--color-primary-glow)",
                          border:         `2px dashed ${isImage ? "#7C3AED" : "var(--color-primary)"}`,
                          borderRadius:   "var(--radius-xl)",
                          cursor:         "pointer",
                          transition:     "background var(--transition-fast)",
                        }}
                        onMouseEnter={(e) =>
                          e.currentTarget.style.background = isImage
                            ? "rgba(124,58,237,0.14)"
                            : "rgba(45,156,219,0.22)"
                        }
                        onMouseLeave={(e) =>
                          e.currentTarget.style.background = isImage
                            ? "rgba(124,58,237,0.07)"
                            : "var(--color-primary-glow)"
                        }
                      >
                        <div style={{
                          width:          72,
                          height:         72,
                          borderRadius:   "var(--radius-full)",
                          background:     isImage ? "#7C3AED" : "var(--color-primary)",
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          color:          "#fff",
                        }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="14" />
                          </svg>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{
                            fontWeight: "var(--font-semibold)",
                            color:      isImage ? "#7C3AED" : "var(--color-primary)",
                            fontSize:   "var(--text-lg)",
                          }}>
                            Upload v1 {isImage ? "image" : "draft"}
                          </p>
                          <p style={{
                            fontSize:  "var(--text-sm)",
                            color:     "var(--color-text-muted)",
                            marginTop: "var(--space-1)",
                          }}>
                            {isImage
                              ? "Request complete — JPG, PNG, WEBP supported"
                              : "Work log complete — MP4 supported"}
                          </p>
                        </div>
                      </button>
                    )}
                  </CldUploadWidget>

                ) : (
                  /* Upload locked */
                  <div style={{
                    width:          "100%",
                    minHeight:      "55vh",
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            "var(--space-5)",
                    background:     "var(--color-bg-surface-alt)",
                    border:         "2px dashed var(--color-border-default)",
                    borderRadius:   "var(--radius-xl)",
                  }}>
                    <div style={{
                      width:          64,
                      height:         64,
                      borderRadius:   "var(--radius-full)",
                      background:     "var(--color-border-default)",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      color:          "var(--color-text-muted)",
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <p style={{
                        fontWeight: "var(--font-semibold)",
                        color:      "var(--color-text-secondary)",
                        fontSize:   "var(--text-base)",
                      }}>
                        Upload locked
                      </p>
                      <p style={{
                        fontSize:  "var(--text-sm)",
                        color:     "var(--color-text-muted)",
                        marginTop: "var(--space-1)",
                      }}>
                        {"Complete your work log to reach 100%"}
                      </p>
                    </div>

                    {/* Progress hint pill */}
                    <div style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "var(--space-3)",
                      background:   "var(--color-bg-surface)",
                      border:       "1px solid var(--color-border-default)",
                      borderRadius: "var(--radius-lg)",
                      padding:      "var(--space-3) var(--space-5)",
                    }}>
                      <div style={{ position: "relative", width: 40, height: 40 }}>
                        <ProgressRing progress={project.progress} />
                        <span style={{
                          position:       "absolute",
                          inset:          0,
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          fontSize:       "9px",
                          fontWeight:     "bold",
                          color:          "var(--color-text-primary)",
                        }}>
                          {project.progress}%
                        </span>
                      </div>
                      <div>
                        <p style={{
                          fontSize:   "var(--text-sm)",
                          fontWeight: "var(--font-medium)",
                          color:      "var(--color-text-primary)",
                        }}>
                          {project.progress}% complete
                        </p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                          {"Log more work on the right →"}
                        </p>
                      </div>
                    </div>
                  </div>
                )

              ) : (
                /* ── Media uploaded ── */
                isImage ? (
                  <div style={{ padding: "var(--space-4)" }}>
                    <ImageViewer
                      project={project}
                      annotations={project.annotations ?? []}
                    />
                  </div>
                ) : (
                  <div style={{
                    background:   "#000",
                    borderRadius: "var(--radius-xl)",
                    overflow:     "hidden",
                    lineHeight:   0,
                  }}>
                    <video
                      src={project.mediaUrl}
                      controls
                      style={{
                        width:     "100%",
                        maxHeight: "70vh",
                        objectFit: "contain",
                        display:   "block",
                      }}
                    />
                  </div>
                )
              )}
            </div>

            {/* ── Action buttons — always visible ── */}
            <div style={{
              display:    "flex",
              gap:        "var(--space-3)",
              flexWrap:   "wrap",
              alignItems: "center",
              marginTop:  "var(--space-4)",
            }}>
              <button
                className="btn btn--secondary"
                onClick={handleGenerateToken}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {token ? "Regenerate token" : "Generate token"}
              </button>

              {token && (
                <div style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "var(--space-2)",
                  padding:      "var(--space-2) var(--space-3)",
                  background:   "var(--color-bg-surface-alt)",
                  border:       "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  flex:         1,
                  minWidth:     0,
                }}>
                  <code style={{
                    fontSize:     "var(--text-xs)",
                    color:        "var(--color-primary)",
                    fontFamily:   "var(--font-mono)",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                    flex:         1,
                  }}>
                    {window.location.origin}/review/{token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard?.writeText(
                      `${window.location.origin}/review/${token}`
                    )}
                    style={{
                      background: "none",
                      border:     "none",
                      cursor:     "pointer",
                      color:      "var(--color-text-muted)",
                      padding:    "2px",
                      display:    "flex",
                      flexShrink: 0,
                    }}
                    title="Copy link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
              )}

              {project.mediaUrl && (
                <span className="badge badge--delivered"
                  style={{ padding: "var(--space-2) var(--space-4)" }}>
                  v1 uploaded ✓
                </span>
              )}
            </div>
          </div>

          {/* ── Right: panel ── */}
          <aside>
            {!project.mediaUrl ? (
              isImage ? null : (
                /* Pass persisted work log state down from project */
                <WorkLogPanel
                  project={project}
                  loggedSeconds={project.loggedSeconds ?? 0}
                  workLog={project.workLog ?? []}
                  onProgressUpdate={onProgressUpdate}
                />
              )
            ) : (
              !isImage && (
                <div className="card">
                  <p className="card-section-label">Annotations</p>
                  <div style={{
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    height:         200,
                    color:          "var(--color-text-muted)",
                    fontSize:       "var(--text-sm)",
                    fontStyle:      "italic",
                  }}>
                    No feedback yet.
                  </div>
                </div>
              )
            )}
          </aside>

        </div>
      </main>
    </div>
  );
}
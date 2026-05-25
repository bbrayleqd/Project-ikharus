"use client";
import { useState, useEffect }  from "react";
import { CldUploadWidget }      from "next-cloudinary";
import { UserButton }           from "@clerk/nextjs";
import { useTheme }             from "../../../theme-provider";

import WorkLogPanel      from "./WorkLogPanel";
import RevisionChecklist from "./RevisionChecklist";
import ImageViewer       from "./ImageViewer";
import VideoViewer       from "./VideoViewer";
import { db }            from "../../../lib/firebase";
import {
  doc, setDoc, updateDoc, serverTimestamp,
  collection, query, orderBy, onSnapshot,
} from "firebase/firestore";

// --- Icons -------------------------------------------------------------------

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
      stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 6 5 9 10 3"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="14"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

// --- Helpers -----------------------------------------------------------------

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
      <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={r}/>
      <circle className="progress-ring__fill"  cx={size / 2} cy={size / 2} r={r}
        strokeDasharray={circ} strokeDashoffset={offset}/>
    </svg>
  );
}

// --- Annotation Todo List (editor side) --------------------------------------

function AnnotationTodo({ annotations, onToggleResolved }) {
  const total    = annotations.length;
  const resolved = annotations.filter(a => a.resolved).length;
  const allDone  = total > 0 && resolved === total;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <p className="card-section-label">Client feedback</p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 160, color: "var(--color-text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic",
        }}>
          No feedback yet from client.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Progress summary */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-3)" }}>
          <p className="card-section-label" style={{ margin: 0 }}>Revision tasks</p>
          <span style={{
            fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)",
            color: allDone ? "var(--color-status-delivered-text)" : "var(--color-primary)",
          }}>
            {resolved} / {total}
          </span>
        </div>

        <div className="header-progress__bar">
          <div className="header-progress__fill" style={{
            width: `${progress}%`,
            background: allDone ? "var(--color-status-delivered-text)" : "var(--color-primary)",
            transition: "width 0.4s ease",
          }}/>
        </div>

        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          {allDone
            ? "✓ All feedback addressed — ready to upload next revision"
            : `${total - resolved} item${total - resolved !== 1 ? "s" : ""} remaining`}
        </p>
      </div>

      {/* Checklist — scrollable */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <p className="card-section-label">Feedback to address</p>
        <div style={{
          display: "flex", flexDirection: "column", gap: "var(--space-2)",
          maxHeight: 380, overflowY: "auto", paddingRight: "var(--space-1)",
        }}>
          {annotations.map((ann, i) => (
            <div
              key={ann.id}
              style={{
                display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                border: `1px solid ${ann.resolved ? "var(--color-status-delivered-text)" : "var(--color-border-default)"}`,
                background: ann.resolved ? "var(--color-status-delivered-bg)" : "var(--color-bg-surface-alt)",
                transition: "all var(--transition-fast)",
              }}
            >
              {/* Checkbox */}
              <div
                onClick={() => onToggleResolved(ann.id, !ann.resolved)}
                style={{
                  width: 20, height: 20, borderRadius: "var(--radius-sm)", flexShrink: 0,
                  border: `2px solid ${ann.resolved ? "var(--color-primary)" : "var(--color-border-default)"}`,
                  background: ann.resolved ? "var(--color-primary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all var(--transition-fast)", marginTop: 2,
                }}
              >
                {ann.resolved && <CheckIcon />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {ann.type === "frame" && (
                  <span style={{
                    display: "inline-block", marginBottom: "var(--space-1)",
                    padding: "1px 6px", borderRadius: "var(--radius-sm)",
                    background: "rgba(229,62,62,0.1)", color: "#E53E3E",
                    fontSize: "10px", fontWeight: "var(--font-semibold)", fontVariantNumeric: "tabular-nums",
                  }}>
                    {ann.at !== undefined
                      ? `${Math.floor(ann.at / 60)}:${String(Math.floor(ann.at % 60)).padStart(2, "0")}`
                      : "Frame"}
                  </span>
                )}
                {ann.type === "range" && (
                  <span style={{
                    display: "inline-block", marginBottom: "var(--space-1)",
                    padding: "1px 6px", borderRadius: "var(--radius-sm)",
                    background: "var(--color-primary-glow)", color: "var(--color-primary)",
                    fontSize: "10px", fontWeight: "var(--font-semibold)", fontVariantNumeric: "tabular-nums",
                  }}>
                    {ann.start !== undefined
                      ? `${Math.floor(ann.start / 60)}:${String(Math.floor(ann.start % 60)).padStart(2, "0")} → ${Math.floor(ann.end / 60)}:${String(Math.floor(ann.end % 60)).padStart(2, "0")}`
                      : "Range"}
                  </span>
                )}
                {ann.type === "ellipse" && (
                  <span style={{
                    display: "inline-block", marginBottom: "var(--space-1)",
                    padding: "1px 6px", borderRadius: "var(--radius-sm)",
                    background: "rgba(124,58,237,0.1)", color: "#7C3AED",
                    fontSize: "10px", fontWeight: "var(--font-semibold)",
                  }}>Region #{i + 1}</span>
                )}
                {ann.type === "pin" && (
                  <span style={{
                    display: "inline-block", marginBottom: "var(--space-1)",
                    padding: "1px 6px", borderRadius: "var(--radius-sm)",
                    background: "rgba(229,62,62,0.1)", color: "#E53E3E",
                    fontSize: "10px", fontWeight: "var(--font-semibold)",
                  }}>Pin #{i + 1}</span>
                )}
                <p style={{
                  fontSize: "var(--text-sm)",
                  color: ann.resolved ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  lineHeight: "var(--leading-relaxed)",
                  textDecoration: ann.resolved ? "line-through" : "none",
                  transition: "all var(--transition-fast)",
                  margin: 0,
                }}>
                  {ann.comment}
                </p>
              </div>

              {ann.resolved && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-status-delivered-text)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Component ----------------------------------------------------------------

export default function EditorView({
  project,
  onBack,
  onProgressUpdate,
  onMediaUploaded,
}) {
  const { darkMode, toggleDarkMode } = useTheme();
  const isImage         = project.projectType === "image";
  const isReadyToUpload = isImage ? true : project.progress >= 100;

  // Revision starts at 0; first upload bumps to 1
  const [currentRevision,  setCurrentRevision]  = useState(project.currentRevision ?? 0);
  const [token,            setToken]             = useState(project.clientToken ?? null);
  const [copied,           setCopied]            = useState(false);
  const [annotations,      setAnnotations]       = useState([]);

  // Subscribe to annotations subcollection
  useEffect(() => {
    if (!project?.id) return;
    const q = query(
      collection(db, "projects", project.id, "annotations"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      // Spread data first, then override id with the Firestore string doc ID.
      // This prevents the locally-generated numeric id (Date.now()) stored
      // inside the document from overriding the real Firestore document ID.
      setAnnotations(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, [project?.id]);

  // Keep local revision in sync with project (in case of external update)
  useEffect(() => {
    if (project.currentRevision !== undefined) {
      setCurrentRevision(project.currentRevision);
    }
  }, [project.currentRevision]);

  // Keep token in sync with project
  useEffect(() => {
    if (project.clientToken) setToken(project.clientToken);
  }, [project.clientToken]);

  // currentRevision = number of times client has submitted feedback.
  // Annotations are stored at revision = currentRevision (post-bump value after submit).
  const currentAnnotations = annotations.filter(
    (a) => (a.revision ?? 1) === currentRevision
  );
  const totalTasks    = currentAnnotations.length;
  const resolvedTasks = currentAnnotations.filter(a => a.resolved).length;
  const allResolved   = totalTasks > 0 && resolvedTasks === totalTasks;

  // Progress: task-based after media uploaded, work-log-based before
  const taskProgress = project.mediaUrl && totalTasks > 0
    ? Math.round((resolvedTasks / totalTasks) * 100)
    : project.progress ?? 0;

  const maxRevisions  = project.maxRevisions ?? 3;
  // revisionsLeft: how many more client feedback rounds are allowed after this upload.
  // currentRevision is how many rounds already submitted. If == maxRevisions, this is the final delivery.
  const revisionsLeft = maxRevisions - currentRevision;

  // Upload is allowed when all tasks are resolved (or no tasks yet on first upload).
  // Always allow the final delivery upload even when revisionsLeft === 0.
  const canUploadRevision = project.mediaUrl && allResolved && (revisionsLeft > 0 || currentRevision === maxRevisions);

  // --- Toggle annotation resolved -------------------------------------------
  const handleToggleResolved = async (annotationId, resolved) => {
    // Guard: annotationId must be a non-empty string
    if (!annotationId || typeof annotationId !== "string") {
      console.error("Invalid annotationId:", annotationId);
      return;
    }
    if (!project?.id || typeof project.id !== "string") {
      console.error("Invalid project.id:", project?.id);
      return;
    }
    try {
      await updateDoc(
        doc(db, "projects", project.id, "annotations", annotationId),
        { resolved }
      );
    } catch (e) {
      console.error("Toggle resolved failed:", e);
    }
  };

  // --- Generate token (one per project, reuse if exists) --------------------
  const handleGenerateToken = async () => {
    // If project already has a token, just show it
    if (project.clientToken) {
      setToken(project.clientToken);
      return;
    }
    const clientSlug = (project.client ?? "client").toLowerCase().replace(/\s+/g, "");
    const generated  = `${clientSlug}_${Math.random().toString(36).slice(2, 8)}`;

    await setDoc(doc(db, "tokens", generated), {
      projectId:       project.id,
      projectName:     project.name,
      client:          project.client,
      projectType:     project.projectType,
      progress:        project.progress ?? 0,
      mediaUrl:        project.mediaUrl ?? null,
      maxRevisions:    maxRevisions,
      currentRevision: currentRevision,
      createdAt:       serverTimestamp(),
    });

    // Persist token on the project so it's permanent
    await updateDoc(doc(db, "projects", project.id), { clientToken: generated });
    setToken(generated);
  };

  const handleCopyLink = () => {
    if (!token) return;
    navigator.clipboard?.writeText(`${window.location.origin}/client/${token}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- First upload — delegate to parent (dashboard handles project + token sync) ---
  const handleFirstUpload = (url) => {
    onMediaUploaded(url);
  };

  // --- Upload next revision (bumps counter, unlocks client) -----------------
  const handleNextRevisionUploaded = (url) => {
    onMediaUploaded(url);
  };

  const handleChecklistUpdate = (newProgress, updatedTasks) => {
    onProgressUpdate(newProgress, { tasks: updatedTasks });
  };

  const uploadPreset  = "mediaflow_unsigned";
  const uploadOptions = isImage
    ? { resourceType: "image", clientAllowedFormats: ["jpg", "jpeg", "png", "webp"] }
    : { resourceType: "video", clientAllowedFormats: ["mp4", "mov"] };

  const reviewUrl = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/client/${token}` : null;

  // Revision label: "0 of 3" before first upload, "1 of 3" after, etc.
  const revisionLabel = `${currentRevision} of ${maxRevisions}`;

  return (
    <div className="app-shell">

      {/* -- Header -- */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <button className="btn btn--ghost" onClick={onBack}
            style={{ fontSize: "var(--text-sm)" }}>
            ← Back
          </button>

          <span style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", fontSize: "var(--text-lg)" }}>
            {project.name}
          </span>

          <span style={{
            padding: "2px 10px", borderRadius: "var(--radius-full)",
            background: isImage ? "rgba(124,58,237,0.1)" : "var(--color-primary-glow)",
            color: isImage ? "#7C3AED" : "var(--color-primary)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)",
          }}>
            {isImage ? "Image" : "Video"}
          </span>

          <span className={statusBadgeClass(project.status)}>{project.status}</span>
        </div>

        {/* Progress bar */}
        <div className="header-progress" style={{ flex: 1, maxWidth: 300, margin: "0 var(--space-8)" }}>
          <div className="header-progress__bar">
            <div className="header-progress__fill" style={{
              width: `${taskProgress}%`,
              background: isImage ? "#7C3AED" : "var(--color-primary)",
              transition: "width 0.4s ease",
            }}/>
          </div>
          <span className="header-progress__pct">{taskProgress}%</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
          {/* Revision counter */}
          <div style={{
            fontSize: "var(--text-xs)", color: "var(--color-text-secondary)",
            fontWeight: "var(--font-semibold)", textTransform: "uppercase", letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}>
            Rev {revisionLabel}
          </div>

          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "var(--radius-full)",
              background: "var(--color-bg-surface-alt)", border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)", cursor: "pointer",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", transition: "all var(--transition-fast)",
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* -- Body: scrollable -- */}
      <main className="app-main">
        <div className="editor-grid">

          {/* -- Left: media area -- */}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* Media card */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {!project.mediaUrl ? (
                isReadyToUpload ? (
                  <CldUploadWidget
                    uploadPreset={uploadPreset}
                    options={uploadOptions}
                    onSuccess={(res) => handleFirstUpload(res.info.secure_url)}
                  >
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        style={{
                          width: "100%", minHeight: "55vh",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: "var(--space-4)",
                          background: isImage ? "rgba(124,58,237,0.07)" : "var(--color-primary-glow)",
                          border: `2px dashed ${isImage ? "#7C3AED" : "var(--color-primary)"}`,
                          borderRadius: "var(--radius-xl)", cursor: "pointer",
                          transition: "background var(--transition-fast)",
                        }}
                      >
                        <div style={{
                          width: 72, height: 72, borderRadius: "var(--radius-full)",
                          background: isImage ? "#7C3AED" : "var(--color-primary)",
                          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                        }}>
                          <UploadIcon />
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontWeight: "var(--font-semibold)", color: isImage ? "#7C3AED" : "var(--color-primary)", fontSize: "var(--text-lg)" }}>
                            Upload first {isImage ? "image" : "draft"}
                          </p>
                          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                            {isImage ? "JPG, PNG, WEBP supported" : "MP4, MOV supported"}
                          </p>
                        </div>
                      </button>
                    )}
                  </CldUploadWidget>
                ) : (
                  /* Upload locked */
                  <div style={{
                    width: "100%", minHeight: "55vh", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: "var(--space-5)",
                    background: "var(--color-bg-surface-alt)", border: "2px dashed var(--color-border-default)",
                    borderRadius: "var(--radius-xl)",
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "var(--radius-full)",
                      background: "var(--color-border-default)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)",
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-secondary)", fontSize: "var(--text-base)" }}>Upload locked</p>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>Complete your work log to reach 100%</p>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "var(--space-3)",
                      background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)",
                      borderRadius: "var(--radius-lg)", padding: "var(--space-3) var(--space-5)",
                    }}>
                      <div style={{ position: "relative", width: 40, height: 40 }}>
                        <ProgressRing progress={project.progress ?? 0}/>
                        <span style={{
                          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "9px", fontWeight: "bold", color: "var(--color-text-primary)",
                        }}>{project.progress ?? 0}%</span>
                      </div>
                      <div>
                        <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>{project.progress ?? 0}% complete</p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Log more work on the right →</p>
                      </div>
                    </div>
                  </div>
                )
              ) : isImage ? (
                <div style={{ padding: "var(--space-4)" }}>
                  <ImageViewer project={project} annotations={currentAnnotations}/>
                </div>
              ) : (
                <VideoViewer project={project} annotations={currentAnnotations}/>
              )}
            </div>

            {/* -- Action buttons row -- */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>

              {/* Generate / show token — only once */}
              {!token ? (
                <button
                  className="btn btn--secondary"
                  onClick={handleGenerateToken}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  Generate client link
                </button>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-surface-alt)", border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)", flex: 1, minWidth: 0, maxWidth: 420,
                }}>
                  <code style={{
                    fontSize: "var(--text-xs)", color: "var(--color-primary)",
                    fontFamily: "var(--font-mono)", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                  }}>
                    {reviewUrl}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    style={{
                      background: copied ? "var(--color-primary)" : "none",
                      border: "none", cursor: "pointer",
                      color: copied ? "#fff" : "var(--color-text-muted)",
                      padding: "4px 8px", borderRadius: "var(--radius-sm)",
                      display: "flex", alignItems: "center", gap: "4px",
                      fontSize: "11px", fontWeight: "var(--font-medium)",
                      transition: "all var(--transition-fast)", flexShrink: 0,
                    }}
                    title="Copy link"
                  >
                    <CopyIcon />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}

              {/* Upload next revision — only when all tasks resolved */}
              {canUploadRevision && (
                <CldUploadWidget
                  uploadPreset={uploadPreset}
                  options={uploadOptions}
                  onSuccess={(res) => handleNextRevisionUploaded(res.info.secure_url)}
                >
                  {({ open }) => (
                    <button
                      className="btn btn--primary"
                      onClick={() => open()}
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                      <UploadIcon />
                      {currentRevision >= maxRevisions ? "Upload final delivery" : `Upload revision ${currentRevision + 1}`}
                    </button>
                  )}
                </CldUploadWidget>
              )}

              {/* Waiting on client feedback */}
              {project.mediaUrl && !canUploadRevision && totalTasks > 0 && !allResolved && (
                <span style={{
                  fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontStyle: "italic",
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Resolve all tasks to unlock {currentRevision >= maxRevisions ? "final delivery" : "next upload"}
                </span>
              )}

              {/* Max revisions reached — only after final delivery upload */}
              {project.mediaUrl && currentRevision > maxRevisions && (
                <span className="badge badge--delivered" style={{ padding: "var(--space-2) var(--space-4)" }}>
                  Final delivery uploaded
                </span>
              )}
            </div>
          </div>

          {/* -- Right sidebar -- */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", minWidth: 0 }}>
            {!project.mediaUrl ? (
              isImage ? (
                <RevisionChecklist
                  project={project}
                  onProgressUpdate={handleChecklistUpdate}
                />
              ) : (
                <WorkLogPanel
                  project={project}
                  loggedSeconds={project.loggedSeconds ?? 0}
                  workLog={project.workLog ?? []}
                  onProgressUpdate={onProgressUpdate}
                />
              )
            ) : (
              <AnnotationTodo
                annotations={currentAnnotations}
                onToggleResolved={handleToggleResolved}
              />
            )}
          </aside>

        </div>
      </main>
    </div>
  );
}
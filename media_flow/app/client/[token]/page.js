"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useTheme }                  from "../../theme-provider";
import { db }                        from "../../lib/firebase";
import {
  doc, getDoc, updateDoc,
  collection, addDoc,
  onSnapshot, query,
  orderBy, serverTimestamp,
} from "firebase/firestore";
import ImageAnnotator from "./_components/ImageAnnotator";
import VideoAnnotator from "./_components/VideoAnnotator";

/* -- Icons ---------------------------------------------------------------- */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function ProgressRing({ progress = 0, size = 52, stroke = 4 }) {
  const clamped = Math.min(100, Math.max(0, progress));
  const r       = (size - stroke * 2) / 2;
  const circ    = 2 * Math.PI * r;
  const offset  = circ - (clamped / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-border-default)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-primary)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

/* -- Confirm Modal -------------------------------------------------------- */
function ConfirmSubmitModal({ annotationCount, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "var(--space-4)",
    }}>
      <div style={{
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-xl)",
        border: "2px solid rgba(234,88,12,0.45)",
        maxWidth: 460, width: "100%",
        boxShadow: "0 0 0 1px rgba(234,88,12,0.12), 0 32px 80px rgba(0,0,0,0.40)",
        overflow: "hidden",
      }}>
        {/* Top accent bar */}
        <div style={{ height: 5, background: "linear-gradient(90deg, #C2410C, #EA580C, #FB923C)" }} />

        <div style={{ padding: "var(--space-7)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          {/* Icon + heading */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", textAlign: "center" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "var(--radius-full)",
              background: "rgba(234,88,12,0.12)",
              border: "2px solid rgba(234,88,12,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
            </div>
            <div>
              <p style={{
                fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)",
                color: "var(--color-text-primary)", margin: 0,
              }}>
                Submit feedback?
              </p>
              <p style={{
                fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                marginTop: "var(--space-1)", lineHeight: "1.6",
              }}>
                You have{" "}
                <span style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                  {annotationCount} annotation{annotationCount !== 1 ? "s" : ""}
                </span>{" "}ready to send to your editor.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--color-border-default)" }} />

          {/* Warning box */}
          <div style={{
            display: "flex", gap: "var(--space-3)", alignItems: "flex-start",
            background: "rgba(234,88,12,0.07)",
            border: "1.5px solid rgba(234,88,12,0.3)",
            borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontSize: "var(--text-sm)", color: "#EA580C", lineHeight: "1.55", margin: 0 }}>
              Once submitted, <strong>annotation tools will be locked</strong> until your editor uploads the next revision.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              className="btn btn--ghost"
              onClick={onCancel}
              style={{ flex: 1, justifyContent: "center", border: "1.5px solid var(--color-border-default)" }}
            >
              Cancel
            </button>
            <button
              className="btn btn--primary"
              onClick={onConfirm}
              style={{
                flex: 1, justifyContent: "center",
                background: "#EA580C", borderColor: "#EA580C",
                display: "flex", alignItems: "center", gap: "var(--space-2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
              Send feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Mark Final Modal -------------------------------------------------------- */
function MarkFinalModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: "var(--space-4)",
    }}>
      <div style={{
        background: "var(--color-bg-surface)", borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border-default)", padding: "var(--space-7)",
        maxWidth: 400, width: "100%", display: "flex", flexDirection: "column",
        gap: "var(--space-4)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-full)",
            background: "rgba(16,185,129,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <CheckCircleIcon />
          </div>
          <div>
            <p style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", fontSize: "var(--text-base)", marginBottom: "var(--space-1)" }}>
              Mark as final?
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "1.55" }}>
              This confirms you're happy with this draft. You'll be able to <strong>download the file</strong> once marked as final. This action cannot be undone.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={onConfirm}
            style={{ background: "#10B981", borderColor: "#10B981" }}>
            ✓ Mark as final
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- Page ----------------------------------------------------------------- */
export default function ClientReviewPage({ params }) {
  const { token }                    = use(params);
  const { darkMode, toggleDarkMode } = useTheme();

  const [tokenData,         setTokenData]         = useState(null);
  const [projectData,       setProjectData]        = useState(null);
  const [annotations,       setAnnotations]        = useState([]);
  const [status,            setStatus]             = useState("loading");
  const [submitted,         setSubmitted]          = useState(false);
  const [hasEverSubmitted,  setHasEverSubmitted]   = useState(false);
  const [showConfirmModal,  setShowConfirmModal]   = useState(false);
  const [showFinalModal,    setShowFinalModal]     = useState(false);
  const [isFinal,           setIsFinal]            = useState(false);
  const [currentRevision,   setCurrentRevision]    = useState(1);

  /* -- Load token doc from Firestore ------------------------------------ */
  useEffect(() => {
    async function loadToken() {
      try {
        const snap = await getDoc(doc(db, "tokens", token));
        if (!snap.exists()) { setStatus("invalid"); return; }
        const data = snap.data();
        setTokenData(data);
        setSubmitted(!!data.clientSubmittedAt);
        setHasEverSubmitted(!!data.hasEverSubmitted);
        setIsFinal(!!data.markedFinal);
        setCurrentRevision(data.currentRevision ?? 1);

        setStatus("ready");
      } catch (err) {
        console.error("Token load error:", err);
        setStatus("invalid");
      }
    }
    loadToken();
  }, [token]);

  /* -- Subscribe to token doc live (catches mediaUrl updates from editor) -- */
  useEffect(() => {
    if (!token) return;
    const unsub = onSnapshot(doc(db, "tokens", token), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTokenData(data);
        setSubmitted(!!data.clientSubmittedAt);
        setHasEverSubmitted(!!data.hasEverSubmitted);
        setIsFinal(!!data.markedFinal);
        setCurrentRevision(data.currentRevision ?? 1);
      }
    });
    return () => unsub();
  }, [token]);

  /* -- Subscribe to project doc in real-time (progress, status, etc.) -- */
  useEffect(() => {
    if (!tokenData?.projectId) return;
    const unsub = onSnapshot(doc(db, "projects", tokenData.projectId), (snap) => {
      if (snap.exists()) setProjectData({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [tokenData?.projectId]);

  /* -- Subscribe to annotations in real-time ---------------------------- */
  useEffect(() => {
    if (!tokenData?.projectId) return;
    const q = query(
      collection(db, "projects", tokenData.projectId, "annotations"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      // Spread data first, then override id with the Firestore string doc ID.
      // Prevents the locally-generated numeric id stored in the document from
      // overriding the real Firestore document ID.
      setAnnotations(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, [tokenData?.projectId]);

  /* -- Current revision annotations (only this round) ------------------- */
  const currentRevisionAnnotations = annotations.filter(
    // annotations are saved at (currentRevision + 1) while annotating;
    // after submit, currentRevision bumps to that value — filter stays consistent.
    (a) => (a.revision ?? 1) === (submitted ? currentRevision : currentRevision + 1)
  );

  /* -- Save annotation to Firestore ------------------------------------- */
  const handleAnnotationSave = async (annotation) => {
    if (!tokenData?.projectId || submitted || isFinal) return;
    // Strip the locally-generated numeric id — Firestore will assign its own
    // string document ID. Keeping the numeric id would overwrite the real doc
    // ID when the snapshot is read back with { ...d.data(), id: d.id }.
    // eslint-disable-next-line no-unused-vars
    const { id: _localId, ...annotationData } = annotation;
    await addDoc(
      collection(db, "projects", tokenData.projectId, "annotations"),
      {
        ...annotationData,
        token,
        revision:  currentRevision + 1,  // round being annotated; bumps to this on submit
        createdAt: serverTimestamp(),
      }
    );
  };

  /* -- Submit all feedback ---------------------------------------------- */
  const handleSubmitConfirmed = async () => {
    setShowConfirmModal(false);
    // Revision increments HERE — when client sends feedback — not on editor upload.
    const nextRevision = currentRevision + 1;
    try {
      await updateDoc(doc(db, "tokens", token), {
        clientSubmittedAt: serverTimestamp(),
        hasEverSubmitted:  true,
        currentRevision:   nextRevision,
      });
      // Also update project status and revision
      if (tokenData?.projectId) {
        await updateDoc(doc(db, "projects", tokenData.projectId), {
          status:            "Needs Action",
          currentRevision:   nextRevision,
          clientSubmittedAt: serverTimestamp(),
        });
      }
    } catch (e) { console.error(e); }
    setSubmitted(true);
  };

  /* -- Mark as final ---------------------------------------------------- */
  const handleMarkFinalConfirmed = async () => {
    setShowFinalModal(false);
    try {
      await updateDoc(doc(db, "tokens", token), { markedFinal: true, markedFinalAt: serverTimestamp() });
      if (tokenData?.projectId) {
        await updateDoc(doc(db, "projects", tokenData.projectId), {
          status: "Delivered", markedFinal: true,
        });
      }
    } catch (e) { console.error(e); }
    setIsFinal(true);
  };

  /* -- Download --------------------------------------------------------- */
  const handleDownload = async () => {
    if (!isFinal || !mediaUrl) return;
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `${tokenData.projectName || "file"}_final`;
    link.target = "_blank";
    link.click();
  };

  /* -- Derived ---------------------------------------------------------- */
  const maxRevisions   = projectData?.maxRevisions ?? tokenData?.maxRevisions ?? 3;
  // After submitting round N, currentRevision becomes N+1.
  // reachedMax when that next value exceeds the allowed maximum.
  const reachedMax     = submitted && currentRevision > maxRevisions;
  // Use projectData.mediaUrl as source of truth (most up to date), fall back to token
  const mediaUrl       = projectData?.mediaUrl ?? tokenData?.mediaUrl ?? null;
  const canAnnotate    = !!mediaUrl && !submitted && !isFinal && !reachedMax;
  // Display: when actively annotating show the round they're ON (currentRevision + 1),
  // when submitted show the round they just completed (currentRevision).
  const displayRevision = submitted ? currentRevision : currentRevision + 1;
  const annotationCount = currentRevisionAnnotations.length;

  // Task-based progress: annotations submitted = tasks for editor
  const totalTasks     = currentRevisionAnnotations.length;
  const resolvedTasks  = currentRevisionAnnotations.filter(a => a.resolved).length;
  const taskProgress   = submitted && totalTasks > 0
    ? Math.round((resolvedTasks / totalTasks) * 100)
    : submitted ? 100 : (tokenData?.progress ?? 0);

  /* -- States ----------------------------------------------------------- */
  if (status === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "var(--color-text-muted)",
        fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
      }}>
        Loading review…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100vh", gap: "var(--space-3)", fontFamily: "var(--font-sans)",
      }}>
        <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
          Invalid or expired link
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Please ask your editor to generate a new token.
        </p>
      </div>
    );
  }

  const isVideo = tokenData.projectType === "video";

  return (
    <div className="app-shell">

      {/* Modals */}
      {showConfirmModal && (
        <ConfirmSubmitModal
          annotationCount={annotationCount}
          onConfirm={handleSubmitConfirmed}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {showFinalModal && (
        <MarkFinalModal
          onConfirm={handleMarkFinalConfirmed}
          onCancel={() => setShowFinalModal(false)}
        />
      )}

      {/* -- Header -- */}
      <header className="app-header">
        <div>
          <p style={{
            fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)",
            color: "var(--color-text-primary)", margin: 0,
          }}>
            {tokenData.projectName}
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: 0 }}>
            Review for {tokenData.client}
            {hasEverSubmitted && ` · Revision ${displayRevision} of ${maxRevisions}`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {/* Progress ring (task-based after submit) */}
          {tokenData.mediaUrl && (
            <div style={{ position: "relative", width: 52, height: 52 }}>
              <ProgressRing progress={taskProgress} />
              <span style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: "bold", color: "var(--color-text-primary)",
              }}>
                {taskProgress}%
              </span>
            </div>
          )}

          {/* Status badges */}
          {isFinal ? (
            <span className="badge badge--delivered">✓ Final</span>
          ) : submitted ? (
            <span className="badge badge--needs-action">Awaiting revision</span>
          ) : mediaUrl ? (
            <span className="badge badge--draft">Draft ready</span>
          ) : (
            <span className="badge badge--draft">
                  {projectData?.progress ?? tokenData?.progress ?? 0}% complete
                </span>
          )}

          {/* Progress bar */}
          {mediaUrl && (
            <div style={{ width: 120 }}>
              <div className="header-progress__bar">
                <div
                  className="header-progress__fill"
                  style={{ width: `${taskProgress}%`, transition: "width 0.4s ease" }}
                />
              </div>
            </div>
          )}

          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 10px", borderRadius: "var(--radius-full)",
              background: "var(--color-bg-surface-alt)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)", cursor: "pointer",
              fontSize: "var(--text-xs)", transition: "all var(--transition-fast)",
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* -- Main -- */}
      <main className="app-main" style={{ overflowY: "auto" }}>
        <div className="editor-grid">

          {/* -- Left: annotator (scrollable) -- */}
          <div style={{ minWidth: 0 }}>
            {!mediaUrl ? (
              <div className="card" style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                minHeight: "360px", gap: "var(--space-5)", textAlign: "center",
                padding: "var(--space-8)",
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <div>
                  <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                    Your editor is still working
                  </p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    Check back soon — progress updates in real time.
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ width: "100%", maxWidth: 340 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Progress</span>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                      {projectData?.progress ?? tokenData?.progress ?? 0}%
                    </span>
                  </div>
                  <div style={{
                    height: 8, background: "var(--color-border-default)",
                    borderRadius: "var(--radius-full)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${projectData?.progress ?? tokenData?.progress ?? 0}%`,
                      background: "var(--color-primary)",
                      borderRadius: "var(--radius-full)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              </div>
            ) : isVideo ? (
              <VideoAnnotator
                videoUrl={mediaUrl}
                projectName={tokenData.projectName}
                clientName={tokenData.client}
                annotations={currentRevisionAnnotations}
                onAnnotationSave={handleAnnotationSave}
                locked={!canAnnotate}
                lockedReason={
                  isFinal       ? "final"   :
                  reachedMax    ? "maxRevisions" :
                  submitted     ? "submitted" : null
                }
              />
            ) : (
              <ImageAnnotator
                imageUrl={mediaUrl}
                projectName={tokenData.projectName}
                annotations={currentRevisionAnnotations}
                onAnnotationSave={handleAnnotationSave}
                locked={!canAnnotate}
                lockedReason={
                  isFinal       ? "final"   :
                  reachedMax    ? "maxRevisions" :
                  submitted     ? "submitted" : null
                }
              />
            )}
          </div>

          {/* -- Right: sidebar -- */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* Project info */}
            <div className="card">
              <p className="card-section-label">Project details</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[
                  ["Type",        isVideo ? "Video" : "Image"],
                  ...(hasEverSubmitted ? [["Revision", `${displayRevision} of ${maxRevisions}`]] : []),
                  ["Annotations", `${annotationCount}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{label}</span>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to annotate — only if can annotate */}
            {canAnnotate && (
              <div className="card">
                <p className="card-section-label">How to annotate</p>
                {isVideo ? (
                  <ul style={{
                    fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    paddingLeft: "var(--space-4)",
                  }}>
                    <li><strong>Mark frame</strong> — flag an exact moment</li>
                    <li><strong>Mark range</strong> — flag a duration</li>
                    <li>Add a comment and save</li>
                  </ul>
                ) : (
                  <ul style={{
                    fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    paddingLeft: "var(--space-4)",
                  }}>
                    <li><strong>Draw region</strong> — drag an oval over an area</li>
                    <li><strong>Drop pin</strong> — click to mark a spot</li>
                    <li>Add a comment and save</li>
                  </ul>
                )}
              </div>
            )}

            {/* Locked state notice */}
            {submitted && !isFinal && !reachedMax && (
              <div style={{
                background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.25)",
                borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
                fontSize: "var(--text-sm)", color: "#EA580C", lineHeight: "1.5",
              }}>
                <strong>Annotations locked.</strong> Waiting for your editor to upload revision {currentRevision + 1}.
                You'll be able to annotate again once the next draft is ready.
              </div>
            )}

            {reachedMax && !isFinal && (
              <div style={{
                background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)",
                borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
                fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "1.5",
              }}>
                <strong>Max revisions reached.</strong> No more annotations can be added. Please mark the project as final or contact your editor.
              </div>
            )}

            {/* Action card */}
            {mediaUrl && (
              <div className="card">
                {isFinal ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", textAlign: "center" }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
                      color: "#10B981", fontWeight: "var(--font-semibold)",
                    }}>
                      <CheckCircleIcon />
                      <span>Marked as final</span>
                    </div>
                    <button
                      className="btn btn--primary"
                      onClick={handleDownload}
                      style={{ width: "100%", justifyContent: "center", background: "#10B981", borderColor: "#10B981", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                      <DownloadIcon />
                      Download file
                    </button>
                  </div>

                ) : submitted ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                        ✓ Feedback submitted
                      </p>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        Your editor has been notified.
                      </p>
                    </div>
                    {!reachedMax && (
                      <button
                        className="btn btn--ghost"
                        onClick={() => setShowFinalModal(true)}
                        style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                      >
                        <CheckCircleIcon />
                        Happy with this draft? Mark as final
                      </button>
                    )}
                    {reachedMax && (
                      <button
                        className="btn btn--primary"
                        onClick={() => setShowFinalModal(true)}
                        style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "var(--space-2)", background: "#10B981", borderColor: "#10B981" }}
                      >
                        <CheckCircleIcon />
                        Mark as final & download
                      </button>
                    )}
                  </div>

                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "1.5" }}>
                      Done reviewing? Submit your feedback to notify your editor.
                    </p>
                    <button
                      className="btn btn--primary"
                      onClick={() => setShowConfirmModal(true)}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Submit feedback ({annotationCount})
                    </button>
                    <button
                      className="btn btn--ghost"
                      onClick={() => setShowFinalModal(true)}
                      style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}
                    >
                      <CheckCircleIcon />
                      No changes needed — mark as final
                    </button>
                  </div>
                )}
              </div>
            )}

          </aside>
        </div>
      </main>
    </div>
  );
}
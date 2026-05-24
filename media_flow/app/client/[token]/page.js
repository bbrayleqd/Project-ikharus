"use client";

import { use, useState, useEffect } from "react";
import { useTheme }                  from "../../theme-provider";
import { db }                        from "../../lib/firebase";
import {
  doc, getDoc,
  collection, addDoc,
  onSnapshot, query,
  orderBy, serverTimestamp,
}                                    from "firebase/firestore";
import ImageAnnotator from "./_components/ImageAnnotator";
import VideoAnnotator from "./_components/VideoAnnotator";

/* -- Icons ---------------------------------------------------------------- */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
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

/* -- Page ----------------------------------------------------------------- */
export default function ClientReviewPage({ params }) {
  const { token }                    = use(params);
  const { darkMode, toggleDarkMode } = useTheme();

  const [tokenData,    setTokenData]    = useState(null);  // data from tokens/{token}
  const [annotations,  setAnnotations]  = useState([]);
  const [status,       setStatus]       = useState("loading"); // loading | ready | invalid
  const [submitted,    setSubmitted]    = useState(false);

  /* -- Load token doc from Firestore ------------------------------------ */
  useEffect(() => {
    async function loadToken() {
      try {
        const snap = await getDoc(doc(db, "tokens", token));
        if (!snap.exists()) {
          setStatus("invalid");
          return;
        }
        setTokenData(snap.data());
        setStatus("ready");
      } catch (err) {
        console.error("Token load error:", err);
        setStatus("invalid");
      }
    }
    loadToken();
  }, [token]);

  /* -- Subscribe to annotations in real-time ---------------------------- */
  useEffect(() => {
    if (!tokenData?.projectId) return;

    const q = query(
      collection(db, "projects", tokenData.projectId, "annotations"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setAnnotations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [tokenData?.projectId]);

  /* -- Save annotation to Firestore ------------------------------------- */
  const handleAnnotationSave = async (annotation) => {
    if (!tokenData?.projectId) return;
    await addDoc(
      collection(db, "projects", tokenData.projectId, "annotations"),
      {
        ...annotation,
        token:     token,
        createdAt: serverTimestamp(),
      }
    );
    // onSnapshot above updates annotations automatically
  };

  /* -- Submit all feedback ---------------------------------------------- */
  const handleSubmit = () => {
    // All annotations are already saved live — "submit" just
    // confirms to the client that they're done.
    // TODO: optionally update a "clientSubmittedAt" field on the token doc.
    setSubmitted(true);
  };

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
        height: "100vh", gap: "var(--space-3)",
        fontFamily: "var(--font-sans)",
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

      {/* -- Header -- */}
      <header className="app-header">
        <div>
          <p style={{
            fontSize:   "var(--text-lg)",
            fontWeight: "var(--font-semibold)",
            color:      "var(--color-text-primary)",
            margin:     0,
          }}>
            {tokenData.projectName}
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: 0 }}>
            Review for {tokenData.client}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {/* Progress pill */}
          {tokenData.mediaUrl ? (
            <span className="badge badge--delivered">Draft ready</span>
          ) : (
            <span className="badge badge--draft">
              {tokenData.progress}% complete
            </span>
          )}

          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 10px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg-surface-alt)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "var(--text-xs)",
              transition: "all var(--transition-fast)",
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* -- Main -- */}
      <main className="app-main">
        <div className="editor-grid">

          {/* -- Left: annotator -- */}
          <div>
            {!tokenData.mediaUrl ? (
              /* No upload yet — show progress state */
              <div className="card" style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                minHeight:      "360px",
                gap:            "var(--space-4)",
                textAlign:      "center",
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                  Your editor is still working
                </p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  {tokenData.progress}% complete — check back soon.
                </p>
              </div>
            ) : isVideo ? (
              <VideoAnnotator
                videoUrl={tokenData.mediaUrl}
                projectName={tokenData.projectName}
                clientName={tokenData.client}
                annotations={annotations}
                onAnnotationSave={handleAnnotationSave}
              />
            ) : (
              <ImageAnnotator
                imageUrl={tokenData.mediaUrl}
                projectName={tokenData.projectName}
                annotations={annotations}
                onAnnotationSave={handleAnnotationSave}
              />
            )}
          </div>

          {/* -- Right: sidebar -- */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* Project info card */}
            <div className="card">
              <p className="card-section-label">Project details</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Type</span>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
                    {isVideo ? "Video" : "Image"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Annotations</span>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
                    {annotations.length}
                  </span>
                </div>
              </div>
            </div>

            {/* How to annotate card */}
            {tokenData.mediaUrl && !submitted && (
              <div className="card">
                <p className="card-section-label">How to annotate</p>
                {isVideo ? (
                  <ul style={{
                    fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    paddingLeft: "var(--space-4)",
                  }}>
                    <li><strong>Mark frame</strong> — click the timeline to flag an exact moment</li>
                    <li><strong>Mark range</strong> — click twice to flag a duration</li>
                    <li>Add a comment and save</li>
                  </ul>
                ) : (
                  <ul style={{
                    fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    paddingLeft: "var(--space-4)",
                  }}>
                    <li><strong>Draw region</strong> — drag an oval over an area</li>
                    <li><strong>Drop pin</strong> — click to mark an exact spot</li>
                    <li>Add a comment and save</li>
                  </ul>
                )}
              </div>
            )}

            {/* Submit button */}
            {tokenData.mediaUrl && (
              <div className="card">
                {submitted ? (
                  <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
                    <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
                      ✓ Feedback submitted
                    </p>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                      Your editor has been notified.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)", lineHeight: "1.5" }}>
                      Done reviewing? Submit your feedback to notify your editor.
                    </p>
                    <button
                      className="btn btn--primary"
                      onClick={handleSubmit}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Submit feedback
                    </button>
                  </>
                )}
              </div>
            )}

          </aside>
        </div>
      </main>
    </div>
  );
}
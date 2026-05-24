"use client";

import { useState, useEffect }          from "react";
import { useUser, UserButton }          from "@clerk/nextjs";
import { useTheme }                     from "../../theme-provider";
import { db }                           from "../../lib/firebase";
import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where,
  serverTimestamp,
}                                        from "firebase/firestore";

import ProjectCard        from "./_components/ProjectCard";
import EmptyState         from "./_components/EmptyState";
import DeadlineItem       from "./_components/DeadlineItem";
import CreateProjectModal from "./_components/CreateProjectModal";
import EditorView         from "./_components/EditorView";

/* -- Icons ---------------------------------------------------------------- */
function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"   />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* -- Root Page ------------------------------------------------------------ */
export default function DashboardPage() {
  const { user }                              = useUser();
  const { darkMode, toggleDarkMode }          = useTheme();

  const [view, setView]                       = useState("dashboard");
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [projectToEdit, setProjectToEdit]     = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects]               = useState([]);
  const [deadlineFilter, setDeadlineFilter]   = useState(null);
  const [loading, setLoading]                 = useState(true);

  /* -- Load projects from Firestore in real-time ------------------------ */
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "projects"),
      where("editorId", "==", user.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjects(loaded);

      // Keep selectedProject in sync if editor view is open
      setSelectedProject((prev) => {
        if (!prev) return prev;
        const updated = loaded.find((p) => p.id === prev.id);
        return updated ?? prev;
      });

      setLoading(false);
    });

    return () => unsub();
  }, [user?.id]);

  /* -- Handlers --------------------------------------------------------- */

  const handleCreate = async (formData) => {
    if (projectToEdit) {
      await updateDoc(doc(db, "projects", projectToEdit.id), {
        name:            formData.name,
        client:          formData.client,
        projectType:     formData.projectType,
        deadline:        formData.deadline,
        maxRevisions:    formData.maxRevisions,
        maxDurationMins: formData.maxDurationMins,
        maxDurationSecs: formData.maxDurationSecs,
      });
    } else {
      await addDoc(collection(db, "projects"), {
        name:            formData.name,
        client:          formData.client,
        projectType:     formData.projectType,
        deadline:        formData.deadline     ?? "",
        maxRevisions:    formData.maxRevisions ?? 3,
        maxDurationMins: formData.maxDurationMins ?? 0,
        maxDurationSecs: formData.maxDurationSecs ?? 0,
        progress:        0,
        loggedSeconds:   0,
        workLog:         [],
        tasks:           [],
        annotations:     [],
        mediaUrl:        null,
        version:         "v1",
        status:          "In Progress",
        editorId:        user.id,
        createdAt:       serverTimestamp(),
      });
    }
    setIsModalOpen(false);
    setProjectToEdit(null);
  };

  const handleEdit = (project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    await deleteDoc(doc(db, "projects", id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
      setView("dashboard");
    }
  };

  const handleProgressUpdate = async (newProgress, patch = {}) => {
    if (!selectedProject) return;
    const newStatus = newProgress >= 100 ? "Awaiting Upload" : "In Progress";
    await updateDoc(doc(db, "projects", selectedProject.id), {
      progress: newProgress,
      status:   newStatus,
      ...patch,
    });
  };

  const handleMediaUploaded = async (url) => {
    if (!selectedProject) return;
    await updateDoc(doc(db, "projects", selectedProject.id), {
      mediaUrl: url,
      status:   "Needs Action",
    });
    setView("dashboard");
  };

  const openProject = (project) => {
    setSelectedProject(project);
    setView("editor");
  };

  /* -- Editor view ------------------------------------------------------- */
  if (view === "editor" && selectedProject) {
    return (
      <EditorView
        project={selectedProject}
        onBack={() => setView("dashboard")}
        onProgressUpdate={handleProgressUpdate}
        onMediaUploaded={handleMediaUploaded}
      />
    );
  }

  /* -- Dashboard view ---------------------------------------------------- */
  const filteredProjects = deadlineFilter
    ? projects.filter((p) => p.id === deadlineFilter)
    : projects;

  return (
    <div className="app-shell">

      <header className="app-header">
        <a href="/" className="app-header__logo" aria-label="MediaFlow home">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15"
              stroke="var(--color-primary)" strokeWidth="2"
              fill="var(--color-primary-glow)" />
            <path d="M13 10.5l8 5.5-8 5.5V10.5z" fill="var(--color-primary)" />
          </svg>
          <span>
            <span className="brand-media">Media</span>
            <span className="brand-flow">Flow</span>
          </span>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg-surface-alt)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-medium)",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-default)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <p style={{
              fontSize: "var(--text-base)",
              color: "var(--color-text-secondary)",
              margin: 0, lineHeight: 1,
            }}>
              Hello,{" "}
              <span style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                {user?.firstName ?? "Editor"}!
              </span>
            </p>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1fr 260px",
          gap:                 "var(--space-6)",
          alignItems:          "start",
        }}>

          <section className="card" style={{ position: "relative", minHeight: "60vh" }}>
            <p className="card-section-label">Active projects</p>

            {loading ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "200px", color: "var(--color-text-muted)",
                fontSize: "var(--text-sm)",
              }}>
                Loading projects…
              </div>
            ) : projects.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap:                 "var(--space-5)",
              }}>
                {filteredProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    onClick={() => openProject(proj)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            <button
              className="btn--fab"
              onClick={() => setIsModalOpen(true)}
              aria-label="Create new project"
              style={{
                position: "absolute",
                bottom: "var(--space-8)", right: "var(--space-8)",
                display: "flex", alignItems: "center",
                justifyContent: "center", padding: 0, lineHeight: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ display: "block" }}>
                <line x1="12" y1="5"  x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </section>

          <aside className="card">
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "var(--space-3)",
            }}>
              <p className="card-section-label" style={{ margin: 0 }}>Upcoming deadlines</p>
              {deadlineFilter && (
                <button
                  onClick={() => setDeadlineFilter(null)}
                  style={{
                    fontSize: "var(--text-xs)", color: "var(--color-primary)",
                    background: "none", border: "none",
                    cursor: "pointer", padding: 0,
                    fontWeight: "var(--font-semibold)",
                  }}
                >
                  Clear filter
                </button>
              )}
            </div>

            {projects.length === 0 ? (
              <p style={{
                fontSize: "var(--text-sm)", color: "var(--color-text-muted)",
                fontStyle: "italic", marginTop: "var(--space-3)",
              }}>
                No upcoming deadlines.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {[...projects]
                  .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"))
                  .slice(0, 8)
                  .map((proj) => (
                    <DeadlineItem
                      key={proj.id}
                      project={proj}
                      isActive={deadlineFilter === proj.id}
                      onClick={() => setDeadlineFilter(proj.id)}
                    />
                  ))}
              </div>
            )}
          </aside>

        </div>
      </main>

      {isModalOpen && (
        <CreateProjectModal
          onClose={() => {
            setIsModalOpen(false);
            setProjectToEdit(null);
          }}
          onCreate={handleCreate}
          initialData={projectToEdit}
        />
      )}
    </div>
  );
}
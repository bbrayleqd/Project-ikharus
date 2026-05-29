"use client";
/**
 * _components/ProjectCard.jsx
 * Single project tile in the Active Projects grid.
 * Shows a video or image badge based on projectType.
 */

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

function ProgressRing({ progress = 0, size = 52, stroke = 4 }) {
  const clamped = Math.min(100, Math.max(0, progress));
  const r       = (size - stroke * 2) / 2;
  const circ    = 2 * Math.PI * r;
  const offset  = circ - (clamped / 100) * circ;
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="progress-ring"
      aria-label={`${progress}% complete`}
    >
      <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={r} />
      <circle
        className="progress-ring__fill"
        cx={size / 2} cy={size / 2} r={r}
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/** Video camera icon */
function VideoIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

/** Image mountain icon */
function ImageIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/** Thumbnail placeholder when no media has been uploaded yet */
function MediaPlaceholder({ projectType }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-bg-surface-alt)",
    }}>
      {projectType === "image" ? (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.2"
          style={{ color: "var(--color-border-default)" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ) : (
        <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor"
          style={{ color: "var(--color-border-default)" }}>
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
        </svg>
      )}
    </div>
  );
}

/** Edit pencil icon */
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/** Delete trash icon */
function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * @param {{ project: Project, onClick: () => void, onEdit: (p: Project) => void, onDelete: (id: string) => void }} props
 */
export default function ProjectCard({ project, onClick, onEdit, onDelete }) {
  const isImage = project.projectType === "image";

  return (
    <article
      className="card-tile"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Open project ${project.name}`}
    >
      {/* -- Actions menu (visible on hover via CSS) -- */}
      <div className="card-tile__actions">
        <button
          className="card-tile__btn"
          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
          title="Edit Project"
        >
          <EditIcon />
        </button>
        <button
          className="card-tile__btn card-tile__btn--delete"
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          title="Delete Project"
        >
          <DeleteIcon />
        </button>
      </div>

      {/* -- Thumbnail -- */}
      <div className="project-card__thumbnail">
        {project.mediaUrl ? (
          isImage ? (
            <img
              src={project.mediaUrl}
              alt={`${project.name} preview`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <video
              src={`${project.mediaUrl}#t=0.5`}
              muted
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <MediaPlaceholder projectType={project.projectType} />
        )}

        

        {/* Project type badge — top-left */}
        <div style={{
          position:     "absolute",
          top:          "var(--space-2)",
          left:         "var(--space-2)",
          display:      "flex",
          alignItems:   "center",
          gap:          "var(--space-1)",
          padding:      "2px 8px",
          borderRadius: "var(--radius-full)",
          background:   isImage
            ? "rgba(124, 58, 237, 0.12)"   // purple tint for image
            : "rgba(45, 156, 219, 0.12)",  // blue tint for video
          color: isImage
            ? "#7C3AED"
            : "var(--color-primary)",
          fontSize:   "10px",
          fontWeight: "var(--font-bold)",
          boxShadow:  "var(--shadow-xs)",
        }}>
          {isImage ? <ImageIcon /> : <VideoIcon />}
          {isImage ? "Image" : "Video"}
        </div>
      </div>

      {/* -- Meta -- */}
      <div className="project-card__meta">
        <h3 className="project-card__name">{project.name}</h3>
        <p className="project-card__client">Client: {project.client}</p>

        {project.deadline && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-1)" }}>
            Deadline: {new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        {/* For image: show tasks completed count */}
        {isImage && project.tasks?.length > 0 && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            Tasks: {project.tasks.filter((t) => t.done).length} / {project.tasks.length} done
          </p>
        )}

        {!isImage && project.annotations > 0 && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            Annotations: {project.annotations}
          </p>
        )}
      </div>

      {/* -- Footer -- */}
      <div className="project-card__footer">
        <span className={statusBadgeClass(project.status)}>{project.status}</span>
        <span className="version-label">{project.version}</span>
      </div>
    </article>
  );
}
"use client";
/**
 * _components/RevisionChecklist.jsx
 * Pre-upload right-side panel for IMAGE projects.
 *
 * Replaces WorkLogPanel when projectType === "image".
 * Editor checks off tasks defined during project creation.
 * Progress = completedTasks / totalTasks (taskBasedProgress strategy).
 *
 * Design Pattern: Strategy — taskBasedProgress injected via prop.
 */

function taskBasedProgress(completedTasks, totalTasks) {
  if (!totalTasks || totalTasks <= 0) return 0;
  return Math.min(100, Math.round((completedTasks / totalTasks) * 100));
}

/**
 * @param {{
 *   project:          Project,
 *   onProgressUpdate: (progress: number, updatedTasks: Task[]) => void,
 *   strategy?:        (completed: number, total: number) => number,
 * }} props
 */
export default function RevisionChecklist({
  project,
  onProgressUpdate,
  strategy = taskBasedProgress,
}) {
  const tasks      = project.tasks ?? [];
  const completed  = tasks.filter((t) => t.done).length;
  const total      = tasks.length;
  const progress   = strategy(completed, total);
  const isComplete = progress >= 100;

  const handleToggle = (taskId) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    const newCompleted = updatedTasks.filter((t) => t.done).length;
    const newProgress  = strategy(newCompleted, total);
    onProgressUpdate(newProgress, updatedTasks);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* -- Progress summary -- */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: "var(--space-3)",
        }}>
          <p className="card-section-label" style={{ margin: 0 }}>Checklist progress</p>
          <span style={{
            fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)",
            color: isComplete
              ? "var(--color-status-delivered-text)"
              : "var(--color-primary)",
          }}>
            {completed} / {total} tasks
          </span>
        </div>

        {/* Linear progress bar */}
        <div className="header-progress__bar">
          <div
            className="header-progress__fill"
            style={{
              width:      `${progress}%`,
              background: isComplete
                ? "var(--color-status-delivered-text)"
                : "#7C3AED",   // purple for image projects
            }}
          />
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: "var(--space-2)",
          fontSize: "var(--text-xs)", color: "var(--color-text-muted)",
        }}>
          <span>{total - completed} remaining</span>
          <span style={{
            fontWeight: "var(--font-semibold)",
            color: isComplete
              ? "var(--color-status-delivered-text)"
              : "var(--color-text-secondary)",
          }}>
            {progress}%{isComplete && " — Ready to upload ✓"}
          </span>
        </div>
      </div>

      {/* -- Task checklist -- */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <p className="card-section-label">Tasks</p>

        {tasks.length === 0 ? (
          <p style={{
            fontSize: "var(--text-sm)", color: "var(--color-text-muted)",
            fontStyle: "italic", textAlign: "center", marginTop: "var(--space-4)",
          }}>
            No tasks defined.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {tasks.map((task) => (
              <label
                key={task.id}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "var(--space-3)",
                  padding:      "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background:   task.done
                    ? "var(--color-status-delivered-bg)"
                    : "var(--color-bg-surface-alt)",
                  border:       `1px solid ${task.done
                    ? "var(--color-status-delivered-text)"
                    : "var(--color-border-default)"}`,
                  cursor:       "pointer",
                  transition:   "all var(--transition-fast)",
                }}
              >
                {/* Custom checkbox */}
                <div
                  onClick={() => handleToggle(task.id)}
                  style={{
                    width:        20,
                    height:       20,
                    borderRadius: "var(--radius-sm)",
                    border:       `2px solid ${task.done ? "#7C3AED" : "var(--color-border-default)"}`,
                    background:   task.done ? "#7C3AED" : "transparent",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    flexShrink:   0,
                    transition:   "all var(--transition-fast)",
                  }}
                >
                  {task.done && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
                      stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </div>

                <span
                  onClick={() => handleToggle(task.id)}
                  style={{
                    fontSize:        "var(--text-sm)",
                    fontWeight:      "var(--font-medium)",
                    color:           task.done
                      ? "var(--color-status-delivered-text)"
                      : "var(--color-text-primary)",
                    textDecoration:  task.done ? "line-through" : "none",
                    flex:            1,
                    transition:      "all var(--transition-fast)",
                  }}
                >
                  {task.label}
                </span>

                {task.done && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-status-delivered-text)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
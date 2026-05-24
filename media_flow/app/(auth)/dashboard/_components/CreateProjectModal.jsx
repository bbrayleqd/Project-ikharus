"use client";
import { useState } from "react";

function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * _components/CreateProjectModal.jsx
 * Modal for creating or editing a project.
 * Switches between video and image fields based on projectType toggle.
 */
export default function CreateProjectModal({ onClose, onCreate, initialData }) {
  const [formData, setFormData] = useState({
    name:            initialData?.name ?? "",
    client:          initialData?.client ?? "",
    maxRevisions:    initialData?.maxRevisions ?? 3,
    projectType:     initialData?.projectType ?? "video",
    maxDurationMins: initialData?.maxDurationMins ?? "",
    maxDurationSecs: initialData?.maxDurationSecs ?? "",
    deadline:        initialData?.deadline ?? "",
  });



  const field = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      ...formData,
      maxDurationMins: parseInt(formData.maxDurationMins) || 0,
      maxDurationSecs: parseInt(formData.maxDurationSecs) || 0,
      maxRevisions:    parseInt(formData.maxRevisions)    || 3,
      tasks: [],
    });
  };

  const isVideo    = formData.projectType === "video";
  const totalSecs  = (parseInt(formData.maxDurationMins) || 0) * 60
                   + (parseInt(formData.maxDurationSecs) || 0);
  const baseFieldsFilled =
    formData.name.trim() !== "" &&
    formData.client.trim() !== "" &&
    formData.deadline !== "";
  const canSubmit = baseFieldsFilled && (isVideo ? totalSecs > 0 : true);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="modal__title" id="modal-title">
          {initialData ? "Edit project" : "New project"}
        </h2>

        <form onSubmit={handleSubmit}>

          {/* -- Project type toggle -- */}
          <div className="form-group">
            <label className="form-label">Project type</label>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>

              {/* Video button */}
              <button
                type="button"
                onClick={() => field("projectType", "video")}
                style={{
                  flex:         1,
                  padding:      "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border:       `2px solid ${isVideo ? "var(--color-primary)" : "var(--color-border-default)"}`,
                  background:   isVideo ? "var(--color-primary-glow)" : "var(--color-bg-surface-alt)",
                  color:        isVideo ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight:   "var(--font-semibold)",
                  fontSize:     "var(--text-sm)",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  gap:          "var(--space-2)",
                  cursor:       "pointer",
                  transition:   "all var(--transition-fast)",
                }}
              >
                {/* Video icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Video
              </button>

              {/* Image button */}
              <button
                type="button"
                onClick={() => field("projectType", "image")}
                style={{
                  flex:         1,
                  padding:      "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border:       `2px solid ${!isVideo ? "var(--color-primary)" : "var(--color-border-default)"}`,
                  background:   !isVideo ? "var(--color-primary-glow)" : "var(--color-bg-surface-alt)",
                  color:        !isVideo ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight:   "var(--font-semibold)",
                  fontSize:     "var(--text-sm)",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  gap:          "var(--space-2)",
                  cursor:       "pointer",
                  transition:   "all var(--transition-fast)",
                }}
              >
                {/* Image icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Image / Photo
              </button>

            </div>
          </div>

          {/* -- Project name -- */}
          <div className="form-group">
            <label className="form-label" htmlFor="proj-name">Project name</label>
            <input
              id="proj-name"
              className="form-input"
              type="text"
              required
              placeholder={isVideo ? "e.g. Wedding AVP" : "e.g. Brand Poster"}
              value={formData.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </div>

          {/* -- Client name -- */}
          <div className="form-group">
            <label className="form-label" htmlFor="client-name">Client name</label>
            <input
              id="client-name"
              className="form-input"
              type="text"
              required
              placeholder="e.g. John Doe"
              value={formData.client}
              onChange={(e) => field("client", e.target.value)}
            />
          </div>

          {/* -- Max revisions -- */}
          <div className="form-group">
            <label className="form-label" htmlFor="max-rev">Max revisions</label>
            <input
              id="max-rev"
              className="form-input"
              type="number"
              required
              min={1}
              max={20}
              value={formData.maxRevisions}
              onChange={(e) => field("maxRevisions", e.target.value)}
            />
            <span className="form-hint">How many revision rounds are included.</span>
          </div>

          {/* -- Deadline Date -- */}
          <div className="form-group">
            <label className="form-label" htmlFor="deadline">Deadline date</label>
            <input
              id="deadline"
              className="form-input"
              type="date"
              required
              value={formData.deadline}
              onChange={(e) => field("deadline", e.target.value)}
            />
            <span className="form-hint">When does this project need to be finished?</span>
          </div>

          {/* -- VIDEO: max work duration -- */}
          {isVideo && (
            <div className="form-group">
              <label className="form-label">Maximum work duration</label>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={formData.maxDurationMins}
                    onChange={(e) => field("maxDurationMins", e.target.value)}
                    aria-label="Minutes"
                  />
                </div>
                <span style={{
                  color: "var(--color-text-muted)",
                  fontWeight: "var(--font-semibold)",
                  fontSize: "var(--text-lg)",
                }}>:</span>
                <div style={{ flex: 1 }}>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    max={59}
                    placeholder="Sec"
                    value={formData.maxDurationSecs}
                    onChange={(e) => field("maxDurationSecs", e.target.value)}
                    aria-label="Seconds"
                  />
                </div>
              </div>
              <span className="form-hint">
                {totalSecs > 0
                  ? `Total: ${fmtDuration(totalSecs)}. Editor logs work until 100%.`
                  : "How long this edit takes. Unlocks upload when 100% is reached."}
              </span>
            </div>
          )}



          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!canSubmit}
              style={{
                opacity: !canSubmit ? 0.5 : 1,
                cursor:  !canSubmit ? "not-allowed" : "pointer",
              }}
            >
              {initialData ? "Save changes" : "Create project"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
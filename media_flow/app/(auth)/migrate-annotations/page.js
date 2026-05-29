"use client";
/**
 * One-time annotation migration page.
 *
 * Walks every image project owned by the signed-in editor, finds every annotation
 * stored as raw pixel coordinates (i.e. `_normalized` is not true), loads the image
 * to read its natural dimensions, and rewrites the annotation as a percentage of
 * those dimensions with `_normalized: true`.
 *
 * IMPORTANT — limitations of this migration:
 * Old annotations were saved as pixels of whatever <canvas> size the original
 * client browser happened to render the image at. That reference size is NOT
 * stored in the database, so a perfect recovery is impossible. This script uses
 * the image's natural (intrinsic) dimensions as the reference, which assumes the
 * original canvas was the natural image size. That is usually NOT true, so some
 * migrated annotations will land in the wrong spot. Review them in the editor
 * after migration; delete and re-request any that look obviously off.
 *
 * Safe to re-run — the loop skips annotations that are already `_normalized`.
 *
 * Navigate to /migrate-annotations once while signed in, click Run, and read
 * the log. After it reports "Done", you can delete this page if you want.
 */

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "../../lib/firebase";
import {
  collection, query, where, getDocs, doc, updateDoc, getDoc,
} from "firebase/firestore";

// Load an image and return its naturalWidth/naturalHeight.
function loadImageDims(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous"; // R2 bucket is public; this lets us read dims
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export default function MigrateAnnotationsPage() {
  const { user } = useUser();
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const [log,     setLog]     = useState([]);

  const append = (line) => setLog((prev) => [...prev, line]);

  const run = async () => {
    if (!user?.id || running) return;
    setRunning(true);
    setLog([]);
    setDone(false);

    let projectsScanned = 0;
    let annotationsConverted = 0;
    let annotationsSkipped = 0;
    let errors = 0;

    try {
      // 1) Get every project owned by the signed-in editor.
      const projSnap = await getDocs(
        query(collection(db, "projects"), where("editorId", "==", user.id))
      );

      append(`Found ${projSnap.size} project(s) total.`);

      for (const projDoc of projSnap.docs) {
        const project = { id: projDoc.id, ...projDoc.data() };
        projectsScanned++;

        // Only image projects have coordinate-based annotations.
        if (project.projectType !== "image") {
          append(`  → Skipping "${project.name}" (not an image project)`);
          continue;
        }
        if (!project.mediaUrl) {
          append(`  → Skipping "${project.name}" (no media uploaded)`);
          continue;
        }

        append(`Processing "${project.name}"…`);

        // 2) Load the image to get natural dimensions.
        let naturalW, naturalH;
        try {
          const dims = await loadImageDims(project.mediaUrl);
          naturalW = dims.w; naturalH = dims.h;
          append(`   image natural size: ${naturalW} × ${naturalH}`);
        } catch (e) {
          append(`   ⚠ couldn't load image — skipping. (${e.message})`);
          errors++;
          continue;
        }

        // 3) Walk annotations for this project.
        const annSnap = await getDocs(
          collection(db, "projects", project.id, "annotations")
        );

        for (const annDoc of annSnap.docs) {
          const ann = annDoc.data();

          if (ann._normalized) { annotationsSkipped++; continue; }
          // Video annotations (frame/range) are time-based, not coord-based.
          if (ann.type !== "ellipse" && ann.type !== "pin") {
            annotationsSkipped++;
            continue;
          }

          try {
            const patch = { _normalized: true };
            if (ann.type === "ellipse") {
              patch.cx = (ann.cx ?? 0) / naturalW;
              patch.cy = (ann.cy ?? 0) / naturalH;
              patch.rx = (ann.rx ?? 0) / naturalW;
              patch.ry = (ann.ry ?? 0) / naturalH;
            } else { // pin
              patch.x = (ann.x ?? 0) / naturalW;
              patch.y = (ann.y ?? 0) / naturalH;
            }
            await updateDoc(
              doc(db, "projects", project.id, "annotations", annDoc.id),
              patch
            );
            annotationsConverted++;
          } catch (e) {
            append(`   ⚠ failed on annotation ${annDoc.id}: ${e.message}`);
            errors++;
          }
        }
      }

      append("");
      append("─────── Done ───────");
      append(`Projects scanned: ${projectsScanned}`);
      append(`Annotations converted: ${annotationsConverted}`);
      append(`Annotations skipped (already normalized or not coord-based): ${annotationsSkipped}`);
      append(`Errors: ${errors}`);
      append("");
      append("You can navigate away. Open each image project to verify positions.");
      append("If any look wrong, delete that annotation and ask the client to re-create.");
      setDone(true);
    } catch (e) {
      append(`✖ Migration aborted: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{
      maxWidth: 720, margin: "var(--space-8) auto", padding: "var(--space-6)",
      fontFamily: "var(--font-sans)",
    }}>
      <h1 style={{
        fontSize: "var(--text-2xl)", fontWeight: "var(--font-semibold)",
        color: "var(--color-text-primary)", marginBottom: "var(--space-3)",
      }}>
        One-time annotation migration
      </h1>
      <p style={{
        fontSize: "var(--text-sm)", color: "var(--color-text-secondary)",
        lineHeight: "1.6", marginBottom: "var(--space-4)",
      }}>
        This converts old pixel-coordinate annotations into the new normalized format.
        Safe to run; safe to re-run. Old annotations may shift to approximate locations
        because the original canvas size isn't recoverable — open each image afterwards
        and delete any that look obviously misplaced.
      </p>

      <button
        className="btn btn--primary"
        onClick={run}
        disabled={running || !user?.id}
        style={{ marginBottom: "var(--space-4)" }}
      >
        {running ? "Migrating…" : done ? "Run again" : "Run migration"}
      </button>

      {log.length > 0 && (
        <pre style={{
          background: "var(--color-bg-surface-alt)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-mono)",
          whiteSpace: "pre-wrap",
          maxHeight: 480, overflowY: "auto",
        }}>
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}

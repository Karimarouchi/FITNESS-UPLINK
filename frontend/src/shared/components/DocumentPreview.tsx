import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./pdfMapPolyfill";
import { getDocument, GlobalWorkerOptions, RenderingCancelledException } from "pdfjs-dist";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { fetchUploadBlob } from "@/features/onboarding/api";
import { fetchCandidateFile } from "@/features/talent/api";

GlobalWorkerOptions.workerSrc = workerSrc;

type FileMeta = {
  id: string;
  name: string;
  contentType?: string;
};

function kindOf(file: FileMeta) {
  const type = (file.contentType ?? "").toLowerCase();
  const name = file.name.toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    return "image";
  }
  if (type.startsWith("video/") || /\.(mp4|webm|mov)$/.test(name)) {
    return "video";
  }
  return "other";
}

function isCancelledRender(error: unknown) {
  if (error instanceof RenderingCancelledException) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|destroyed/i.test(message);
}

function PdfPages({ src, expanded }: { src: string; expanded: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let pdf: PDFDocumentProxy | null = null;
    const tasks: RenderTask[] = [];

    async function render() {
      setStatus("loading");
      setErrorDetail("");
      host.replaceChildren();
      try {
        const response = await fetch(src);
        const data = new Uint8Array(await response.arrayBuffer());
        loadingTask = getDocument({
          data,
          useWasm: false,
          isOffscreenCanvasSupported: false,
        });
        pdf = await loadingTask.promise;
        if (cancelled) {
          return;
        }
        const boxWidth = wrap?.clientWidth || host.clientWidth || 640;
        const usable = Math.max(280, boxWidth - 24);
        for (let n = 1; n <= pdf.numPages; n += 1) {
          if (cancelled) {
            return;
          }
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(expanded ? 1.55 : 1.2, usable / base.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) {
            throw new Error("Canvas unavailable");
          }
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "doc-pdf-page";
          const task = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });
          tasks.push(task);
          await task.promise;
          if (cancelled) {
            return;
          }
          host.appendChild(canvas);
          if (n === 1) {
            setStatus("ready");
          }
        }
        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled && !isCancelledRender(error)) {
          const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          setErrorDetail(detail);
          setStatus("error");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      for (const task of tasks) {
        try {
          task.cancel();
        } catch {
          /* ignore */
        }
      }
      void loadingTask?.destroy();
    };
  }, [src, expanded]);

  return (
    <div ref={wrapRef} className={expanded ? "doc-pdf is-full" : "doc-pdf"}>
      {status === "loading" ? <p className="doc-preview-status">Chargement du document…</p> : null}
      {status === "error" ? (
        <p className="doc-preview-status">
          Impossible de lire ce PDF.
          {errorDetail ? <span className="doc-preview-error">{errorDetail}</span> : null}
        </p>
      ) : null}
      <div ref={hostRef} className="doc-pdf-pages" />
    </div>
  );
}

export function DocumentPreview({
  file,
  candidateId,
}: {
  file: FileMeta;
  candidateId?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const kind = kindOf(file);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const load = candidateId ? fetchCandidateFile(candidateId, file.id) : fetchUploadBlob(file.id);
    load
      .then((blob) => {
        if (cancelled) {
          return;
        }
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.id, candidateId]);

  function viewer(expanded: boolean) {
    if (!src) {
      return <p className="doc-preview-status">{failed ? "Impossible de charger ce fichier." : "Chargement du document…"}</p>;
    }
    if (kind === "pdf") {
      return <PdfPages src={src} expanded={expanded} />;
    }
    if (kind === "image") {
      return <img className={expanded ? "doc-preview-image is-full" : "doc-preview-image"} src={src} alt={file.name} />;
    }
    if (kind === "video") {
      return <video className="doc-preview-video" src={src} controls preload="metadata" />;
    }
    return (
      <p className="doc-preview-status">
        Aperçu indisponible pour ce type de fichier.
        <a href={src} download={file.name}>
          Télécharger
        </a>
      </p>
    );
  }

  return (
    <div className="doc-preview">
      {viewer(false)}
      <div className="doc-preview-cap">
        <span>{file.name || "Document"}</span>
        <div className="doc-preview-cap-actions">
          {src && kind !== "other" ? (
            <button type="button" onClick={() => setOpen(true)}>
              Plein écran
            </button>
          ) : null}
          {src ? (
            <a href={src} download={file.name}>
              Télécharger
            </a>
          ) : null}
        </div>
      </div>
      {open && src
        ? createPortal(
            <div className="doc-lightbox" role="dialog" aria-modal="true" aria-label={file.name}>
              <div className="doc-lightbox-bar">
                <strong>{file.name}</strong>
                <button type="button" onClick={() => setOpen(false)}>
                  Fermer
                </button>
              </div>
              <div className="doc-lightbox-body">{viewer(true)}</div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

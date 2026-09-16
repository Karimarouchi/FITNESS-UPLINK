import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import { can, useBilling } from "@/features/billing/useBilling";
import {
  fetchMessageFileBlob,
  fetchMessages,
  recruitmentError,
  reportRecruitment,
  sendMessage,
  uploadMessageFile,
  type RecruitmentMessage,
} from "./api";

export function canMessage(status: string) {
  return status !== "APPLIED" && status !== "NEW" && status !== "REJECTED" && status !== "ARCHIVED";
}

export function HireThread({ recruitmentId, compact = false }: { recruitmentId: string; compact?: boolean }) {
  const billing = useBilling();
  const canAttach = can(billing, "hire.chat.files");
  const [rows, setRows] = useState<RecruitmentMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMessages(recruitmentId)
      .then((list) => {
        if (!cancelled) {
          setRows(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de charger la conversation.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [recruitmentId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [rows]);

  async function submit() {
    const body = draft.trim();
    if (!body && !file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let uploadId: string | undefined;
      if (file && canAttach) {
        const uploaded = await uploadMessageFile(recruitmentId, file);
        uploadId = uploaded.id;
      }
      const sent = await sendMessage(recruitmentId, body, uploadId);
      setRows((current) => [...current, sent]);
      setDraft("");
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Le message n’a pas pu être envoyé.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reason) {
      return;
    }
    setBusy(true);
    try {
      await reportRecruitment(recruitmentId, reason);
      setReportOpen(false);
      setReportReason("");
      setReportDone(true);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Signalement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const composer = (
    <>
      {error ? <p className="auth-error">{error}</p> : null}
      {reportDone ? <p className="hire-report-ok">Signalement envoyé à l’équipe.</p> : null}
      {file ? <p className="hire-attach-name">{file.name}</p> : null}
      <div className={compact ? "fu-chat-compose" : "hire-thread-compose"}>
        <input
          className={compact ? "fu-chat-input" : "custom-input"}
          maxLength={2000}
          value={draft}
          placeholder="Écrivez votre message…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        {canAttach ? (
          <label className="hire-attach">
            <span className="material-symbols-outlined" aria-hidden="true">
              attach_file
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        ) : null}
        <button
          className={compact ? "fu-chat-send" : "btn-mini primary"}
          type="button"
          disabled={busy || (!draft.trim() && !file)}
          aria-label="Envoyer"
          onClick={() => void submit()}
        >
          {compact ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              send
            </span>
          ) : busy ? (
            "Envoi…"
          ) : (
            "Envoyer"
          )}
        </button>
      </div>
      <button className="hire-report-link" type="button" onClick={() => setReportOpen((value) => !value)}>
        Signaler
      </button>
      {reportOpen ? (
        <div className="hire-report-box">
          <textarea
            className="custom-input custom-textarea"
            rows={3}
            maxLength={800}
            value={reportReason}
            placeholder="Pourquoi signalez-vous cette discussion ?"
            onChange={(event) => setReportReason(event.target.value)}
          />
          <Button variant="danger" type="button" disabled={busy || !reportReason.trim()} onClick={() => void submitReport()}>
            Envoyer le signalement
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={compact ? "fu-chat-thread" : "hire-thread"}>
      {compact ? null : <h3>Messages</h3>}
      <div className={compact ? "fu-chat-log" : "hire-thread-list"}>
        {rows.length === 0 ? <p className="text-on-surface-variant">Aucun message pour le moment. Écrivez le premier.</p> : null}
        {rows.map((row) => (
          <div key={row.id} className={row.mine ? "hire-bubble is-mine" : "hire-bubble"}>
            {compact ? null : <strong>{row.mine ? "Vous" : row.senderName}</strong>}
            <p>{row.body}</p>
            {row.file ? <MessageFileLink recruitmentId={recruitmentId} message={row} /> : null}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {compact ? <div className="fu-chat-footer">{composer}</div> : composer}
    </div>
  );
}

function MessageFileLink({ recruitmentId, message }: { recruitmentId: string; message: RecruitmentMessage }) {
  const [busy, setBusy] = useState(false);

  async function openFile() {
    if (!message.file) {
      return;
    }
    setBusy(true);
    try {
      const blob = await fetchMessageFileBlob(recruitmentId, message.id);
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, "_blank", "noopener");
      if (!tab) {
        const link = document.createElement("a");
        link.href = url;
        link.download = message.file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="hire-file-link" type="button" disabled={busy} onClick={() => void openFile()}>
      {busy ? "Ouverture…" : message.file?.name}
    </button>
  );
}

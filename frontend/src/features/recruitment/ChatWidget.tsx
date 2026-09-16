import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isBackOfficeUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchNotifications, markNotificationRead, type AppNotification } from "@/features/notifications/api";
import { fetchConversations, formatPipelineDate, type RecruitmentConversation } from "./api";
import { HireThread } from "./HireThread";
import {
  fetchCoachInbox,
  fetchCoachMemberThread,
  fetchDirectMessages,
  fetchMemberInbox,
  replyToMember,
  sendDirectMessage,
  type CoachInboxItem,
  type DirectMessage,
  type MemberInboxItem,
} from "@/features/coaching/api";

function isChatNotice(item: AppNotification) {
  return item.title === "Nouveau message" || item.title === "Vous êtes contacté" || item.title === "Réponse du coach";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FU";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

// ── CoachThread: full thread between coach and one member ─────────────────
function CoachThread({
  coachId,
  memberId,
  memberName,
}: {
  coachId: string;
  memberId: string;
  memberName: string;
}) {
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    fetchCoachMemberThread(coachId, memberId)
      .then(setMsgs)
      .catch(() => setMsgs([]));
  }

  useEffect(() => {
    load();
    const t = window.setInterval(load, 8000);
    return () => window.clearInterval(t);
  }, [coachId, memberId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    setError(null);
    setSending(true);
    try {
      const m = await replyToMember(coachId, memberId, text.trim());
      setMsgs((prev) => [...prev, m]);
      setText("");
    } catch {
      setError("Impossible d'envoyer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fu-chat-thread" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="fu-chat-msgs" style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m) => {
          const mine = m.senderId === coachId;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                background: mine ? "var(--lime, #d6ff3f)" : "var(--paper-2)",
                color: mine ? "#141a32" : "var(--text)",
                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "7px 12px",
                maxWidth: "80%",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, opacity: 0.6 }}>
                {mine ? "Moi" : memberName}
              </div>
              {m.body}
              <div style={{ fontSize: 10, opacity: 0.5, textAlign: "right", marginTop: 2 }}>
                {timeAgo(m.createdAt)}
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--slate-light)", fontSize: 13, marginTop: 24 }}>
            Début de la conversation avec {memberName}.
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 12, padding: "0 14px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--paper-line)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
          placeholder="Votre réponse…"
          style={{ flex: 1, fontSize: 13 }}
          disabled={sending}
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
          style={{
            background: "var(--lime, #d6ff3f)",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            color: "#141a32",
          }}
        >
          {sending ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}

// ── MemberThread: full thread between a member and one coach ──────────────
function MemberThread({
  memberId,
  coachId,
  coachName,
}: {
  memberId: string;
  coachId: string;
  coachName: string;
}) {
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    fetchDirectMessages(coachId)
      .then(setMsgs)
      .catch(() => setMsgs([]));
  }

  useEffect(() => {
    load();
    const t = window.setInterval(load, 8000);
    return () => window.clearInterval(t);
  }, [coachId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    setError(null);
    setSending(true);
    try {
      const m = await sendDirectMessage(coachId, text.trim());
      setMsgs((prev) => [...prev, m]);
      setText("");
    } catch {
      setError("Impossible d'envoyer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fu-chat-thread" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="fu-chat-msgs" style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m) => {
          const mine = m.senderId === memberId;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                background: mine ? "var(--lime, #d6ff3f)" : "var(--paper-2)",
                color: mine ? "#141a32" : "var(--text)",
                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "7px 12px",
                maxWidth: "80%",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, opacity: 0.6 }}>
                {mine ? "Moi" : coachName}
              </div>
              {m.body}
              <div style={{ fontSize: 10, opacity: 0.5, textAlign: "right", marginTop: 2 }}>
                {timeAgo(m.createdAt)}
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--slate-light)", fontSize: 13, marginTop: 24 }}>
            Début de la conversation avec {coachName}.
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 12, padding: "0 14px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--paper-line)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
          placeholder="Votre message…"
          style={{ flex: 1, fontSize: 13 }}
          disabled={sending}
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
          style={{
            background: "var(--lime, #d6ff3f)",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            color: "#141a32",
          }}
        >
          {sending ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}

// ── Main ChatWidget ──────────────────────────────────────────────────────
type ActiveThread =
  | { kind: "hire"; row: RecruitmentConversation }
  | { kind: "coach"; member: CoachInboxItem }
  | { kind: "member"; coach: MemberInboxItem };

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"hire" | "coaching">("hire");

  // Recruitment
  const [rows, setRows] = useState<RecruitmentConversation[]>([]);
  const [unread, setUnread] = useState(0);

  // Coaching inbox (coach side)
  const [coachInbox, setCoachInbox] = useState<CoachInboxItem[]>([]);

  // Coaching inbox (member side — messages with their coaches)
  const [memberInbox, setMemberInbox] = useState<MemberInboxItem[]>([]);

  const [active, setActive] = useState<ActiveThread | null>(null);

  const isCoach = hasPermission(user, PERMS.COACHING_MANAGE);
  const isCoachingMember = !isCoach && hasPermission(user, PERMS.COACHING_DISCOVER);
  const hasCoachingTab = isCoach || isCoachingMember;
  const allowedHire =
    Boolean(user) &&
    !isBackOfficeUser(user) &&
    (hasPermission(user, PERMS.HIRE_PIPELINE) ||
      hasPermission(user, PERMS.HIRE_APPLICATIONS) ||
      hasPermission(user, PERMS.HIRE_APPLY));

  const visible = Boolean(user) && !isBackOfficeUser(user) && (allowedHire || hasCoachingTab);
  const coachingCount = isCoach ? coachInbox.length : memberInbox.length;

  // Open coaching thread from event dispatched on profile page
  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<RecruitmentConversation>).detail;
      if (!detail?.id) return;
      setOpen(true);
      setTab("hire");
      setActive({ kind: "hire", row: { ...detail, lastBody: detail.lastBody ?? null, lastAt: detail.lastAt ?? new Date().toISOString(), lastMine: detail.lastMine ?? false, status: detail.status ?? "CONTACTED" } });
    }
    window.addEventListener("fu-open-hire-chat", onOpen);
    return () => window.removeEventListener("fu-open-hire-chat", onOpen);
  }, []);

  // Polling
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    function refresh() {
      const tasks: Promise<unknown>[] = [];
      if (allowedHire) {
        tasks.push(
          Promise.all([fetchConversations().catch(() => []), fetchNotifications().catch(() => [])]).then(([talks, notices]) => {
            if (cancelled) return;
            setRows(talks as RecruitmentConversation[]);
            setUnread((notices as AppNotification[]).filter((item) => !item.readAt && isChatNotice(item)).length);
          }),
        );
      }
      if (isCoach && user) {
        tasks.push(
          fetchCoachInbox(user.id).catch(() => []).then((inbox) => {
            if (!cancelled) setCoachInbox(inbox as CoachInboxItem[]);
          }),
        );
      }
      if (isCoachingMember) {
        tasks.push(
          fetchMemberInbox().catch(() => []).then((inbox) => {
            if (!cancelled) setMemberInbox(inbox as MemberInboxItem[]);
          }),
        );
      }
      return tasks;
    }

    refresh();
    const timer = window.setInterval(refresh, 12000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [visible, allowedHire, isCoach, isCoachingMember, user?.id]);

  if (!visible) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    setActive(null);
    if (next) {
      try {
        const notices = await fetchNotifications();
        const unreadNotices = notices.filter((item) => !item.readAt && isChatNotice(item));
        if (unreadNotices.length) {
          await Promise.all(unreadNotices.map((item) => markNotificationRead(item.id).catch(() => null)));
        }
        setUnread(0);
        if (allowedHire) setRows(await fetchConversations().catch(() => []));
        if (isCoach && user) setCoachInbox(await fetchCoachInbox(user.id).catch(() => []));
        if (isCoachingMember) setMemberInbox(await fetchMemberInbox().catch(() => []));
      } catch { /* keep */ }
    }
  }

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : coachingCount > 0 ? String(coachingCount) : null;

  const coachingLabel = isCoach ? "Messages de vos clients" : "Vos coachs";

  // Panel title & subtitle
  let panelTitle = "Messages";
  let panelSub = "";
  if (active?.kind === "hire") { panelTitle = active.row.peerName; panelSub = active.row.title; }
  else if (active?.kind === "coach") { panelTitle = active.member.memberDisplayName; panelSub = "Message direct coaching"; }
  else if (active?.kind === "member") { panelTitle = active.coach.coachDisplayName; panelSub = "Message direct coaching"; }
  else if (tab === "coaching") { panelSub = coachingLabel; }
  else { panelSub = allowedHire ? "Recrutement" : hasCoachingTab ? coachingLabel : ""; }

  return (
    <div className="fu-chat">
      {open ? (
        <section className="fu-chat-panel" role="dialog" aria-label="Messages">
          <header className="fu-chat-head">
            {active ? (
              <button className="fu-chat-back" type="button" aria-label="Retour" onClick={() => setActive(null)}>
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              </button>
            ) : (
              <span className="fu-chat-mark material-symbols-outlined" aria-hidden="true">chat_bubble</span>
            )}
            <div>
              <strong>{panelTitle}</strong>
              <p>{panelSub}</p>
            </div>
            <button className="fu-chat-close" type="button" aria-label="Fermer" onClick={() => setOpen(false)}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>

          <div className="fu-chat-body">
            {/* Tabs — only when no active thread and both modes available */}
            {!active && allowedHire && hasCoachingTab ? (
              <div className="fu-chat-tabs">
                {(["hire", "coaching"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`fu-chat-tab${tab === t ? " is-active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {t === "hire" ? "work" : "sports_gymnastics"}
                    </span>
                    {t === "hire" ? "Recrutement" : "Coaching"}
                    {t === "coaching" && coachingCount > 0 ? (
                      <span className="fu-chat-tab-badge">{coachingCount}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Active thread */}
            {active?.kind === "hire" ? (
              <HireThread compact recruitmentId={active.row.id} />
            ) : active?.kind === "coach" && user ? (
              <CoachThread coachId={user.id} memberId={active.member.memberId} memberName={active.member.memberDisplayName} />
            ) : active?.kind === "member" && user ? (
              <MemberThread memberId={user.id} coachId={active.coach.coachId} coachName={active.coach.coachDisplayName} />
            ) : (
              /* List */
              <div className="fu-chat-list">
                {/* Coaching inbox list */}
                {(tab === "coaching" || (!allowedHire && hasCoachingTab)) ? (
                  isCoach ? (
                    coachInbox.length === 0 ? (
                      <p className="fu-chat-empty">Aucun message reçu pour le moment.</p>
                    ) : (
                      coachInbox.map((item) => (
                        <button key={item.memberId} className="fu-chat-item" type="button" onClick={() => setActive({ kind: "coach", member: item })}>
                          <span className="fu-chat-avatar">{initials(item.memberDisplayName)}</span>
                          <span className="fu-chat-item-copy">
                            <strong>{item.memberDisplayName}</strong>
                            <em style={{ maxWidth: 160, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", display: "block" }}>
                              {item.lastBody}
                            </em>
                          </span>
                          <span className="fu-chat-item-date">{timeAgo(item.lastAt)}</span>
                        </button>
                      ))
                    )
                  ) : memberInbox.length === 0 ? (
                    <p className="fu-chat-empty">
                      Vous n'avez pas encore échangé avec un coach. Contactez-en un depuis sa fiche profil.
                    </p>
                  ) : (
                    memberInbox.map((item) => (
                      <button key={item.coachId} className="fu-chat-item" type="button" onClick={() => setActive({ kind: "member", coach: item })}>
                        <span className="fu-chat-avatar">{initials(item.coachDisplayName)}</span>
                        <span className="fu-chat-item-copy">
                          <strong>{item.coachDisplayName}</strong>
                          <em style={{ maxWidth: 160, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", display: "block" }}>
                            {item.lastBody}
                          </em>
                        </span>
                        <span className="fu-chat-item-date">{timeAgo(item.lastAt)}</span>
                      </button>
                    ))
                  )
                ) : (
                  /* Hire list */
                  rows.length === 0 ? (
                    <p className="fu-chat-empty">Aucune discussion pour le moment.</p>
                  ) : (
                    rows.map((row) => (
                      <button key={row.id} className="fu-chat-item" type="button" onClick={() => setActive({ kind: "hire", row })}>
                        <span className="fu-chat-avatar">{initials(row.peerName)}</span>
                        <span className="fu-chat-item-copy">
                          <strong>{row.peerName}</strong>
                          <em>{row.lastBody || row.title}</em>
                        </span>
                        <span className="fu-chat-item-date">{formatPipelineDate(row.lastAt)}</span>
                      </button>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <button className="fu-chat-fab" type="button" aria-label="Ouvrir les messages" onClick={() => void toggle()}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {open ? "close" : "chat_bubble"}
        </span>
        {badge && !open ? <span className="fu-chat-badge">{badge}</span> : null}
      </button>
    </div>
  );
}

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Image as ImageIcon, Loader2, MessagesSquare, Search, Send, Store } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isBackOfficeUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { ApiError } from "@/shared/api/client";
import { isSupplierWorkspace } from "@/components/layout/shell/shellNav";
import {
  fetchConversation,
  fetchConversations,
  formatPrice,
  productPhotoUrl,
  sendConversationMessage,
  type Conversation,
  type ConversationThread,
} from "../api";
import { clockTime, dayLabel, timeAgo } from "../format";
import { refreshMarketplaceUnread } from "../useMarketplaceUnread";

function Thumb({ conversation }: { conversation: Conversation }) {
  if (conversation.productId && conversation.productPhotoUploadId) {
    return (
      <span className="bo-thumb is-sm">
        <img src={productPhotoUrl(conversation.productId, conversation.productPhotoUploadId)} alt="" />
      </span>
    );
  }
  return (
    <span className="bo-thumb is-sm">
      <ImageIcon size={18} />
    </span>
  );
}

export function MarketplaceMessagesPage() {
  const { user } = useAuth();
  const supplier = isSupplierWorkspace(user);
  const workspace = isBackOfficeUser(user) || supplier;
  const showBrowse = !workspace && hasPermission(user, PERMS.MARKETPLACE_BROWSE);
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(() => {
    fetchConversations()
      .then(setConversations)
      .catch(() => setConversations((current) => current ?? []));
  }, []);

  const loadThread = useCallback(
    (id: string, silent = false) => {
      if (!silent) setThreadLoading(true);
      fetchConversation(id)
        .then((result) => {
          setThread(result);
          setConversations(
            (current) => current?.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)) ?? current,
          );
          refreshMarketplaceUnread();
        })
        .catch(() => {
          if (!silent) {
            setThread(null);
            setError("Conversation introuvable.");
          }
        })
        .finally(() => setThreadLoading(false));
    },
    [],
  );

  useEffect(() => {
    loadList();
    const timer = window.setInterval(loadList, 30_000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    setError(null);
    setThread(null);
    setDraft("");
    if (!activeId) return;
    loadThread(activeId);
    const timer = window.setInterval(() => loadThread(activeId, true), 15_000);
    return () => window.clearInterval(timer);
  }, [activeId, loadThread]);

  useEffect(() => {
    if (!activeId && conversations?.length && window.matchMedia("(min-width: 861px)").matches) {
      setParams({ c: conversations[0].id }, { replace: true });
    }
  }, [activeId, conversations, setParams]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [thread?.messages.length, thread?.conversation.id]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations ?? [];
    return (conversations ?? []).filter((item) =>
      [item.counterpart.displayName, item.productName, item.lastMessagePreview].some((value) => value?.toLowerCase().includes(q)),
    );
  }, [conversations, filter]);

  async function send() {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(activeId, body);
      setDraft("");
      setThread((current) => (current ? { ...current, messages: [...current.messages, message] } : current));
      setConversations((current) => {
        if (!current) return current;
        const updated = current.map((item) =>
          item.id === activeId ? { ...item, lastMessagePreview: body.slice(0, 280), lastMessageAt: message.createdAt } : item,
        );
        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Message non envoyé.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const conversation = thread?.conversation ?? null;
  const price = conversation ? formatPrice(conversation.productPriceAmount, conversation.productPriceCurrency) : null;

  return (
    <section className="bo-page">
      <div className="bo-head">
        <div>
          <h1>Messages</h1>
          <p>
            {supplier
              ? "Les acheteurs intéressés par vos articles vous écrivent ici. Répondez rapidement pour conclure."
              : "Vos échanges avec les fournisseurs de la marketplace."}
          </p>
        </div>
        {showBrowse ? (
          <div className="bo-head-actions">
            <Link className="bo-btn" to="/marketplace/products">
              <Store size={16} />
              Parcourir la marketplace
            </Link>
          </div>
        ) : null}
      </div>

      <div className={`bo-inbox${activeId ? " has-thread" : ""}`}>
        <div className="bo-inbox-list">
          <div className="bo-inbox-list-head">
            <div className="bo-toolbar-search" style={{ maxWidth: "none" }}>
              <Search size={16} />
              <input
                className="bo-input"
                value={filter}
                placeholder="Rechercher une conversation…"
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
          </div>
          <div className="bo-inbox-items">
            {conversations === null ? (
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                {[0, 1, 2].map((key) => (
                  <div key={key} className="bo-skeleton" style={{ height: 58 }} />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <div className="bo-empty">
                <div className="bo-empty-icon">
                  <MessagesSquare size={22} />
                </div>
                <div className="bo-empty-title">{conversations.length ? "Aucun résultat" : "Aucune conversation"}</div>
                <p>
                  {supplier
                    ? "Quand un acheteur vous contacte depuis une annonce, la conversation apparaît ici."
                    : "Ouvrez une annonce et cliquez sur « Contacter le fournisseur »."}
                </p>
              </div>
            ) : (
              shown.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`bo-conv${item.id === activeId ? " is-active" : ""}${item.unreadCount > 0 ? " is-unread" : ""}`}
                  onClick={() => setParams({ c: item.id })}
                >
                  <Thumb conversation={item} />
                  <div className="bo-conv-main">
                    <div className="bo-conv-top">
                      <span className="bo-conv-name">{item.counterpart.displayName}</span>
                      <span className="bo-conv-time">{timeAgo(item.lastMessageAt)}</span>
                    </div>
                    <div className="bo-conv-product">{item.productName}</div>
                    <div className="bo-conv-preview">
                      <span>{item.lastMessagePreview ?? "—"}</span>
                      {item.unreadCount > 0 ? <span className="bo-nav-count">{item.unreadCount}</span> : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bo-thread">
          {!activeId ? (
            <div className="bo-thread-empty">
              <div className="bo-empty">
                <div className="bo-empty-icon">
                  <MessagesSquare size={22} />
                </div>
                <div className="bo-empty-title">Sélectionnez une conversation</div>
              </div>
            </div>
          ) : threadLoading && !thread ? (
            <div className="bo-thread-empty">
              <Loader2 size={22} className="bo-spin" color="var(--bo-muted)" />
            </div>
          ) : conversation ? (
            <>
              <div className="bo-thread-head">
                <button type="button" className="bo-icon-btn bo-thread-back" onClick={() => setParams({})} aria-label="Retour">
                  <ArrowLeft size={18} />
                </button>
                <Thumb conversation={conversation} />
                <div className="bo-list-main">
                  <div className="bo-list-title">
                    <span>{conversation.productName}</span>
                    {!conversation.productAvailable ? <span className="bo-pill no-dot">Plus disponible</span> : null}
                  </div>
                  <div className="bo-list-sub">
                    {conversation.viewerRole === "SUPPLIER" ? "Acheteur" : "Fournisseur"} : {conversation.counterpart.displayName}
                    {conversation.counterpart.subtitle ? ` · ${conversation.counterpart.subtitle}` : ""}
                    {price ? ` · ${price}` : " · Prix sur demande"}
                  </div>
                </div>
                {conversation.productId && conversation.productAvailable ? (
                  <a
                    className="bo-btn bo-btn--sm"
                    href={`/marketplace/products/${conversation.productId}`}
                    target={supplier ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} />
                    Annonce
                  </a>
                ) : null}
              </div>
              <div className="bo-thread-body" ref={bodyRef}>
                {thread!.messages.map((message, index) => {
                  const previous = thread!.messages[index - 1];
                  const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                  return (
                    <Fragment key={message.id}>
                      {newDay ? <div className="bo-day">{dayLabel(message.createdAt)}</div> : null}
                      <div className={message.mine ? "bo-msg is-mine" : "bo-msg"}>
                        <div className="bo-msg-bubble">{message.body}</div>
                        <div className="bo-msg-meta">
                          {message.mine ? "Vous" : message.senderName} · {clockTime(message.createdAt)}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
              {error ? (
                <p className="bo-error" style={{ margin: "0 14px 8px" }}>
                  {error}
                </p>
              ) : null}
              <div className="bo-composer">
                <textarea
                  value={draft}
                  rows={1}
                  maxLength={4000}
                  placeholder="Écrire un message… (Entrée pour envoyer)"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button type="button" className="bo-btn bo-btn--primary" disabled={!draft.trim() || sending} onClick={() => void send()}>
                  {sending ? <Loader2 size={16} className="bo-spin" /> : <Send size={16} />}
                  Envoyer
                </button>
              </div>
            </>
          ) : (
            <div className="bo-thread-empty">
              <p className="bo-error">{error ?? "Conversation introuvable."}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

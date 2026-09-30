"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  conversationId: string;
  sender: "user" | "operator";
  text: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  visitorId: string;
  userId: string | null;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export function SupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function refresh() {
    try {
      const response = await fetch("/api/support/operator/conversations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить обращения");

      const next: Conversation[] = data.conversations ?? [];
      setConversations(next);
      setActiveId((current) => current || next[0]?.id || "");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить обращения");
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId]
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!active || !text.trim() || sending) return;

    const messageText = text.trim();
    setText("");
    setSending(true);

    try {
      const response = await fetch("/api/support/operator/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: active.id,
          text: messageText,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось отправить ответ");
      await refresh();
    } catch (reason) {
      setText(messageText);
      setError(reason instanceof Error ? reason.message : "Не удалось отправить ответ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="support-inbox">
      <aside className="support-inbox-list">
        <div className="support-inbox-title">
          <span className="mono">MOST SUPPORT</span>
          <h1>Обращения</h1>
          <small>{conversations.length} чатов</small>
        </div>

        <div className="support-conversation-list">
          {conversations.length === 0 && (
            <p className="support-inbox-empty">Пока нет обращений.</p>
          )}

          {conversations.map((conversation) => {
            const last = conversation.messages.at(-1);
            return (
              <button
                type="button"
                key={conversation.id}
                className={conversation.id === activeId ? "is-active" : ""}
                onClick={() => setActiveId(conversation.id)}
              >
                <span>{conversation.userId ? "Клиент MOST" : "Гость"}</span>
                <small>{last?.text ?? "Новый чат"}</small>
                <time>
                  {new Intl.DateTimeFormat("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(conversation.updatedAt))}
                </time>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="support-inbox-thread">
        {active ? (
          <>
            <header>
              <div>
                <span className="mono">{active.userId ? "АВТОРИЗОВАННЫЙ КЛИЕНТ" : "ГОСТЬ"}</span>
                <strong>{active.id.slice(0, 18)}</strong>
              </div>
              <small>{active.status === "open" ? "Открыт" : "Закрыт"}</small>
            </header>

            <div className="support-inbox-messages">
              {active.messages.length === 0 && (
                <p className="support-inbox-empty">Пользователь ещё ничего не написал.</p>
              )}

              {active.messages.map((message) => (
                <article
                  key={message.id}
                  className={message.sender === "operator" ? "is-operator" : "is-user"}
                >
                  <span>{message.sender === "operator" ? "Вы" : "Клиент"}</span>
                  <p>{message.text}</p>
                  <time>
                    {new Intl.DateTimeFormat("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(message.createdAt))}
                  </time>
                </article>
              ))}
            </div>

            <form onSubmit={submit}>
              <textarea
                rows={3}
                maxLength={2000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ответ пользователю…"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button type="submit" disabled={!text.trim() || sending}>
                {sending ? "Отправляем…" : "Отправить ↗"}
              </button>
            </form>
          </>
        ) : (
          <div className="support-inbox-placeholder">
            <span className="mono">MOST SUPPORT</span>
            <h2>Выберите обращение.</h2>
          </div>
        )}

        {error && <p className="support-inbox-error">{error}</p>}
      </section>
    </div>
  );
}

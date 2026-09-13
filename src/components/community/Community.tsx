"use client";

/**
 * The forum.
 *
 * The seeded threads are written content with invented authors, labeled as such
 * at the top of the page. Replies the learner writes stay on their device.
 */
import { useState } from "react";
import { MessagesSquare, Send, Users } from "lucide-react";
import { SKILLS } from "@/lib/curriculum";
import { relativeDate } from "@/lib/format";
import type { LearnerState, SkillId } from "@/lib/types";

export function Community({
  state,
  onReply,
}: {
  state: LearnerState;
  onReply: (threadId: string, body: string) => void;
}) {
  const [filter, setFilter] = useState<SkillId | "all">("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const threads = state.threads
    .filter((thread) => filter === "all" || thread.skill === filter)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Community</h1>
          <p>
            Questions people actually ask, with answers that match what the lessons teach.
          </p>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: "var(--s5)" }}>
        <Users size={15} aria-hidden="true" />
        <span>
          <strong style={{ color: "var(--text)" }}>These discussions are written content.</strong>{" "}
          The names are invented and there are no other users — this app has no backend and
          no accounts. Replies you write are saved on this device only.
        </span>
      </div>

      <div className="row" style={{ marginBottom: "var(--s4)" }}>
        <button
          type="button"
          className={`button small ${filter === "all" ? "primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {(Object.keys(SKILLS) as SkillId[]).map((skill) => (
          <button
            key={skill}
            type="button"
            className={`button small ${filter === skill ? "primary" : ""}`}
            onClick={() => setFilter(skill)}
          >
            {SKILLS[skill].name}
          </button>
        ))}
      </div>

      <div className="stack">
        {threads.map((thread) => (
          <article className="thread" key={thread.id}>
            <header className="thread-head">
              <div className="row" style={{ marginBottom: "var(--s2)" }}>
                <span className="badge is-green">{SKILLS[thread.skill].name}</span>
                <span className="badge">
                  {thread.replies.length}{" "}
                  {thread.replies.length === 1 ? "reply" : "replies"}
                </span>
              </div>
              <h3 className="thread-title">{thread.title}</h3>
              <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--s2)" }}>
                {thread.body}
              </p>
              <div className="thread-byline">
                <span className="avatar" aria-hidden="true">
                  {thread.author.charAt(0)}
                </span>
                {thread.author} · Level {thread.level} · {relativeDate(thread.at)}
              </div>
            </header>

            {thread.replies.map((reply) => (
              <div className={`reply ${reply.mine ? "is-mine" : ""}`} key={reply.id}>
                <span className={`avatar ${reply.mine ? "is-mine" : ""}`} aria-hidden="true">
                  {reply.author.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="thread-byline" style={{ marginBottom: 3 }}>
                    {reply.author}
                    {reply.mine && <span className="badge is-green">You</span>}
                    <span>· Level {reply.level} · {relativeDate(reply.at)}</span>
                  </div>
                  <p className="reply-body">{reply.body}</p>
                </div>
              </div>
            ))}

            <form
              className="reply-form"
              onSubmit={(event) => {
                event.preventDefault();
                const body = drafts[thread.id]?.trim();
                if (!body) return;
                onReply(thread.id, body);
                setDrafts((current) => ({ ...current, [thread.id]: "" }));
              }}
            >
              <label className="sr-only" htmlFor={`reply-${thread.id}`}>
                Reply to {thread.title}
              </label>
              <textarea
                id={`reply-${thread.id}`}
                className="input"
                rows={2}
                placeholder="Add your answer…"
                value={drafts[thread.id] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [thread.id]: event.target.value }))
                }
              />
              <div className="row">
                <button
                  type="submit"
                  className="button primary small"
                  disabled={!drafts[thread.id]?.trim()}
                >
                  <Send size={13} aria-hidden="true" />
                  Post reply
                </button>
                <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
                  Saved on this device only
                </span>
              </div>
            </form>
          </article>
        ))}

        {threads.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "var(--s7)" }}>
            <MessagesSquare size={24} color="var(--text-faint)" style={{ margin: "0 auto" }} aria-hidden="true" />
            <h3 style={{ marginTop: "var(--s3)" }}>Nothing in this track yet</h3>
          </div>
        )}
      </div>
    </div>
  );
}

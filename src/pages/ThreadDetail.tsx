import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { Message, NotFound } from '../components/Guard';
import { MentionTextarea, RichText } from '../components/Mention';
import { Avatar, Badge, Field, PageHeader, Select } from '../components/ui';
import { t } from '../i18n/en';
import { formatDateTime } from '../lib/format';
import { languages } from '../lib/reference';
import { addPost, setFollow, setThreadLanguage } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import { LanguageBadge, threadLink } from './Discussions';

export default function ThreadDetail() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const [text, setText] = useState('');
  const thread = db.threads.find((th) => th.id === id);
  if (!thread) return <NotFound />;
  const full = session.can('discussions.viewAll');
  if (!full && thread.kind !== 'network') return <Message title={t.common.noAccessTitle} text={t.common.noAccessText} />;

  const following = thread.followerIds.includes(session.userId);
  const people = db.people.filter((p) => p.status === 'active');
  const isAuthor = thread.authorId === session.userId || session.role === 'admin';

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={thread.title}
        back={thread.kind === 'network' ? { to: '/discussions/ask', label: t.discussions.tabAsk } : { to: '/discussions', label: t.discussions.title }}
        actions={
          <button type="button" className="btn btn-ghost" aria-pressed={following} onClick={() => setFollow(thread.id, session.userId, !following)}>
            {following ? <BellOff size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}
            {following ? t.discussions.unfollow : t.discussions.follow}
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="blue">{t.threadKinds[thread.kind]}</Badge>
        {thread.kind === 'initiative' && full && <Link to={`/initiatives/${thread.initiativeId}`}>{threadLink(thread, db)}</Link>}
        {(thread.kind === 'wp' || thread.kind === 'topic') && <strong>{threadLink(thread, db)}</strong>}
        <LanguageBadge language={thread.language} />
        <span className="text-muted" aria-live="polite">
          {following ? t.discussions.following : t.discussions.notFollowing}
        </span>
      </div>

      <ol className="space-y-3">
        {thread.posts.map((post) => {
          const author = db.people.find((p) => p.id === post.authorId);
          const org = db.organisations.find((o) => o.id === author?.orgId);
          return (
            <li key={post.id} className="card flex gap-3 p-4">
              <Avatar name={author?.name ?? '?'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong>{author?.name}</strong>
                  <span className="text-muted">
                    {' '}
                    · {org?.short} · {formatDateTime(post.date)}
                  </span>
                </p>
                <div className="mt-1">
                  <RichText text={post.text} people={db.people} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <form
        className="card mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addPost(thread.id, text.trim(), session.userId);
          setText('');
          toast(t.discussions.replied);
        }}
      >
        <Field label={t.discussions.reply} hint={t.discussions.mentionHint}>
          {(p) => <MentionTextarea {...p} value={text} onChange={setText} people={people} />}
        </Field>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <button type="submit" className="btn" disabled={!text.trim()}>
            {t.discussions.send}
          </button>
          {isAuthor && (
            <label className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{t.discussions.changeLanguage}</span>
              <Select className="w-auto" value={thread.language} onChange={(v) => setThreadLanguage(thread.id, v)} options={languages.map((l) => ({ value: l, label: t.languages[l as keyof typeof t.languages] }))} />
            </label>
          )}
        </div>
      </form>
    </div>
  );
}

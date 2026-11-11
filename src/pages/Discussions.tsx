import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, MessageSquare, Plus } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { MentionTextarea } from '../components/Mention';
import { Badge, Empty, Field, Modal, PageHeader, Section, Select, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatDate, includesText, relativeDate } from '../lib/format';
import { languages, wpOptions } from '../lib/reference';
import { visibleThreads } from '../lib/visibility';
import { createThread, saveSettings, setFollow, type ThreadInput } from '../store/actions';
import { useSession, type Session } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Db, Thread, ThreadKind, WpId } from '../types';

const languageOptions = languages.map((l) => ({ value: l, label: t.languages[l as keyof typeof t.languages] }));
const kindOptions = (['wp', 'initiative', 'topic', 'network'] as ThreadKind[]).map((k) => ({ value: k, label: t.threadKinds[k] }));

export const discussionTabs = (s: Session) => [
  ...(s.can('discussions.viewAll') ? [{ to: '/discussions', label: t.discussions.tabAll, end: true }] : []),
  { to: '/discussions/ask', label: t.discussions.tabAsk },
  { to: '/discussions/settings', label: t.discussions.tabSettings },
];

/** What a thread is linked to: a work package, an initiative, a topic or the whole network. */
export function threadLink(th: Thread, db: Db): string {
  if (th.kind === 'wp') return th.wp ?? '';
  if (th.kind === 'initiative') return db.initiatives.find((i) => i.id === th.initiativeId)?.title ?? t.threadKinds.initiative;
  if (th.kind === 'topic') return th.topic ?? '';
  return t.threadKinds.network;
}

export function LanguageBadge({ language }: { language: string }) {
  if (language === 'en') return null;
  return (
    <Badge tone="amber">
      <Globe size={12} aria-hidden="true" />
      {fill(t.discussions.writtenIn, { language: t.languages[language as keyof typeof t.languages] })}
    </Badge>
  );
}

function ThreadList({ threads }: { threads: Thread[] }) {
  const db = useDb();
  if (threads.length === 0) return <Empty>{t.common.noResults}</Empty>;
  return (
    <ul className="space-y-3">
      {threads.map((th) => {
        const last = th.posts[th.posts.length - 1];
        return (
          <li key={th.id} className="card p-4">
            <div className="mb-1 flex flex-wrap gap-1.5">
              <Badge tone="blue">
                {t.threadKinds[th.kind]}
                {th.kind !== 'network' && `: ${threadLink(th, db)}`}
              </Badge>
              <LanguageBadge language={th.language} />
            </div>
            <h2 className="text-ink text-base font-semibold">
              <Link to={`/discussions/${th.id}`} className="plain-link">
                {th.title}
              </Link>
            </h2>
            <p className="text-muted mt-1 flex flex-wrap gap-x-4 text-xs">
              <span>{fill(t.discussions.startedBy, { name: db.people.find((p) => p.id === th.authorId)?.name ?? '', date: formatDate(th.created) })}</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={12} aria-hidden="true" />
                {fill(t.discussions.replies, { n: th.posts.length - 1 })}
              </span>
              <span>{fill(t.discussions.lastReply, { date: relativeDate(last.date).toLowerCase() })}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const lastActivity = (th: Thread) => th.posts[th.posts.length - 1].date;
const byLatest = (a: Thread, b: Thread) => lastActivity(b).localeCompare(lastActivity(a));

function NewThreadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDb();
  const session = useSession();
  const navigate = useNavigate();
  const empty: ThreadInput = { title: '', text: '', kind: 'wp', wp: 'WP1', initiativeId: db.initiatives[0]?.id, topic: '', language: 'en' };
  const [form, setForm] = useState<ThreadInput>(empty);
  const [submitted, setSubmitted] = useState(false);
  const people = db.people.filter((p) => p.status === 'active');
  const missing = (v?: string) => (submitted && !v?.trim() ? t.common.required : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.title.trim() || !form.text.trim() || (form.kind === 'topic' && !form.topic?.trim())) return;
    const id = createThread(
      {
        title: form.title.trim(),
        text: form.text.trim(),
        kind: form.kind,
        language: form.language,
        wp: form.kind === 'wp' ? form.wp : undefined,
        initiativeId: form.kind === 'initiative' ? form.initiativeId : undefined,
        topic: form.kind === 'topic' ? form.topic?.trim() : undefined,
      },
      session.userId,
    );
    setForm(empty);
    setSubmitted(false);
    onClose();
    toast(t.discussions.created);
    navigate(`/discussions/${id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title={t.discussions.newThread}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t.discussions.fTitle} error={missing(form.title)}>
          {(p) => <input {...p} className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.discussions.fLinked}>
            {(p) => <Select {...p} value={form.kind} onChange={(v) => setForm({ ...form, kind: v as ThreadKind })} options={kindOptions.filter((k) => k.value !== 'network')} />}
          </Field>
          {form.kind === 'wp' && <Field label={t.discussions.fWp}>{(p) => <Select {...p} value={form.wp ?? 'WP1'} onChange={(v) => setForm({ ...form, wp: v as WpId })} options={wpOptions} />}</Field>}
          {form.kind === 'initiative' && (
            <Field label={t.discussions.fInitiative}>
              {(p) => <Select {...p} value={form.initiativeId ?? ''} onChange={(v) => setForm({ ...form, initiativeId: v })} options={db.initiatives.map((i) => ({ value: i.id, label: i.title }))} />}
            </Field>
          )}
          {form.kind === 'topic' && (
            <Field label={t.discussions.fTopic} hint={t.discussions.fTopicHint} error={missing(form.topic)}>
              {(p) => <input {...p} className="input" value={form.topic ?? ''} onChange={(e) => setForm({ ...form, topic: e.target.value })} />}
            </Field>
          )}
        </div>
        <Field label={t.discussions.fMessage} hint={t.discussions.mentionHint} error={missing(form.text)}>
          {(p) => <MentionTextarea {...p} value={form.text} onChange={(v) => setForm({ ...form, text: v })} people={people} />}
        </Field>
        <Field label={t.discussions.fLanguage} hint={t.discussions.languageHint}>
          {(p) => <Select {...p} value={form.language} onChange={(v) => setForm({ ...form, language: v })} options={languageOptions} />}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn">
            {t.discussions.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Discussions() {
  const db = useDb();
  const session = useSession();
  const { get } = useFilters();
  const [adding, setAdding] = useState(false);
  const all = visibleThreads(db.threads, session);
  const list = all
    .filter(
      (th) =>
        (!get('kind') || th.kind === get('kind')) &&
        (!get('wp') || th.wp === get('wp')) &&
        (!get('language') || th.language === get('language')) &&
        (!get('q') || includesText(`${th.title} ${threadLink(th, db)} ${th.posts.map((p) => p.text).join(' ')}`, get('q'))),
    )
    .sort(byLatest);
  return (
    <>
      <PageHeader
        title={t.discussions.title}
        intro={t.discussions.intro}
        actions={
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            {t.discussions.newThread}
          </button>
        }
      />
      <Tabs tabs={discussionTabs(session)} label={t.discussions.title} />
      <FilterBar
        searchLabel={t.discussions.searchLabel}
        shown={list.length}
        total={all.length}
        filters={[
          { key: 'kind', label: t.discussions.linkedTo, options: kindOptions },
          { key: 'wp', label: t.common.wp, options: wpOptions },
          { key: 'language', label: t.common.language, options: languageOptions },
        ]}
      />
      <ThreadList threads={list} />
      <NewThreadModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/** "Ask the network": any member or associated partner can post a question to everyone. */
export function AskNetwork() {
  const db = useDb();
  const session = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [submitted, setSubmitted] = useState(false);
  const threads = db.threads.filter((th) => th.kind === 'network').sort(byLatest);
  const people = db.people.filter((p) => p.status === 'active');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!title.trim() || !text.trim()) return;
    const id = createThread({ title: title.trim(), text: text.trim(), kind: 'network', language }, session.userId);
    toast(t.discussions.askPosted);
    navigate(`/discussions/${id}`);
  };

  return (
    <>
      <PageHeader title={t.discussions.title} intro={t.discussions.askIntro} />
      <Tabs tabs={discussionTabs(session)} label={t.discussions.title} />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <Section title={t.discussions.askTitle} className="lg:col-span-2">
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label={t.discussions.askPlaceholderTitle} error={submitted && !title.trim() ? t.common.required : undefined}>
              {(p) => <input {...p} className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />}
            </Field>
            <Field label={t.discussions.askDetails} hint={t.discussions.mentionHint} error={submitted && !text.trim() ? t.common.required : undefined}>
              {(p) => <MentionTextarea {...p} value={text} onChange={setText} people={people} />}
            </Field>
            <Field label={t.discussions.fLanguage} hint={t.discussions.languageHint}>
              {(p) => <Select {...p} value={language} onChange={setLanguage} options={languageOptions} />}
            </Field>
            <button type="submit" className="btn">
              {t.discussions.askSubmit}
            </button>
          </form>
        </Section>
        <section className="lg:col-span-3">
          <h2 className="mb-3">
            {t.discussions.askRecent} ({threads.length})
          </h2>
          <ThreadList threads={threads} />
        </section>
      </div>
    </>
  );
}

export function NotificationSettings() {
  const db = useDb();
  const session = useSession();
  const s = db.settings;
  const followed = visibleThreads(db.threads, session).filter((th) => th.followerIds.includes(session.userId));
  const save = (patch: Parameters<typeof saveSettings>[0]) => {
    saveSettings(patch);
    toast(t.common.saved);
  };
  const checks = [
    ['notifyMentions', t.discussions.notifyMentions],
    ['notifyActions', t.discussions.notifyActions],
    ['notifyNetwork', t.discussions.notifyNetwork],
  ] as const;
  return (
    <>
      <PageHeader title={t.discussions.title} intro={t.discussions.settingsIntro} />
      <Tabs tabs={discussionTabs(session)} label={t.discussions.title} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section title={t.discussions.tabSettings}>
          <fieldset>
            <legend className="label">{t.discussions.digest}</legend>
            {(['weekly', 'daily', 'none'] as const).map((d) => (
              <label key={d} className="flex items-center gap-2 py-1.5 text-sm">
                <input type="radio" name="digest" checked={s.digest === d} onChange={() => save({ digest: d })} />
                {t.discussions.digestOptions[d]}
              </label>
            ))}
          </fieldset>
          <fieldset className="border-line mt-4 border-t pt-4">
            <legend className="label float-left w-full">{t.discussions.alsoTell}</legend>
            {checks.map(([key, label]) => (
              <label key={key} className="clear-both flex items-center gap-2 py-1.5 text-sm">
                <input type="checkbox" checked={s[key]} onChange={(e) => save({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </fieldset>
        </Section>
        <Section title={`${t.discussions.followed} (${followed.length})`}>
          <p className="text-muted mb-3 text-sm">{t.discussions.followedHint}</p>
          {followed.length === 0 && <Empty>{t.discussions.followedEmpty}</Empty>}
          <ul className="divide-line divide-y">
            {followed.map((th) => (
              <li key={th.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link to={`/discussions/${th.id}`}>{th.title}</Link>
                <button type="button" className="btn btn-ghost btn-sm shrink-0" aria-label={`${t.discussions.unfollow}: ${th.title}`} onClick={() => setFollow(th.id, session.userId, false)}>
                  {t.discussions.unfollow}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

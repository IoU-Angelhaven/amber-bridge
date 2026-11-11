import { Link } from 'react-router-dom';
import { AtSign, CalendarDays, ClipboardCheck, FileSearch, Filter, Inbox, Pin, Send, type LucideIcon } from 'lucide-react';
import { Avatar, Badge, Empty, Section } from '../components/ui';
import { mentions } from '../components/Mention';
import { t } from '../i18n/en';
import { daysFromToday, fill, formatDate, formatRange, relativeDate, today } from '../lib/format';
import { canOpenLink, visibleMeetings, visibleThreads } from '../lib/visibility';
import { useSession } from '../store/session';
import { useDb } from '../store/store';

interface WaitingItem {
  key: string;
  icon: LucideIcon;
  kind: string;
  title: string;
  sub?: string;
  due?: string;
  to: string;
}

export default function Home() {
  const db = useDb();
  const session = useSession();
  const me = session.user;
  if (!me) return null;

  const meetings = visibleMeetings(db.meetings, session);
  const threads = visibleThreads(db.threads, session);

  // ----- Waiting for me -----
  const waiting: WaitingItem[] = [];
  meetings.forEach((m) =>
    m.actions
      .filter((a) => a.ownerId === me.id && !a.done)
      .forEach((a) => waiting.push({ key: a.id, icon: ClipboardCheck, kind: t.home.waitAction, title: a.text, sub: m.title, due: a.due, to: `/calendar/${m.id}` })),
  );
  if (session.can('documents.viewAll')) {
    db.documents
      .filter((d) => d.reviewerId === me.id && d.status === 'review')
      .forEach((d) => waiting.push({ key: d.id, icon: FileSearch, kind: t.home.waitReview, title: d.title, to: `/documents/${d.id}` }));
  }
  threads.forEach((th) => {
    const lastMention = th.posts.findLastIndex((p) => p.authorId !== me.id && mentions(p.text, me));
    const lastOwn = th.posts.findLastIndex((p) => p.authorId === me.id);
    if (lastMention > lastOwn) {
      const author = db.people.find((p) => p.id === th.posts[lastMention].authorId);
      waiting.push({ key: th.id, icon: AtSign, kind: t.home.waitMention, title: th.title, sub: fill(t.common.by, { name: author?.name ?? '' }), to: `/discussions/${th.id}` });
    }
  });
  if (session.can('proposals.review')) {
    db.proposals
      .filter((p) => p.status === 'waiting')
      .forEach((p) =>
        waiting.push({ key: p.id, icon: Send, kind: t.home.waitProposal, title: db.initiatives.find((i) => i.id === p.initiativeId)?.title ?? '', to: '/admin/proposals' }),
      );
  }
  if (session.can('learning.respond')) {
    db.submissions
      .filter((s) => s.status === 'new')
      .forEach((s) => waiting.push({ key: s.id, icon: Inbox, kind: t.home.waitSubmission, title: s.text, sub: s.from, to: '/learning/inbox' }));
  }
  waiting.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  // ----- What's new -----
  const news = db.activity
    .filter((a) => {
      if (canOpenLink(a.link, session)) return true;
      const id = a.link.split('/')[2];
      if (a.link.startsWith('/discussions')) return threads.some((th) => th.id === id);
      if (a.link.startsWith('/documents')) return db.documents.some((d) => d.id === id && d.status === 'approved');
      return false;
    })
    .slice(0, 8);

  const upcoming = meetings
    .filter((m) => (m.endDate ?? m.date) >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const org = db.organisations.find((o) => o.id === me.orgId);
  const mine = session.can('initiatives.view')
    ? db.initiatives.filter((i) => i.status !== 'closed' && (i.ownerId === me.id || i.orgId === me.orgId || i.partnerIds.includes(me.orgId)))
    : [];
  const shortcuts = session.can('initiatives.view') ? t.home.shortcutList : t.home.shortcutListAssociate;

  return (
    <>
      <div className="mb-6">
        <span className="eyebrow mb-1">{org?.short}</span>
        <h1>{fill(t.home.welcome, { name: me.name.split(' ')[0] })}</h1>
        <p className="text-muted mt-2">{t.home.intro}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={`${t.home.waiting} (${waiting.length})`}>
            {waiting.length === 0 && <Empty>{t.home.waitingEmpty}</Empty>}
            <ul className="divide-line divide-y">
              {waiting.map((w) => (
                <li key={w.key} className="flex items-start gap-3 py-3">
                  <span className="bg-brand-tint text-brand mt-0.5 rounded p-1.5">
                    <w.icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="eyebrow">{w.kind}</span>
                    <Link to={w.to} className="plain-link block font-semibold">
                      {w.title}
                    </Link>
                    {w.sub && <span className="muted block">{w.sub}</span>}
                  </div>
                  {w.due && (
                    <Badge tone={daysFromToday(w.due) < 0 ? 'orange' : 'amber'}>
                      {fill(daysFromToday(w.due) < 0 ? t.home.overdue : t.home.due, { date: formatDate(w.due) })}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section title={t.home.whatsNew}>
            <ul className="space-y-3">
              {news.map((a) => {
                const actor = db.people.find((p) => p.id === a.actorId);
                return (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <Avatar name={actor?.name ?? '?'} />
                    <p className="min-w-0">
                      <strong>{actor?.name}</strong> {fill(t.activity[a.verb], { detail: a.detail ?? '' })} <Link to={a.link}>{a.title}</Link>
                      <span className="text-muted block text-xs">{relativeDate(a.date)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={t.home.pinned}>
            <ul className="space-y-4">
              {db.pinned.map((p) => (
                <li key={p.id} className="border-accent border-l-4 pl-3 text-sm">
                  <h3 className="flex items-center gap-1.5">
                    <Pin size={14} className="text-accent-text shrink-0" aria-hidden="true" />
                    {p.title}
                  </h3>
                  <p className="mt-1">{p.text}</p>
                  <p className="text-muted mt-1 text-xs">
                    {db.people.find((x) => x.id === p.authorId)?.name} · {formatDate(p.date)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={t.home.upcoming}>
            {upcoming.length === 0 && <Empty>{t.home.upcomingEmpty}</Empty>}
            <ul className="divide-line divide-y">
              {upcoming.map((m) => (
                <li key={m.id} className="py-2.5 text-sm">
                  <span className="text-muted flex items-center gap-1.5 text-xs font-semibold">
                    <CalendarDays size={13} aria-hidden="true" />
                    {formatRange(m.date, m.endDate)} · {t.eventTypes[m.type]}
                  </span>
                  <Link to={`/calendar/${m.id}`} className="plain-link font-semibold">
                    {m.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/calendar" className="mt-3 inline-block text-sm">
              {t.home.openCalendar}
            </Link>
          </Section>

          {session.can('initiatives.view') && (
            <Section title={t.home.myInitiatives}>
              {mine.length === 0 && <Empty>{t.home.myInitiativesEmpty}</Empty>}
              <ul className="divide-line divide-y">
                {mine.slice(0, 6).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link to={`/initiatives/${i.id}`} className="plain-link font-semibold">
                      {i.title}
                    </Link>
                    <Badge tone="blue">{t.columns[i.column]}</Badge>
                  </li>
                ))}
              </ul>
              <Link to="/initiatives" className="mt-3 inline-block text-sm">
                {t.home.openBoard}
              </Link>
            </Section>
          )}

          <Section title={t.home.shortcuts}>
            <ul className="flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <li key={s.to}>
                  <Link to={fill(s.to, { country: org?.country ?? '' })} className="btn btn-ghost btn-sm">
                    <Filter size={13} aria-hidden="true" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}

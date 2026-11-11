import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, PageHeader, Section } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatRange, includesText } from '../lib/format';
import { visibleDocs, visibleMeetings, visibleThreads } from '../lib/visibility';
import { useSession } from '../store/session';
import { useDb } from '../store/store';

interface Hit {
  to: string;
  title: string;
  sub?: ReactNode;
}

/** Search across the whole workspace, limited to what the current role may see. */
export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const db = useDb();
  const session = useSession();
  const has = (...texts: (string | undefined)[]) => includesText(texts.join(' '), q);

  const groups: { title: string; hits: Hit[] }[] = !q.trim()
    ? []
    : [
        {
          title: t.search.initiatives,
          hits: session.can('initiatives.view')
            ? db.initiatives.filter((i) => has(i.title, i.problem, i.hypothesis, i.learned)).map((i) => ({ to: `/initiatives/${i.id}`, title: i.title, sub: `${i.wp} · ${t.columns[i.column]}` }))
            : [],
        },
        {
          title: t.search.documents,
          hits: visibleDocs(db.documents, session).filter((d) => has(d.title, d.description)).map((d) => ({ to: `/documents/${d.id}`, title: d.title, sub: `${t.docTypes[d.type]} · ${t.docStatus[d.status]}` })),
        },
        {
          title: t.search.discussions,
          hits: visibleThreads(db.threads, session).filter((th) => has(th.title, ...th.posts.map((p) => p.text))).map((th) => ({ to: `/discussions/${th.id}`, title: th.title, sub: t.threadKinds[th.kind] })),
        },
        {
          title: t.search.meetings,
          hits: visibleMeetings(db.meetings, session)
            .filter((m) => has(m.title, m.location, session.can('calendar.viewAll') ? m.notes + m.decisions.map((d) => d.text).join(' ') : ''))
            .map((m) => ({ to: `/calendar/${m.id}`, title: m.title, sub: `${t.eventTypes[m.type]} · ${formatRange(m.date, m.endDate)}` })),
        },
        {
          title: t.search.organisations,
          hits: db.organisations.filter((o) => has(o.name, o.about, ...o.expertise)).map((o) => ({ to: `/network/${o.id}`, title: o.name, sub: t.countries[o.country] })),
        },
      ].filter((g) => g.hits.length > 0);

  return (
    <>
      <PageHeader title={t.search.title} intro={q.trim() ? fill(t.search.for, { q }) : t.search.empty} />
      {q.trim() && groups.length === 0 && <Empty>{fill(t.search.none, { q })}</Empty>}
      <div className="space-y-5">
        {groups.map((g) => (
          <Section key={g.title} title={`${g.title} (${g.hits.length})`}>
            <ul className="divide-line divide-y">
              {g.hits.map((h) => (
                <li key={h.to} className="py-2 text-sm">
                  <Link to={h.to} className="font-semibold">
                    {h.title}
                  </Link>
                  <span className="text-muted block text-xs">{h.sub}</span>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </>
  );
}

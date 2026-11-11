import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { NotFound } from '../components/Guard';
import { OPEN_PLATFORM_URL } from '../components/Layout';
import { Badge, PageHeader, Progress } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatDate } from '../lib/format';
import { countryOptions, phases } from '../lib/reference';
import { setGuideItem, setGuideNote } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Guide, Phase } from '../types';

type Status = 'not-started' | 'in-progress' | 'done';
const tone = { 'not-started': 'grey', 'in-progress': 'amber', done: 'green' } as const;

const doneCount = (guide: Guide, phase: Phase) => (guide.done[phase.id] ?? []).length;
/** The status of a phase follows from its checklist. */
function phaseStatus(guide: Guide, phase: Phase): Status {
  const n = doneCount(guide, phase);
  return n === 0 ? 'not-started' : n >= phase.activities.length ? 'done' : 'in-progress';
}
const totalItems = phases.reduce((sum, p) => sum + p.activities.length, 0);
const totalDone = (guide: Guide) => phases.reduce((sum, p) => sum + doneCount(guide, p), 0);

/** Overview: compare the progress of all organisations. */
export default function Guides() {
  const db = useDb();
  const { get } = useFilters();
  const rows = db.guides
    .map((g) => ({ guide: g, org: db.organisations.find((o) => o.id === g.orgId)! }))
    .filter((r) => r.org && (!get('country') || r.org.country === get('country')));
  return (
    <>
      <PageHeader title={t.guides.title} intro={t.guides.intro} />
      <FilterBar shown={rows.length} total={db.guides.length} filters={[{ key: 'country', label: t.common.country, options: countryOptions }]} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">{t.guides.overview}</caption>
          <thead className="border-line text-muted border-b text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">{t.common.organisation}</th>
              {phases.map((p) => (
                <th key={p.id} scope="col" className="px-2 py-3 normal-case">
                  <span className="block uppercase">{fill(t.guides.phase, { n: p.id })}</span>
                  <span className="font-normal">{p.name}</span>
                </th>
              ))}
              <th scope="col" className="w-40 px-4 py-3">{t.guides.total}</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map(({ guide, org }) => (
              <tr key={org.id} className="align-top">
                <th scope="row" className="px-4 py-3 font-semibold">
                  <Link to={`/guides/${org.id}`} aria-label={fill(t.guides.openGuide, { org: org.short })}>
                    {org.short}
                  </Link>
                  <span className="text-muted block text-xs font-normal">{t.countries[org.country]}</span>
                </th>
                {phases.map((p) => {
                  const status = phaseStatus(guide, p);
                  return (
                    <td key={p.id} className="px-2 py-3">
                      <Badge tone={tone[status]}>{t.guideStatus[status]}</Badge>
                      <span className="text-muted mt-1 block text-xs">
                        {doneCount(guide, p)}/{p.activities.length}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <Progress value={totalDone(guide)} max={totalItems} label={fill(t.guides.itemsDone, { done: totalDone(guide), total: totalItems })} />
                  <span className="text-muted mt-1 block text-xs">{fill(t.guides.lastUpdated, { date: formatDate(guide.updated) })}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PhaseNote({ orgId, phaseId, value, canEdit }: { orgId: string; phaseId: number; value: string; canEdit: boolean }) {
  const [note, setNote] = useState(value);
  if (!canEdit) return value ? <p className="bg-soft mt-3 rounded p-3 text-sm">{value}</p> : null;
  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        setGuideNote(orgId, phaseId, note.trim());
        toast(t.common.saved);
      }}
    >
      <label className="label" htmlFor={`note-${phaseId}`}>
        {t.guides.note}
      </label>
      <div className="flex gap-2">
        <input id={`note-${phaseId}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn btn-ghost shrink-0" disabled={note === value}>
          {t.guides.saveNote}
        </button>
      </div>
    </form>
  );
}

export function GuideDetail() {
  const { orgId } = useParams();
  const db = useDb();
  const session = useSession();
  const guide = db.guides.find((g) => g.orgId === orgId);
  const org = db.organisations.find((o) => o.id === orgId);
  if (!guide || !org) return <NotFound />;
  const canEdit = session.role === 'admin' || session.user?.orgId === org.id;

  return (
    <>
      <PageHeader eyebrow={`${t.guides.guideFor} · ${t.countries[org.country]}`} title={org.name} back={{ to: '/guides', label: t.guides.allGuides }} />
      <div className="card mb-5 text-sm">
        <p>
          {fill(t.guides.ownedBy, { org: org.short })} <strong>{canEdit ? t.guides.canEdit : t.guides.readOnly}</strong>
        </p>
        <div className="mt-3 max-w-md">
          <Progress value={totalDone(guide)} max={totalItems} label={fill(t.guides.itemsDone, { done: totalDone(guide), total: totalItems })} />
        </div>
        <p className="text-muted mt-2 flex flex-wrap gap-x-4 text-xs">
          {fill(t.guides.lastUpdated, { date: formatDate(guide.updated) })}
          <a href={`${OPEN_PLATFORM_URL}model/`} className="inline-flex items-center gap-1">
            {t.guides.modelLink}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </p>
      </div>

      {/* Five-phase view: jump links on top, one card per phase below */}
      <nav aria-label={t.common.phase} className="mb-5">
        <ol className="grid gap-2 sm:grid-cols-5">
          {phases.map((p) => {
            const status = phaseStatus(guide, p);
            return (
              <li key={p.id}>
                <a href={`#phase-${p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`phase-${p.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className={`text-ink block h-full rounded border-t-4 bg-white p-3 no-underline shadow-sm ${status === 'done' ? 'border-[#1f7a45]' : status === 'in-progress' ? 'border-accent' : 'border-[#aeb8c2]'}`}>
                  <span className="eyebrow">{fill(t.guides.phase, { n: p.id })}</span>
                  <span className="block text-sm leading-snug font-semibold">{p.name}</span>
                  <span className="mt-1.5 block">
                    <Badge tone={tone[status]}>{t.guideStatus[status]}</Badge>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-5">
        {phases.map((p) => {
          const status = phaseStatus(guide, p);
          const done = guide.done[p.id] ?? [];
          return (
            <section key={p.id} id={`phase-${p.id}`} className="card scroll-mt-20" aria-labelledby={`phase-title-${p.id}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="eyebrow">{fill(t.guides.phase, { n: p.id })}</span>
                  <h2 id={`phase-title-${p.id}`}>{p.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted text-sm">{fill(t.guides.itemsDone, { done: done.length, total: p.activities.length })}</span>
                  <Badge tone={tone[status]}>{t.guideStatus[status]}</Badge>
                </div>
              </div>
              <fieldset disabled={!canEdit}>
                <legend className="sr-only">{fill(t.guides.checklist, { phase: p.name })}</legend>
                <ul className="grid gap-x-6 sm:grid-cols-2">
                  {p.activities.map((activity, index) => (
                    <li key={activity}>
                      <label className={`flex items-start gap-2.5 py-1.5 text-sm ${canEdit ? 'cursor-pointer' : ''}`}>
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={done.includes(index)} onChange={(e) => setGuideItem(org.id, p.id, index, e.target.checked, session.userId)} />
                        <span>
                          <span className="text-muted">
                            {p.id}.{index + 1}{' '}
                          </span>
                          {activity}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <PhaseNote orgId={org.id} phaseId={p.id} value={guide.notes[p.id] ?? ''} canEdit={canEdit} />
            </section>
          );
        })}
      </div>
    </>
  );
}

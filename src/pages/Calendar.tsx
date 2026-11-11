import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { Badge, Empty, Field, Modal, PageHeader, Select, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatMonth, formatRange, includesText, today } from '../lib/format';
import { eventTypes, wpOptions } from '../lib/reference';
import { visibleMeetings } from '../lib/visibility';
import { addMeeting, type MeetingInput } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { EventType, Meeting, WpId } from '../types';

const typeOptions = eventTypes.map((e) => ({ value: e, label: t.eventTypes[e] }));

export const calendarTabs = (withDecisions: boolean) => [
  { to: '/calendar', label: t.calendar.tabCalendar, end: true },
  ...(withDecisions ? [{ to: '/calendar/decisions', label: t.calendar.tabDecisions }] : []),
];

// Each type has its own colour and is always shown together with its name.
const typeStyle: Record<EventType, string> = {
  'partner-meeting': 'border-l-brand bg-brand-tint',
  workshop: 'border-l-[#1f7a45] bg-[#e7f5ec]',
  'study-visit': 'border-l-[#7a3fa0] bg-[#f3eaf8]',
  training: 'border-l-[#0e7490] bg-[#e3f4f8]',
  deadline: 'border-l-accent bg-[#fde8de]',
};

const pad = (n: number) => String(n).padStart(2, '0');
const onDay = (m: Meeting, day: string) => m.date <= day && (m.endDate ?? m.date) >= day;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function EventRow({ m }: { m: Meeting }) {
  return (
    <li className={`rounded border-l-4 p-3 ${typeStyle[m.type]}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span>{formatRange(m.date, m.endDate)}</span>
        <Badge tone="outline">{t.eventTypes[m.type]}</Badge>
        <Badge tone="outline">{m.wp}</Badge>
        {m.audience === 'all' && <Badge tone="outline">{t.calendar.open}</Badge>}
      </div>
      <Link to={`/calendar/${m.id}`} className="plain-link mt-1 block font-semibold">
        {m.title}
      </Link>
      {(m.time || m.location) && (
        <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-[#33414a]">
          {m.time && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              {m.time}
            </span>
          )}
          {m.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" />
              {m.location}
            </span>
          )}
        </p>
      )}
    </li>
  );
}

function MonthGrid({ month, events }: { month: string; events: Meeting[] }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <table className="card hidden w-full table-fixed border-collapse p-0 md:table">
      <caption className="sr-only">{formatMonth(month)}</caption>
      <thead>
        <tr>
          {t.calendar.weekdays.map((d) => (
            <th key={d} scope="col" className="border-line text-muted border-b px-2 py-2 text-left text-xs font-semibold uppercase">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((day, di) => {
              const iso = day ? `${month}-${pad(day)}` : '';
              const dayEvents = day ? events.filter((e) => onDay(e, iso)) : [];
              const isToday = iso === today();
              return (
                <td key={di} className={`border-line h-28 border align-top ${day ? 'bg-white' : 'bg-soft'} p-1.5`}>
                  {day && (
                    <>
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${isToday ? 'bg-brand text-white' : 'text-ink'}`}>
                        {day}
                        {isToday && <span className="sr-only"> ({t.time.today})</span>}
                      </span>
                      <ul className="mt-1 space-y-1">
                        {dayEvents.map((e) => (
                          <li key={e.id}>
                            <Link to={`/calendar/${e.id}`} className={`text-ink block rounded-sm border-l-4 px-1.5 py-1 text-xs leading-tight no-underline hover:underline ${typeStyle[e.type]}`}>
                              <span className="block font-semibold">{t.eventTypes[e.type]}</span>
                              {e.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AddEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const navigate = useNavigate();
  const empty: MeetingInput = { title: '', type: 'workshop', date: '', time: '', location: 'Online', wp: 'WP1', audience: 'partners' };
  const [form, setForm] = useState<MeetingInput>(empty);
  const [submitted, setSubmitted] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.title.trim() || !form.date) return;
    const id = addMeeting({ ...form, title: form.title.trim() }, session.userId);
    setForm(empty);
    setSubmitted(false);
    onClose();
    toast(t.calendar.added);
    navigate(`/calendar/${id}`);
  };
  return (
    <Modal open={open} onClose={onClose} title={t.calendar.addTitle}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t.calendar.fTitle} error={submitted && !form.title.trim() ? t.common.required : undefined}>
          {(p) => <input {...p} className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.common.type}>{(p) => <Select {...p} value={form.type} onChange={(v) => setForm({ ...form, type: v as EventType })} options={typeOptions} />}</Field>
          <Field label={t.common.wp}>{(p) => <Select {...p} value={form.wp} onChange={(v) => setForm({ ...form, wp: v as WpId })} options={wpOptions} />}</Field>
          <Field label={t.calendar.fDate} error={submitted && !form.date ? t.common.required : undefined}>
            {(p) => <input {...p} type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}
          </Field>
          <Field label={t.calendar.fTime} hint={t.calendar.fTimeHint}>
            {(p) => <input {...p} className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />}
          </Field>
        </div>
        <Field label={t.calendar.fLocation}>{(p) => <input {...p} className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />}</Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.audience === 'all'} onChange={(e) => setForm({ ...form, audience: e.target.checked ? 'all' : 'partners' })} />
          {t.calendar.fAudience}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn">
            {t.calendar.add}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Calendar() {
  const db = useDb();
  const session = useSession();
  const { get, set } = useFilters();
  const [adding, setAdding] = useState(false);
  const view = get('view') === 'list' ? 'list' : 'month';
  const month = get('month') || today().slice(0, 7);

  const all = visibleMeetings(db.meetings, session);
  const events = all
    .filter((m) => (!get('wp') || m.wp === get('wp')) && (!get('type') || m.type === get('type')) && (!get('q') || includesText(`${m.title} ${m.location}`, get('q'))))
    .sort((a, b) => a.date.localeCompare(b.date));
  const inMonth = events.filter((m) => m.date.slice(0, 7) <= month && (m.endDate ?? m.date).slice(0, 7) >= month);
  const upcoming = events.filter((m) => (m.endDate ?? m.date) >= today());
  const earlier = events.filter((m) => (m.endDate ?? m.date) < today()).reverse();

  const viewButton = (v: 'month' | 'list', label: string) => (
    <button type="button" aria-pressed={view === v} onClick={() => set('view', v === 'list' ? 'list' : '')} className={`btn btn-sm ${view === v ? '' : 'btn-ghost'}`}>
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        title={t.calendar.title}
        intro={t.calendar.intro}
        actions={
          session.can('calendar.edit') && (
            <button type="button" className="btn" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              {t.calendar.add}
            </button>
          )
        }
      />
      <Tabs tabs={calendarTabs(session.can('calendar.viewAll'))} label={t.calendar.title} />
      <FilterBar
        searchLabel={t.common.search}
        shown={events.length}
        total={all.length}
        filters={[
          { key: 'wp', label: t.common.wp, options: wpOptions },
          { key: 'type', label: t.common.type, options: typeOptions },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t.calendar.view} className="flex gap-1">
          {viewButton('month', t.calendar.month)}
          {viewButton('list', t.calendar.list)}
        </div>
        {view === 'month' && (
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" aria-label={t.calendar.prev} onClick={() => set('month', shiftMonth(month, -1))}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <h2 className="text-ink min-w-40 text-center text-lg font-semibold" aria-live="polite">
              {formatMonth(month)}
            </h2>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={t.calendar.next} onClick={() => set('month', shiftMonth(month, 1))}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('month', '')}>
              {t.calendar.thisMonth}
            </button>
          </div>
        )}
      </div>

      {view === 'month' ? (
        <>
          <MonthGrid month={month} events={events} />
          {/* On small screens a month grid is too narrow: the same month is shown as a list. */}
          <div className="md:hidden">
            <h3 className="mb-2">{fill(t.calendar.smallScreen, { month: formatMonth(month) })}</h3>
            {inMonth.length === 0 ? <Empty>{t.calendar.noEventsMonth}</Empty> : <ul className="space-y-2">{inMonth.map((m) => <EventRow key={m.id} m={m} />)}</ul>}
          </div>
        </>
      ) : events.length === 0 ? (
        <Empty>{t.calendar.noEvents}</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3">
              {t.calendar.upcoming} ({upcoming.length})
            </h2>
            <ul className="space-y-2">{upcoming.map((m) => <EventRow key={m.id} m={m} />)}</ul>
          </section>
          <section>
            <h2 className="mb-3">
              {t.calendar.earlier} ({earlier.length})
            </h2>
            <ul className="space-y-2">{earlier.map((m) => <EventRow key={m.id} m={m} />)}</ul>
          </section>
        </div>
      )}
      <AddEventModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

export function DecisionLog() {
  const db = useDb();
  const { get } = useFilters();
  const all = db.meetings.flatMap((m) => m.decisions.map((d) => ({ ...d, meeting: m }))).sort((a, b) => b.meeting.date.localeCompare(a.meeting.date));
  const list = all.filter((d) => (!get('wp') || d.meeting.wp === get('wp')) && (!get('q') || includesText(`${d.text} ${d.meeting.title}`, get('q'))));
  return (
    <>
      <PageHeader title={t.calendar.title} intro={t.calendar.decisionLogIntro} />
      <Tabs tabs={calendarTabs(true)} label={t.calendar.title} />
      <FilterBar searchLabel={t.calendar.searchDecisions} shown={list.length} total={all.length} filters={[{ key: 'wp', label: t.common.wp, options: wpOptions }]} />
      {list.length === 0 ? (
        <Empty>{t.common.noResults}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-line text-muted border-b text-xs tracking-wide uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">{t.calendar.decision}</th>
                <th scope="col" className="px-3 py-3">{t.calendar.meeting}</th>
                <th scope="col" className="hidden px-3 py-3 sm:table-cell">{t.common.wp}</th>
                <th scope="col" className="px-3 py-3">{t.common.date}</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {list.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-4 py-3 font-semibold">{d.text}</td>
                  <td className="px-3 py-3">
                    <Link to={`/calendar/${d.meeting.id}`}>{d.meeting.title}</Link>
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <Badge tone="blue">{d.meeting.wp}</Badge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatRange(d.meeting.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

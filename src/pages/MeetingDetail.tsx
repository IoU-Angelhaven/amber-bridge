import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import { Message, NotFound } from '../components/Guard';
import { LinkedDocs } from '../components/LinkedDocs';
import { Badge, Empty, Field, PageHeader, Section, Select } from '../components/ui';
import { t } from '../i18n/en';
import { daysFromToday, fill, formatDate, formatLongDate } from '../lib/format';
import { wpName } from '../lib/reference';
import { addAction, addDecision, setActionDone, updateMeeting } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';

export default function MeetingDetail() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const meeting = db.meetings.find((m) => m.id === id);
  const [notes, setNotes] = useState(meeting?.notes ?? '');
  const [agendaItem, setAgendaItem] = useState('');
  const [decision, setDecision] = useState('');
  const [action, setAction] = useState({ text: '', ownerId: session.userId, due: '' });

  if (!meeting) return <NotFound />;
  const full = session.can('calendar.viewAll');
  if (!full && meeting.audience !== 'all') return <Message title={t.common.noAccessTitle} text={t.common.noAccessText} />;
  const canEdit = session.can('calendar.edit');
  const members = db.people.filter((p) => p.status === 'active' && p.role !== 'associate');

  return (
    <>
      <PageHeader eyebrow={`${t.eventTypes[meeting.type]} · ${meeting.wp} ${wpName(meeting.wp)}`} title={meeting.title} back={{ to: '/calendar', label: t.calendar.title }} />

      <div className="card mb-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <p className="flex items-center gap-2">
          <Clock size={16} className="text-accent-text" aria-hidden="true" />
          <span>
            <span className="sr-only">{t.calendar.when}: </span>
            {formatLongDate(meeting.date)}
            {meeting.endDate && ` – ${formatLongDate(meeting.endDate)}`}
            {meeting.time && `, ${meeting.time}`}
          </span>
        </p>
        {meeting.location && (
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-accent-text" aria-hidden="true" />
            <span>
              <span className="sr-only">{t.calendar.where}: </span>
              {meeting.location}
            </span>
          </p>
        )}
        {meeting.audience === 'all' && <Badge tone="blue">{t.calendar.open}</Badge>}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Section title={t.calendar.agenda}>
            {meeting.agenda.length === 0 ? (
              <Empty>{t.calendar.noAgenda}</Empty>
            ) : (
              <ol className="list-decimal space-y-1.5 pl-5">
                {meeting.agenda.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            )}
            {canEdit && (
              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!agendaItem.trim()) return;
                  updateMeeting(meeting.id, { agenda: [...meeting.agenda, agendaItem.trim()] });
                  setAgendaItem('');
                }}
              >
                <Field label={t.calendar.addAgenda} className="min-w-0 flex-1">
                  {(p) => <input {...p} className="input" value={agendaItem} onChange={(e) => setAgendaItem(e.target.value)} />}
                </Field>
                <button type="submit" className="btn btn-ghost" disabled={!agendaItem.trim()}>
                  {t.common.add}
                </button>
              </form>
            )}
          </Section>

          {full && (
            <Section title={t.calendar.notes}>
              {canEdit ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMeeting(meeting.id, { notes });
                    toast(t.common.saved);
                  }}
                >
                  <textarea className="input" rows={5} aria-label={t.calendar.notes} placeholder={t.calendar.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <button type="submit" className="btn btn-ghost mt-2" disabled={notes === meeting.notes}>
                    {t.calendar.saveNotes}
                  </button>
                </form>
              ) : (
                <p className="whitespace-pre-line">{meeting.notes || t.calendar.noNotes}</p>
              )}
            </Section>
          )}

          <LinkedDocs target="meeting" targetId={meeting.id} documentIds={full ? meeting.documentIds : meeting.documentIds.filter((d) => db.documents.find((x) => x.id === d)?.status === 'approved')} canEdit={canEdit} />
        </div>

        {full && (
          <div className="space-y-5">
            <Section title={`${t.calendar.decisions} (${meeting.decisions.length})`}>
              {meeting.decisions.length === 0 ? (
                <Empty>{t.calendar.noDecisions}</Empty>
              ) : (
                <ul className="space-y-2">
                  {meeting.decisions.map((d) => (
                    <li key={d.id} className="border-brand bg-brand-tint rounded border-l-4 px-3 py-2 text-sm">
                      {d.text}
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (
                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!decision.trim()) return;
                    addDecision(meeting.id, decision.trim(), session.userId);
                    setDecision('');
                    toast(t.calendar.decisionAdded);
                  }}
                >
                  <Field label={t.calendar.addDecision} className="min-w-0 flex-1">
                    {(p) => <input {...p} className="input" value={decision} onChange={(e) => setDecision(e.target.value)} />}
                  </Field>
                  <button type="submit" className="btn btn-ghost" disabled={!decision.trim()}>
                    {t.common.add}
                  </button>
                </form>
              )}
            </Section>

            <Section title={`${t.calendar.actions} (${meeting.actions.length})`}>
              {meeting.actions.length === 0 ? (
                <Empty>{t.calendar.noActions}</Empty>
              ) : (
                <ul className="divide-line divide-y">
                  {meeting.actions.map((a) => {
                    const owner = db.people.find((p) => p.id === a.ownerId);
                    const late = !a.done && daysFromToday(a.due) < 0;
                    return (
                      <li key={a.id} className="flex items-start gap-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={a.done}
                          disabled={!canEdit}
                          aria-label={fill(t.calendar.markDone, { text: a.text })}
                          onChange={(e) => setActionDone(meeting.id, a.id, e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={a.done ? 'text-muted line-through' : 'font-semibold'}>{a.text}</p>
                          <p className="text-muted text-xs">
                            {t.calendar.actionOwner}: {owner?.name} · {t.calendar.actionDue}: {formatDate(a.due)}
                          </p>
                        </div>
                        {a.done ? <Badge tone="green">{t.calendar.done}</Badge> : late ? <Badge tone="orange">{fill(t.home.overdue, { date: formatDate(a.due) })}</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              {canEdit && (
                <form
                  className="border-line mt-3 space-y-3 border-t pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!action.text.trim() || !action.due) return;
                    addAction(meeting.id, action.text.trim(), action.ownerId, action.due);
                    setAction({ text: '', ownerId: session.userId, due: '' });
                    toast(t.calendar.actionAdded);
                  }}
                >
                  <h3>{t.calendar.addAction}</h3>
                  <Field label={`${t.calendar.action} *`}>{(p) => <input {...p} className="input" value={action.text} onChange={(e) => setAction({ ...action, text: e.target.value })} />}</Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t.calendar.actionOwner}>
                      {(p) => <Select {...p} value={action.ownerId} onChange={(v) => setAction({ ...action, ownerId: v })} options={members.map((m) => ({ value: m.id, label: m.name }))} />}
                    </Field>
                    <Field label={`${t.calendar.actionDue} *`}>
                      {(p) => <input {...p} type="date" className="input" value={action.due} onChange={(e) => setAction({ ...action, due: e.target.value })} />}
                    </Field>
                  </div>
                  <button type="submit" className="btn btn-ghost" disabled={!action.text.trim() || !action.due}>
                    {t.calendar.addAction}
                  </button>
                </form>
              )}
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

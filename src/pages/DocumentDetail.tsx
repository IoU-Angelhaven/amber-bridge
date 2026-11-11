import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { Comments } from '../components/Comments';
import { Message, NotFound } from '../components/Guard';
import { Badge, DocStatusBadge, Empty, Field, Notice, PageHeader, Section, Select } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatDate, formatRange } from '../lib/format';
import { wpName } from '../lib/reference';
import { addDocVersion, linkDocument, setDocStatus } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { DocStatus } from '../types';

export default function DocumentDetail() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const [note, setNote] = useState('');
  const [initiativeChoice, setInitiativeChoice] = useState('');
  const [meetingChoice, setMeetingChoice] = useState('');

  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return <NotFound />;
  if (doc.status !== 'approved' && !session.can('documents.viewAll')) return <Message title={t.common.noAccessTitle} text={t.common.noAccessText} />;

  const canAdd = session.can('documents.add');
  const person = (pid?: string) => db.people.find((p) => p.id === pid);
  const initiatives = session.can('initiatives.view') ? db.initiatives.filter((i) => i.documentIds.includes(doc.id)) : [];
  const meetings = session.can('calendar.viewAll') ? db.meetings.filter((m) => m.documentIds.includes(doc.id)) : [];

  const change = (status: DocStatus) => {
    setDocStatus(doc.id, status, t.docStatus[status], session.userId);
    toast(fill(t.documents.statusChanged, { status: t.docStatus[status] }));
  };

  return (
    <>
      <PageHeader
        eyebrow={`${t.docTypes[doc.type]} · ${doc.wp}`}
        title={doc.title}
        intro={doc.description}
        back={{ to: '/documents', label: t.documents.title }}
        actions={
          <>
            {canAdd && doc.status === 'draft' && (
              <button type="button" className="btn" onClick={() => change('review')}>
                {t.documents.sendForReview}
              </button>
            )}
            {doc.status === 'review' && session.can('documents.approve') && (
              <button type="button" className="btn" onClick={() => change('approved')}>
                {t.documents.approve}
              </button>
            )}
            {canAdd && doc.status !== 'draft' && (
              <button type="button" className="btn btn-ghost" onClick={() => change('draft')}>
                {t.documents.backToDraft}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => toast(t.common.mockAction)}>
              <Download size={15} aria-hidden="true" />
              {t.documents.download}
            </button>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t.documents.preview}>
            <div className="border-line bg-soft text-muted flex min-h-64 flex-col items-center justify-center gap-2 rounded border p-6 text-center">
              <FileText size={44} strokeWidth={1.25} aria-hidden="true" />
              <p className="text-ink font-semibold">{fill(t.documents.previewText, { fileType: doc.fileType })}</p>
              <p className="text-sm">{t.documents.previewNote}</p>
            </div>
          </Section>

          <Section title={t.documents.versions}>
            <ol className="divide-line divide-y">
              {doc.versions.map((v, i) => (
                <li key={v.version + v.date} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="w-24 font-semibold">
                    {t.documents.version} {v.version}
                  </span>
                  <span className="min-w-0 flex-1">{v.note}</span>
                  {i === 0 && <Badge tone="blue">{t.documents.current}</Badge>}
                  <span className="text-muted text-xs">
                    {person(v.authorId)?.name} · {formatDate(v.date)}
                  </span>
                </li>
              ))}
            </ol>
            {canAdd && (
              <form
                className="border-line mt-3 space-y-3 border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  addDocVersion(doc.id, note.trim(), session.userId);
                  setNote('');
                  toast(t.documents.versionAdded);
                }}
              >
                <h3>{t.documents.addVersion}</h3>
                <Notice />
                <Field label={t.documents.versionNote} hint={t.documents.uploadMock}>
                  {(p) => <input {...p} className="input" value={note} onChange={(e) => setNote(e.target.value)} />}
                </Field>
                <button type="submit" className="btn btn-ghost" disabled={!note.trim()}>
                  {t.documents.addVersion}
                </button>
              </form>
            )}
          </Section>

          <Comments targetType="document" targetId={doc.id} canAdd={canAdd} />
        </div>

        <div className="space-y-5">
          <Section title={t.documents.details}>
            <dl className="divide-line divide-y text-sm">
              {(
                [
                  [t.common.status, <DocStatusBadge status={doc.status} />],
                  [t.documents.docType, t.docTypes[doc.type]],
                  [t.common.wp, `${doc.wp} ${wpName(doc.wp)}`],
                  [t.common.country, t.countries[doc.country]],
                  [t.documents.file, doc.fileType],
                  [t.common.owner, person(doc.ownerId)?.name],
                  ...(doc.reviewerId ? [[t.documents.reviewer, person(doc.reviewerId)?.name]] : []),
                  [t.common.created, formatDate(doc.created)],
                  [t.common.updated, formatDate(doc.updated)],
                ] as [string, React.ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="py-2">
                  <dt className="text-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {doc.status === 'review' && !session.can('documents.approve') && <p className="text-muted mt-2 text-xs">{t.documents.approveHint}</p>}
          </Section>

          {session.can('documents.viewAll') && (
            <Section title={t.documents.linkedTo}>
              {initiatives.length + meetings.length === 0 && <Empty>{t.documents.notLinked}</Empty>}
              {initiatives.length > 0 && (
                <>
                  <h3 className="mt-1">{t.documents.linkedInitiatives}</h3>
                  <ul className="mb-3 text-sm">
                    {initiatives.map((i) => (
                      <li key={i.id} className="py-1">
                        <Link to={`/initiatives/${i.id}`}>{i.title}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {meetings.length > 0 && (
                <>
                  <h3 className="mt-1">{t.documents.linkedMeetings}</h3>
                  <ul className="text-sm">
                    {meetings.map((m) => (
                      <li key={m.id} className="py-1">
                        <Link to={`/calendar/${m.id}`}>{m.title}</Link> <span className="text-muted">· {formatRange(m.date, m.endDate)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {canAdd && (
                <div className="border-line mt-3 space-y-3 border-t pt-3">
                  <div className="flex items-end gap-2">
                    <Field label={t.documents.linkToInitiative} className="min-w-0 flex-1">
                      {(p) => (
                        <Select {...p} value={initiativeChoice} onChange={setInitiativeChoice} placeholder={t.documents.chooseInitiative} options={db.initiatives.filter((i) => !i.documentIds.includes(doc.id)).map((i) => ({ value: i.id, label: i.title }))} />
                      )}
                    </Field>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={!initiativeChoice}
                      onClick={() => {
                        linkDocument('initiative', initiativeChoice, doc.id, true);
                        setInitiativeChoice('');
                        toast(t.documents.linked);
                      }}
                    >
                      {t.common.link}
                    </button>
                  </div>
                  <div className="flex items-end gap-2">
                    <Field label={t.documents.linkToMeeting} className="min-w-0 flex-1">
                      {(p) => (
                        <Select {...p} value={meetingChoice} onChange={setMeetingChoice} placeholder={t.documents.chooseMeeting} options={db.meetings.filter((m) => !m.documentIds.includes(doc.id)).map((m) => ({ value: m.id, label: m.title }))} />
                      )}
                    </Field>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={!meetingChoice}
                      onClick={() => {
                        linkDocument('meeting', meetingChoice, doc.id, true);
                        setMeetingChoice('');
                        toast(t.documents.linked);
                      }}
                    >
                      {t.common.link}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

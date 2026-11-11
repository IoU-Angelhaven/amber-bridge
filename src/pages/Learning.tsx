import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, GraduationCap } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { Avatar, Badge, Empty, Field, PageHeader, Section, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { formatDate, formatDateTime, includesText } from '../lib/format';
import { countryOptions } from '../lib/reference';
import { addExperience, respondToSubmission, setSubmissionStatus, submissionToInitiative } from '../store/actions';
import { useSession, type Session } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Course, Submission } from '../types';

const tabs = (s: Session) => [
  { to: '/learning', label: t.learning.tabCourses, end: true },
  ...(s.can('learning.facilitators') ? [{ to: '/learning/facilitators', label: t.learning.tabFacilitators }] : []),
  ...(s.can('learning.inbox') ? [{ to: '/learning/inbox', label: t.learning.tabInbox }] : []),
];

const mock = () => toast(t.common.mockAction);

function CourseCard({ course, action }: { course: Course; action: string }) {
  const Icon = course.kind === 'material' ? FileText : BookOpen;
  return (
    <li className="card flex flex-col">
      <Icon size={22} className="text-brand mb-2" aria-hidden="true" />
      <h3>{course.title}</h3>
      <p className="text-muted mt-1 flex-1 text-sm">{course.description}</p>
      <p className="text-muted mt-2 text-xs font-semibold">
        {course.format} · {course.duration}
      </p>
      <button type="button" className="btn btn-ghost btn-sm mt-3 self-start" onClick={mock}>
        {action}
        <span className="sr-only">: {course.title}</span>
      </button>
    </li>
  );
}

export default function Learning() {
  const db = useDb();
  const session = useSession();
  const academy = db.courses.find((c) => c.kind === 'academy');
  return (
    <>
      <PageHeader title={t.learning.title} intro={t.learning.intro} />
      <Tabs tabs={tabs(session)} label={t.learning.title} />
      {academy && (
        <section className="bg-brand mb-8 rounded p-6 text-white md:p-8">
          <span className="text-xs font-bold tracking-wider text-[#ffd9c7] uppercase">{t.learning.academy}</span>
          <h2 className="mt-1 flex items-center gap-3 text-2xl font-light text-white md:text-3xl">
            <GraduationCap size={30} aria-hidden="true" />
            {academy.title}
          </h2>
          <p className="mt-2 max-w-2xl">{academy.description}</p>
          <p className="mt-2 text-sm font-semibold">
            {academy.format} · {academy.duration}
          </p>
          <button type="button" className="btn mt-4 border-white bg-white text-[#003399] hover:bg-[#eef1fb] hover:text-[#003399]" onClick={mock}>
            {t.learning.openAcademy}
          </button>
        </section>
      )}
      <h2 className="mb-3">{t.learning.courses}</h2>
      <ul className="mb-8 grid gap-4 md:grid-cols-3">
        {db.courses.filter((c) => c.kind === 'course').map((c) => <CourseCard key={c.id} course={c} action={t.learning.openCourse} />)}
      </ul>
      <h2 className="mb-3">{t.learning.material}</h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {db.courses.filter((c) => c.kind === 'material').map((c) => <CourseCard key={c.id} course={c} action={t.learning.openMaterial} />)}
      </ul>
    </>
  );
}

export function Facilitators() {
  const db = useDb();
  const session = useSession();
  const [text, setText] = useState('');
  return (
    <>
      <PageHeader title={t.learning.title} intro={t.learning.facilitatorIntro} />
      <Tabs tabs={tabs(session)} label={t.learning.title} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3">{t.learning.facilitatorMaterial}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {db.facilitatorMaterials.map((c) => <CourseCard key={c.id} course={c} action={t.learning.openMaterial} />)}
          </ul>
        </section>
        <Section title={t.learning.experiences}>
          <form
            className="mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              addExperience(text.trim(), session.userId);
              setText('');
              toast(t.learning.shared);
            }}
          >
            <Field label={t.learning.experienceLabel}>
              {(p) => <textarea {...p} className="input" rows={3} placeholder={t.learning.experiencePlaceholder} value={text} onChange={(e) => setText(e.target.value)} />}
            </Field>
            <button type="submit" className="btn mt-2" disabled={!text.trim()}>
              {t.learning.share}
            </button>
          </form>
          <ul className="space-y-4">
            {db.experiences.map((x) => {
              const author = db.people.find((p) => p.id === x.authorId);
              return (
                <li key={x.id} className="flex gap-3 text-sm">
                  <Avatar name={author?.name ?? '?'} />
                  <div>
                    <p>
                      <strong>{author?.name}</strong> <span className="text-muted">· {formatDateTime(x.date)}</span>
                    </p>
                    <p className="whitespace-pre-line">{x.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </>
  );
}

const statusTone = { new: 'orange', 'in-review': 'amber', answered: 'green' } as const;
const statusOptions = (['new', 'in-review', 'answered'] as const).map((s) => ({ value: s, label: t.learning.status[s] }));
const kindOptions = (['need', 'idea'] as const).map((k) => ({ value: k, label: t.learning.kind[k] }));

function SubmissionCard({ item }: { item: Submission }) {
  const session = useSession();
  const navigate = useNavigate();
  const [response, setResponse] = useState('');
  const canRespond = session.can('learning.respond');
  return (
    <li className="card">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="blue">{t.learning.kind[item.kind]}</Badge>
        <Badge tone={statusTone[item.status]}>{t.learning.status[item.status]}</Badge>
        <span className="text-muted text-xs">
          {t.learning.from}: {item.from}, {t.countries[item.country]} · {formatDate(item.date)}
        </span>
      </div>
      <p className="font-semibold">{item.text}</p>
      {item.response && (
        <div className="border-line bg-soft mt-3 rounded border-l-4 border-l-[#1f7a45] p-3 text-sm">
          <strong className="block">{t.learning.response}</strong>
          {item.response}
        </div>
      )}
      {item.initiativeId && session.can('initiatives.view') && (
        <Link to={`/initiatives/${item.initiativeId}`} className="mt-3 inline-block text-sm">
          {t.learning.openInitiative}
        </Link>
      )}
      {canRespond && item.status !== 'answered' && (
        <form
          className="border-line mt-4 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!response.trim()) return;
            respondToSubmission(item.id, response.trim());
            toast(t.learning.responded);
          }}
        >
          <Field label={t.learning.responseLabel}>{(p) => <textarea {...p} className="input" rows={2} value={response} onChange={(e) => setResponse(e.target.value)} />}</Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-sm" disabled={!response.trim()}>
              {t.learning.sendResponse}
            </button>
            {item.status === 'new' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubmissionStatus(item.id, 'in-review')}>
                {t.learning.markReview}
              </button>
            )}
            {!item.initiativeId && session.user && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const id = submissionToInitiative(item.id, session.user!);
                  toast(t.learning.initiativeCreated);
                  navigate(`/initiatives/${id}`);
                }}
              >
                {t.learning.toInitiative}
              </button>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

export function Inbox() {
  const db = useDb();
  const session = useSession();
  const { get } = useFilters();
  const list = db.submissions.filter(
    (s) => (!get('status') || s.status === get('status')) && (!get('kind') || s.kind === get('kind')) && (!get('country') || s.country === get('country')) && (!get('q') || includesText(`${s.text} ${s.from}`, get('q'))),
  );
  return (
    <>
      <PageHeader title={t.learning.title} intro={t.learning.inboxIntro} />
      <Tabs tabs={tabs(session)} label={t.learning.title} />
      {!session.can('learning.respond') && <p className="text-muted mb-4 text-sm">{t.learning.inboxMemberNote}</p>}
      <FilterBar
        searchLabel={t.common.search}
        shown={list.length}
        total={db.submissions.length}
        filters={[
          { key: 'status', label: t.common.status, options: statusOptions },
          { key: 'kind', label: t.common.type, options: kindOptions },
          { key: 'country', label: t.common.country, options: countryOptions },
        ]}
      />
      {list.length === 0 && <Empty>{t.common.noResults}</Empty>}
      <ul className="space-y-4">{list.map((s) => <SubmissionCard key={s.id} item={s} />)}</ul>
    </>
  );
}

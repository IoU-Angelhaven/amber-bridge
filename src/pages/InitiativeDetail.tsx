import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessagesSquare, Pencil, Share2 } from 'lucide-react';
import { Comments } from '../components/Comments';
import { NotFound } from '../components/Guard';
import { LinkedDocs } from '../components/LinkedDocs';
import { ProposalModal } from '../components/ProposalModal';
import { Badge, Field, InitiativeStatusBadge, Modal, PageHeader, Section, Select } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatDate } from '../lib/format';
import { columnOptions, phaseName, wpName } from '../lib/reference';
import { closeInitiative, createThread, moveInitiative, updateInitiative } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Column } from '../types';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="py-2">
    <dt className="text-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

export default function InitiativeDetail() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [learned, setLearned] = useState('');
  const [learnedError, setLearnedError] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const item = db.initiatives.find((i) => i.id === id);
  if (!item) return <NotFound />;

  const canEdit = session.can('initiatives.edit');
  const org = db.organisations.find((o) => o.id === item.orgId);
  const owner = db.people.find((p) => p.id === item.ownerId);
  const thread = db.threads.find((th) => th.id === item.threadId);
  const proposals = db.proposals.filter((p) => p.initiativeId === item.id);

  const startThread = () => {
    const threadId = createThread({ title: item.title, kind: 'initiative', initiativeId: item.id, wp: item.wp, language: 'en', text: item.problem }, session.userId);
    updateInitiative(item.id, { threadId });
    navigate(`/discussions/${threadId}`);
  };

  return (
    <>
      <PageHeader
        eyebrow={`${item.wp} · ${t.columns[item.column]}`}
        title={item.title}
        back={{ to: '/initiatives', label: t.board.title }}
        actions={
          canEdit && (
            <>
              <Link to={`/initiatives/${item.id}/edit`} className="btn btn-ghost">
                <Pencil size={15} aria-hidden="true" />
                {t.common.edit}
              </Link>
              {item.status === 'closed' ? (
                <button type="button" className="btn btn-ghost" onClick={() => updateInitiative(item.id, { status: 'active' })}>
                  {t.initiative.reopen}
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => updateInitiative(item.id, { status: item.status === 'paused' ? 'active' : 'paused' })}>
                    {item.status === 'paused' ? t.initiative.resume : t.initiative.hold}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setLearned(item.learned);
                      setClosing(true);
                    }}
                  >
                    {t.initiative.closeButton}
                  </button>
                </>
              )}
            </>
          )
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t.initiative.problem}>
            <p>{item.problem}</p>
          </Section>
          <Section title={t.initiative.hypothesis}>{item.hypothesis ? <p>{item.hypothesis}</p> : <p className="text-muted text-sm">{t.initiative.noHypothesis}</p>}</Section>
          <Section title={t.initiative.nextStep}>{item.nextStep ? <p>{item.nextStep}</p> : <p className="text-muted text-sm">{t.initiative.noNextStep}</p>}</Section>
          <Section title={t.initiative.learned} className={item.learned ? 'border-l-4 border-[#1f7a45]' : ''}>
            {item.learned ? <p className="whitespace-pre-line">{item.learned}</p> : <p className="text-muted text-sm">{t.initiative.learnedEmpty}</p>}
          </Section>
          <LinkedDocs target="initiative" targetId={item.id} documentIds={item.documentIds} canEdit={canEdit} />
          <Comments targetType="initiative" targetId={item.id} canAdd={canEdit} />
        </div>

        <div className="space-y-5">
          <Section title={t.initiative.details}>
            <dl className="divide-line divide-y">
              <Row label={t.common.status}>
                <InitiativeStatusBadge status={item.status} />
              </Row>
              <Row label={t.initiative.stage}>
                {canEdit ? (
                  <Select
                    aria-label={fill(t.board.moveLabel, { title: item.title })}
                    value={item.column}
                    options={columnOptions}
                    onChange={(v) => {
                      moveInitiative(item.id, v as Column, t.columns[v as Column], session.userId);
                      toast(fill(t.board.moved, { title: item.title, column: t.columns[v as Column] }));
                    }}
                  />
                ) : (
                  t.columns[item.column]
                )}
              </Row>
              <Row label={t.common.owner}>
                {owner?.name}
                <span className="text-muted block">{owner?.title}</span>
              </Row>
              <Row label={t.initiative.orgCountry}>
                <Link to={`/network/${org?.id}`}>{org?.short}</Link>, {org ? t.countries[org.country] : ''}
              </Row>
              <Row label={t.initiative.partners}>
                {item.partnerIds.length === 0 ? (
                  <span className="text-muted">{t.initiative.noPartners}</span>
                ) : (
                  <ul>
                    {item.partnerIds.map((pid) => {
                      const partner = db.organisations.find((o) => o.id === pid);
                      return (
                        <li key={pid}>
                          <Link to={`/network/${pid}`}>{partner?.short}</Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Row>
              <Row label={t.common.phase}>
                {item.phaseId}. {phaseName(item.phaseId)}
              </Row>
              <Row label={t.common.wp}>
                {item.wp} {wpName(item.wp)}
              </Row>
              <Row label={t.common.updated}>{formatDate(item.updated)}</Row>
            </dl>
          </Section>

          <Section title={t.initiative.discussion}>
            {thread ? (
              <Link to={`/discussions/${thread.id}`} className="inline-flex items-center gap-2 text-sm">
                <MessagesSquare size={16} aria-hidden="true" />
                {t.initiative.openThread} ({fill(t.discussions.replies, { n: thread.posts.length - 1 })})
              </Link>
            ) : (
              <>
                <p className="text-muted mb-3 text-sm">{t.initiative.noThread}</p>
                {canEdit && (
                  <button type="button" className="btn btn-ghost" onClick={startThread}>
                    {t.initiative.startThread}
                  </button>
                )}
              </>
            )}
          </Section>

          {(item.column === 'spread' || proposals.length > 0) && (
            <Section title={t.initiative.proposals}>
              <ul className="space-y-2 text-sm">
                {proposals.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {t.proposal.formats[p.format]} · {formatDate(p.date)}
                    </span>
                    <Badge tone={p.status === 'accepted' ? 'green' : p.status === 'waiting' ? 'amber' : 'grey'}>{t.initiative.proposalStatus[p.status]}</Badge>
                  </li>
                ))}
              </ul>
              {item.column === 'spread' && canEdit && (
                <button type="button" className="btn mt-3 w-full" onClick={() => setSuggesting(true)}>
                  <Share2 size={15} aria-hidden="true" />
                  {t.board.suggest}
                </button>
              )}
            </Section>
          )}
        </div>
      </div>

      <Modal open={closing} onClose={() => setClosing(false)} title={t.initiative.closeTitle}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!learned.trim()) return setLearnedError(true);
            closeInitiative(item.id, learned.trim(), session.userId);
            setClosing(false);
            setLearnedError(false);
            toast(t.initiative.closed);
          }}
        >
          <p className="text-muted mb-4 text-sm">{t.initiative.closeIntro}</p>
          <Field label={t.initiative.learnedLabel} error={learnedError ? t.common.required : undefined}>
            {(p) => <textarea {...p} className="input" rows={5} required value={learned} onChange={(e) => setLearned(e.target.value)} />}
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setClosing(false)}>
              {t.common.cancel}
            </button>
            <button type="submit" className="btn">
              {t.initiative.closeButton}
            </button>
          </div>
        </form>
      </Modal>
      <ProposalModal initiative={suggesting ? item : undefined} onClose={() => setSuggesting(false)} />
    </>
  );
}

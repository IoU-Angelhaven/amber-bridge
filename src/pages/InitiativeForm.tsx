import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NotFound } from '../components/Guard';
import { Field, PageHeader, Select } from '../components/ui';
import { t } from '../i18n/en';
import { columnOptions, phaseOptions, wpOptions } from '../lib/reference';
import { createInitiative, updateInitiative, type InitiativeInput } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Column, PhaseId, WpId } from '../types';

/** Create a new initiative, or edit an existing one (when the address has an id). */
export default function InitiativeForm() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const navigate = useNavigate();
  const existing = id ? db.initiatives.find((i) => i.id === id) : undefined;

  const [form, setForm] = useState<InitiativeInput>(
    existing ?? {
      title: '',
      problem: '',
      hypothesis: '',
      ownerId: session.userId,
      orgId: session.user?.orgId ?? 'o1',
      partnerIds: [],
      phaseId: 1,
      wp: 'WP2',
      column: 'idea',
      nextStep: '',
    },
  );
  const [submitted, setSubmitted] = useState(false);
  if (id && !existing) return <NotFound />;

  const set = <K extends keyof InitiativeInput>(key: K, value: InitiativeInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const missing = (value: string) => (submitted && !value.trim() ? t.common.required : undefined);
  const members = db.people.filter((p) => p.role !== 'associate' && p.status === 'active');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.title.trim() || !form.problem.trim()) return;
    const input: InitiativeInput = {
      title: form.title.trim(),
      problem: form.problem.trim(),
      hypothesis: form.hypothesis.trim(),
      ownerId: form.ownerId,
      orgId: form.orgId,
      partnerIds: form.partnerIds.filter((p) => p !== form.orgId),
      phaseId: form.phaseId,
      wp: form.wp,
      column: form.column,
      nextStep: form.nextStep.trim(),
    };
    if (existing) {
      updateInitiative(existing.id, input);
      toast(t.initiative.updated);
      navigate(`/initiatives/${existing.id}`);
    } else {
      const newId = createInitiative(input, session.userId);
      toast(t.initiative.created);
      navigate(`/initiatives/${newId}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={existing ? t.initiative.formEdit : t.initiative.formNew}
        intro={t.initiative.formIntro}
        back={existing ? { to: `/initiatives/${existing.id}`, label: existing.title } : { to: '/initiatives', label: t.board.title }}
      />
      <form className="card space-y-5" onSubmit={submit} noValidate>
        <p className="text-muted text-sm">{t.common.requiredHint}</p>
        <Field label={t.initiative.fTitle} hint={t.initiative.fTitleHint} error={missing(form.title)}>
          {(p) => <input {...p} className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} />}
        </Field>
        <Field label={t.initiative.fProblem} hint={t.initiative.fProblemHint} error={missing(form.problem)}>
          {(p) => <textarea {...p} className="input" rows={3} required value={form.problem} onChange={(e) => set('problem', e.target.value)} />}
        </Field>
        <Field label={t.initiative.fHypothesis} hint={t.initiative.fHypothesisHint}>
          {(p) => <textarea {...p} className="input" rows={3} value={form.hypothesis} onChange={(e) => set('hypothesis', e.target.value)} />}
        </Field>
        <Field label={t.initiative.fNextStep} hint={t.initiative.fNextStepHint}>
          {(p) => <input {...p} className="input" value={form.nextStep} onChange={(e) => set('nextStep', e.target.value)} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.initiative.fOrg}>
            {(p) => (
              <Select {...p} value={form.orgId} onChange={(v) => set('orgId', v)} options={db.organisations.filter((o) => o.type === 'partner').map((o) => ({ value: o.id, label: `${o.short} (${t.countries[o.country]})` }))} />
            )}
          </Field>
          <Field label={t.initiative.fOwner}>
            {(p) => <Select {...p} value={form.ownerId} onChange={(v) => set('ownerId', v)} options={members.map((m) => ({ value: m.id, label: m.name }))} />}
          </Field>
          <Field label={t.common.wp}>{(p) => <Select {...p} value={form.wp} onChange={(v) => set('wp', v as WpId)} options={wpOptions} />}</Field>
          <Field label={t.common.phase}>
            {(p) => <Select {...p} value={String(form.phaseId)} onChange={(v) => set('phaseId', Number(v) as PhaseId)} options={phaseOptions} />}
          </Field>
          <Field label={t.initiative.fColumn}>{(p) => <Select {...p} value={form.column} onChange={(v) => set('column', v as Column)} options={columnOptions} />}</Field>
        </div>
        <fieldset>
          <legend className="label">{t.initiative.fPartners}</legend>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {db.organisations
              .filter((o) => o.id !== form.orgId)
              .map((o) => (
                <label key={o.id} className="flex items-start gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.partnerIds.includes(o.id)}
                    onChange={(e) => set('partnerIds', e.target.checked ? [...form.partnerIds, o.id] : form.partnerIds.filter((x) => x !== o.id))}
                  />
                  {o.short}
                </label>
              ))}
          </div>
        </fieldset>
        <div className="border-line flex justify-end gap-2 border-t pt-4">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn">
            {existing ? t.common.save : t.initiative.createSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}

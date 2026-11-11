import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, UserPlus } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { Badge, Empty, Field, Modal, PageHeader, Section, Select, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { daysFromToday, fill, formatDate, formatMonth, includesText } from '../lib/format';
import { permissions, type Permission } from '../lib/permissions';
import { columns, countries, countryOptions } from '../lib/reference';
import { invitePerson, reviewProposal, updatePerson } from '../store/actions';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Person, Proposal } from '../types';

const tabs = [
  { to: '/admin', label: t.admin.tabMembers, end: true },
  { to: '/admin/roles', label: t.admin.tabRoles },
  { to: '/admin/proposals', label: t.admin.tabProposals },
  { to: '/admin/statistics', label: t.admin.tabStats },
];
const memberRoles = ['admin', 'member', 'associate'] as const;
const roleOptions = memberRoles.map((r) => ({ value: r, label: t.roles[r] }));
const statusTone = { active: 'green', invited: 'amber', inactive: 'grey' } as const;

function Header() {
  return (
    <>
      <PageHeader title={t.admin.title} intro={t.admin.intro} />
      <Tabs tabs={tabs} label={t.admin.title} />
    </>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDb();
  const empty = { name: '', email: '', orgId: 'o1', role: 'member' as Person['role'] };
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || !form.email.trim()) return;
    invitePerson({ ...form, name: form.name.trim(), email: form.email.trim() });
    setForm(empty);
    setSubmitted(false);
    onClose();
    toast(t.admin.invited);
  };
  return (
    <Modal open={open} onClose={onClose} title={t.admin.inviteTitle}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-muted text-sm">{t.admin.inviteHint}</p>
        <Field label={t.admin.fName} error={submitted && !form.name.trim() ? t.common.required : undefined}>
          {(p) => <input {...p} className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label={t.admin.fEmail} error={submitted && !form.email.trim() ? t.common.required : undefined}>
          {(p) => <input {...p} type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.common.organisation}>
            {(p) => <Select {...p} value={form.orgId} onChange={(v) => setForm({ ...form, orgId: v })} options={db.organisations.map((o) => ({ value: o.id, label: o.short }))} />}
          </Field>
          <Field label={t.admin.fRole}>{(p) => <Select {...p} value={form.role} onChange={(v) => setForm({ ...form, role: v as Person['role'] })} options={roleOptions} />}</Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn">
            {t.admin.invite}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminMembers() {
  const db = useDb();
  const { get } = useFilters();
  const [inviting, setInviting] = useState(false);
  const org = (p: Person) => db.organisations.find((o) => o.id === p.orgId);
  const list = db.people.filter(
    (p) => (!get('role') || p.role === get('role')) && (!get('country') || org(p)?.country === get('country')) && (!get('q') || includesText(`${p.name} ${p.email} ${org(p)?.name}`, get('q'))),
  );
  return (
    <>
      <Header />
      <div className="mb-4 flex justify-end">
        <button type="button" className="btn" onClick={() => setInviting(true)}>
          <UserPlus size={16} aria-hidden="true" />
          {t.admin.invite}
        </button>
      </div>
      <FilterBar
        searchLabel={t.admin.searchMembers}
        shown={list.length}
        total={db.people.length}
        filters={[
          { key: 'role', label: t.admin.fRole, options: roleOptions },
          { key: 'country', label: t.common.country, options: countryOptions },
        ]}
      />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-line text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">{t.admin.name}</th>
              <th scope="col" className="px-3 py-3">{t.common.organisation}</th>
              <th scope="col" className="px-3 py-3">{t.admin.fRole}</th>
              <th scope="col" className="px-3 py-3">{t.common.status}</th>
              <th scope="col" className="px-3 py-3">{t.admin.lastActive}</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">{t.common.edit}</span></th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {list.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3">
                  <strong>{p.name}</strong>
                  <span className="text-muted block text-xs">{p.email}</span>
                </td>
                <td className="px-3 py-3">
                  {org(p)?.short}
                  <span className="text-muted block text-xs">{org(p) ? t.countries[org(p)!.country] : ''}</span>
                </td>
                <td className="px-3 py-3">
                  <Select className="min-h-8 w-44 py-0.5" aria-label={fill(t.admin.roleFor, { name: p.name })} value={p.role} onChange={(v) => updatePerson(p.id, { role: v as Person['role'] })} options={roleOptions} />
                </td>
                <td className="px-3 py-3">
                  <Badge tone={statusTone[p.status]}>{t.admin.memberStatus[p.status]}</Badge>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{p.lastActive ? formatDate(p.lastActive) : t.admin.never}</td>
                <td className="px-3 py-3 text-right">
                  {p.status === 'invited' ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast(t.admin.resent)}>
                      {t.admin.resend}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" aria-label={`${p.status === 'active' ? t.admin.deactivate : t.admin.activate}: ${p.name}`} onClick={() => updatePerson(p.id, { status: p.status === 'active' ? 'inactive' : 'active' })}>
                      {p.status === 'active' ? t.admin.deactivate : t.admin.activate}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InviteModal open={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

export function AdminRoles() {
  return (
    <>
      <Header />
      <p className="text-muted mb-4 text-sm">{t.admin.rolesIntro}</p>
      <ul className="mb-5 grid gap-4 md:grid-cols-3">
        {memberRoles.map((r) => (
          <li key={r} className="card">
            <h2 className="text-ink text-base font-semibold">{t.roles[r]}</h2>
            <p className="text-muted mt-1 text-sm">{t.roleHelp[r]}</p>
          </li>
        ))}
      </ul>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-line text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">{t.admin.permission}</th>
              {memberRoles.map((r) => (
                <th key={r} scope="col" className="px-3 py-3 text-center">{t.roles[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {(Object.keys(permissions) as Permission[]).map((perm) => (
              <tr key={perm}>
                <th scope="row" className="px-4 py-2.5 font-normal">{t.admin.permissions[perm]}</th>
                {memberRoles.map((r) => {
                  const ok = (permissions[perm] as string[]).includes(r);
                  return (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {ok ? <Check size={18} className="inline text-[#17552f]" aria-hidden="true" /> : <Minus size={18} className="inline text-[#8a97a3]" aria-hidden="true" />}
                      <span className="sr-only">{ok ? t.admin.allowed : t.admin.notAllowed}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminProposals() {
  const db = useDb();
  const review = (id: string, status: Proposal['status']) => {
    reviewProposal(id, status);
    toast(fill(t.admin.reviewed, { status: t.initiative.proposalStatus[status] }));
  };
  return (
    <>
      <Header />
      <p className="text-muted mb-4 text-sm">{t.admin.proposalsIntro}</p>
      {db.proposals.length === 0 && <Empty>{t.admin.proposalsEmpty}</Empty>}
      <ul className="space-y-4">
        {db.proposals.map((p) => {
          const initiative = db.initiatives.find((i) => i.id === p.initiativeId);
          const by = db.people.find((x) => x.id === p.proposedById);
          return (
            <li key={p.id} className="card">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="blue">
                  {t.admin.proposedAs}: {t.proposal.formats[p.format]}
                </Badge>
                <Badge tone={p.status === 'accepted' ? 'green' : p.status === 'waiting' ? 'amber' : 'grey'}>{t.initiative.proposalStatus[p.status]}</Badge>
              </div>
              <h2 className="text-ink text-base font-semibold">
                <Link to={`/initiatives/${p.initiativeId}`}>{initiative?.title}</Link>
              </h2>
              {p.note && <p className="mt-1 text-sm">{p.note}</p>}
              {initiative?.learned && (
                <p className="bg-soft mt-2 rounded p-3 text-sm">
                  <strong className="block">{t.initiative.learned}</strong>
                  {initiative.learned}
                </p>
              )}
              <p className="text-muted mt-2 text-xs">{fill(t.admin.proposedBy, { name: by?.name ?? '', date: formatDate(p.date) })}</p>
              {p.status === 'waiting' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => review(p.id, 'accepted')}>
                    {t.admin.accept}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => review(p.id, 'declined')}>
                    {t.admin.decline}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

interface Bar {
  label: string;
  value: number;
}

/** One-series bar chart. Every bar has its value written next to it, and the same figures are available as a table. */
function BarChart({ title, note, data, labelHeader }: { title: string; note?: string; data: Bar[]; labelHeader: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Section title={title}>
      {note && <p className="text-muted -mt-2 mb-3 text-xs">{note}</p>}
      <ul className="space-y-2" aria-hidden="true">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm" title={`${d.label}: ${d.value}`}>
            <span className="truncate">{d.label}</span>
            <span className="block h-3.5">
              <span className="bg-brand block h-full min-w-0.5 rounded-r" style={{ width: `${(d.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="text-brand cursor-pointer font-semibold">{t.admin.tableLabel}</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead className="text-muted text-xs uppercase">
            <tr>
              <th scope="col" className="py-1">{labelHeader}</th>
              <th scope="col" className="py-1 text-right">{t.admin.value}</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row" className="py-1 font-normal">{d.label}</th>
                <td className="py-1 text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Section>
  );
}

export function AdminStats() {
  const db = useDb();
  const isActive = (p: Person) => p.status === 'active' && !!p.lastActive && daysFromToday(p.lastActive) >= -30;
  const active = db.people.filter(isActive);
  const perCountry = countries.map((c) => ({ label: t.countries[c], value: active.filter((p) => db.organisations.find((o) => o.id === p.orgId)?.country === c).length }));
  const perColumn = columns.map((c) => ({ label: t.columns[c], value: db.initiatives.filter((i) => i.column === c).length }));
  const months = [...new Set(db.documents.map((d) => d.created.slice(0, 7)))].sort();
  const perMonth = months.map((m) => ({ label: formatMonth(m), value: db.documents.filter((d) => d.created.startsWith(m)).length }));
  const tiles = [
    { label: t.admin.statMembers, value: active.length, hint: t.admin.statMembersHint },
    { label: t.admin.statInitiatives, value: db.initiatives.length },
    { label: t.admin.statDocuments, value: db.documents.length },
    { label: t.admin.statOrganisations, value: db.organisations.length },
  ];
  return (
    <>
      <Header />
      <p className="text-muted mb-4 text-sm">{t.admin.statsIntro}</p>
      <dl className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card flex flex-col-reverse justify-end">
            <dd className="text-brand text-4xl font-light">{tile.value}</dd>
            <dt className="text-sm font-semibold">
              {tile.label}
              {tile.hint && <span className="text-muted block text-xs font-normal">{tile.hint}</span>}
            </dt>
          </div>
        ))}
      </dl>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <BarChart title={t.admin.chartMembers} note={t.admin.chartMembersNote} data={perCountry} labelHeader={t.common.country} />
        <BarChart title={t.admin.chartColumns} data={perColumn} labelHeader={t.admin.column} />
        <BarChart title={t.admin.chartDocs} data={perMonth} labelHeader={t.admin.month} />
      </div>
    </>
  );
}

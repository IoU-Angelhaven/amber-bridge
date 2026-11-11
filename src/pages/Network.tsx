import { Link, useParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { NotFound } from '../components/Guard';
import { Avatar, Badge, Empty, PageHeader, Progress, Section, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { fill, includesText } from '../lib/format';
import { countries, countryOptions } from '../lib/reference';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import type { Organisation, OrgType } from '../types';

const orgTypes: OrgType[] = ['partner', 'provider', 'pag'];
const typeOptions = orgTypes.map((o) => ({ value: o, label: t.orgTypes[o] }));
const goal: Record<OrgType, number> = { partner: 10, provider: 5, pag: 5 };
const tabs = [
  { to: '/network', label: t.network.tabDirectory, end: true },
  { to: '/network/countries', label: t.network.tabCountries },
];

/** Progress towards the network goal: 10 partners + 5 healthcare providers + 5 patient advocacy groups. */
function GoalProgress({ orgs }: { orgs: Organisation[] }) {
  const count = (type: OrgType) => Math.min(orgs.filter((o) => o.type === type).length, goal[type]);
  const total = orgTypes.reduce((sum, type) => sum + count(type), 0);
  return (
    <section className="card mb-5" aria-labelledby="goal-title">
      <div className="grid items-center gap-5 md:grid-cols-3">
        <div>
          <h2 id="goal-title">{t.network.goalTitle}</h2>
          <p className="text-brand mt-1 text-4xl font-light">
            {total}
            <span className="text-muted text-xl"> / 20</span>
          </p>
          <p className="text-sm font-semibold">{fill(t.network.goalText, { n: total })}</p>
          <p className="text-muted mt-1 text-xs">{t.network.goalDetail}</p>
        </div>
        <ul className="space-y-3 md:col-span-2">
          {orgTypes.map((type) => (
            <li key={type}>
              <p className="mb-1 text-sm font-semibold">{t.orgTypesShort[type]}</p>
              <Progress value={count(type)} max={goal[type]} label={`${t.orgTypesShort[type]}: ${count(type)} / ${goal[type]}`} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OrgBadges({ org }: { org: Organisation }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={org.type === 'partner' ? 'blue' : org.type === 'provider' ? 'green' : 'orange'}>{t.orgTypes[org.type]}</Badge>
      <Badge tone="outline">{t.countries[org.country]}</Badge>
      {org.lead && <Badge tone="amber">{t.network.lead}</Badge>}
      {org.example && <Badge tone="grey">{t.common.example}</Badge>}
    </div>
  );
}

export default function Network() {
  const db = useDb();
  const { get } = useFilters();
  const list = db.organisations.filter(
    (o) => (!get('country') || o.country === get('country')) && (!get('type') || o.type === get('type')) && (!get('q') || includesText(`${o.name} ${o.expertise.join(' ')} ${o.about}`, get('q'))),
  );
  return (
    <>
      <PageHeader title={t.network.title} intro={t.network.intro} />
      <Tabs tabs={tabs} label={t.network.title} />
      <GoalProgress orgs={db.organisations} />
      <FilterBar
        searchLabel={t.network.searchLabel}
        shown={list.length}
        total={db.organisations.length}
        filters={[
          { key: 'country', label: t.common.country, options: countryOptions },
          { key: 'type', label: t.common.type, options: typeOptions },
        ]}
      />
      {list.length === 0 && <Empty>{t.common.noResults}</Empty>}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => {
          const contact = db.people.find((p) => p.id === o.contactId);
          return (
            <li key={o.id} className="card flex flex-col">
              <OrgBadges org={o} />
              <h2 className="text-ink mt-2 text-base font-semibold">
                <Link to={`/network/${o.id}`} className="plain-link">
                  {o.name}
                </Link>
              </h2>
              <p className="text-muted mt-1 flex-1 text-sm">{o.expertise.join(' · ')}</p>
              <p className="border-line mt-3 flex items-center gap-2 border-t pt-3 text-sm">
                <Avatar name={contact?.name ?? '?'} />
                <span>
                  <strong className="block">{contact?.name}</strong>
                  <span className="text-muted text-xs">{contact?.title}</span>
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function CountryOverview() {
  const db = useDb();
  return (
    <>
      <PageHeader title={t.network.title} intro={t.network.intro} />
      <Tabs tabs={tabs} label={t.network.title} />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {countries.map((c) => {
          const orgs = db.organisations.filter((o) => o.country === c);
          return (
            <li key={c} className="card">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-ink text-xl font-semibold">{t.countries[c]}</h2>
                <Link to={`/network?country=${c}`} className="text-sm">
                  {fill(t.network.organisations, { n: orgs.length })}
                </Link>
              </div>
              <dl className="border-line my-3 grid grid-cols-3 gap-2 border-y py-3 text-center">
                {orgTypes.map((type) => (
                  <div key={type}>
                    <dd className="text-brand text-2xl font-light">{orgs.filter((o) => o.type === type).length}</dd>
                    <dt className="text-muted text-xs">{t.orgTypesShort[type]}</dt>
                  </div>
                ))}
              </dl>
              <ul className="space-y-1 text-sm">
                {orgs.map((o) => (
                  <li key={o.id}>
                    <Link to={`/network/${o.id}`}>{o.short}</Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function OrgProfile() {
  const { id } = useParams();
  const db = useDb();
  const session = useSession();
  const org = db.organisations.find((o) => o.id === id);
  if (!org) return <NotFound />;
  const contact = db.people.find((p) => p.id === org.contactId);
  const people = db.people.filter((p) => p.orgId === org.id && p.status !== 'inactive');
  const initiatives = db.initiatives.filter((i) => i.orgId === org.id || i.partnerIds.includes(org.id));
  return (
    <>
      <PageHeader title={org.name} back={{ to: '/network', label: t.network.title }} />
      <div className="mb-5">
        <OrgBadges org={org} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t.network.about}>
            <p>{org.about}</p>
            <h3 className="mt-4">{t.network.role}</h3>
            <p className="text-sm">{org.role}</p>
            <h3 className="mt-4 mb-1">{t.network.expertise}</h3>
            <ul className="flex flex-wrap gap-1.5">
              {org.expertise.map((e) => (
                <li key={e}>
                  <Badge tone="blue">{e}</Badge>
                </li>
              ))}
            </ul>
          </Section>
          {session.can('initiatives.view') && (
            <Section title={`${t.network.initiatives} (${initiatives.length})`}>
              {initiatives.length === 0 && <Empty>{t.network.noInitiatives}</Empty>}
              <ul className="divide-line divide-y">
                {initiatives.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link to={`/initiatives/${i.id}`}>{i.title}</Link>
                    <Badge tone="blue">{t.columns[i.column]}</Badge>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
        <div className="space-y-5">
          <Section title={t.network.contact}>
            <div className="flex items-start gap-3">
              <Avatar name={contact?.name ?? '?'} />
              <p className="text-sm">
                <strong className="block">{contact?.name}</strong>
                {contact?.title}
                <a href={`mailto:${contact?.email}`} className="mt-1 flex items-center gap-1 break-all">
                  <Mail size={14} aria-hidden="true" />
                  {contact?.email}
                </a>
              </p>
            </div>
          </Section>
          <Section title={`${t.network.people} (${people.length})`}>
            <ul className="space-y-2 text-sm">
              {people.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  <span className="text-muted block text-xs">{p.title}</span>
                </li>
              ))}
            </ul>
          </Section>
          {org.type === 'partner' && session.can('guides.view') && (
            <Section title={t.network.guide}>
              <Link to={`/guides/${org.id}`} className="btn btn-ghost">
                {t.network.openGuide}
              </Link>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

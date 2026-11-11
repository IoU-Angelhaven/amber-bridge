import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Upload } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { Badge, DocStatusBadge, Empty, Field, Modal, Notice, PageHeader, Select, Tabs } from '../components/ui';
import { t } from '../i18n/en';
import { fill, formatDate, includesText } from '../lib/format';
import { countryOptions, docStatuses, docTypes, fileTypes, wpOptions } from '../lib/reference';
import { visibleDocs } from '../lib/visibility';
import { addDocument, type DocInput } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Country, DocType, WpId } from '../types';

const typeOptions = docTypes.map((d) => ({ value: d, label: t.docTypes[d] }));
const statusOptions = docStatuses.map((s) => ({ value: s, label: t.docStatus[s] }));
const countryAllOptions = [{ value: 'ALL', label: t.countries.ALL }, ...countryOptions];

export const docTabs = [
  { to: '/documents', label: t.documents.tabLibrary, end: true },
  { to: '/documents/templates', label: t.documents.tabTemplates },
];

const emptyDoc: DocInput = { title: '', description: '', type: 'report', wp: 'WP2', country: 'ALL', fileType: 'Word' };

/** "Upload" dialog: saves details about a document, no file. */
export function AddDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState<DocInput>(emptyDoc);
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError(true);
    const id = addDocument({ ...form, title: form.title.trim() }, session.userId);
    setForm(emptyDoc);
    setError(false);
    onClose();
    toast(t.documents.added);
    navigate(`/documents/${id}`);
  };
  return (
    <Modal open={open} onClose={onClose} title={t.documents.addTitle}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Notice />
        <div className="border-field text-muted flex items-center gap-3 rounded border border-dashed p-4 text-sm">
          <Upload size={22} className="shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-ink block">{t.documents.chooseFile}</strong>
            {t.documents.uploadMock}
          </span>
        </div>
        <Field label={t.documents.fTitle} error={error && !form.title.trim() ? t.common.required : undefined}>
          {(p) => <input {...p} className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        </Field>
        <Field label={t.documents.fDescription}>
          {(p) => <textarea {...p} className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.documents.docType}>{(p) => <Select {...p} value={form.type} onChange={(v) => setForm({ ...form, type: v as DocType })} options={typeOptions} />}</Field>
          <Field label={t.documents.file}>
            {(p) => <Select {...p} value={form.fileType} onChange={(v) => setForm({ ...form, fileType: v })} options={fileTypes.map((f) => ({ value: f, label: f }))} />}
          </Field>
          <Field label={t.common.wp}>{(p) => <Select {...p} value={form.wp} onChange={(v) => setForm({ ...form, wp: v as WpId })} options={wpOptions} />}</Field>
          <Field label={t.common.country}>
            {(p) => <Select {...p} value={form.country} onChange={(v) => setForm({ ...form, country: v as Country | 'ALL' })} options={countryAllOptions} />}
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn">
            {t.documents.add}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Documents() {
  const db = useDb();
  const session = useSession();
  const { get } = useFilters();
  const [adding, setAdding] = useState(false);
  const all = visibleDocs(db.documents, session);
  const list = all
    .filter(
      (d) =>
        (!get('wp') || d.wp === get('wp')) &&
        (!get('type') || d.type === get('type')) &&
        (!get('country') || d.country === get('country')) &&
        (!get('status') || d.status === get('status')) &&
        (!get('q') || includesText(`${d.title} ${d.description} ${t.docTypes[d.type]}`, get('q'))),
    )
    .sort((a, b) => b.updated.localeCompare(a.updated));
  const canAdd = session.can('documents.add');

  return (
    <>
      <PageHeader
        title={t.documents.title}
        intro={session.can('documents.viewAll') ? t.documents.intro : t.documents.introAssociate}
        actions={
          canAdd && (
            <button type="button" className="btn" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              {t.documents.add}
            </button>
          )
        }
      />
      <Tabs tabs={docTabs} label={t.documents.title} />
      <FilterBar
        searchLabel={t.documents.searchLabel}
        shown={list.length}
        total={all.length}
        filters={[
          { key: 'wp', label: t.common.wp, options: wpOptions },
          { key: 'type', label: t.documents.docType, options: typeOptions },
          { key: 'country', label: t.common.country, options: countryAllOptions },
          ...(session.can('documents.viewAll') ? [{ key: 'status', label: t.common.status, options: statusOptions }] : []),
        ]}
      />
      {list.length === 0 ? (
        <Empty>{t.common.noResults}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-line text-muted border-b text-xs tracking-wide uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">{t.common.title}</th>
                <th scope="col" className="hidden px-3 py-3 md:table-cell">{t.common.type}</th>
                <th scope="col" className="hidden px-3 py-3 sm:table-cell">{t.common.wp}</th>
                <th scope="col" className="hidden px-3 py-3 lg:table-cell">{t.common.country}</th>
                <th scope="col" className="px-3 py-3">{t.common.status}</th>
                <th scope="col" className="hidden px-3 py-3 md:table-cell">{t.common.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {list.map((d) => (
                <tr key={d.id} className="hover:bg-soft align-top">
                  <td className="px-4 py-3">
                    <Link to={`/documents/${d.id}`} className="inline-flex items-start gap-2 font-semibold">
                      <FileText size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {d.title}
                    </Link>
                    <p className="text-muted mt-0.5 pl-6 text-xs">{d.description}</p>
                    <p className="text-muted mt-1 pl-6 text-xs md:hidden">
                      {t.docTypes[d.type]} · {d.wp} · {formatDate(d.updated)}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">{t.docTypes[d.type]}</td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <Badge tone="blue">{d.wp}</Badge>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">{t.countries[d.country]}</td>
                  <td className="px-3 py-3">
                    <DocStatusBadge status={d.status} />
                  </td>
                  <td className="hidden px-3 py-3 whitespace-nowrap md:table-cell">{formatDate(d.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddDocumentModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

export function Templates() {
  const db = useDb();
  const session = useSession();
  const navigate = useNavigate();
  const use = (id: string) => {
    const tpl = db.templates.find((x) => x.id === id);
    if (!tpl) return;
    const docId = addDocument(
      { title: fill(t.documents.newFromTemplate, { title: tpl.title }), description: tpl.description, type: tpl.type, wp: 'WP1', country: 'ALL', fileType: tpl.fileType },
      session.userId,
    );
    toast(t.documents.templateUsed);
    navigate(`/documents/${docId}`);
  };
  return (
    <>
      <PageHeader title={t.documents.title} intro={t.documents.templatesIntro} />
      <Tabs tabs={docTabs} label={t.documents.title} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {db.templates.map((tpl) => (
          <li key={tpl.id} className="card flex flex-col">
            <span className="eyebrow mb-1">
              {t.docTypes[tpl.type]} · {tpl.fileType}
            </span>
            <h2 className="text-ink text-lg font-semibold">{tpl.title}</h2>
            <p className="text-muted mt-1 flex-1 text-sm">{tpl.description}</p>
            <p className="text-muted mt-2 text-xs">
              {t.common.updated} {formatDate(tpl.updated)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.can('documents.add') && (
                <button type="button" className="btn btn-sm" onClick={() => use(tpl.id)}>
                  {t.documents.useTemplate}
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast(t.common.mockAction)}>
                {t.documents.download}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

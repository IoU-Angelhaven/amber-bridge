import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import { t } from '../i18n/en';
import { linkDocument } from '../store/actions';
import { useDb } from '../store/store';
import { DocStatusBadge, Empty, Section, Select } from './ui';
import type { ReactNode } from 'react';

/** List of documents linked to an initiative or a meeting, with a way to add and remove links. */
export function LinkedDocs(props: { target: 'initiative' | 'meeting'; targetId: string; documentIds: string[]; canEdit: boolean; extra?: ReactNode }) {
  const db = useDb();
  const [choice, setChoice] = useState('');
  const docs = props.documentIds.map((id) => db.documents.find((d) => d.id === id)).filter((d) => d !== undefined);
  const others = db.documents.filter((d) => !props.documentIds.includes(d.id));

  return (
    <Section title={t.common.linkedDocs}>
      {docs.length === 0 && <Empty>{t.common.noLinkedDocs}</Empty>}
      <ul className="divide-line divide-y">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
            <FileText size={16} className="text-muted shrink-0" aria-hidden="true" />
            <Link to={`/documents/${d.id}`} className="min-w-0 flex-1">
              {d.title}
            </Link>
            <DocStatusBadge status={d.status} />
            {props.canEdit && (
              <button
                type="button"
                className="text-muted hover:text-ink cursor-pointer rounded p-1"
                aria-label={`${t.common.unlink}: ${d.title}`}
                onClick={() => linkDocument(props.target, props.targetId, d.id, false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {props.canEdit && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Select aria-label={t.common.linkDoc} value={choice} onChange={setChoice} placeholder={t.common.chooseDoc} options={others.map((d) => ({ value: d.id, label: d.title }))} />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!choice}
            onClick={() => {
              linkDocument(props.target, props.targetId, choice, true);
              setChoice('');
            }}
          >
            {t.common.link}
          </button>
          {props.extra}
        </div>
      )}
    </Section>
  );
}

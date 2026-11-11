// Small shared building blocks used on every page.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, X } from 'lucide-react';
import { t } from '../i18n/en';
import { fill, initials } from '../lib/format';
import type { DocStatus, InitiativeStatus } from '../types';

export function PageHeader(props: { eyebrow?: string; title: string; intro?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-6">
      {props.back && (
        <Link to={props.back.to} className="mb-3 inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          {fill(t.common.backTo, { page: props.back.label })}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          {props.eyebrow && <span className="eyebrow mb-1">{props.eyebrow}</span>}
          <h1>{props.title}</h1>
          {props.intro && <p className="text-muted mt-2">{props.intro}</p>}
        </div>
        {props.actions && <div className="flex flex-wrap gap-2">{props.actions}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, label }: { tabs: { to: string; label: string; end?: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="border-line mb-6 flex flex-wrap gap-x-1 border-b">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `-mb-px border-b-[3px] px-3 py-2 text-sm font-semibold no-underline ${
              isActive ? 'border-brand text-brand' : 'text-muted hover:text-brand border-transparent'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

type Tone = 'grey' | 'blue' | 'amber' | 'green' | 'orange' | 'outline';
const tones: Record<Tone, string> = {
  grey: 'bg-[#e9edf1] text-[#33414a]',
  blue: 'bg-brand-tint text-brand-dark',
  amber: 'bg-[#fff1c2] text-[#5c4300]',
  green: 'bg-[#dff3e5] text-[#17552f]',
  orange: 'bg-[#fde8de] text-[#8f2f0d]',
  outline: 'border border-field text-ink bg-white',
};

export function Badge({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

const docTone: Record<DocStatus, Tone> = { draft: 'grey', review: 'amber', approved: 'green' };
export const DocStatusBadge = ({ status }: { status: DocStatus }) => <Badge tone={docTone[status]}>{t.docStatus[status]}</Badge>;

const initiativeTone: Record<InitiativeStatus, Tone> = { active: 'blue', paused: 'amber', closed: 'grey' };
export const InitiativeStatusBadge = ({ status }: { status: InitiativeStatus }) => (
  <Badge tone={initiativeTone[status]}>{t.initiativeStatus[status]}</Badge>
);

export function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="bg-brand-tint text-brand-dark inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
      {initials(name)}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted border-line rounded border border-dashed bg-white/60 p-4 text-sm">{children}</p>;
}

/** The fixed warning about patient data and financial documents. */
export function Notice({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded border border-[#e3c35a] bg-[#fff8dc] p-3 text-sm text-[#4a3a00] ${className}`}>
      <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        <strong>{t.app.noticeLabel}: </strong>
        {t.app.notice}
      </span>
    </p>
  );
}

/** Label + field + help text + error text, connected for screen readers. */
export function Field(props: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const described = [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={props.className}>
      <label className="label" htmlFor={id}>
        {props.label}
      </label>
      {props.hint && (
        <p id={`${id}-hint`} className="text-muted mb-1 text-xs">
          {props.hint}
        </p>
      )}
      {props.children({ id, 'aria-describedby': described, 'aria-invalid': props.error ? true : undefined })}
      {props.error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-[#a3210f]">
          {props.error}
        </p>
      )}
    </div>
  );
}

export function Select(props: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  disabled?: boolean;
}) {
  const { options, placeholder, onChange, className, ...rest } = props;
  return (
    <select {...rest} className={`input ${className ?? ''}`} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Dialog window. Uses the browser's <dialog>, which keeps keyboard focus inside and closes on Esc. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="text-ink m-auto max-h-[92vh] w-[min(40rem,94vw)] rounded bg-white p-0 shadow-xl"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-brand text-2xl font-light">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="text-muted hover:text-ink -m-1 cursor-pointer rounded p-1" aria-label={t.common.close}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Section({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Simple progress bar with a text value next to it. */
export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#dfe4ee]" role="img" aria-label={label}>
        <div className={`h-full rounded-full ${pct === 100 ? 'bg-[#1f7a45]' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-ink w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

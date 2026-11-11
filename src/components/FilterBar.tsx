// Filters and search that are kept in the address (for example ?wp=WP3&status=review),
// so that a filtered list can be shared as a link or saved as a shortcut.
import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { t } from '../i18n/en';
import type { Option } from '../lib/reference';
import { fill } from '../lib/format';

export interface FilterDef {
  key: string;
  label: string;
  options: Option[];
}

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? '';
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return { get, set, params, setParams };
}

export function FilterBar(props: { filters: FilterDef[]; searchLabel?: string; shown?: number; total?: number }) {
  const { get, set, params, setParams } = useFilters();
  const id = useId();
  const keys = [...props.filters.map((f) => f.key), 'q'];
  const active = keys.some((k) => get(k));
  const clear = () => {
    const next = new URLSearchParams(params);
    keys.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };
  return (
    <div role="search" aria-label={t.common.filters} className="card mb-5 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {props.searchLabel && (
          <div className="min-w-48 flex-[2]">
            <label className="label" htmlFor={`${id}-q`}>
              {props.searchLabel}
            </label>
            <div className="relative">
              <Search size={16} className="text-muted pointer-events-none absolute top-3 left-3" aria-hidden="true" />
              <input id={`${id}-q`} type="search" className="input pl-9" value={get('q')} onChange={(e) => set('q', e.target.value)} />
            </div>
          </div>
        )}
        {props.filters.map((f) => (
          <div key={f.key} className="min-w-36 flex-1">
            <label className="label" htmlFor={`${id}-${f.key}`}>
              {f.label}
            </label>
            <select id={`${id}-${f.key}`} className="input" value={get(f.key)} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">{t.common.all}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-sm" aria-live="polite">
          {props.total !== undefined && fill(t.common.showing, { n: props.shown ?? 0, total: props.total })}
        </p>
        {active && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            {t.common.clear}
          </button>
        )}
      </div>
    </div>
  );
}

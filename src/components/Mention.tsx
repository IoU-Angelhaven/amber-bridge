// Text field with @mentions, and display of text with highlighted mentions.
import { useState, type ReactNode } from 'react';
import { t } from '../i18n/en';
import type { Person } from '../types';

export function MentionTextarea(props: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  people: Person[];
  rows?: number;
  placeholder?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
}) {
  const { people, onChange, ...rest } = props;
  const [match, setMatch] = useState<{ start: number; query: string } | null>(null);

  const check = (value: string, caret: number) => {
    const found = /@([\p{L}]*)$/u.exec(value.slice(0, caret));
    setMatch(found ? { start: found.index, query: found[1].toLowerCase() } : null);
  };

  const suggestions = match ? people.filter((p) => p.name.toLowerCase().includes(match.query)).slice(0, 5) : [];

  const pick = (person: Person) => {
    if (!match) return;
    const before = props.value.slice(0, match.start);
    const after = props.value.slice(match.start + 1 + match.query.length);
    onChange(`${before}@${person.name} ${after}`);
    setMatch(null);
  };

  return (
    <div>
      <textarea
        {...rest}
        rows={props.rows ?? 4}
        className="input"
        onChange={(e) => {
          onChange(e.target.value);
          check(e.target.value, e.target.selectionStart);
        }}
      />
      {suggestions.length > 0 && (
        <ul aria-label={t.discussions.mentionList} className="border-line mt-1 flex flex-wrap gap-1 rounded border bg-white p-2">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => pick(p)}>
                @{p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Shows text with line breaks and highlights "@Name" for known people. */
export function RichText({ text, people }: { text: string; people: Person[] }) {
  const names = people.map((p) => p.name).sort((a, b) => b.length - a.length);
  const parts = text.split(new RegExp(`(@(?:${names.map(escape).join('|')}))`, 'g'));
  const out: ReactNode[] = parts.map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1)) ? (
      <span key={i} className="bg-brand-tint text-brand-dark rounded-sm px-1 font-semibold">
        {part}
      </span>
    ) : (
      part
    ),
  );
  return <p className="whitespace-pre-line">{out}</p>;
}

export const mentions = (text: string, person: Person) => text.includes(`@${person.name}`);

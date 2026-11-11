import { useState } from 'react';
import { t } from '../i18n/en';
import { createProposal } from '../store/actions';
import { useSession } from '../store/session';
import { toast } from '../store/toast';
import type { Initiative, Proposal } from '../types';
import { Field, Modal } from './ui';

const formats: Proposal['format'][] = ['story', 'template', 'guide'];

/** "Suggest for the open layer": creates a mock proposal for a coordinator to review. */
export function ProposalModal({ initiative, onClose }: { initiative: Initiative | undefined; onClose: () => void }) {
  const { userId } = useSession();
  const [format, setFormat] = useState<Proposal['format']>('story');
  const [note, setNote] = useState('');
  return (
    <Modal open={!!initiative} onClose={onClose} title={t.proposal.title}>
      {initiative && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createProposal(initiative.id, format, note.trim(), userId);
            setNote('');
            onClose();
            toast(t.proposal.sent);
          }}
        >
          <p className="font-semibold">{initiative.title}</p>
          <p className="text-muted mt-1 mb-4 text-sm">{t.proposal.intro}</p>
          <fieldset className="mb-4">
            <legend className="label">{t.proposal.format}</legend>
            <div className="space-y-2">
              {formats.map((f) => (
                <label key={f} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${format === f ? 'border-brand bg-brand-tint' : 'border-field'}`}>
                  <input type="radio" name="format" className="mt-1" checked={format === f} onChange={() => setFormat(f)} />
                  <span className="text-sm">
                    <strong className="block">{t.proposal.formats[f]}</strong>
                    {t.proposal.formatHelp[f]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t.proposal.note}>{(p) => <textarea {...p} className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t.common.cancel}
            </button>
            <button type="submit" className="btn">
              {t.proposal.submit}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

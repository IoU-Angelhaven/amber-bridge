import { useState } from 'react';
import { t } from '../i18n/en';
import { formatDateTime } from '../lib/format';
import { addComment } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Comment } from '../types';
import { MentionTextarea, RichText } from './Mention';
import { Avatar, Empty, Field, Section } from './ui';

export function Comments({ targetType, targetId, canAdd }: { targetType: Comment['targetType']; targetId: string; canAdd: boolean }) {
  const db = useDb();
  const { userId } = useSession();
  const [text, setText] = useState('');
  const list = db.comments.filter((c) => c.targetType === targetType && c.targetId === targetId);
  const active = db.people.filter((p) => p.status === 'active');

  return (
    <Section title={`${t.common.comments} (${list.length})`}>
      {list.length === 0 && <Empty>{t.common.noComments}</Empty>}
      <ul className="space-y-4">
        {list.map((c) => {
          const author = db.people.find((p) => p.id === c.authorId);
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar name={author?.name ?? '?'} />
              <div className="min-w-0 text-sm">
                <p>
                  <strong>{author?.name}</strong> <span className="text-muted">· {formatDateTime(c.date)}</span>
                </p>
                <RichText text={c.text} people={db.people} />
              </div>
            </li>
          );
        })}
      </ul>
      {canAdd && (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addComment(targetType, targetId, text.trim(), userId);
            setText('');
            toast(t.common.commentPosted);
          }}
        >
          <Field label={t.common.addComment} hint={t.discussions.mentionHint}>
            {(p) => <MentionTextarea {...p} value={text} onChange={setText} people={active} rows={3} />}
          </Field>
          <button type="submit" className="btn mt-2" disabled={!text.trim()}>
            {t.common.postComment}
          </button>
        </form>
      )}
    </Section>
  );
}

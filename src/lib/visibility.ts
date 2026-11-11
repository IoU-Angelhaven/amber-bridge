// What a role may see inside the shared lists.
import type { Doc, Meeting, Thread } from '../types';
import type { Session } from '../store/session';

export const visibleDocs = (docs: Doc[], s: Session) => (s.can('documents.viewAll') ? docs : docs.filter((d) => d.status === 'approved'));
export const visibleMeetings = (meetings: Meeting[], s: Session) => (s.can('calendar.viewAll') ? meetings : meetings.filter((m) => m.audience === 'all'));
export const visibleThreads = (threads: Thread[], s: Session) => (s.can('discussions.viewAll') ? threads : threads.filter((th) => th.kind === 'network'));

/** May the current role open this activity link? */
export function canOpenLink(link: string, s: Session): boolean {
  if (link.startsWith('/initiatives')) return s.can('initiatives.view');
  if (link.startsWith('/guides')) return s.can('guides.view');
  if (link.startsWith('/documents')) return s.can('documents.viewAll');
  if (link.startsWith('/calendar')) return s.can('calendar.viewAll');
  if (link.startsWith('/discussions')) return s.can('discussions.viewAll');
  return true;
}

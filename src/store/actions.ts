// All changes to the data go through these functions.
// In a production version each function would call the backend API instead.
import { nowIso, today } from '../lib/format';
import type {
  ActivityVerb,
  Column,
  Comment,
  Db,
  Doc,
  DocStatus,
  Initiative,
  Meeting,
  Person,
  Proposal,
  Settings,
  Thread,
} from '../types';
import { uid, update } from './store';

function log(db: Db, actorId: string, verb: ActivityVerb, link: string, title: string, detail?: string) {
  db.activity.unshift({ id: uid('a'), date: nowIso(), actorId, verb, link, title, detail });
}

const find = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id);

// ---------- Initiatives ----------

export type InitiativeInput = Pick<
  Initiative,
  'title' | 'problem' | 'hypothesis' | 'ownerId' | 'orgId' | 'partnerIds' | 'phaseId' | 'wp' | 'column' | 'nextStep'
>;

export function createInitiative(input: InitiativeInput, actorId: string): string {
  const id = uid('i');
  update((db) => {
    db.initiatives.push({ ...input, id, status: 'active', documentIds: [], learned: '', created: today(), updated: today() });
    log(db, actorId, 'initiative.created', `/initiatives/${id}`, input.title);
  });
  return id;
}

export function updateInitiative(id: string, patch: Partial<Initiative>) {
  update((db) => {
    const item = find(db.initiatives, id);
    if (item) Object.assign(item, patch, { updated: today() });
  });
}

export function moveInitiative(id: string, column: Column, columnLabel: string, actorId: string) {
  update((db) => {
    const item = find(db.initiatives, id);
    if (!item || item.column === column) return;
    item.column = column;
    item.updated = today();
    log(db, actorId, 'initiative.moved', `/initiatives/${id}`, item.title, columnLabel);
  });
}

export function closeInitiative(id: string, learned: string, actorId: string) {
  update((db) => {
    const item = find(db.initiatives, id);
    if (!item) return;
    item.status = 'closed';
    item.learned = learned;
    item.updated = today();
    log(db, actorId, 'initiative.closed', `/initiatives/${id}`, item.title);
  });
}

export function createProposal(initiativeId: string, format: Proposal['format'], note: string, actorId: string) {
  update((db) => {
    const item = find(db.initiatives, initiativeId);
    if (!item) return;
    db.proposals.unshift({ id: uid('pr'), initiativeId, format, note, proposedById: actorId, date: today(), status: 'waiting' });
    log(db, actorId, 'proposal.created', `/initiatives/${initiativeId}`, item.title);
  });
}

export function reviewProposal(id: string, status: Proposal['status']) {
  update((db) => {
    const item = find(db.proposals, id);
    if (item) item.status = status;
  });
}

// ---------- Comments ----------

export function addComment(targetType: Comment['targetType'], targetId: string, text: string, actorId: string) {
  update((db) => {
    db.comments.push({ id: uid('c'), targetType, targetId, authorId: actorId, date: nowIso(), text });
    const title =
      targetType === 'initiative' ? find(db.initiatives, targetId)?.title : find(db.documents, targetId)?.title;
    log(db, actorId, 'comment.added', `/${targetType}s/${targetId}`, title ?? '');
  });
}

// ---------- Documents (metadata only) ----------

export type DocInput = Pick<Doc, 'title' | 'description' | 'type' | 'wp' | 'country' | 'fileType'>;

export function addDocument(input: DocInput, actorId: string, initiativeId?: string): string {
  const id = uid('d');
  update((db) => {
    db.documents.unshift({
      ...input,
      id,
      status: 'draft',
      ownerId: actorId,
      created: today(),
      updated: today(),
      versions: [{ version: '0.1', date: today(), authorId: actorId, note: 'First version.' }],
    });
    if (initiativeId) find(db.initiatives, initiativeId)?.documentIds.push(id);
    log(db, actorId, 'document.added', `/documents/${id}`, input.title);
  });
  return id;
}

export function addDocVersion(id: string, note: string, actorId: string) {
  update((db) => {
    const doc = find(db.documents, id);
    if (!doc) return;
    const last = parseFloat(doc.versions[0]?.version ?? '0');
    doc.versions.unshift({ version: (last + 0.1).toFixed(1), date: today(), authorId: actorId, note });
    doc.updated = today();
    log(db, actorId, 'document.version', `/documents/${id}`, doc.title);
  });
}

export function setDocStatus(id: string, status: DocStatus, statusLabel: string, actorId: string) {
  update((db) => {
    const doc = find(db.documents, id);
    if (!doc) return;
    doc.status = status;
    doc.updated = today();
    log(db, actorId, 'document.status', `/documents/${id}`, doc.title, statusLabel);
  });
}

export function linkDocument(target: 'initiative' | 'meeting', targetId: string, docId: string, linked: boolean) {
  update((db) => {
    const item = target === 'initiative' ? find(db.initiatives, targetId) : find(db.meetings, targetId);
    if (!item) return;
    item.documentIds = item.documentIds.filter((d) => d !== docId);
    if (linked) item.documentIds.push(docId);
  });
}

// ---------- Discussions ----------

export type ThreadInput = Pick<Thread, 'title' | 'kind' | 'wp' | 'initiativeId' | 'topic' | 'language'> & { text: string };

export function createThread(input: ThreadInput, actorId: string): string {
  const id = uid('t');
  const { text, ...rest } = input;
  update((db) => {
    db.threads.unshift({
      ...rest,
      id,
      authorId: actorId,
      created: nowIso(),
      followerIds: [actorId],
      posts: [{ id: uid('post'), authorId: actorId, date: nowIso(), text }],
    });
    if (input.kind === 'initiative' && input.initiativeId) {
      const initiative = find(db.initiatives, input.initiativeId);
      if (initiative && !initiative.threadId) initiative.threadId = id;
    }
    log(db, actorId, 'thread.created', `/discussions/${id}`, input.title);
  });
  return id;
}

export function addPost(threadId: string, text: string, actorId: string) {
  update((db) => {
    const thread = find(db.threads, threadId);
    if (!thread) return;
    thread.posts.push({ id: uid('post'), authorId: actorId, date: nowIso(), text });
    if (!thread.followerIds.includes(actorId)) thread.followerIds.push(actorId);
    log(db, actorId, 'thread.replied', `/discussions/${threadId}`, thread.title);
  });
}

export function setFollow(threadId: string, personId: string, follow: boolean) {
  update((db) => {
    const thread = find(db.threads, threadId);
    if (!thread) return;
    thread.followerIds = thread.followerIds.filter((p) => p !== personId);
    if (follow) thread.followerIds.push(personId);
  });
}

export function setThreadLanguage(threadId: string, language: string) {
  update((db) => {
    const thread = find(db.threads, threadId);
    if (thread) thread.language = language;
  });
}

export function saveSettings(patch: Partial<Settings>) {
  update((db) => {
    Object.assign(db.settings, patch);
  });
}

// ---------- Calendar and meetings ----------

export type MeetingInput = Pick<Meeting, 'title' | 'type' | 'date' | 'time' | 'location' | 'wp' | 'audience'>;

export function addMeeting(input: MeetingInput, actorId: string): string {
  const id = uid('m');
  update((db) => {
    db.meetings.push({ ...input, id, agenda: [], notes: '', decisions: [], actions: [], documentIds: [] });
    log(db, actorId, 'meeting.added', `/calendar/${id}`, input.title);
  });
  return id;
}

export function updateMeeting(id: string, patch: Partial<Pick<Meeting, 'notes' | 'agenda'>>) {
  update((db) => {
    const meeting = find(db.meetings, id);
    if (meeting) Object.assign(meeting, patch);
  });
}

export function addDecision(meetingId: string, text: string, actorId: string) {
  update((db) => {
    const meeting = find(db.meetings, meetingId);
    if (!meeting) return;
    meeting.decisions.push({ id: uid('dec'), text });
    log(db, actorId, 'meeting.decision', `/calendar/${meetingId}`, meeting.title);
  });
}

export function addAction(meetingId: string, text: string, ownerId: string, due: string) {
  update((db) => {
    find(db.meetings, meetingId)?.actions.push({ id: uid('act'), text, ownerId, due, done: false });
  });
}

export function setActionDone(meetingId: string, actionId: string, done: boolean) {
  update((db) => {
    const action = find(db.meetings, meetingId)?.actions.find((a) => a.id === actionId);
    if (action) action.done = done;
  });
}

// ---------- Local implementation guides ----------

export function setGuideItem(orgId: string, phaseId: number, index: number, done: boolean, actorId: string) {
  update((db) => {
    const guide = db.guides.find((g) => g.orgId === orgId);
    if (!guide) return;
    const list = (guide.done[phaseId] ?? []).filter((i) => i !== index);
    if (done) list.push(index);
    guide.done[phaseId] = list.sort((a, b) => a - b);
    guide.updated = today();
    const org = find(db.organisations, orgId);
    // one "guide updated" entry per organisation is enough in the activity list
    if (db.activity[0]?.verb !== 'guide.updated' || db.activity[0].link !== `/guides/${orgId}`) {
      log(db, actorId, 'guide.updated', `/guides/${orgId}`, org?.short ?? '');
    }
  });
}

export function setGuideNote(orgId: string, phaseId: number, note: string) {
  update((db) => {
    const guide = db.guides.find((g) => g.orgId === orgId);
    if (!guide) return;
    guide.notes[phaseId] = note;
    guide.updated = today();
  });
}

// ---------- Learning ----------

export function addExperience(text: string, actorId: string) {
  update((db) => {
    db.experiences.unshift({ id: uid('e'), authorId: actorId, date: nowIso(), text });
  });
}

export function respondToSubmission(id: string, response: string) {
  update((db) => {
    const item = find(db.submissions, id);
    if (!item) return;
    item.response = response;
    item.status = 'answered';
  });
}

export function setSubmissionStatus(id: string, status: 'new' | 'in-review' | 'answered') {
  update((db) => {
    const item = find(db.submissions, id);
    if (item) item.status = status;
  });
}

/** Turn a submitted need or idea into a card in the "Idea" column. */
export function submissionToInitiative(id: string, actor: Person): string {
  const newId = uid('i');
  update((db) => {
    const item = find(db.submissions, id);
    if (!item) return;
    const title = item.text.length > 70 ? item.text.slice(0, 67).trimEnd() + '…' : item.text;
    db.initiatives.push({
      id: newId,
      title,
      problem: item.text,
      hypothesis: '',
      ownerId: actor.id,
      orgId: actor.orgId,
      partnerIds: [],
      phaseId: 1,
      wp: 'WP4',
      column: 'idea',
      status: 'active',
      nextStep: '',
      documentIds: [],
      learned: '',
      created: today(),
      updated: today(),
    });
    item.initiativeId = newId;
    if (item.status === 'new') item.status = 'in-review';
    log(db, actor.id, 'initiative.created', `/initiatives/${newId}`, title);
  });
  return newId;
}

// ---------- Administration ----------

export function invitePerson(input: { name: string; email: string; orgId: string; role: Person['role'] }) {
  update((db) => {
    db.people.push({ ...input, id: uid('p'), title: '', status: 'invited' });
  });
}

export function updatePerson(id: string, patch: Partial<Pick<Person, 'role' | 'status'>>) {
  update((db) => {
    const person = find(db.people, id);
    if (person) Object.assign(person, patch);
  });
}


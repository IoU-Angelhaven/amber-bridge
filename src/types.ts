// Data model of the prototype. Every collection in `Db` is one JSON file in src/data/.
// In a production version each collection would be a table or API resource.

export type Role = 'admin' | 'member' | 'associate' | 'visitor';
export type Country = 'DK' | 'SE' | 'DE' | 'PL' | 'LT';
export type WpId = 'WP1' | 'WP2' | 'WP3' | 'WP4';
export type PhaseId = 1 | 2 | 3 | 4 | 5;

export interface WorkPackage {
  id: WpId;
  name: string;
}

export interface Phase {
  id: PhaseId;
  name: string;
  /** Checklist items = the activities of the AMBeR model for this phase. */
  activities: string[];
}

export type OrgType = 'partner' | 'provider' | 'pag';

export interface Organisation {
  id: string;
  name: string;
  short: string;
  country: Country;
  type: OrgType;
  lead?: boolean;
  /** True for invented organisations used only as examples. */
  example?: boolean;
  role: string;
  expertise: string[];
  contactId: string;
  about: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  orgId: string;
  role: Exclude<Role, 'visitor'>;
  email: string;
  status: 'active' | 'invited' | 'inactive';
  lastActive?: string;
}

export type Column = 'idea' | 'hypothesis' | 'prototype' | 'test' | 'spread';
export type InitiativeStatus = 'active' | 'paused' | 'closed';

export interface Initiative {
  id: string;
  title: string;
  problem: string;
  hypothesis: string;
  ownerId: string;
  /** Owning organisation. The country is taken from the organisation. */
  orgId: string;
  partnerIds: string[];
  phaseId: PhaseId;
  wp: WpId;
  column: Column;
  status: InitiativeStatus;
  nextStep: string;
  documentIds: string[];
  threadId?: string;
  /** "What we learned" – filled in when the initiative is closed. */
  learned: string;
  created: string;
  updated: string;
}

export interface Comment {
  id: string;
  targetType: 'initiative' | 'document';
  targetId: string;
  authorId: string;
  date: string;
  text: string;
}

export type DocStatus = 'draft' | 'review' | 'approved';
export type DocType =
  | 'minutes'
  | 'agenda'
  | 'plan'
  | 'report'
  | 'guide'
  | 'questionnaire'
  | 'checklist'
  | 'presentation'
  | 'other';

export interface DocVersion {
  version: string;
  date: string;
  authorId: string;
  note: string;
}

/** Metadata only – the prototype stores no files. */
export interface Doc {
  id: string;
  title: string;
  description: string;
  type: DocType;
  wp: WpId;
  /** 'ALL' = relevant for all countries. */
  country: Country | 'ALL';
  status: DocStatus;
  fileType: string;
  ownerId: string;
  reviewerId?: string;
  created: string;
  updated: string;
  versions: DocVersion[];
}

export interface Template {
  id: string;
  title: string;
  type: DocType;
  description: string;
  fileType: string;
  updated: string;
}

export type ThreadKind = 'wp' | 'initiative' | 'topic' | 'network';

export interface Post {
  id: string;
  authorId: string;
  date: string;
  text: string;
}

export interface Thread {
  id: string;
  title: string;
  kind: ThreadKind;
  wp?: WpId;
  initiativeId?: string;
  topic?: string;
  /** Language code. English ('en') is the default. */
  language: string;
  authorId: string;
  created: string;
  posts: Post[];
  followerIds: string[];
}

export type EventType = 'partner-meeting' | 'workshop' | 'study-visit' | 'training' | 'deadline';

export interface Decision {
  id: string;
  text: string;
}

export interface ActionItem {
  id: string;
  text: string;
  ownerId: string;
  due: string;
  done: boolean;
}

/** A calendar entry. Meetings, workshops, visits, training and deadlines share one type. */
export interface Meeting {
  id: string;
  title: string;
  type: EventType;
  date: string;
  endDate?: string;
  time?: string;
  location: string;
  wp: WpId;
  /** 'all' = also visible for associated partners. */
  audience: 'all' | 'partners';
  agenda: string[];
  notes: string;
  decisions: Decision[];
  actions: ActionItem[];
  documentIds: string[];
}

export interface Guide {
  orgId: string;
  updated: string;
  /** For each phase id: the indexes of the checklist items that are done. */
  done: Record<string, number[]>;
  notes: Record<string, string>;
}

export interface Course {
  id: string;
  kind: 'academy' | 'course' | 'material';
  title: string;
  description: string;
  format: string;
  duration: string;
}

export interface Experience {
  id: string;
  authorId: string;
  date: string;
  text: string;
}

export interface Submission {
  id: string;
  kind: 'need' | 'idea';
  from: string;
  country: Country;
  date: string;
  text: string;
  status: 'new' | 'in-review' | 'answered';
  response: string;
  initiativeId?: string;
}

export interface Proposal {
  id: string;
  initiativeId: string;
  format: 'story' | 'template' | 'guide';
  note: string;
  proposedById: string;
  date: string;
  status: 'waiting' | 'accepted' | 'declined';
}

export type ActivityVerb =
  | 'initiative.created'
  | 'initiative.moved'
  | 'initiative.closed'
  | 'document.added'
  | 'document.version'
  | 'document.status'
  | 'thread.created'
  | 'thread.replied'
  | 'meeting.added'
  | 'meeting.decision'
  | 'guide.updated'
  | 'proposal.created'
  | 'comment.added';

export interface Activity {
  id: string;
  date: string;
  actorId: string;
  verb: ActivityVerb;
  /** Route to the item, e.g. /initiatives/i1 */
  link: string;
  title: string;
  detail?: string;
}

export interface PinnedMessage {
  id: string;
  /** 'all' = also shown to associated partners. */
  audience: 'all' | 'partners';
  authorId: string;
  date: string;
  title: string;
  text: string;
}

export interface Settings {
  digest: 'weekly' | 'daily' | 'none';
  notifyMentions: boolean;
  notifyActions: boolean;
  notifyNetwork: boolean;
}

export interface Db {
  organisations: Organisation[];
  people: Person[];
  initiatives: Initiative[];
  comments: Comment[];
  documents: Doc[];
  templates: Template[];
  threads: Thread[];
  meetings: Meeting[];
  guides: Guide[];
  courses: Course[];
  facilitatorMaterials: Course[];
  experiences: Experience[];
  submissions: Submission[];
  proposals: Proposal[];
  activity: Activity[];
  pinned: PinnedMessage[];
  settings: Settings;
}

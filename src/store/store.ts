// Mock data layer.
// The JSON files in src/data are the starting point. Every change the user makes is
// kept in localStorage. To connect a real backend, replace this file and actions.ts:
// the pages only use `useDb()` to read and the functions in actions.ts to write.
import { useSyncExternalStore } from 'react';
import type { Db } from '../types';
import organisations from '../data/organisations.json';
import people from '../data/people.json';
import initiatives from '../data/initiatives.json';
import comments from '../data/comments.json';
import documents from '../data/documents.json';
import templates from '../data/templates.json';
import threads from '../data/threads.json';
import meetings from '../data/meetings.json';
import guides from '../data/guides.json';
import learning from '../data/learning.json';
import misc from '../data/misc.json';

const STORAGE_KEY = 'amber-bridge-demo-v2';

function seed(): Db {
  return structuredClone({
    organisations,
    people,
    initiatives,
    comments,
    documents,
    templates,
    threads,
    meetings,
    guides,
    courses: learning.courses,
    facilitatorMaterials: learning.facilitatorMaterials,
    experiences: learning.experiences,
    submissions: learning.submissions,
    proposals: misc.proposals,
    activity: misc.activity,
    pinned: misc.pinned,
    settings: misc.settings,
  }) as unknown as Db;
}

function load(): Db {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Db;
  } catch {
    // localStorage is not available or the saved data is broken: use the starting data
  }
  return seed();
}

let state: Db = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore: the prototype still works without saving
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDb = () => state;

/** Read the whole data set. The component updates when the data changes. */
export const useDb = () => useSyncExternalStore(subscribe, getDb);

/** Change the data. `change` receives a copy that it may modify directly. */
export function update(change: (db: Db) => void) {
  const next = structuredClone(state);
  change(next);
  state = next;
  emit();
}

export function resetDb() {
  state = seed();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

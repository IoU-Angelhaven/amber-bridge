// Mock session: there is no real login. The "View as" switcher chooses a role,
// and each role is shown as one example person.
import { useSyncExternalStore } from 'react';
import type { Person, Role } from '../types';
import { can, type Permission } from '../lib/permissions';
import { useDb } from './store';

const KEY = 'amber-bridge-role';
const demoPerson: Record<Exclude<Role, 'visitor'>, string> = { admin: 'p1', member: 'p3', associate: 'p13' };
export const roles: Role[] = ['admin', 'member', 'associate', 'visitor'];

function read(): Role {
  try {
    const saved = localStorage.getItem(KEY) as Role | null;
    if (saved && roles.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return 'admin';
}

let role: Role = read();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setRole(next: Role) {
  role = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export interface Session {
  role: Role;
  /** The example person for this role. Undefined for a visitor. */
  user?: Person;
  userId: string;
  can: (permission: Permission) => boolean;
}

export function useSession(): Session {
  const current = useSyncExternalStore(subscribe, () => role);
  const db = useDb();
  const userId = current === 'visitor' ? '' : demoPerson[current];
  return {
    role: current,
    userId,
    user: db.people.find((p) => p.id === userId),
    can: (permission) => can(current, permission),
  };
}

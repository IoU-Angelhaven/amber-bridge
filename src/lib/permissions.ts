// One place that says what each role may see and do.
// The navigation, the page guards and the "Roles and permissions" table all read from here.
import type { Role } from '../types';

const all: Role[] = ['admin', 'member', 'associate'];
const partners: Role[] = ['admin', 'member'];
const admin: Role[] = ['admin'];

export const permissions = {
  'home.view': all,
  'initiatives.view': partners,
  'initiatives.edit': partners,
  'documents.viewApproved': all,
  'documents.viewAll': partners,
  'documents.add': partners,
  'documents.approve': admin,
  'discussions.network': all,
  'discussions.viewAll': partners,
  'calendar.viewOpen': all,
  'calendar.viewAll': partners,
  'calendar.edit': partners,
  'network.view': all,
  'learning.view': all,
  'learning.facilitators': partners,
  'learning.inbox': partners,
  'learning.respond': admin,
  'guides.view': partners,
  'proposals.review': admin,
  'admin.view': admin,
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof permissions;

export const can = (role: Role, permission: Permission) => (permissions[permission] as Role[]).includes(role);

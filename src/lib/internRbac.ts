import { fetchUserRoles } from '@/lib/roles';

// Intern program specific roles
export type InternRole =
  | 'INTERN'
  | 'INTERN_MANAGER'
  | 'INTERN_SPONSOR'
  | 'INTERN_PROGRAM_ADMIN';

export async function fetchInternRoles(): Promise<InternRole[]> {
  const roles = await fetchUserRoles();
  const allowed: InternRole[] = [
    'INTERN',
    'INTERN_MANAGER',
    'INTERN_SPONSOR',
    'INTERN_PROGRAM_ADMIN',
  ];
  return roles.filter((r): r is InternRole => allowed.includes(r as InternRole));
}

export function hasInternRole(userRoles: InternRole[], required: InternRole | InternRole[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => userRoles.includes(r));
}




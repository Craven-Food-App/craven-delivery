import { supabase } from "@/integrations/supabase/client";
import { hasFullAccess } from "@/utils/torranceAccess";
import { fetchUserRoles } from '@/lib/roles';

// Intern program specific roles
export type InternRole =
  | 'INTERN'
  | 'INTERN_MANAGER'
  | 'INTERN_SPONSOR'
  | 'INTERN_PROGRAM_ADMIN';

export async function fetchInternRoles(): Promise<InternRole[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allInternRoles: InternRole[] = [
    'INTERN',
    'INTERN_MANAGER',
    'INTERN_SPONSOR',
    'INTERN_PROGRAM_ADMIN',
  ];

  // Torrance Stroman (CEO) gets universal access to all intern roles automatically
  if (user?.email && hasFullAccess(user.email)) {
    return allInternRoles;
  }

  // Everyone else: derive intern roles from user_roles
  const roles = await fetchUserRoles();
  return roles.filter((r): r is InternRole => allInternRoles.includes(r as InternRole));
}

export function hasInternRole(userRoles: InternRole[], required: InternRole | InternRole[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => userRoles.includes(r));
}




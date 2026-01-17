/**
 * Role Synchronization Verification Utility
 * 
 * This utility helps verify that all C-level employees are properly
 * recognized and synced in the system.
 */

import { supabase } from '@/integrations/supabase/client';
import { isCLevelPosition } from './roleUtils';

export interface CLevelEmployeeStatus {
  employee_id: string;
  employee_name: string;
  position: string;
  email: string;
  user_id: string | null;
  sync_status: 'fully_synced' | 'missing_user_id' | 'missing_exec_users' | 'missing_role';
  exec_role: string | null;
  exec_department: string | null;
  action_needed: string;
}

/**
 * Check the status of all C-level employees
 */
export async function verifyCLevelEmployees(): Promise<CLevelEmployeeStatus[]> {
  try {
    // Fetch all employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, position, email, user_id, department_id, departments(name)');

    if (empError) throw empError;

    // Filter C-level employees
    const cLevelEmployees = (employees || []).filter((emp: any) => 
      isCLevelPosition(emp.position)
    );

    // Fetch exec_users records
    const { data: execUsers, error: execError } = await supabase
      .from('exec_users')
      .select('id, user_id, role, department, title');

    if (execError) throw execError;

    // Fetch user_roles
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (roleError) throw roleError;

    // Create exec_users map
    const execUsersMap = new Map(
      (execUsers || []).map((eu: any) => [eu.user_id, eu])
    );

    // Create user_roles map
    const userRolesMap = new Map<string, Set<string>>();
    (userRoles || []).forEach((ur: any) => {
      if (!userRolesMap.has(ur.user_id)) {
        userRolesMap.set(ur.user_id, new Set());
      }
      userRolesMap.get(ur.user_id)!.add(ur.role);
    });

    // Build status report
    const statusReport: CLevelEmployeeStatus[] = cLevelEmployees.map((emp: any) => {
      const execUser = emp.user_id ? execUsersMap.get(emp.user_id) : null;
      const roles = emp.user_id ? userRolesMap.get(emp.user_id) || new Set() : new Set();
      
      let sync_status: CLevelEmployeeStatus['sync_status'];
      let action_needed: string;

      if (!emp.user_id) {
        sync_status = 'missing_user_id';
        action_needed = 'Create auth account, then update employees.user_id';
      } else if (!execUser) {
        sync_status = 'missing_exec_users';
        action_needed = 'Will be auto-created by trigger OR run backfill migration';
      } else if (!roles.has('executive')) {
        sync_status = 'missing_role';
        action_needed = 'Will be auto-created by trigger OR run backfill migration';
      } else {
        sync_status = 'fully_synced';
        action_needed = 'No action needed';
      }

      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        position: emp.position,
        email: emp.email,
        user_id: emp.user_id,
        sync_status,
        exec_role: execUser?.role || null,
        exec_department: execUser?.department || emp.departments?.name || null,
        action_needed,
      };
    });

    return statusReport;
  } catch (error) {
    console.error('Error verifying C-level employees:', error);
    throw error;
  }
}

/**
 * Get summary statistics
 */
export async function getRoleSyncSummary() {
  try {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, position, user_id');

    const cLevelEmployees = (employees || []).filter((emp: any) => 
      isCLevelPosition(emp.position)
    );

    const withUserId = cLevelEmployees.filter((emp: any) => emp.user_id);

    const { data: execUsers } = await supabase
      .from('exec_users')
      .select('user_id');

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const execUserIds = new Set((execUsers || []).map((eu: any) => eu.user_id));
    const executiveRoleUserIds = new Set(
      (userRoles || []).filter((ur: any) => ur.role === 'executive').map((ur: any) => ur.user_id)
    );

    const inExecUsers = cLevelEmployees.filter((emp: any) => 
      emp.user_id && execUserIds.has(emp.user_id)
    );

    const withExecutiveRole = cLevelEmployees.filter((emp: any) => 
      emp.user_id && executiveRoleUserIds.has(emp.user_id)
    );

    return {
      totalCLevel: cLevelEmployees.length,
      withUserId: withUserId.length,
      inExecUsers: inExecUsers.length,
      withExecutiveRole: withExecutiveRole.length,
      missingUserId: cLevelEmployees.length - withUserId.length,
      missingExecUsers: withUserId.length - inExecUsers.length,
      missingExecutiveRole: withUserId.length - withExecutiveRole.length,
    };
  } catch (error) {
    console.error('Error getting role sync summary:', error);
    throw error;
  }
}

/**
 * Manually trigger sync for a specific employee
 */
export async function syncEmployeeManually(employeeId: string) {
  try {
    // Get employee with department info
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*, departments(name)')
      .eq('id', employeeId)
      .single();

    if (empError) throw empError;

    if (!isCLevelPosition(employee.position)) {
      throw new Error('Employee is not a C-level position');
    }

    if (!employee.user_id) {
      throw new Error('Employee does not have a user_id (auth account)');
    }

    // Get exec role from position
    const { getExecRoleFromPosition } = await import('./roleUtils');
    const execRole = getExecRoleFromPosition(employee.position) || 'board_member';
    const departmentName = employee.departments?.name || 'Executive';

    // Step 1: Create/update exec_users record
    const { error: execError } = await supabase
      .from('exec_users')
      .upsert({
        user_id: employee.user_id,
        role: execRole,
        department: departmentName,
        title: employee.position,
        access_level: 1,
      }, {
        onConflict: 'user_id'
      });

    if (execError) {
      console.error('Error creating exec_users:', execError);
      throw execError;
    }

    // Step 2 & 3: Add roles using database function (bypasses RLS)
    const { data: roleSyncResult, error: roleSyncError } = await supabase.rpc(
      'sync_user_roles_for_employee' as any,
      {
        p_employee_id: employeeId,
        p_user_id: employee.user_id,
        p_employee_role: 'employee',
        p_executive_role: 'executive'
      }
    );

    if (roleSyncError) {
      console.error('Error syncing roles via function:', roleSyncError);
      // Fallback to direct insert (might fail due to RLS, but try anyway)
      const { error: employeeRoleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: employee.user_id,
          role: 'employee',
        }, {
          onConflict: 'user_id,role'
        });

      const { error: executiveRoleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: employee.user_id,
          role: 'executive',
        }, {
          onConflict: 'user_id,role'
        });

      if (executiveRoleError) {
        console.error('Error adding executive role:', executiveRoleError);
        throw executiveRoleError;
      }
    } else if (roleSyncResult && typeof roleSyncResult === 'object' && (roleSyncResult as any).success === false) {
      // Function returned errors
      const errors = (roleSyncResult as any).errors || [];
      if (errors.length > 0) {
        throw new Error(`Failed to sync roles: ${errors.join(', ')}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing employee manually:', error);
    throw error;
  }
}


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  pin_code: string;
  is_active: boolean;
  role_id?: string;
  restaurant_employee_roles?: {
    name: string;
    description: string;
    permissions: any;
  };
}

interface EmployeeRole {
  id: string;
  name: string;
  description: string;
  permissions: any;
}

interface EmployeeManagementProps {
  restaurantId: string;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ restaurantId }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    employee_id: '',
    full_name: '',
    pin_code: '',
    role_id: ''
  });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [restaurantId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_employees')
        .select(`
          *,
          restaurant_employee_roles (
            name,
            description,
            permissions
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_employee_roles')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const generateEmployeeId = () => {
    return 'EMP' + Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  const generatePinCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.full_name || !newEmployee.role_id) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Generate employee ID if not provided
      const employeeId = newEmployee.employee_id || generateEmployeeId();

      // Check if employee ID already exists for this restaurant
      const { data: existingEmployee, error: checkError } = await supabase
        .from('restaurant_employees')
        .select('employee_id')
        .eq('restaurant_id', restaurantId)
        .eq('employee_id', employeeId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means "no rows returned" which is what we want
        throw checkError;
      }

      if (existingEmployee) {
        toast({
          title: "Employee ID already exists",
          description: `Employee ID "${employeeId}" is already in use. Please use a different ID.`,
          variant: "destructive"
        });
        return;
      }

      // Get the selected role to include the role name
      const selectedRole = roles.find(r => r.id === newEmployee.role_id);

      const employeeData = {
        restaurant_id: restaurantId,
        employee_id: employeeId,
        full_name: newEmployee.full_name,
        pin_code: newEmployee.pin_code || generatePinCode(),
        role_id: newEmployee.role_id,
        role: selectedRole?.name || 'cashier',
        is_active: true
      };

      const { error } = await supabase
        .from('restaurant_employees')
        .insert(employeeData);

      if (error) throw error;

      toast({
        title: "Employee added",
        description: `${newEmployee.full_name} has been added successfully`,
      });

      setNewEmployee({ employee_id: '', full_name: '', pin_code: '', role_id: '' });
      setShowAddDialog(false);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      
      // Handle specific duplicate key error
      if (error?.code === '23505' && error?.message?.includes('restaurant_employees_restaurant_id_employee_id_key')) {
        toast({
          title: "Duplicate Employee ID",
          description: "This employee ID already exists. Please use a different ID.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add employee. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee) return;

    try {
      // Get the selected role to update the role name field as well
      const selectedRole = roles.find(r => r.id === editingEmployee.role_id);
      
      const { error } = await supabase
        .from('restaurant_employees')
        .update({
          full_name: editingEmployee.full_name,
          employee_id: editingEmployee.employee_id,
          pin_code: editingEmployee.pin_code,
          role_id: editingEmployee.role_id,
          role: selectedRole?.name || editingEmployee.role,
          is_active: editingEmployee.is_active
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      toast({
        title: "Employee updated",
        description: `${editingEmployee.full_name} has been updated successfully`,
      });

      setEditingEmployee(null);
      setShowEditDialog(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurant_employees')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Employee status updated",
        description: `Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Employee Management</h2>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={newEmployee.employee_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <Label htmlFor="pinCode">PIN Code (4 digits)</Label>
                <Input
                  id="pinCode"
                  value={newEmployee.pin_code}
                  onChange={(e) => setNewEmployee({ ...newEmployee, pin_code: e.target.value })}
                  placeholder="Auto-generated if empty"
                  maxLength={4}
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={newEmployee.role_id} onValueChange={(value) => setNewEmployee({ ...newEmployee, role_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee}>
                  Add Employee
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{employee.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>ID: {employee.employee_id}</span>
                      <span>•</span>
                      <span>PIN: {employee.pin_code}</span>
                      <span>•</span>
                      <span>Role: {employee.restaurant_employee_roles?.name || employee.role}</span>
                    </div>
                  </div>
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={employee.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                  >
                    {employee.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  value={editingEmployee.full_name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="editEmployeeId">Employee ID</Label>
                <Input
                  id="editEmployeeId"
                  value={editingEmployee.employee_id}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, employee_id: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editPinCode">PIN Code</Label>
                <Input
                  id="editPinCode"
                  value={editingEmployee.pin_code}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, pin_code: e.target.value })}
                  maxLength={4}
                />
              </div>

              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select 
                  value={editingEmployee.role_id || ''} 
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, role_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditEmployee}>
                  Update Employee
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  restaurant_id: string;
}

interface EmployeeLoginProps {
  restaurantId: string;
  onLogin: (employee: Employee) => void;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({ restaurantId, onLogin }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !pinCode) {
      toast({
        title: "Missing Information",
        description: "Please enter both Employee ID and PIN.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('restaurant_employees')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('employee_id', employeeId)
        .eq('pin_code', pinCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Credentials",
          description: "Employee ID or PIN is incorrect.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: `Welcome, ${data.full_name}!`
      });

      onLogin(data);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (value: string) => {
    // Only allow numeric input and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPinCode(numericValue);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-foreground p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Employee Login</CardTitle>
          <p className="text-muted-foreground">Point of Sale System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-sm font-medium">
                Employee ID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="Enter Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  className="pl-10 h-12 text-lg"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode" className="text-sm font-medium">
                PIN Code
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pinCode"
                  type="password"
                  placeholder="Enter PIN"
                  value={pinCode}
                  onChange={(e) => handlePinInput(e.target.value)}
                  className="pl-10 h-12 text-lg text-center tracking-widest"
                  autoComplete="current-password"
                  maxLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !employeeId || !pinCode}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Demo Credentials:<br />
              ID: EMP001, PIN: 1234<br />
              ID: MGR001, PIN: 9999
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
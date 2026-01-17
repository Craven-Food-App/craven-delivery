import React, { useState } from 'react';
import { EmployeeLogin } from './EmployeeLogin';
import { ModernPOS } from './ModernPOS';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  restaurant_id: string;
}

interface PhoneOrderPOSProps {
  restaurantId: string;
}

export const PhoneOrderPOS: React.FC<PhoneOrderPOSProps> = ({ restaurantId }) => {
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);

  const handleEmployeeLogin = (employee: Employee) => {
    setLoggedInEmployee(employee);
  };

  const handleEmployeeLogout = () => {
    setLoggedInEmployee(null);
  };

  if (!loggedInEmployee) {
    return (
      <EmployeeLogin 
        restaurantId={restaurantId} 
        onLogin={handleEmployeeLogin} 
      />
    );
  }

  return (
    <ModernPOS 
      restaurantId={restaurantId} 
      employee={loggedInEmployee} 
      onLogout={handleEmployeeLogout} 
    />
  );
};
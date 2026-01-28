import React from 'react';
import { useNavigate } from 'react-router-dom';
// Use the original AppointmentList component with full functionality
import AppointmentList from '../../governance-admin/AppointmentList';

/**
 * Appointments Tab - Uses the original AppointmentList component
 * which has all the document generation, workflow, and status management functionality
 */
const AppointmentsTab: React.FC = () => {
  return <AppointmentList />;
};

export default AppointmentsTab;


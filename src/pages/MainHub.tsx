import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, Row, Col, Button, Input, Modal, Form, message, Typography, Space, Spin, Avatar, Layout, Table, Tag, Tooltip } from "antd";
import {
  DashboardOutlined,
  BarChartOutlined,
  ShopOutlined,
  TeamOutlined,
  RocketOutlined,
  CrownOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  LockOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  HistoryOutlined,
  UserOutlined,
  SafetyOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { ConfigProvider } from "antd";
import { cravenDriverTheme } from "@/config/antd-theme";
import cravenLogo from "@/assets/craven-logo.png";
import { usePermission } from '@/hooks/usePermission';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import PinChangeModal from '@/components/hub/PinChangeModal';
import { hasFullAccess } from '@/utils/torranceAccess';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface Portal {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
}

interface EmployeeInfo {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  position: string;
  isCEO: boolean;
}

const MainHub: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [user, setUser] = useState<any>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track user activity
  useActivityTracking('hub');
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinChangeModal, setShowPinChangeModal] = useState(false);
  
  // Time clock state - initialize with default values
  const [clockStatus, setClockStatus] = useState<{
    isClockedIn: boolean;
    clockInAt: string | null;
    hoursToday: number;
    weeklyHours: number;
    currentEntryId: string | null;
  }>({
    isClockedIn: false,
    clockInAt: null,
    hoursToday: 0,
    weeklyHours: 0,
    currentEntryId: null,
  });
  const [clockLoading, setClockLoading] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [showClockHistory, setShowClockHistory] = useState(false);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDuration, setCurrentDuration] = useState('00:00:00');
  
  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [showDepartments, setShowDepartments] = useState(true);
  
  // Access control state
  const [userAccess, setUserAccess] = useState<{
    canViewEmployeeCount: boolean;
    canViewBudget: boolean;
    isDepartmentHead: boolean;
    isExecutive: boolean;
    isCEO: boolean;
    isCFO: boolean;
  }>({
    canViewEmployeeCount: false,
    canViewBudget: false,
    isDepartmentHead: false,
    isExecutive: false,
    isCEO: false,
    isCFO: false,
  });
  
  // SSN verification modal state
  const [showSSNModal, setShowSSNModal] = useState(false);
  const [ssnInput, setSsnInput] = useState('');
  const [ssnVerifying, setSsnVerifying] = useState(false);
  const [pendingClockAction, setPendingClockAction] = useState<'in' | 'out' | null>(null);
  
  // Flash effect state
  const [flashColor, setFlashColor] = useState<string | null>(null);
  
  // Load persisted clock status from localStorage on mount
  useEffect(() => {
    if (user) {
      try {
        const savedStatus = localStorage.getItem(`clock_status_${user.id}`);
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          // Only use saved status if it's recent (within last 24 hours)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setClockStatus({
              isClockedIn: parsed.isClockedIn,
              clockInAt: parsed.clockInAt,
              hoursToday: parsed.hoursToday || 0,
              weeklyHours: parsed.weeklyHours || 0,
              currentEntryId: parsed.currentEntryId || null,
            });
            setStatusLoaded(true);
            console.log('Loaded persisted clock status from localStorage');
          } else {
            // No valid saved status, mark as loaded so we can fetch from database
            setStatusLoaded(true);
          }
        } else {
          // No saved status, mark as loaded so we can fetch from database
          setStatusLoaded(true);
        }
      } catch (err) {
        console.log('Could not load persisted status:', err);
        // On error, mark as loaded so we can fetch from database
        setStatusLoaded(true);
      }
    }
  }, [user]);
  
  // Save clock status to localStorage whenever it changes
  useEffect(() => {
    if (user && statusLoaded) {
      try {
        localStorage.setItem(`clock_status_${user.id}`, JSON.stringify({
          ...clockStatus,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.log('Could not save status to localStorage:', err);
      }
    }
  }, [clockStatus, user, statusLoaded]);

  // CEO Master PIN - Torrance Stroman
  const CEO_MASTER_PIN = "999999";
  const CEO_PIN = "020304"; // CEO PIN for tstroman.ceo@cravenusa.com
  const CEO_EMAIL_PATTERN = /torrance|stroman/i;

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Always redirect to business auth with hq=true parameter
        window.location.href = '/auth?hq=true&redirect=/hub';
        return;
      }

      setUser(user);

      // Check if PIN is already verified (stored in sessionStorage)
      const verifiedEmployee = sessionStorage.getItem("hub_employee_info");
      if (verifiedEmployee) {
        setEmployeeInfo(JSON.parse(verifiedEmployee));
        setLoading(false);
        return;
      }

      // ALL users (including admins and executives) must verify PIN
      // This is the main access point - everyone goes through PIN verification
      setPinModalVisible(true);
      setLoading(false);
    } catch (error) {
      console.error('Error checking user:', error);
      // Always redirect to business auth with hq=true parameter
      window.location.href = '/auth?hq=true&redirect=/hub';
    }
  };

  const verifyPIN = async (values: { email: string; pin: string }) => {
    setPinLoading(true);
    const { email, pin } = values;

    try {
      // Check for ALL executives (CEO, CTO, CFO, COO, etc.) using database verification
      // First, check if user is an executive via exec_users or ceo_access_credentials
      const { data: execUser } = await supabase
        .from("exec_users")
        .select("role, title, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const { data: hasAccessCred } = await supabase
        .from("ceo_access_credentials")
        .select("user_email")
        .eq("user_email", email.toLowerCase())
        .maybeSingle();

      // If user is an executive OR has access credentials, verify PIN
      if (execUser || hasAccessCred) {
        const { data: isValidPin, error: pinError } = await supabase
          .rpc('verify_ceo_pin', { 
            check_email: email.toLowerCase(), 
            check_pin: pin 
          });

        if (!pinError && isValidPin) {
          // Check if user has temporary PIN flag - prompt for PIN change
          if (user.user_metadata?.requires_pin_change === true) {
            setPinModalVisible(false);
            setPinLoading(false);
            setShowPinChangeModal(true);
            return;
          }

          const { data: profiles } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
          
          // Determine role and position
          const isCEO = execUser?.role === 'ceo' || email.toLowerCase() === 'tstroman.ceo@cravenusa.com';
          const position = execUser?.title || profiles?.role || "Executive";
          const employeeNumber = isCEO ? "CEO001" : execUser?.role?.toUpperCase() + "001" || "EXEC001";
          
          const execInfo: EmployeeInfo = {
            id: user.id,
            employee_number: employeeNumber,
            full_name: profiles?.full_name || "Executive",
            email: user.email || email,
            position: position,
            isCEO: isCEO,
          };

          sessionStorage.setItem("hub_employee_info", JSON.stringify(execInfo));
          setEmployeeInfo(execInfo);
          setPinModalVisible(false);
          message.success(`Welcome, ${profiles?.full_name || position}! PIN verified.`);
          setPinLoading(false);
          return;
        }
      }

      // Fallback: Check CEO Master PIN or hardcoded PIN
      if (pin === CEO_MASTER_PIN || pin === CEO_PIN) {
        // Check if email matches CEO pattern
        const isCEOEmail = email.toLowerCase().includes("torrance") ||
                          email.toLowerCase().includes("stroman") ||
                          email.toLowerCase().includes("tstroman.ceo@cravenusa.com");

        if (isCEOEmail) {
          const { data: profiles } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();

          const ceoInfo: EmployeeInfo = {
            id: user.id,
            employee_number: "CEO001",
            full_name: profiles?.full_name || "Torrance Stroman",
            email: user.email || email,
            position: "Chief Executive Officer",
            isCEO: true,
          };

          sessionStorage.setItem("hub_employee_info", JSON.stringify(ceoInfo));
          setEmployeeInfo(ceoInfo);
          setPinModalVisible(false);
          message.success("Welcome, CEO Stroman! PIN verified.");
          setPinLoading(false);
          return;
        }
      }

      // Note: execUser was already checked above, so we skip the duplicate check here

      // Verify employee PIN - try multiple methods
      let employee: any = null;
      let verificationError: any = null;

      try {
        // Method 1: Try RPC function first
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc("verify_employee_portal_pin", {
            p_email: email,
            p_pin: pin,
          });

          if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            employee = rpcData[0];
          } else {
            verificationError = rpcError;
          }
        } catch (rpcErr: any) {
          console.log("RPC function not available or failed, trying direct query:", rpcErr.message);
          verificationError = rpcErr;
        }

        // Method 2: Direct query with portal_pin (if column exists)
        if (!employee) {
          try {
            const { data: queryData, error: queryError } = await supabase
              .from("employees")
              .select(
                "id, employee_number, first_name, last_name, email, position, portal_pin, portal_access_granted, employment_status",
              )
              .eq("email", email)
              .eq("employment_status", "active")
              .single();

            if (queryError) {
              console.log("Direct query error:", queryError);
              verificationError = queryError;
            } else if (queryData) {
              // Check if portal_pin column exists and matches
              if (queryData.portal_pin !== undefined) {
                if (queryData.portal_pin === pin && queryData.portal_access_granted !== false) {
                  employee = {
                    employee_id: queryData.id,
                    employee_number: queryData.employee_number,
                    full_name: `${queryData.first_name} ${queryData.last_name}`,
                    email: queryData.email,
                    position: queryData.position,
                  };
                } else {
                  verificationError = new Error("PIN does not match or access not granted");
                }
              } else {
                // portal_pin column doesn't exist yet - allow any PIN for testing
                // This is temporary until migration is run
                console.warn("portal_pin column not found - allowing access for testing");
                employee = {
                  employee_id: queryData.id,
                  employee_number: queryData.employee_number,
                  full_name: `${queryData.first_name} ${queryData.last_name}`,
                  email: queryData.email,
                  position: queryData.position,
                };
              }
            }
          } catch (queryErr: any) {
            console.log("Direct query failed:", queryErr.message);
            verificationError = queryErr;
          }
        }
      } catch (err: any) {
        console.error("PIN verification error:", err);
        verificationError = err;
      }

      if (!employee) {
        console.error("PIN verification failed:", verificationError);
        const errorMsg = verificationError?.message || "Invalid email or PIN";
        message.error(`Access denied: ${errorMsg}. Please check your credentials or contact HR for portal access.`);
        setPinLoading(false);
        return;
      }

      // Check if employee is also an admin
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, full_name")
        .eq("user_id", user.id)
        .single();

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

      const isAdmin = profile?.role === "admin" || roles?.some((r) => r.role === "admin");

      const employeeData: EmployeeInfo = {
        id: employee.employee_id || employee.id,
        employee_number: employee.employee_number || "N/A",
        full_name: employee.full_name || `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        position: isAdmin ? `${employee.position} (Admin)` : employee.position,
        isCEO: false,
      };

      sessionStorage.setItem("hub_employee_info", JSON.stringify(employeeData));
      setEmployeeInfo(employeeData);
      setPinModalVisible(false);
      message.success(`Welcome, ${employeeData.full_name}! ${isAdmin ? "Admin access granted." : ""}`);
      setPinLoading(false);
    } catch (error: any) {
      console.error("PIN verification error:", error);
      message.error("Failed to verify PIN. Please try again.");
      setPinLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all local storage related to auth
      sessionStorage.removeItem("hub_employee_info");
      localStorage.removeItem("hub_employee_info");
      
      // Clear all Supabase auth keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear from sessionStorage
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase (global scope to invalidate all sessions)
      await supabase.auth.signOut({ scope: 'global' });
      
      message.success('Signed out successfully');
      
      // Force redirect to business auth with hq=true parameter
      setTimeout(() => {
        const currentHost = window.location.hostname;
        if (currentHost === 'hq.cravenusa.com' || currentHost.includes('hq.')) {
          window.location.href = 'https://hq.cravenusa.com/auth?hq=true';
        } else {
          window.location.href = '/auth?hq=true';
        }
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if signOut fails
      const currentHost = window.location.hostname;
      if (currentHost === 'hq.cravenusa.com' || currentHost.includes('hq.')) {
        window.location.href = 'https://hq.cravenusa.com/auth?hq=true';
      } else {
        window.location.href = '/auth?hq=true';
      }
    }
  };

  // Time clock utility functions
  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDuration = (start: Date | string, end: Date | string): string => {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const diffMs = endDate.getTime() - startDate.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  // Fetch clock status - ALWAYS trust the database, never auto-reset
  const fetchClockStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_employee_clock_status', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('RPC error fetching clock status:', error);
        // DON'T reset state on error - keep existing state and retry
        // Only log the error, don't change state
        return;
      }
      
      console.log('Clock status response:', data);
      
      // The function always returns one row (even if clocked out)
      if (data && data.length > 0) {
        const status = data[0];
        const isClockedIn = Boolean(status.is_clocked_in);
        
        console.log('Parsed clock status from database:', {
          raw: status.is_clocked_in,
          parsed: isClockedIn,
          clockInAt: status.clock_in_time,
          currentEntryId: status.current_entry_id
        });
        
        // ALWAYS update with database state - this is the source of truth
        const newStatus = {
          isClockedIn: isClockedIn,
          clockInAt: status.clock_in_time || null,
          hoursToday: Number(status.total_hours_today) || 0,
          weeklyHours: Number(status.weekly_hours) || 0,
          currentEntryId: status.current_entry_id || null
        };
        setClockStatus(newStatus);
        setStatusLoaded(true);
        
        // Persist to localStorage
        if (user) {
          try {
            localStorage.setItem(`clock_status_${user.id}`, JSON.stringify({
              ...newStatus,
              timestamp: Date.now(),
            }));
          } catch (err) {
            console.log('Could not save to localStorage:', err);
          }
        }
        
        // Update current duration if clocked in
        if (isClockedIn && status.clock_in_time) {
          const duration = calculateDuration(status.clock_in_time, new Date());
          setCurrentDuration(duration);
        } else {
          setCurrentDuration('00:00:00');
        }
      } else {
        // No status found - database explicitly says user is clocked out
        console.log('Database confirms: user is clocked out');
        const newStatus = {
          isClockedIn: false,
          clockInAt: null,
          hoursToday: 0,
          weeklyHours: 0,
          currentEntryId: null
        };
        setClockStatus(newStatus);
        setStatusLoaded(true);
        setCurrentDuration('00:00:00');
        
        // Persist to localStorage
        if (user) {
          try {
            localStorage.setItem(`clock_status_${user.id}`, JSON.stringify({
              ...newStatus,
              timestamp: Date.now(),
            }));
          } catch (err) {
            console.log('Could not save to localStorage:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching clock status:', error);
      // CRITICAL: Do NOT change state on error - preserve existing state
      // The state should only change via explicit clock in/out or confirmed database response
      console.warn('Preserving existing clock status due to fetch error');
    }
  };

  // Fetch time entries history with names
  const fetchTimeEntries = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          employees:employee_id (
            id,
            first_name,
            last_name,
            email
          ),
          exec_users:exec_user_id (
            id,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .order('clock_in_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      if (data) {
        // Fetch names for entries
        const entriesWithNames = await Promise.all(
          data.map(async (entry: any) => {
            let name = employeeInfo?.full_name || 'Unknown';
            
            // If entry has employee data, use it
            if (entry.employees && entry.employees.first_name) {
              name = `${entry.employees.first_name} ${entry.employees.last_name}`;
            } 
            // If entry has exec_user data, fetch name
            else if (entry.exec_users) {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', entry.exec_users.user_id)
                .single();
              if (profile?.full_name) {
                name = profile.full_name;
              } else if (profile?.email) {
                name = profile.email;
              }
            }
            
            return { ...entry, display_name: name };
          })
        );
        setTimeEntries(entriesWithNames);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  // Verify SSN last 4 digits
  const verifySSN = async (ssnLast4: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // CEO/Torrance bypass - check if user is CEO first
      const isTorranceUser = hasFullAccess(user.email) || 
                            user.email?.toLowerCase() === 'tstroman.ceo@cravenusa.com' ||
                            user.email?.toLowerCase().includes('torrance') ||
                            user.email?.toLowerCase().includes('tstroman');
      
      if (isTorranceUser) {
        // For CEO, first try to get employee record
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('ssn_last4, id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // If employee record exists and has SSN, verify it
        if (employee && employee.ssn_last4) {
          const isValid = employee.ssn_last4 === ssnLast4;
          console.log('CEO SSN verification:', { 
            provided: ssnLast4, 
            stored: employee.ssn_last4, 
            match: isValid 
          });
          return isValid;
        }
        
        // If no employee record or no SSN set, log warning but allow CEO to proceed
        // This ensures CEO can always clock in/out even if employee record is missing
        if (employeeError && employeeError.code !== 'PGRST116') {
          console.warn('Error fetching CEO employee record:', employeeError);
        }
        console.log('CEO user - no employee record or SSN found, allowing SSN verification to proceed');
        // Note: In production, you may want to add a hardcoded CEO SSN check here
        // For now, allowing CEO to proceed if employee record doesn't exist
        return true;
      }
      
      // Regular employee verification
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('ssn_last4, id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
        return false;
      }
      
      // Employee must have ssn_last4 set in database
      if (!employee || !employee.ssn_last4) {
        console.log('Employee does not have SSN last 4 set in database');
        return false;
      }
      
      // Verify the SSN matches
      const isValid = employee.ssn_last4 === ssnLast4;
      console.log('SSN verification:', { 
        provided: ssnLast4, 
        stored: employee.ssn_last4, 
        match: isValid 
      });
      
      return isValid;
    } catch (error) {
      console.error('Error verifying SSN:', error);
      return false;
    }
  };

  // Handle SSN verification submission
  const handleSSNSubmit = async () => {
    if (!ssnInput || ssnInput.length !== 4) {
      message.error('Please enter the last 4 digits of your Social Security Number');
      return;
    }
    
    if (!/^\d{4}$/.test(ssnInput)) {
      message.error('Please enter only numbers');
      return;
    }
    
    setSsnVerifying(true);
    
    try {
      const isValid = await verifySSN(ssnInput);
      
      if (!isValid) {
        message.error('Invalid SSN. Please try again.');
        setSsnInput('');
        setSsnVerifying(false);
        return;
      }
      
      // Close modal and proceed with pending action
      setShowSSNModal(false);
      setSsnInput('');
      setSsnVerifying(false);
      
      // Flash effect and clock action
      if (pendingClockAction === 'in') {
        setFlashColor('green');
        await performClockIn();
        // Clear flash after action completes
        setTimeout(() => setFlashColor(null), 1000);
      } else if (pendingClockAction === 'out') {
        setFlashColor('red');
        await performClockOut();
        // Clear flash after action completes
        setTimeout(() => setFlashColor(null), 1000);
      }
      
      setPendingClockAction(null);
    } catch (error: any) {
      message.error('Verification failed: ' + error.message);
      setSsnVerifying(false);
    }
  };

  // Show SSN modal before clocking in
  const handleClockIn = async () => {
    if (!user) return;
    setPendingClockAction('in');
    setShowSSNModal(true);
    setSsnInput('');
  };

  // Show SSN modal before clocking out
  const handleClockOut = async () => {
    if (!user) return;
    setPendingClockAction('out');
    setShowSSNModal(true);
    setSsnInput('');
  };

  // Actual clock in function (called after SSN verification)
  const performClockIn = async () => {
    if (!user) return;
    setClockLoading(true);
    
    try {
      // Call with user_id (works for both employees and executives)
      const { data, error } = await supabase.rpc('clock_in', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      message.success('Clocked in successfully');
      
      // Update state immediately for instant UI feedback
      const now = new Date().toISOString();
      console.log('Setting clock status to CLOCKED IN immediately', { now, data });
      
      // Get the actual clock_in_at from the database entry if we have the entry ID
      let actualClockInAt = now;
      if (data) {
        try {
          const { data: entry } = await supabase
            .from('time_entries')
            .select('clock_in_at')
            .eq('id', data)
            .single();
          if (entry?.clock_in_at) {
            actualClockInAt = entry.clock_in_at;
          }
        } catch (err) {
          console.log('Could not fetch entry timestamp, using now:', err);
        }
      }
      
      // Update state immediately - use direct state update for immediate UI feedback
      const updatedStatus = {
        isClockedIn: true,
        clockInAt: actualClockInAt,
        hoursToday: 0, // Will be updated by fetchClockStatus
        weeklyHours: 0, // Will be updated by fetchClockStatus
        currentEntryId: data || null
      };
      
      console.log('Setting clock status to CLOCKED IN:', updatedStatus);
      setClockStatus(updatedStatus);
      setStatusLoaded(true);
      setCurrentDuration('00:00:00'); // Reset duration counter
      
      // Persist to localStorage immediately
      if (user) {
        try {
          localStorage.setItem(`clock_status_${user.id}`, JSON.stringify({
            ...updatedStatus,
            timestamp: Date.now(),
          }));
        } catch (err) {
          console.log('Could not save clock in to localStorage:', err);
        }
      }
      
      // Fetch entries immediately
      await fetchTimeEntries();
      
      // Verify status in the background without blocking UI updates
      // Don't reset state if verification fails - trust the immediate update
      setTimeout(async () => {
        try {
          const { data: statusData, error: statusError } = await supabase.rpc('get_employee_clock_status', {
            p_user_id: user.id
          });
          
          if (!statusError && statusData && statusData.length > 0) {
            const status = statusData[0];
            const isClockedIn = Boolean(status.is_clocked_in);
            
            if (isClockedIn) {
              // Only update if still clocked in (don't override if user already clocked out)
              setClockStatus(prev => {
                if (prev.isClockedIn) {
                  // Update with server data but preserve isClockedIn = true
                  return {
                    isClockedIn: true, // Always keep this true if we're verifying clock in
                    clockInAt: status.clock_in_time || prev.clockInAt,
                    hoursToday: Number(status.total_hours_today) || prev.hoursToday,
                    weeklyHours: Number(status.weekly_hours) || prev.weeklyHours,
                    currentEntryId: status.current_entry_id || prev.currentEntryId
                  };
                }
                return prev; // Don't change if user already clocked out
              });
              console.log('Verified clocked in status from server');
            } else {
              console.warn('Verification says not clocked in, but keeping local state');
              // Don't reset - trust the immediate update
            }
          }
        } catch (err) {
          console.error('Error verifying status (non-blocking):', err);
          // Don't reset state on verification error
        }
      }, 500);
    } catch (error: any) {
      console.error('Clock in error:', error);
      message.error(error.message || 'Failed to clock in');
    } finally {
      setClockLoading(false);
    }
  };

  // Actual clock out function (called after SSN verification)
  const performClockOut = async () => {
    if (!user) return;
    setClockLoading(true);
    
    try {
      // Call with user_id (works for both employees and executives)
      const { data, error } = await supabase.rpc('clock_out', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      message.success('Clocked out successfully');
      
      // Update state immediately for instant UI feedback
      console.log('Setting clock status to CLOCKED OUT immediately');
      const newClockOutStatus = {
        isClockedIn: false,
        clockInAt: null,
        hoursToday: 0,
        weeklyHours: 0,
        currentEntryId: null
      };
      setClockStatus(newClockOutStatus);
      setStatusLoaded(true);
      setCurrentDuration('00:00:00');
      
      // Persist to localStorage immediately
      if (user) {
        try {
          localStorage.setItem(`clock_status_${user.id}`, JSON.stringify({
            ...newClockOutStatus,
            timestamp: Date.now(),
          }));
        } catch (err) {
          console.log('Could not save clock out to localStorage:', err);
        }
      }
      
      // Small delay to ensure state is updated, then fetch from server
      setTimeout(async () => {
        await fetchClockStatus();
        await fetchTimeEntries();
      }, 100);
    } catch (error: any) {
      message.error(error.message || 'Failed to clock out');
    } finally {
      setClockLoading(false);
    }
  };

  // Real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (clockStatus.isClockedIn && clockStatus.clockInAt) {
        const duration = calculateDuration(clockStatus.clockInAt, new Date());
        setCurrentDuration(duration);
      } else {
        setCurrentDuration('00:00:00');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [clockStatus]);

  // Fetch clock status when user is available
  // CRITICAL: Only fetch status from database, never reset state
  useEffect(() => {
    if (user && statusLoaded) {
      // Only fetch from database AFTER localStorage has been checked
      // This ensures we don't override the persisted state
      console.log('Status loaded, fetching clock status from database for sync...', user.id);
      fetchClockStatus();
      fetchTimeEntries();
      // Poll for updates every 60 seconds (only to sync, never to reset) - reduced frequency
      const interval = setInterval(() => {
        fetchClockStatus();
      }, 60000);
      return () => clearInterval(interval);
    } else if (user && !statusLoaded) {
      // If status not loaded yet, just fetch entries (don't fetch status until localStorage loads)
      fetchTimeEntries();
    }
  }, [user, statusLoaded]);

  // Fetch departments
  const fetchDepartments = async () => {
    if (!user) return;
    setDepartmentsLoading(true);
    try {
      let deptData: any[] = [];
      
      // Try simpler query first (foreign key relationships can be problematic with RLS)
      const { data: simpleData, error: simpleError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });
      
      if (simpleError) {
        console.error('Error fetching departments:', simpleError);
        throw simpleError;
      }
      deptData = simpleData || [];

      // Get employee counts and head employee info for each department
      const departmentsWithCounts = await Promise.all(
        deptData.map(async (dept) => {
          // Get employee count
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .eq('employment_status', 'active');

          // Get head employee if exists (if not already fetched via join)
          let headEmployee = dept.head_employee || null;
          if (!headEmployee && dept.head_employee_id) {
            const { data: head } = await supabase
              .from('employees')
              .select('id, first_name, last_name, email')
              .eq('id', dept.head_employee_id)
              .single();
            headEmployee = head;
          }

          // Get unique positions/roles in this department
          const { data: employees } = await supabase
            .from('employees')
            .select('position')
            .eq('department_id', dept.id)
            .eq('employment_status', 'active');

          // Count occurrences of each position
          const roleCounts: Record<string, number> = {};
          employees?.forEach((emp) => {
            if (emp.position) {
              roleCounts[emp.position] = (roleCounts[emp.position] || 0) + 1;
            }
          });

          // Convert to array of roles with counts
          const roles = Object.entries(roleCounts)
            .map(([position, count]) => ({ position, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

          return {
            ...dept,
            employee_count: count || 0,
            head_employee: headEmployee,
            roles: roles,
          };
        })
      );

      setDepartments(departmentsWithCounts);
    } catch (error) {
      console.error('Error fetching departments:', error);
      message.error('Failed to load departments');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Check user access permissions
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) return;

      const userEmail = user.email?.toLowerCase() || '';
      
      // TORRANCE STROMAN: UNIVERSAL ACCESS - SEES EVERYTHING
      const isTorrance = hasFullAccess(user.email) || 
                        userEmail === 'tstroman.ceo@cravenusa.com' || 
                        userEmail.includes('torrance') || 
                        userEmail.includes('tstroman');

      if (isTorrance) {
        setUserAccess({
          canViewEmployeeCount: true,
          canViewBudget: true,
          isDepartmentHead: true,
          isExecutive: true,
          isCEO: true,
          isCFO: true,
        });
        return;
      }

      // Check if user is an executive
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role, title, department')
        .eq('user_id', user.id)
        .maybeSingle();

      const isExecutive = !!execUser;
      const isCEO = execUser?.role === 'ceo';
      const isCFO = execUser?.role === 'cfo';

      // Check if user is a department head
      let isDepartmentHead = false;
      if (employeeInfo?.id) {
        const { data: deptHead } = await supabase
          .from('departments')
          .select('id')
          .eq('head_employee_id', employeeInfo.id)
          .maybeSingle();
        isDepartmentHead = !!deptHead;
      }

      // Employee Count: Department heads and Executives
      const canViewEmployeeCount = isDepartmentHead || isExecutive;

      // Budget: CEO and CFO only
      const canViewBudget = isCEO || isCFO;

      setUserAccess({
        canViewEmployeeCount,
        canViewBudget,
        isDepartmentHead,
        isExecutive,
        isCEO,
        isCFO,
      });
    };

    if (user) {
      checkUserAccess();
    }
  }, [user, employeeInfo]);

  useEffect(() => {
    if (user && employeeInfo) {
      fetchDepartments();
    }
  }, [user, employeeInfo]);

  // Company-side portals only
  const portals: Portal[] = [
    {
      id: "company",
      name: "Company Portal",
      description: "Restricted – Corporate HQ",
      icon: LockOutlined,
      path: "/company",
      color: "#ff6a00",
    },
    {
      id: "admin",
      name: "Admin Portal",
      description: "System administration and operations management",
      icon: SettingOutlined,
      path: "/admin",
      color: "#ff4d4f",
    },
    {
      id: "marketing",
      name: "Marketing Portal",
      description: "Campaigns, analytics, and customer engagement",
      icon: RocketOutlined,
      path: "/marketing-portal",
      color: "#ff7a45",
    },
    {
      id: "ceo",
      name: "CEO Command Center",
      description: "Executive leadership and strategic oversight",
      icon: DashboardOutlined,
      path: "/ceo",
      color: "#13c2c2",
    },
    {
      id: "cfo",
      name: "CFO Portal",
      description: "Financial management and reporting",
      icon: DollarOutlined,
      path: "/cfo",
      color: "#52c41a",
    },
    {
      id: "coo",
      name: "COO Operations Portal",
      description: "Operations and logistics management",
      icon: ShopOutlined,
      path: "/coo",
      color: "#1890ff",
    },
    {
      id: "cto",
      name: "CTO Technology Portal",
      description: "Technology and engineering dashboard",
      icon: BarChartOutlined,
      path: "/cto",
      color: "#eb2f96",
    },
    {
      id: "articles-generator",
      name: "Articles Generator",
      description: "Generate Articles of Incorporation documents",
      icon: FileTextOutlined,
      path: "/technology/articles-generator",
      color: "#722ed1",
    },
    {
      id: "cxo",
      name: "CXO Experience Portal",
      description: "Experience leadership and customer insights",
      icon: TeamOutlined,
      path: "/cxo",
      color: "#fa541c",
    },
    {
      id: "hr",
      name: "HR Portal",
      description: "Human resources and document generation",
      icon: FileTextOutlined,
      path: "/hr-portal",
      color: "#fa8c16",
    },
    {
      id: "merchant-operations",
      name: "Merchant Operations",
      description: "Restaurant onboarding, verification, and management",
      icon: ShopOutlined,
      path: "/merchant-operations",
      color: "#ff7a45",
    },
    {
      id: "driver-operations",
      name: "Driver Operations",
      description: "Driver applications, onboarding, and management",
      icon: TeamOutlined,
      path: "/driver-operations",
      color: "#52c41a",
    },
    {
      id: "customer-success",
      name: "Customer Success",
      description: "Customer accounts, promos, and engagement",
      icon: UserOutlined,
      path: "/customer-success",
      color: "#1890ff",
    },
    {
      id: "support-operations",
      name: "Support Operations",
      description: "Refunds, disputes, tickets, and audit logs",
      icon: SafetyOutlined,
      path: "/support-operations",
      color: "#fa541c",
    },
    {
      id: "testing",
      name: "Testing Portal",
      description: "QA testing and test data management",
      icon: BugOutlined,
      path: "/testing",
      color: "#fa8c16",
    },
    {
      id: "intern",
      name: "Intern Portal",
      description: "Intern workspace for training, tasks, and performance",
      icon: UserOutlined,
      path: "/intern/dashboard",
      color: "#6366f1",
    },
    {
      id: "intern-manager",
      name: "Intern Manager",
      description: "Manage assigned interns, reviews, and approvals",
      icon: TeamOutlined,
      path: "/manager/dashboard",
      color: "#0ea5e9",
    },
    {
      id: "intern-sponsor",
      name: "Executive Sponsor",
      description: "Review conversion pipeline and finalize approvals",
      icon: CrownOutlined,
      path: "/executive-sponsor/pipeline",
      color: "#a855f7",
    },
    {
      id: "intern-program-admin",
      name: "Intern Program Admin",
      description: "Configure intern tracks, templates, and access",
      icon: SettingOutlined,
      path: "/admin/intern-program/dashboard",
      color: "#f97316",
    },
  ];

  // Permission flags (used to gray out tiles but keep visible)
  const canAdmin = usePermission('admin.view');
  const canMarketing = usePermission('marketing.view');
  const canCEO = usePermission('ceo.view');
  const canCFO = usePermission('finance.view');
  const canCOO = usePermission('coo.view');
  const canCTO = usePermission('cto.view');
  const canHR = usePermission('hr.view');

  const [hasCompanyAccess, setHasCompanyAccess] = useState(false);

  useEffect(() => {
    const checkCompanyAccess = async () => {
      try {
        // Check if user is tstroman.ceo@cravenusa.com first (CEO executive account)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'tstroman.ceo@cravenusa.com') {
          setHasCompanyAccess(true);
          return;
        }

        const { fetchUserRoles, hasCompanyPortalAccess } = await import('@/lib/roles');
        const roles = await fetchUserRoles();
        const hasAccess = await hasCompanyPortalAccess(roles);
        setHasCompanyAccess(hasAccess);
      } catch (error) {
        console.error('Error checking company access:', error);
      }
    };
    checkCompanyAccess();
  }, []);

  const isPortalAllowed = (id: string): boolean => {
    switch (id) {
      case 'company': return hasCompanyAccess;
      case 'admin': return canAdmin;
      case 'marketing': return canMarketing;
      case 'ceo': return canCEO;
      case 'cfo': return canCFO;
      case 'coo': return canCOO;
      case 'cto': return canCTO;
      case 'articles-generator': return canCTO; // Technology department access
      case 'cxo': return canCEO;
      case 'hr': return canHR;
      default: return true;
    }
  };

  // Permission gates for portal visibility
  // Show all portals (permissions temporarily disabled at hub level)

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider theme={cravenDriverTheme}>
      <Layout style={{ minHeight: "100vh", background: "#ffffff" }}>
        {/* Corporate Header */}
        <Header
          style={{
            background: "#ffffff",
            padding: "0 16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            height: 56,
            flexWrap: "wrap",
            minHeight: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            <img
              src={cravenLogo}
              alt="Crave'N"
              style={{
                height: 32,
                width: "auto",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                borderLeft: "1px solid #e5e7eb",
                height: 32,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                minWidth: 0,
                flex: "1 1 auto",
                overflow: "hidden",
              }}
            >
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: "#111827",
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Portal Access
              </Title>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {employeeInfo ? `${employeeInfo.full_name} • ${employeeInfo.position}` : "Corporate Access Portal"}
              </Text>
            </div>
          </div>
          <Space
            size="middle"
            style={{
              flexShrink: 0,
              marginLeft: 16,
            }}
          >
            {employeeInfo && (
              <Avatar
                size={32}
                style={{
                  backgroundColor: "#ff7a45",
                  color: "#fff",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {employeeInfo.full_name.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                borderColor: "#d1d5db",
                color: "#374151",
                height: 36,
                flexShrink: 0,
                fontSize: 13,
                padding: "0 12px",
              }}
            >
              Sign Out
            </Button>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: "16px 12px",
            maxWidth: 1600,
            margin: "0 auto",
            width: "100%",
            background: "#ffffff",
          }}
        >
          <div style={{ marginBottom: 16 }} />

          {/* Time Clock Section - Redesigned Compact Layout */}
          {user && (
            <Card
              style={{
                marginBottom: 16,
                background: flashColor === 'green' 
                  ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                  : flashColor === 'red'
                  ? 'linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)'
                  : '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'background 0.3s ease',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Row gutter={[16, 12]} align="middle">
                {/* Left Section: Time & Date */}
                <Col xs={24} sm={12} md={8}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ClockCircleOutlined style={{ 
                      fontSize: 32, 
                      color: flashColor ? '#fff' : '#ff7a45',
                      opacity: 0.9 
                    }} />
                    <div style={{ color: flashColor ? '#fff' : '#111827' }}>
                      <div style={{ 
                        fontSize: 28, 
                        fontWeight: 700, 
                        fontFamily: 'monospace', 
                        lineHeight: 1.2,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6
                      }}>
                        {formatTime(currentTime).split(' ')[0]}
                        <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>
                          {formatTime(currentTime).split(' ')[1]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                        {formatDate(currentTime)}
                      </div>
                    </div>
                  </div>
                </Col>
                
                {/* Center Section: Status Badge & Duration */}
                <Col xs={24} sm={12} md={6}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 20,
                      background: clockStatus.isClockedIn 
                        ? (flashColor ? 'rgba(255,255,255,0.3)' : '#52c41a')
                        : (flashColor ? 'rgba(255,255,255,0.25)' : '#f3f4f6'),
                      border: clockStatus.isClockedIn && !flashColor ? '1px solid #52c41a' : 'none',
                      fontSize: 11,
                      fontWeight: 700,
                      color: clockStatus.isClockedIn 
                        ? (flashColor ? '#fff' : '#fff')
                        : (flashColor ? '#fff' : '#6b7280'),
                      letterSpacing: 0.5,
                    }}>
                      {clockStatus.isClockedIn ? (
                        <>
                          <div style={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            background: flashColor ? '#fff' : '#fff',
                            animation: clockStatus.isClockedIn ? 'pulse 2s infinite' : 'none'
                          }} />
                          CLOCKED IN
                        </>
                      ) : (
                        <>
                          <div style={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            background: flashColor ? '#fff' : '#9ca3af'
                          }} />
                          CLOCKED OUT
                        </>
                      )}
                    </div>
                    {clockStatus.isClockedIn && clockStatus.clockInAt && (
                      <div style={{ 
                        fontSize: 13, 
                        fontFamily: 'monospace', 
                        fontWeight: 600,
                        color: flashColor ? '#fff' : '#111827',
                        opacity: 0.9
                      }}>
                        {currentDuration}
                      </div>
                    )}
                  </div>
                </Col>
                
                {/* Right Section: Action Buttons */}
                <Col xs={24} sm={24} md={10}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      type="primary"
                      size="middle"
                      icon={<LoginOutlined />}
                      loading={clockLoading && pendingClockAction === 'in'}
                      onClick={handleClockIn}
                      disabled={clockLoading || clockStatus.isClockedIn}
                      style={{
                        background: clockStatus.isClockedIn ? '#d1d5db' : '#52c41a',
                        border: 'none',
                        height: 36,
                        fontSize: 13,
                        fontWeight: 600,
                        flex: 1,
                        boxShadow: clockStatus.isClockedIn ? 'none' : '0 2px 4px rgba(82, 196, 26, 0.3)',
                      }}
                    >
                      Clock In
                    </Button>
                    <Button
                      type="primary"
                      size="middle"
                      icon={<LogoutOutlined />}
                      loading={clockLoading && pendingClockAction === 'out'}
                      onClick={handleClockOut}
                      disabled={clockLoading || !clockStatus.isClockedIn || pendingClockAction === 'in'}
                      style={{
                        background: !clockStatus.isClockedIn ? '#d1d5db' : '#ff4d4f',
                        border: 'none',
                        height: 36,
                        fontSize: 13,
                        fontWeight: 600,
                        flex: 1,
                        boxShadow: (!clockStatus.isClockedIn || pendingClockAction === 'in') ? 'none' : '0 2px 4px rgba(255, 77, 79, 0.3)',
                      }}
                    >
                      Clock Out
                    </Button>
                  </div>
                </Col>
              </Row>
              
              {/* Bottom Section: Stats & History */}
              <Row gutter={[12, 8]} style={{ marginTop: 12 }}>
                <Col xs={12} sm={6}>
                  <div style={{ 
                    padding: '8px 12px',
                    background: flashColor ? 'rgba(255,255,255,0.15)' : '#f9fafb',
                    borderRadius: 6,
                    border: flashColor ? 'none' : '1px solid #e5e7eb',
                  }}>
                    <div style={{ 
                      fontSize: 10, 
                      fontWeight: 600,
                      color: flashColor ? '#fff' : '#6b7280', 
                      marginBottom: 4,
                      opacity: 0.9
                    }}>
                      Hours Today
                    </div>
                    <div style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: flashColor ? '#fff' : '#111827', 
                      fontFamily: 'monospace'
                    }}>
                      {clockStatus.hoursToday.toFixed(1)}h
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ 
                    padding: '8px 12px',
                    background: flashColor ? 'rgba(255,255,255,0.15)' : '#f9fafb',
                    borderRadius: 6,
                    border: flashColor ? 'none' : '1px solid #e5e7eb',
                  }}>
                    <div style={{ 
                      fontSize: 10, 
                      fontWeight: 600,
                      color: flashColor ? '#fff' : '#6b7280', 
                      marginBottom: 4,
                      opacity: 0.9
                    }}>
                      Hours This Week
                    </div>
                    <div style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: flashColor ? '#fff' : '#111827', 
                      fontFamily: 'monospace'
                    }}>
                      {clockStatus.weeklyHours.toFixed(1)}h
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <Button
                    type="default"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => {
                      setShowClockHistory(!showClockHistory);
                      if (!showClockHistory) fetchTimeEntries();
                    }}
                    block
                    style={{
                      background: flashColor ? 'rgba(255,255,255,0.2)' : '#ffffff',
                      border: flashColor ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e5e7eb',
                      color: flashColor ? '#fff' : '#6b7280',
                      height: 36,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {showClockHistory ? 'Hide' : 'View'} Time History ({timeEntries.length})
                  </Button>
                </Col>
              </Row>
              
              {/* History Table */}
              {showClockHistory && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <Card
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      border: 'none',
                    }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: 14 }}>
                        <HistoryOutlined style={{ marginRight: 4, color: '#ff7a45', fontSize: 14 }} />
                        Recent Time Entries
                      </Title>
                    </div>
                    
                    {timeEntries.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
                        No time entries recorded yet.
                      </div>
                    ) : (
                      <Table
                        dataSource={timeEntries}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 8, size: 'small' }}
                        columns={[
                          {
                            title: 'Name',
                            dataIndex: 'display_name',
                            key: 'name',
                            render: (name: string) => (
                              <span style={{ fontWeight: 500 }}>{name || 'Unknown'}</span>
                            ),
                          },
                          {
                            title: 'Clock In',
                            dataIndex: 'clock_in_at',
                            key: 'clock_in',
                            render: (date: string) => (
                              <span>
                                {formatDate(date)} at {formatTime(date)}
                              </span>
                            ),
                          },
                          {
                            title: 'Clock Out',
                            dataIndex: 'clock_out_at',
                            key: 'clock_out',
                            render: (date: string | null) => date ? formatTime(date) : 'N/A',
                          },
                          {
                            title: 'Duration',
                            dataIndex: 'total_hours',
                            key: 'duration',
                            render: (hours: number) => hours ? `${hours.toFixed(2)} hrs` : 'N/A',
                          },
                          {
                            title: 'Status',
                            dataIndex: 'status',
                            key: 'status',
                            render: (status: string) => (
                              <Tag color={status === 'clocked_out' ? 'green' : status === 'clocked_in' ? 'blue' : 'orange'}>
                                {status === 'clocked_out' ? 'Completed' : status === 'clocked_in' ? 'Active' : 'On Break'}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    )}
                  </Card>
                </div>
              )}
            </Card>
          )}

          {/* Departments Section */}
          {user && employeeInfo && (
            <Card
              style={{
                marginBottom: 16,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: 14 }}>
                  <TeamOutlined style={{ marginRight: 6, color: '#ff7a45', fontSize: 16 }} />
                  Company Departments
                </Title>
                <Button
                  type="text"
                  size="small"
                  icon={showDepartments ? <span>−</span> : <span>+</span>}
                  onClick={() => setShowDepartments(!showDepartments)}
                  style={{ fontSize: 12, fontWeight: 600, padding: '0 8px', height: 24 }}
                >
                  {showDepartments ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              {showDepartments && (
                <Spin spinning={departmentsLoading}>
                  {departments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>
                      No departments found.
                    </div>
                  ) : (
                    <Row gutter={[8, 8]}>
                      {departments.map((dept) => (
                        <Col xs={12} sm={8} md={6} lg={4} xl={3} key={dept.id}>
                          <Card
                            hoverable
                            style={{
                              height: '100%',
                              borderRadius: 4,
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              transition: 'all 0.2s',
                              cursor: 'pointer',
                            }}
                            bodyStyle={{ padding: 12 }}
                            onClick={() => {
                              const deptName = dept.name.toLowerCase().replace(/\s+/g, '-');
                              navigate(`/hub/department/${deptName}`);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.borderColor = '#ff7a45';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ color: '#111827', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                                {dept.name}
                              </div>
                              {userAccess.canViewEmployeeCount && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, color: '#6b7280' }}>Employees</span>
                                  <Tag color="blue" style={{ margin: 0, fontSize: 10, padding: '0 6px', height: 18 }}>
                                    {dept.employee_count || 0}
                                  </Tag>
                                </div>
                              )}
                              {userAccess.canViewBudget && dept.budget && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, color: '#6b7280' }}>Budget</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#52c41a' }}>
                                    ${(Number(dept.budget) / 1000).toFixed(0)}k
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* View Portals Button */}
                            <Button
                              type="primary"
                              size="small"
                              block
                              style={{
                                background: '#ff7a45',
                                borderColor: '#ff7a45',
                                height: 24,
                                fontSize: 10,
                                fontWeight: 500,
                                marginTop: 8,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const deptName = dept.name.toLowerCase().replace(/\s+/g, '-');
                                navigate(`/hub/department/${deptName}`);
                              }}
                            >
                              View →
                            </Button>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Spin>
              )}
            </Card>
          )}

          {/* Portal Grid - Compact Grid */}
          <Row gutter={[10, 10]}>
            {portals.map((portal) => {
              const allowed = isPortalAllowed(portal.id);
              const Icon = portal.icon;
              return (
                <Col xs={12} sm={8} md={6} lg={4} xl={3} key={portal.id}>
                  <Card
                    hoverable
                    style={{
                      height: "100%",
                      borderRadius: 4,
                      cursor: allowed ? "pointer" : "not-allowed",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      background: "#ffffff",
                      opacity: allowed ? 1 : 0.5,
                    }}
                    onClick={() => {
                      if (allowed) {
                        navigate(portal.path);
                      } else {
                        message.warning('Access denied for this portal');
                      }
                    }}
                    bodyStyle={{ padding: 12 }}
                    onMouseEnter={(e) => {
                      if (allowed) {
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.borderColor = portal.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.06)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 4,
                          background: `linear-gradient(135deg, ${portal.color}15 0%, ${portal.color}08 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 6px",
                          border: `1px solid ${portal.color}20`,
                        }}
                      >
                        <Icon style={{ fontSize: 18, color: portal.color }} />
                      </div>
                      <div
                        style={{
                          color: "#111827",
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          lineHeight: 1.2,
                        }}
                      >
                        {portal.name}
                      </div>
                      <Tooltip title={portal.description}>
                        <Button
                          type="primary"
                          size="small"
                          style={{
                            background: portal.color,
                            borderColor: portal.color,
                            width: "100%",
                            height: 24,
                            fontWeight: 500,
                            fontSize: 10,
                            borderRadius: 4,
                            padding: '0 8px',
                            boxShadow: `0 2px 4px ${portal.color}30`,
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.background = portal.color;
                              e.currentTarget.style.borderColor = portal.color;
                              if (allowed) {
                                e.currentTarget.style.opacity = "0.9";
                                e.currentTarget.style.transform = "scale(1.02)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = portal.color;
                              e.currentTarget.style.borderColor = portal.color;
                              e.currentTarget.style.opacity = "1";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (allowed) navigate(portal.path);
                            }}
                            disabled={!allowed}
                          >
                            {allowed ? 'Access Portal →' : 'No Access'}
                          </Button>
                        </Tooltip>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Content>

        {/* PIN Verification Modal - Corporate Style */}
        <Modal
          title={
            <div style={{ padding: "8px 0" }}>
              <Space size="middle">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "#ff7a4515",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LockOutlined style={{ color: "#ff7a45", fontSize: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>Portal Access Verification</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Enter your credentials to continue</div>
                </div>
              </Space>
            </div>
          }
          open={pinModalVisible}
          onCancel={() => {
            message.warning("PIN verification required to access portals");
          }}
          footer={null}
          closable={false}
          maskClosable={false}
          maskStyle={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
          style={{ top: 120 }}
          width={480}
          zIndex={1000}
        >
          <Form form={form} layout="vertical" onFinish={verifyPIN} autoComplete="off" style={{ marginTop: 8 }}>
            <Form.Item
              label={<span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>Email Address</span>}
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
              style={{ marginBottom: 20 }}
            >
              <Input
                size="large"
                placeholder="employee@cravenusa.com"
                autoComplete="email"
                style={{
                  height: 44,
                  borderRadius: 6,
                  borderColor: "#d1d5db",
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>Portal PIN</span>}
              name="pin"
              rules={[
                { required: true, message: "Please enter your PIN" },
                { len: 6, message: "PIN must be 6 digits" },
                { pattern: /^\d+$/, message: "PIN must be numeric" },
              ]}
              style={{ marginBottom: 24 }}
              help={
                <Text type="secondary" style={{ fontSize: 12, color: "#9ca3af" }}>
                  PINs are issued during the hiring process. CEO has master PIN access.
                </Text>
              }
            >
              <Input.Password
                size="large"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                autoComplete="off"
                style={{
                  height: 44,
                  borderRadius: 6,
                  borderColor: "#d1d5db",
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={pinLoading}
                block
                style={{
                  background: "#ff7a45",
                  borderColor: "#ff7a45",
                  height: 44,
                  fontWeight: 500,
                  fontSize: 15,
                  borderRadius: 6,
                  boxShadow: "0 2px 4px rgba(255, 122, 69, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!pinLoading) {
                    e.currentTarget.style.background = "#ff5a1f";
                    e.currentTarget.style.borderColor = "#ff5a1f";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(255, 122, 69, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!pinLoading) {
                    e.currentTarget.style.background = "#ff7a45";
                    e.currentTarget.style.borderColor = "#ff7a45";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(255, 122, 69, 0.3)";
                  }
                }}
              >
                Verify & Access Portal
              </Button>
            </Form.Item>
          </Form>
        </Modal>
        
        {/* SSN Verification Modal */}
        <Modal
          title={
            <div style={{ textAlign: 'center' }}>
              <LockOutlined style={{ fontSize: 32, color: '#ff7a45', marginBottom: 8 }} />
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {pendingClockAction === 'in' ? 'Clock In Verification' : 'Clock Out Verification'}
              </div>
            </div>
          }
          open={showSSNModal}
          onCancel={() => {
            setShowSSNModal(false);
            setSsnInput('');
            setPendingClockAction(null);
          }}
          footer={null}
          centered
          width={400}
        >
          <div style={{ padding: '20px 0' }}>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
              Please enter the last 4 digits of your Social Security Number to confirm
            </Text>
            
            <Input
              type="text"
              maxLength={4}
              value={ssnInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Only numbers
                if (value.length <= 4) {
                  setSsnInput(value);
                }
              }}
              onPressEnter={handleSSNSubmit}
              placeholder="Enter last 4 digits"
              size="large"
              style={{
                fontSize: 24,
                textAlign: 'center',
                letterSpacing: 8,
                fontFamily: 'monospace',
                fontWeight: 600,
                height: 56,
              }}
              autoFocus
              disabled={ssnVerifying}
            />
            
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleSSNSubmit}
                loading={ssnVerifying}
                disabled={ssnInput.length !== 4 || ssnVerifying}
                style={{
                  background: '#ff7a45',
                  borderColor: '#ff7a45',
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {pendingClockAction === 'in' ? 'Clock In' : 'Clock Out'}
              </Button>
              <Button
                type="text"
                block
                onClick={() => {
                  setShowSSNModal(false);
                  setSsnInput('');
                  setPendingClockAction(null);
                }}
                disabled={ssnVerifying}
                style={{ marginTop: 12 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* PIN Change Modal */}
        <PinChangeModal
          visible={showPinChangeModal}
          userEmail={user?.email || ''}
          onSuccess={() => {
            setShowPinChangeModal(false);
            // Re-show PIN verification modal to allow login with new PIN
            setPinModalVisible(true);
            message.success('PIN updated! Please verify with your new PIN.');
          }}
          onCancel={() => {
            setShowPinChangeModal(false);
            message.warning('You must set a new PIN to access the Hub.');
          }}
        />
      </Layout>
    </ConfigProvider>
  );
};

export default MainHub;

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
  FundOutlined,
  CodeOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  EyeOutlined,
  MessageOutlined,
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

// Shared time-clock duration helper used by MainHub and tests
export const calculateDuration = (start: Date | string, end: Date | string): string => {
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

interface Portal {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
}

interface HubSection {
  id: string;
  title: string;
  subtitle: string;
  portalIds: string[];
}

const isPortalInDepartment = (portalId: string, deptId: string): boolean => {
  switch (deptId) {
    case "executive":
      return ["ceo", "admin", "company", "investors", "cxo", "cfo", "cpo"].includes(portalId);
    case "operations":
      return [
        "coo",
        "merchant-operations",
        "driver-operations",
        "support-operations",
        "customer-success",
      ].includes(portalId);
    case "finance":
      return ["cfo", "foundational-invites"].includes(portalId);
    case "technology":
      return [
        "cto",
        "engineering-workspace",
        "platform-infrastructure",
        "product-command",
        "quality-release",
        "internal-it",
        "testing",
      ].includes(portalId);
    case "marketing":
      return ["marketing", "market-demand"].includes(portalId);
    case "hr":
      return [
        "hr",
        "talent-management",
        "intern",
        "intern-manager",
        "intern-sponsor",
        "intern-program-admin",
      ].includes(portalId);
    case "support":
      return ["support-operations", "customer-success"].includes(portalId);
    case "logistics":
      return ["coo", "driver-operations", "merchant-operations"].includes(portalId);
    default:
      return true;
  }
};

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
  
  // Departments / filters
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  
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
              .maybeSingle();

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
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

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
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', entry.exec_users.user_id)
                .maybeSingle();
              if (!profileError && profile) {
                if (profile.full_name) {
                  name = profile.full_name;
                } else if (profile.email) {
                  name = profile.email;
                }
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

  const closeClockHistory = () => {
    setShowClockHistory(false);
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
        p_user_id: user.id,
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
            .maybeSingle();
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
      
      // If backend says we are already clocked in, immediately resync UI
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('already clocked in') || msg.includes('user is already clocked in')) {
        try {
          await fetchClockStatus();
          await fetchTimeEntries();
        } catch (syncErr) {
          console.error('Error syncing clock status after already-clocked-in error:', syncErr);
        }
      }
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
      console.error('Clock out error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
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
              .maybeSingle();
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
      id: "engineering-workspace",
      name: "Engineering Workspace",
      description: "Sprint management, code reviews, and team collaboration",
      icon: CodeOutlined,
      path: "/engineering-workspace",
      color: "#722ed1",
    },
    {
      id: "platform-infrastructure",
      name: "Platform & Infrastructure Hub",
      description: "Infrastructure monitoring, service health, and deployments",
      icon: CloudServerOutlined,
      path: "/platform-infrastructure",
      color: "#1890ff",
    },
    {
      id: "product-command",
      name: "Product Command Center",
      description: "Product management, feature tracking, and roadmap planning",
      icon: AppstoreOutlined,
      path: "/product-command",
      color: "#52c41a",
    },
    {
      id: "quality-release",
      name: "Quality & Release Portal",
      description: "QA workflows, release management, and testing coordination",
      icon: CheckCircleOutlined,
      path: "/quality-release",
      color: "#fa8c16",
    },
    {
      id: "internal-it",
      name: "Internal IT Operations",
      description: "IT help desk, asset management, and internal tooling",
      icon: DesktopOutlined,
      path: "/internal-it",
      color: "#eb2f96",
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
      id: "market-demand",
      name: "Market Demand",
      description: "Partnership requests, demand metrics, and merchant reports",
      icon: BarChartOutlined,
      path: "/hub/market-demand",
      color: "#f97316",
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
      id: "investors",
      name: "Investors Portal",
      description: "Investor relations, pitch deck, and confidential materials",
      icon: FundOutlined,
      path: "/investors/portal",
      color: "#722ed1",
    },
    {
      id: "investor-demo",
      name: "Investor Demo Portal",
      description: "Manage investor demo access with mock data views",
      icon: EyeOutlined,
      path: "/hub/investor-demo",
      color: "#9333ea",
    },
    {
      id: "foundational-invites",
      name: "Foundational Invites",
      description: "Friends & family support invites ($50-$500)",
      icon: DollarOutlined,
      path: "/hub/foundational/invites",
      color: "#10b981",
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
    {
      id: "talent-management",
      name: "Talent Management",
      description: "Consolidated intern and manager talent workflows",
      icon: TeamOutlined,
      path: "/intern/dashboard",
      color: "#6366f1",
    },
    {
      id: "cpo",
      name: "CPO Partnership Portal",
      description: "Partnership management, pipeline, contracts, and analytics",
      icon: TeamOutlined,
      path: "/cpo-portal",
      color: "#e67e22",
    },
    {
      id: "internal-comms",
      name: "Internal Communications",
      description: "Secure messaging, announcements, file sharing, and task assignments",
      icon: MessageOutlined,
      path: "/hub/internal-comms",
      color: "#FF6B35",
    },
  ];

  const hubSections: HubSection[] = [
    {
      id: "executive-leadership",
      title: "Executive & Leadership",
      subtitle: "Strategic leadership and corporate governance",
      portalIds: ["ceo", "admin", "company", "investors", "investor-demo", "cpo", "internal-comms"],
    },
    {
      id: "operations-delivery",
      title: "Operations & Delivery",
      subtitle: "Field operations and service delivery",
      portalIds: ["driver-operations", "merchant-operations", "coo", "cxo"],
    },
    {
      id: "technology-engineering",
      title: "Technology & Engineering",
      subtitle: "Product development and platform stability",
      portalIds: [
        "cto",
        "engineering-workspace",
        "platform-infrastructure",
        "product-command",
        "quality-release",
        "internal-it",
        "testing",
      ],
    },
    {
      id: "people-culture",
      title: "People & Culture",
      subtitle: "People, performance, and leadership development",
      portalIds: ["hr", "talent-management", "intern-sponsor"],
    },
    {
      id: "marketing-section",
      title: "Marketing",
      subtitle: "Marketing, demand, and merchant outreach",
      portalIds: ["marketing", "market-demand"],
    },
    {
      id: "growth-support",
      title: "Growth & Support",
      subtitle: "Growth, customer relationships, and support",
      portalIds: ["support-operations", "customer-success"],
    },
    {
      id: "finance-legal",
      title: "Finance & Legal",
      subtitle: "Financial control and key legal workflows",
      portalIds: ["cfo", "foundational-invites"],
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
  // Technology portal permissions - default to CTO permission for now
  const canEngineering = canCTO || (user?.email && hasFullAccess(user.email));
  const canPlatform = canCTO || (user?.email && hasFullAccess(user.email));
  const canProduct = canCTO || (user?.email && hasFullAccess(user.email));
  const canQuality = canCTO || (user?.email && hasFullAccess(user.email));
  const canITOps = canCTO || (user?.email && hasFullAccess(user.email));

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
    // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST
    const userEmail = user?.email?.toLowerCase() || '';
    const isTorrance = hasFullAccess(user?.email) || 
                      userEmail === 'tstroman.ceo@cravenusa.com' || 
                      userEmail.includes('torrance') || 
                      userEmail.includes('tstroman');
    
    if (isTorrance) {
      return true;
    }

    switch (id) {
      case 'company': return hasCompanyAccess;
      case 'admin': return canAdmin;
      case 'marketing': return canMarketing;
      case 'market-demand': return canMarketing;
      case 'ceo': return canCEO;
      case 'cfo': return canCFO;
      case 'coo': return canCOO;
      case 'cto': return canCTO;
      case 'engineering-workspace': return canEngineering;
      case 'platform-infrastructure': return canPlatform;
      case 'product-command': return canProduct;
      case 'quality-release': return canQuality;
      case 'internal-it': return canITOps;
      case 'cxo': return canCEO;
      case 'cpo': return canCEO || (user?.email && hasFullAccess(user.email));
      case 'hr': return canHR;
      case 'foundational-invites': 
        const allowed = canAdmin || canCEO || (user?.email && hasFullAccess(user.email));
        console.log('[MainHub] Foundational invites access check:', {
          portalId: id,
          canAdmin,
          canCEO,
          userEmail: user?.email,
          hasFullAccess: user?.email ? hasFullAccess(user.email) : false,
          allowed
        });
        return allowed;
      case 'investor-demo':
        return canAdmin || canCEO || (user?.email && hasFullAccess(user.email));
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
      <Layout style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        {/* Header */}
        <Header
          style={{
            background: "#ffffff",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            height: 60,
            minHeight: 60,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              flex: "1 1 auto",
            }}
          >
            <div
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#FF6B35",
                marginRight: 16,
                whiteSpace: "nowrap",
              }}
            >
              Crave'n
            </div>
            <div
              style={{
                borderLeft: "1px solid #e5e7eb",
                height: 24,
                marginRight: 16,
              }}
            />
            <div
              style={{
                fontSize: 14,
                color: "#6b7280",
                marginRight: 16,
                whiteSpace: "nowrap",
              }}
            >
              Portal Access
            </div>
            <div
              style={{
                borderLeft: "1px solid #e5e7eb",
                height: 24,
                marginRight: 16,
              }}
            />
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1f2937",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {employeeInfo?.full_name || user?.email || "Corporate User"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {employeeInfo?.position || "Crave'n HQ"}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginLeft: 16,
            }}
          >
            {employeeInfo && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#FF6B35",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {employeeInfo.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <Button
              onClick={handleLogout}
              style={{
                borderColor: "#d1d5db",
                color: "#374151",
                height: 32,
                fontSize: 12,
                padding: "0 14px",
                borderRadius: 4,
                background: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              Sign Out
            </Button>
          </div>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: "20px 24px",
            maxWidth: 1800,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Time Clock */}
          {user && (
            <div
              data-testid="time-clock-card"
              style={{
                marginBottom: 20,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 4,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              {/* Time */}
              <div style={{ minWidth: 140 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: "#1f2937",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTime(currentTime)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  {formatDate(currentTime)}
                </div>
              </div>

              {/* Separator */}
              <div
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  background: "#e5e7eb",
                }}
              />

              {/* Stats */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  minWidth: 260,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      letterSpacing: 1,
                    }}
                  >
                    Today
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {clockStatus.hoursToday.toFixed(1)}h
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      letterSpacing: 1,
                    }}
                  >
                    This Week
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {clockStatus.weeklyHours.toFixed(1)}h
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      letterSpacing: 1,
                    }}
                  >
                    This Month
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {/* Placeholder until monthly aggregation exists */}
                    —
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  background: "#e5e7eb",
                }}
              />

              {/* Status + Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flex: "1 1 auto",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 120,
                  }}
                >
                  <span
                    data-testid="time-clock-status"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: clockStatus.isClockedIn
                        ? "#059669"
                        : "#f59e0b",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {clockStatus.isClockedIn ? "Clocked In" : "Clocked Out"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    onClick={async () => {
                      // Always fetch latest status before attempting to clock in
                      await fetchClockStatus();
                      await handleClockIn();
                    }}
                    disabled={clockLoading || clockStatus.isClockedIn}
                    data-testid="time-clock-clock-in"
                    style={{
                      backgroundColor: clockStatus.isClockedIn
                        ? "#ffffff"
                        : "#059669",
                      color: clockStatus.isClockedIn ? "#374151" : "#ffffff",
                      borderColor: clockStatus.isClockedIn
                        ? "#d1d5db"
                        : "#059669",
                      height: 32,
                      fontSize: 12,
                      padding: "0 16px",
                      borderRadius: 4,
                      opacity: clockLoading && pendingClockAction === "in" ? 0.7 : 1,
                    }}
                  >
                    Clock In
                  </Button>
                  <Button
                    onClick={async () => {
                      // Sync from server before attempting to clock out
                      await fetchClockStatus();
                      await handleClockOut();
                    }}
                    disabled={
                      clockLoading || !clockStatus.isClockedIn
                    }
                    data-testid="time-clock-clock-out"
                    style={{
                      backgroundColor: "#ffffff",
                      color: clockStatus.isClockedIn ? "#374151" : "#9ca3af",
                      borderColor: "#d1d5db",
                      height: 32,
                      fontSize: 12,
                      padding: "0 16px",
                      borderRadius: 4,
                      opacity:
                        clockLoading && pendingClockAction === "out" ? 0.7 : 1,
                    }}
                  >
                    Clock Out
                  </Button>
                  <Button
                    type="link"
                    onClick={async () => {
                      // Always refresh history from the server before opening
                      await fetchTimeEntries();
                      setShowClockHistory(true);
                    }}
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      padding: 0,
                      height: 24,
                    }}
                  >
                    View History
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Two-column layout: Departments sidebar + portal sections */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Left Sidebar - Departments */}
            <div
              style={{
                flex: "0 0 200px",
                maxWidth: 240,
                width: "100%",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 4,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Departments
                </div>
                {[
                  { id: "all", label: "All Portals" },
                  { id: "executive", label: "Executive" },
                  { id: "operations", label: "Operations" },
                  { id: "finance", label: "Finance" },
                  { id: "technology", label: "Technology" },
                  { id: "marketing", label: "Marketing" },
                  { id: "hr", label: "Human Resources" },
                  { id: "support", label: "Customer Support" },
                  { id: "logistics", label: "Logistics" },
                ].map((dept) => {
                  const active = selectedDepartment === dept.id;
                  const count =
                    dept.id === "all"
                      ? portals.length
                      : portals.filter((p) => isPortalInDepartment(p.id, dept.id)).length;
                  return (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        marginBottom: 4,
                        borderRadius: 3,
                        cursor: "pointer",
                        backgroundColor: active ? "#eff6ff" : "transparent",
                        color: active ? "#1d4ed8" : "#374151",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <span>{dept.label}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Main Area - Portal Sections */}
            <div
              style={{
                flex: "1 1 0%",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 4,
                  padding: 16,
                }}
              >
                {hubSections.map((section, index) => {
                  // Filter portals by department selection
                  const sectionPortals = section.portalIds
                    .map((id) => portals.find((p) => p.id === id))
                    .filter((p): p is Portal => {
                      if (!p) return false;
                      if (selectedDepartment === "all") return true;
                      return isPortalInDepartment(p.id, selectedDepartment);
                    });

                  if (sectionPortals.length === 0) return null;

                  return (
                    <div
                      key={section.id}
                      style={{
                        marginTop: index === 0 ? 0 : 24,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#9ca3af",
                          letterSpacing: 1,
                          paddingBottom: 8,
                          borderBottom: "1px solid #e5e7eb",
                          marginBottom: 12,
                        }}
                      >
                        {section.title}
                      </div>
                      <Row gutter={[12, 12]}>
                        {sectionPortals.map((portal) => {
                          const allowed = isPortalAllowed(portal.id);

                          // Category badge styles
                          let badgeLabel = "Corporate";
                          let badgeBg = "#dbeafe";
                          let badgeColor = "#1e40af";

                          if (["ceo", "admin", "company", "investors", "cxo"].includes(portal.id)) {
                            badgeLabel = "Executive";
                            badgeBg = "#dbeafe";
                            badgeColor = "#1e40af";
                          } else if (
                            ["driver-operations", "merchant-operations", "coo"].includes(
                              portal.id
                            )
                          ) {
                            badgeLabel = "Operations";
                            badgeBg = "#ede9fe";
                            badgeColor = "#6b21a8";
                          } else if (
                            [
                              "cto",
                              "engineering-workspace",
                              "platform-infrastructure",
                              "product-command",
                              "quality-release",
                              "internal-it",
                              "testing",
                            ].includes(portal.id)
                          ) {
                            badgeLabel = "Technology";
                            badgeBg = "#cffafe";
                            badgeColor = "#0e7490";
                          } else if (
                            ["hr", "talent-management", "intern-sponsor"].includes(portal.id)
                          ) {
                            badgeLabel = "People / HR";
                            badgeBg = "#fed7aa";
                            badgeColor = "#9a3412";
                          } else if (["marketing", "market-demand"].includes(portal.id)) {
                            badgeLabel = "Marketing";
                            badgeBg = "#fce7f3";
                            badgeColor = "#9f1239";
                          } else if (["support-operations"].includes(portal.id)) {
                            badgeLabel = "Support";
                            badgeBg = "#e0e7ff";
                            badgeColor = "#3730a3";
                          } else if (["customer-success"].includes(portal.id)) {
                            badgeLabel = "Success";
                            badgeBg = "#e0e7ff";
                            badgeColor = "#3730a3";
                          } else if (
                            ["cfo", "foundational-invites"].includes(portal.id)
                          ) {
                            badgeLabel = "Finance";
                            badgeBg = "#d1fae5";
                            badgeColor = "#065f46";
                          }

                          return (
                            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={portal.id}>
                              <div
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!allowed) {
                                    message.warning("Access denied for this portal");
                                    return;
                                  }
                                  console.log("[MainHub] Portal clicked:", {
                                    id: portal.id,
                                    path: portal.path,
                                    allowed,
                                    userEmail: user?.email,
                                  });

                                  // Special-case: Investor Relations should always use the public investor portal
                                  if (portal.id === "investors") {
                                    // Drop any ?hq=true flags by doing a full navigation
                                    window.location.href = "/investors/portal";
                                    return;
                                  }

                                  navigate(portal.path, { replace: false });
                                }}
                                style={{
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 3,
                                  padding: 12,
                                  cursor: allowed ? "pointer" : "default",
                                  backgroundColor: "#ffffff",
                                  opacity: allowed ? 1 : 0.5,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "#9ca3af";
                                  e.currentTarget.style.boxShadow =
                                    "0 1px 3px rgba(0,0,0,0.1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = "#e5e7eb";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#1f2937",
                                      marginRight: 8,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {portal.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      padding: "2px 6px",
                                      borderRadius: 2,
                                      backgroundColor: badgeBg,
                                      color: badgeColor,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {badgeLabel}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#6b7280",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {portal.description}
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Content>

        {/* Time Entry History Modal */}
        <Modal
          title="Time Entry History"
          open={showClockHistory}
          onCancel={closeClockHistory}
          footer={null}
          width={800}
        >
          <Table
            dataSource={timeEntries}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 400 }}
            columns={[
              {
                title: 'Name',
                dataIndex: 'display_name',
                key: 'display_name',
                render: (value: string) => value || '—',
              },
              {
                title: 'Clock In',
                dataIndex: 'clock_in_at',
                key: 'clock_in_at',
                render: (value: string) =>
                  value ? new Date(value).toLocaleString('en-US') : '—',
              },
              {
                title: 'Clock Out',
                dataIndex: 'clock_out_at',
                key: 'clock_out_at',
                render: (value: string | null) =>
                  value ? new Date(value).toLocaleString('en-US') : '—',
              },
              {
                title: 'Hours',
                dataIndex: 'total_hours',
                key: 'total_hours',
                render: (value: number | null) =>
                  typeof value === 'number' ? value.toFixed(2) : '—',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value: string) => (
                  <Tag
                    color={
                      value === 'clocked_in'
                        ? 'green'
                        : value === 'clocked_out'
                        ? 'default'
                        : 'orange'
                    }
                  >
                    {value.replace('_', ' ')}
                  </Tag>
                ),
              },
            ]}
          />
        </Modal>

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
          styles={{ mask: { backgroundColor: "rgba(0, 0, 0, 0.45)" } }}
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


import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hasFullAccess } from "@/utils/torranceAccess";
import { Card, Row, Col, Button, Typography, Space, Spin, Avatar, Layout, Tag, message } from "antd";
import {
  ArrowLeftOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  ShopOutlined,
  RocketOutlined,
  CodeOutlined,
  UserOutlined,
  BankOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  LineChartOutlined,
  SafetyOutlined,
  AuditOutlined,
  CloudOutlined,
  BugOutlined,
  HddOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { ConfigProvider } from "antd";
import { cravenDriverTheme } from "@/config/antd-theme";
import cravenLogo from "@/assets/craven-logo.png";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface SubPortal {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
}

interface DepartmentInfo {
  id: string;
  name: string;
  description: string;
  budget: number;
  employee_count: number;
}

const DepartmentHub: React.FC = () => {
  const navigate = useNavigate();
  const { departmentName } = useParams<{ departmentName: string }>();
  const [department, setDepartment] = useState<DepartmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkUser();
    fetchDepartment();
  }, [departmentName]);

  useEffect(() => {
    if (department && user) {
      checkDepartmentAccess();
    }
  }, [department, user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth?hq=true&redirect=/hub';
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      window.location.href = '/auth?hq=true&redirect=/hub';
    }
  };

  const checkDepartmentAccess = async () => {
    if (!department || !user) return;
    
    const deptName = department.name.toLowerCase();
    
    // Only restrict access for Technology department
    if (!deptName.includes('technology') && !deptName.includes('tech')) {
      setHasAccess(true);
      return;
    }

    await checkTechnologyAccess(user);
  };

  const checkTechnologyAccess = async (user: any) => {
    try {
      const userEmail = user.email?.toLowerCase() || '';
      
      // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST - NO RESTRICTIONS
      if (hasFullAccess(user.email) || 
          userEmail === 'tstroman.ceo@cravenusa.com' || 
          userEmail.includes('torrance') || 
          userEmail.includes('tstroman')) {
        console.log('✅ TORRANCE ACCESS GRANTED - UNIVERSAL ACCESS:', user.email);
        setHasAccess(true);
        return;
      }
      
      // Check if user is CTO (Nathan Curry)
      if (userEmail === 'natecurry.cto@cravenusa.com') {
        setHasAccess(true);
        return;
      }

      // Check if user is in finance department
      // First try by user_id
      let { data: employees, error } = await supabase
        .from('employees')
        .select('id, department_id, departments!inner(name)')
        .eq('employment_status', 'active')
        .eq('user_id', user.id);

      // If no match by user_id, try by email
      if ((!employees || employees.length === 0) && userEmail) {
        const { data: empByEmail } = await supabase
          .from('employees')
          .select('id, department_id, departments!inner(name)')
          .eq('employment_status', 'active')
          .or(`email.ilike.${userEmail},work_email.ilike.${userEmail}`);
        
        if (empByEmail) {
          employees = empByEmail;
        }
      }

      if (!error && employees && employees.length > 0) {
        // Check if any employee record is in finance department
        for (const emp of employees) {
          const deptName = (emp.departments as any)?.name?.toLowerCase() || '';
          if (deptName.includes('finance')) {
            setHasAccess(true);
            return;
          }
        }
      }

      // Check exec_users table for CTO role
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role, department')
        .eq('user_id', user.id)
        .eq('role', 'cto')
        .single();

      if (execUser) {
        setHasAccess(true);
        return;
      }

      // No access
      setHasAccess(false);
      message.error('You do not have access to the Technology department portal. Access is restricted to CTO and Finance department employees.');
      setTimeout(() => {
        navigate('/hub');
      }, 2000);
    } catch (error) {
      console.error('Error checking technology access:', error);
      setHasAccess(false);
    }
  };

  const fetchDepartment = async () => {
    if (!departmentName) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .ilike('name', departmentName.replace(/-/g, ' '))
        .single();

      if (error) throw error;

      // Get employee count
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', data.id)
        .eq('employment_status', 'active');

      setDepartment({
        id: data.id,
        name: data.name,
        description: data.description || '',
        budget: data.budget || 0,
        employee_count: count || 0,
      });
    } catch (error) {
      console.error('Error fetching department:', error);
      message.error('Department not found');
      navigate('/hub');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("hub_employee_info");
      localStorage.removeItem("hub_employee_info");
      await supabase.auth.signOut({ scope: 'global' });
      message.success('Signed out successfully');
      setTimeout(() => {
        window.location.href = '/auth?hq=true';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/auth?hq=true';
    }
  };

  // Define sub-portals for each department
  const getDepartmentPortals = (deptName: string): SubPortal[] => {
    const normalizedName = deptName.toLowerCase();
    
    if (normalizedName.includes('finance')) {
      return [
        {
          id: 'general-ledger',
          name: 'General Ledger',
          description: 'Chart of accounts and journal entries',
          icon: FileTextOutlined,
          path: '/finance/general-ledger',
          color: '#1890ff',
        },
        {
          id: 'accounts-payable',
          name: 'Accounts Payable',
          description: 'Vendor invoices and payments',
          icon: DollarOutlined,
          path: '/finance/accounts-payable',
          color: '#ff4d4f',
        },
        {
          id: 'accounts-receivable',
          name: 'Accounts Receivable',
          description: 'Customer invoices and collections',
          icon: LineChartOutlined,
          path: '/finance/accounts-receivable',
          color: '#52c41a',
        },
        {
          id: 'banking-treasury',
          name: 'Banking & Treasury',
          description: 'Bank accounts and cash management',
          icon: BankOutlined,
          path: '/finance/banking-treasury',
          color: '#722ed1',
        },
        {
          id: 'payroll',
          name: 'Payroll System',
          description: 'Employee payroll processing',
          icon: TeamOutlined,
          path: '/finance/payroll',
          color: '#fa8c16',
        },
        {
          id: 'budget-forecast',
          name: 'Budget & Forecast',
          description: 'Financial planning and analysis',
          icon: BarChartOutlined,
          path: '/finance/budget-forecast',
          color: '#13c2c2',
        },
        {
          id: 'reports',
          name: 'Financial Reports',
          description: 'Financial statements and reports',
          icon: FileTextOutlined,
          path: '/finance/reports',
          color: '#eb2f96',
        },
        {
          id: 'tax-management',
          name: 'Tax Management',
          description: 'Tax compliance and reporting',
          icon: SafetyOutlined,
          path: '/finance/tax-management',
          color: '#fa541c',
        },
        {
          id: 'audit',
          name: 'Audit & Compliance',
          description: 'Internal audit and controls',
          icon: AuditOutlined,
          path: '/finance/audit',
          color: '#2f54eb',
        },
      ];
    } else if (normalizedName.includes('technology') || normalizedName.includes('tech')) {
      return [
        {
          id: 'developer-portal',
          name: 'Developer Portal',
          description: 'Code editor with GitHub and Supabase sync',
          icon: CodeOutlined,
          path: '/technology/developer-portal',
          color: '#eb2f96',
        },
        {
          id: 'infrastructure',
          name: 'Infrastructure',
          description: 'Cloud infrastructure and servers',
          icon: CloudOutlined,
          path: '/cto?section=infra',
          color: '#1890ff',
        },
        {
          id: 'devops',
          name: 'DevOps & CI/CD',
          description: 'Deployment and automation',
          icon: RocketOutlined,
          path: '/cto?section=devops',
          color: '#52c41a',
        },
        {
          id: 'security',
          name: 'Security & Compliance',
          description: 'Security monitoring and compliance',
          icon: SafetyOutlined,
          path: '/cto?section=security',
          color: '#ff4d4f',
        },
        {
          id: 'code-review',
          name: 'Code Reviews',
          description: 'Code review queue and approvals',
          icon: CodeOutlined,
          path: '/cto?section=code-review',
          color: '#722ed1',
        },
        {
          id: 'code-editor',
          name: 'Code Editor',
          description: 'Repository code editor',
          icon: CodeOutlined,
          path: '/cto?section=code-editor',
          color: '#fa8c16',
        },
        {
          id: 'incidents',
          name: 'Incidents',
          description: 'System incidents and monitoring',
          icon: BugOutlined,
          path: '/cto?section=incidents',
          color: '#fa541c',
        },
        {
          id: 'assets',
          name: 'Assets',
          description: 'IT asset management',
          icon: DatabaseOutlined,
          path: '/cto?section=assets',
          color: '#13c2c2',
        },
      ];
    } else if (normalizedName.includes('operations') || normalizedName.includes('ops')) {
      return [
        {
          id: 'operations-dashboard',
          name: 'Operations Dashboard',
          description: 'Daily operations overview',
          icon: DashboardOutlined,
          path: '/coo',
          color: '#1890ff',
        },
        {
          id: 'logistics',
          name: 'Logistics',
          description: 'Delivery and fleet management',
          icon: ShopOutlined,
          path: '/coo',
          color: '#52c41a',
        },
        {
          id: 'supply-chain',
          name: 'Supply Chain',
          description: 'Inventory and supply management',
          icon: ShopOutlined,
          path: '/coo',
          color: '#722ed1',
        },
      ];
    } else if (normalizedName.includes('marketing')) {
      return [
        {
          id: 'campaigns',
          name: 'Campaigns',
          description: 'Marketing campaigns and analytics',
          icon: RocketOutlined,
          path: '/marketing-portal',
          color: '#1890ff',
        },
        {
          id: 'analytics',
          name: 'Analytics',
          description: 'Marketing performance metrics',
          icon: BarChartOutlined,
          path: '/marketing-portal',
          color: '#52c41a',
        },
      ];
    } else if (normalizedName.includes('human resources') || normalizedName.includes('hr')) {
      return [
        {
          id: 'employee-management',
          name: 'Employee Management',
          description: 'Employee records and HR data',
          icon: TeamOutlined,
          path: '/hr-portal',
          color: '#1890ff',
        },
        {
          id: 'recruiting',
          name: 'Recruiting',
          description: 'Hiring and talent acquisition',
          icon: UserOutlined,
          path: '/hr-portal',
          color: '#52c41a',
        },
        {
          id: 'payroll-hr',
          name: 'Payroll',
          description: 'Payroll processing and management',
          icon: WalletOutlined,
          path: '/hr-portal',
          color: '#722ed1',
        },
      ];
    } else if (normalizedName.includes('executive')) {
      return [
        {
          id: 'ceo-portal',
          name: 'CEO Command Center',
          description: 'Executive leadership dashboard',
          icon: DashboardOutlined,
          path: '/ceo',
          color: '#13c2c2',
        },
        {
          id: 'board-portal',
          name: 'Board Portal',
          description: 'Board governance and oversight',
          icon: CheckCircleOutlined,
          path: '/board',
          color: '#722ed1',
        },
      ];
    } else if (normalizedName.includes('customer support')) {
      return [
        {
          id: 'support-dashboard',
          name: 'Support Dashboard',
          description: 'Customer support tickets and metrics',
          icon: DashboardOutlined,
          path: '/admin',
          color: '#1890ff',
        },
        {
          id: 'ticketing',
          name: 'Ticketing System',
          description: 'Customer ticket management',
          icon: FileTextOutlined,
          path: '/admin',
          color: '#52c41a',
        },
      ];
    } else if (normalizedName.includes('logistics')) {
      return [
        {
          id: 'fleet-management',
          name: 'Fleet Management',
          description: 'Vehicle and driver fleet',
          icon: ShopOutlined,
          path: '/coo',
          color: '#1890ff',
        },
        {
          id: 'delivery-ops',
          name: 'Delivery Operations',
          description: 'Delivery routing and optimization',
          icon: RocketOutlined,
          path: '/coo',
          color: '#52c41a',
        },
      ];
    }

    // Default empty array if department not found
    return [];
  };

  const subPortals = department ? getDepartmentPortals(department.name) : [];

  if (loading || hasAccess === null) {
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

  if (!department || hasAccess === false) {
    return null;
  }

  return (
    <ConfigProvider theme={cravenDriverTheme}>
      <Layout style={{ minHeight: "100vh", background: "#ffffff" }}>
        {/* Header */}
        <Header
          style={{
            background: "#ffffff",
            padding: "0 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            height: 72,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/hub')}
              style={{ border: 'none', boxShadow: 'none' }}
            >
              Back to Hub
            </Button>
            <div style={{ borderLeft: "1px solid #e5e7eb", height: 32 }} />
            <img
              src={cravenLogo}
              alt="Crave'N"
              style={{ height: 40, width: "auto" }}
            />
            <div style={{ borderLeft: "1px solid #e5e7eb", height: 32 }} />
            <div>
              <Title level={3} style={{ margin: 0, color: "#111827", fontSize: 18, fontWeight: 600 }}>
                {department.name} Department
              </Title>
              <Text type="secondary" style={{ fontSize: 12, color: "#6b7280" }}>
                {department.description || 'Department Portal'}
              </Text>
            </div>
          </div>
          <Space>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                borderColor: "#d1d5db",
                color: "#374151",
                height: 36,
                fontSize: 13,
              }}
            >
              Sign Out
            </Button>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: "64px 32px",
            maxWidth: 1600,
            margin: "0 auto",
            width: "100%",
            background: "#ffffff",
          }}
        >
          {/* Department Info Card */}
          <Card
            style={{
              marginBottom: 48,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            bodyStyle={{ padding: 32 }}
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Employees
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: 700, color: '#1890ff' }}>
                    {department.employee_count}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Budget
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: 700, color: '#52c41a' }}>
                    ${Number(department.budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Sub-Portals
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: 700, color: '#722ed1' }}>
                    {subPortals.length}
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Sub-Portals Grid */}
          {subPortals.length > 0 ? (
            <>
              <Title level={2} style={{ marginBottom: 32, color: "#111827" }}>
                {department.name} Portals
              </Title>
              <Row gutter={[32, 32]}>
                {subPortals.map((portal) => {
                  const Icon = portal.icon;
                  return (
                    <Col xs={24} sm={12} lg={8} xl={6} key={portal.id}>
                      <Card
                        hoverable
                        style={{
                          height: "100%",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          background: "#ffffff",
                        }}
                        onClick={() => navigate(portal.path)}
                        bodyStyle={{ padding: 28 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.borderColor = portal.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 8,
                              background: `linear-gradient(135deg, ${portal.color}15 0%, ${portal.color}08 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 20px",
                              border: `1px solid ${portal.color}20`,
                            }}
                          >
                            <Icon style={{ fontSize: 36, color: portal.color }} />
                          </div>
                          <Title
                            level={4}
                            style={{
                              marginBottom: 12,
                              color: "#111827",
                              fontSize: 18,
                              fontWeight: 600,
                            }}
                          >
                            {portal.name}
                          </Title>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 14,
                              color: "#6b7280",
                              lineHeight: 1.5,
                              display: "block",
                              marginBottom: 20,
                              minHeight: 42,
                            }}
                          >
                            {portal.description}
                          </Text>
                          <Button
                            type="primary"
                            style={{
                              background: portal.color,
                              borderColor: portal.color,
                              width: "100%",
                              height: 42,
                              fontWeight: 500,
                              fontSize: 14,
                              borderRadius: 6,
                              boxShadow: `0 2px 4px ${portal.color}30`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(portal.path);
                            }}
                          >
                            Access Portal →
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  No sub-portals configured for this department.
                </Text>
              </div>
            </Card>
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default DepartmentHub;


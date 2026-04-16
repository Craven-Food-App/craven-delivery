import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Tag, ConfigProvider } from 'antd';
import { supabase } from '@/integrations/supabase/client';
import { cravenDriverTheme } from '@/config/antd-theme';
import {
  IconChartPie,
  IconShield,
  IconUsers,
  IconUserCheck,
  IconBuildingSkyscraper,
  IconUsersGroup,
  IconBook,
} from '@tabler/icons-react';

interface PortalSection {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
  category: string;
}

const companySections: PortalSection[] = [
  {
    id: 'cap-table',
    name: 'Cap & Equity Tables',
    description: 'Shareholder equity, grants, and ownership tracking',
    icon: IconChartPie,
    path: '/company/cap-table',
    color: '#13c2c2',
    category: 'Equity',
  },
  {
    id: 'executives',
    name: 'Executive Dashboard',
    description: 'Appointments, onboarding, documents, equity & vesting',
    icon: IconBuildingSkyscraper,
    path: '/company/executives',
    color: '#fa8c16',
    category: 'People',
  },
  {
    id: 'governance',
    name: 'Governance Admin',
    description: 'Appointments, resolutions, and corporate governance',
    icon: IconShield,
    path: '/company/governance',
    color: '#1890ff',
    category: 'Governance',
  },
  {
    id: 'board',
    name: 'Board Portal',
    description: 'Board members, voting, and meeting management',
    icon: IconUsers,
    path: '/company/board',
    color: '#722ed1',
    category: 'Governance',
  },
  {
    id: 'team',
    name: 'Team Management',
    description: 'Executive directory and team oversight',
    icon: IconUserCheck,
    path: '/company/team',
    color: '#52c41a',
    category: 'People',
  },
  {
    id: 'leadership',
    name: 'Leadership Directory',
    description: 'Public-facing leadership and officer directory',
    icon: IconUsersGroup,
    path: '/company/leadership',
    color: '#eb2f96',
    category: 'People',
  },
  {
    id: 'sop',
    name: 'SOP Documents',
    description: 'Standard operating procedures and company policies',
    icon: IconBook,
    path: '/company/sop',
    color: '#2f54eb',
    category: 'Operations',
  },
];

const CompanyPortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  // Jason Parcell: redirect directly to Team page (read-only)
  useEffect(() => {
    const checkJason = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() === 'jparcell2022@gmail.com') {
        setRedirecting(true);
        navigate('/company/team', { replace: true });
      }
    };
    checkJason();
  }, [navigate]);

  if (redirecting) return null;

  const sectionsByCategory = companySections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, PortalSection[]>);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Equity':
        return 'cyan';
      case 'Governance':
        return 'blue';
      case 'People':
        return 'green';
      default:
        return 'default';
    }
  };

  return (
    <ConfigProvider theme={cravenDriverTheme}>
      <div style={{ padding: '20px 24px', maxWidth: 1800, margin: '0 auto', width: '100%' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          padding: 16,
        }}>
          {Object.entries(sectionsByCategory).map(([category, sections], index) => (
            <div key={category} style={{ marginTop: index === 0 ? 0 : 24 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#9ca3af',
                letterSpacing: 1,
                paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
                marginBottom: 12,
              }}>
                {category}
              </div>
              <Row gutter={[12, 12]}>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Col xs={24} sm={12} lg={8} xl={6} key={section.id}>
                      <Card
                        hoverable
                        style={{
                          height: '100%',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          background: '#ffffff',
                        }}
                        onClick={() => navigate(section.path)}
                        bodyStyle={{ padding: 20 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = section.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            backgroundColor: `${section.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                          }}>
                            <Icon size={24} style={{ color: section.color }} />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <Tag
                              color={getCategoryColor(section.category)}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              {section.category}
                            </Tag>
                          </div>
                          <div style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#1f2937',
                            marginBottom: 6,
                          }}>
                            {section.name}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: '#6b7280',
                            lineHeight: 1.5,
                            marginBottom: 16,
                            minHeight: 36,
                          }}>
                            {section.description}
                          </div>
                          <Button
                            type="primary"
                            style={{
                              background: section.color,
                              borderColor: section.color,
                              width: '100%',
                              height: 36,
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 6,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(section.path);
                            }}
                          >
                            Access →
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CompanyPortalDashboard;


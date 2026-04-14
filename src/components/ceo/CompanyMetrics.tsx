// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Typography, Space, Progress, 
  Table, Tag, Button, Select, DatePicker, Divider, Tooltip, Avatar
} from 'antd';
import {
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
  TargetOutlined,
  CalendarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface RevenueData {
  period: string;
  revenue: number;
  orders: number;
  growth: number;
}

interface DepartmentPerformance {
  department: string;
  revenue: number;
  employees: number;
  efficiency: number;
  growth: number;
}

export const CompanyMetrics: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentPerformance[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetricsData();
  }, [timeRange]);

  const fetchMetricsData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = dayjs();
      const startDate = timeRange === '7d' ? endDate.subtract(7, 'days') :
                      timeRange === '30d' ? endDate.subtract(30, 'days') :
                      timeRange === '90d' ? endDate.subtract(90, 'days') :
                      endDate.subtract(365, 'days');

      // Fetch revenue data
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Process revenue data by period
      const revenueByPeriod: { [key: string]: { revenue: number; orders: number } } = {};
      
      ordersData?.forEach(order => {
        const period = timeRange === '7d' ? dayjs(order.created_at).format('MMM DD') :
                      timeRange === '30d' ? dayjs(order.created_at).format('MMM DD') :
                      timeRange === '90d' ? dayjs(order.created_at).format('MMM DD') :
                      dayjs(order.created_at).format('MMM YYYY');

        if (!revenueByPeriod[period]) {
          revenueByPeriod[period] = { revenue: 0, orders: 0 };
        }
        revenueByPeriod[period].revenue += order.total_amount || 0;
        revenueByPeriod[period].orders += 1;
      });

      const processedRevenueData: RevenueData[] = Object.entries(revenueByPeriod)
        .map(([period, data], index, array) => ({
          period,
          revenue: data.revenue,
          orders: data.orders,
          growth: index > 0 ? 
            ((data.revenue - array[index - 1][1].revenue) / array[index - 1][1].revenue) * 100 : 0
        }))
        .sort((a, b) => dayjs(a.period).valueOf() - dayjs(b.period).valueOf());

      setRevenueData(processedRevenueData);

      // Fetch real department performance from employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('department, employment_status, salary');

      const deptMap: Record<string, { employees: number; totalSalary: number }> = {};
      (employeesData || []).forEach((emp: any) => {
        const dept = emp.department || 'Unassigned';
        if (!deptMap[dept]) deptMap[dept] = { employees: 0, totalSalary: 0 };
        if (emp.employment_status === 'active') {
          deptMap[dept].employees += 1;
          deptMap[dept].totalSalary += emp.salary || 0;
        }
      });

      const departmentPerformance: DepartmentPerformance[] = Object.entries(deptMap)
        .filter(([_, v]) => v.employees > 0)
        .map(([department, data]) => ({
          department,
          revenue: 0, // Revenue is tracked at order level, not department
          employees: data.employees,
          efficiency: 0,
          growth: 0,
        }));

      setDepartmentData(departmentPerformance);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + item.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalGrowth = revenueData.length > 1 ? 
    ((revenueData[revenueData.length - 1].revenue - revenueData[0].revenue) / revenueData[0].revenue) * 100 : 0;

  const revenueColumns = [
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => (
        <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
          ${value.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Orders',
      dataIndex: 'orders',
      key: 'orders',
      render: (value: number) => <Text>{value}</Text>
    },
    {
      title: 'Growth',
      dataIndex: 'growth',
      key: 'growth',
      render: (value: number) => (
        <Tag color={value >= 0 ? 'green' : 'red'}>
          {value >= 0 ? <TrendingUpOutlined /> : <TrendingDownOutlined />}
          {Math.abs(value).toFixed(1)}%
        </Tag>
      )
    }
  ];

  const departmentColumns = [
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => (
        <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
          ${value.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Employees',
      dataIndex: 'employees',
      key: 'employees',
      render: (value: number) => (
        <Space>
          <UserOutlined />
          <Text>{value}</Text>
        </Space>
      )
    },
    {
      title: 'Efficiency',
      dataIndex: 'efficiency',
      key: 'efficiency',
      render: (value: number) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Progress 
            percent={value} 
            size="small" 
            strokeColor={value >= 90 ? '#52c41a' : value >= 80 ? '#faad14' : '#f5222d'}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>{value}%</Text>
        </Space>
      )
    },
    {
      title: 'Growth',
      dataIndex: 'growth',
      key: 'growth',
      render: (value: number) => (
        <Tag color={value >= 0 ? 'green' : 'red'}>
          {value >= 0 ? <TrendingUpOutlined /> : <TrendingDownOutlined />}
          {Math.abs(value).toFixed(1)}%
        </Tag>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              Company Metrics
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Comprehensive business performance analytics
            </Text>
          </div>
          <Space>
            <Select 
              value={timeRange} 
              onChange={setTimeRange}
              style={{ width: 120 }}
            >
              <Option value="7d">Last 7 days</Option>
              <Option value="30d">Last 30 days</Option>
              <Option value="90d">Last 90 days</Option>
              <Option value="1y">Last year</Option>
            </Select>
            <Button 
              type="primary" 
              icon={<BarChartOutlined />}
              onClick={fetchMetricsData}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* Key Performance Indicators */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                border: '1px solid #0ea5e9',
                borderRadius: '12px'
              }}
            >
              <Statistic
                title={<Text type="secondary">Total Revenue</Text>}
                value={totalRevenue}
                prefix={<DollarOutlined style={{ color: '#0ea5e9' }} />}
                precision={0}
                valueStyle={{ color: '#0c4a6e', fontSize: '28px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {timeRange === '7d' ? 'Last 7 days' : 
                 timeRange === '30d' ? 'Last 30 days' : 
                 timeRange === '90d' ? 'Last 90 days' : 'Last year'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '1px solid #22c55e',
                borderRadius: '12px'
              }}
            >
              <Statistic
                title={<Text type="secondary">Total Orders</Text>}
                value={totalOrders}
                prefix={<ShoppingCartOutlined style={{ color: '#22c55e' }} />}
                valueStyle={{ color: '#15803d', fontSize: '28px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {avgOrderValue > 0 ? `Avg: $${avgOrderValue.toFixed(0)}` : 'No orders'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                border: '1px solid #ef4444',
                borderRadius: '12px'
              }}
            >
              <Statistic
                title={<Text type="secondary">Growth Rate</Text>}
                value={Math.abs(totalGrowth)}
                prefix={totalGrowth >= 0 ? <TrendingUpOutlined style={{ color: '#ef4444' }} /> : <TrendingDownOutlined style={{ color: '#ef4444' }} />}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#dc2626', fontSize: '28px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {totalGrowth >= 0 ? 'Positive growth' : 'Decline'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{ 
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: '1px solid #f59e0b',
                borderRadius: '12px'
              }}
            >
              <Statistic
                title={<Text type="secondary">Avg Order Value</Text>}
                value={avgOrderValue}
                prefix={<DollarOutlined style={{ color: '#f59e0b' }} />}
                precision={2}
                valueStyle={{ color: '#d97706', fontSize: '28px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {totalOrders > 0 ? `From ${totalOrders} orders` : 'No orders yet'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Revenue Performance Table */}
        <Card 
          title={
            <Space>
              <LineChartOutlined style={{ color: '#722ed1' }} />
              <Text strong>Revenue Performance</Text>
            </Space>
          }
          style={{ borderRadius: '12px' }}
        >
          <Table
            columns={revenueColumns}
            dataSource={revenueData}
            rowKey="period"
            pagination={false}
            loading={loading}
            size="small"
          />
        </Card>

        {/* Department Performance */}
        <Card 
          title={
            <Space>
              <PieChartOutlined style={{ color: '#faad14' }} />
              <Text strong>Department Performance</Text>
            </Space>
          }
          style={{ borderRadius: '12px' }}
        >
          <Table
            columns={departmentColumns}
            dataSource={departmentData}
            rowKey="department"
            pagination={false}
            loading={loading}
            size="small"
          />
        </Card>

        {/* Department Summary */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#52c41a' }} />
                  <Text strong>Departments by Headcount</Text>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {departmentData
                  .sort((a, b) => b.employees - a.employees)
                  .slice(0, 5)
                  .map((dept, idx) => (
                    <div key={dept.department} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Avatar style={{ backgroundColor: idx === 0 ? '#52c41a' : idx === 1 ? '#1890ff' : '#faad14' }}>{idx + 1}</Avatar>
                        <Text strong>{dept.department}</Text>
                      </Space>
                      <Tag color="blue">{dept.employees} employees</Tag>
                    </div>
                  ))}
                {departmentData.length === 0 && (
                  <Text type="secondary">No department data available</Text>
                )}
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                  <Text strong>Revenue Summary</Text>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
                  <Text strong style={{ color: '#1890ff' }}>Total Revenue</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ${totalRevenue.toLocaleString()} across {totalOrders} orders
                  </Text>
                </div>
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                  <Text strong style={{ color: '#52c41a' }}>Average Order Value</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ${avgOrderValue.toFixed(2)} per order
                  </Text>
                </div>
                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                  <Text strong style={{ color: '#f59e0b' }}>Growth</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(1)}% over selected period
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ActionLog {
  id: string;
  user_id: string;
  user_role: string;
  user_email: string;
  user_name: string;
  action_type: string;
  action_category: string;
  target_resource_name: string;
  action_description: string;
  target_resource_type: string;
  target_resource_id: string;
  severity: string;
  requires_review: boolean;
  compliance_tag: string;
  created_at: string;
}

export const AuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    // Check screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchText, categoryFilter, severityFilter, logs]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error} = await supabase
        .from('unified_audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      // Map to the expected format
      const formattedLogs = (data || []).map((log: any) => ({
        id: log.id,
        user_id: log.user_id,
        user_role: log.user_role,
        user_email: log.user_email,
        user_name: log.user_name,
        action_type: log.action_type,
        action_category: log.action_category,
        target_name: log.target_resource_name,
        action_description: log.action_description,
        target_resource_type: log.target_resource_type,
        target_resource_id: log.target_resource_id,
        severity: log.severity,
        requires_review: log.requires_review,
        compliance_tag: log.compliance_tag,
        created_at: log.created_at,
      }));
      
      setLogs(formattedLogs);
      setFilteredLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchText) {
      filtered = filtered.filter(log =>
        log.action_description.toLowerCase().includes(searchText.toLowerCase()) ||
        log.target_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(log => log.action_category === categoryFilter);
    }

    if (severityFilter) {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }

    setFilteredLogs(filtered);
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div>
          <div className="font-medium">{dayjs(date).format('MMM D, YYYY')}</div>
          <div className="text-xs text-slate-500">{dayjs(date).format('h:mm A')}</div>
        </div>
      ),
      width: 140,
    },
    {
      title: 'Action',
      dataIndex: 'action_description',
      key: 'action_description',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'action_category',
      key: 'action_category',
      render: (category: string) => {
        const colors: Record<string, string> = {
          personnel: 'blue',
          financial: 'green',
          system: 'purple',
          strategic: 'orange',
          emergency: 'red',
        };
        return <Tag color={colors[category]}>{category.toUpperCase()}</Tag>;
      },
      width: 120,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const colors: Record<string, string> = {
          low: 'default',
          normal: 'blue',
          high: 'orange',
          critical: 'red',
        };
        return <Tag color={colors[severity]}>{severity.toUpperCase()}</Tag>;
      },
      width: 100,
    },
  ];

  const categoryStats = {
    personnel: logs.filter(l => l.action_category === 'personnel').length,
    financial: logs.filter(l => l.action_category === 'financial').length,
    system: logs.filter(l => l.action_category === 'system').length,
    strategic: logs.filter(l => l.action_category === 'strategic').length,
    emergency: logs.filter(l => l.action_category === 'emergency').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Audit Trail</h2>
        <p className="text-sm sm:text-base text-slate-600">Complete log of all CEO actions and system changes</p>
      </div>

      {/* Quick Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
          <div className={`font-bold text-blue-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{categoryStats.personnel}</div>
          <div className="text-xs sm:text-sm text-slate-600">Personnel</div>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
          <div className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{categoryStats.financial}</div>
          <div className="text-xs sm:text-sm text-slate-600">Financial</div>
        </div>
        <div className="bg-purple-50 p-3 sm:p-4 rounded-lg text-center">
          <div className={`font-bold text-purple-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{categoryStats.system}</div>
          <div className="text-xs sm:text-sm text-slate-600">System</div>
        </div>
        <div className="bg-orange-50 p-3 sm:p-4 rounded-lg text-center">
          <div className={`font-bold text-orange-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{categoryStats.strategic}</div>
          <div className="text-xs sm:text-sm text-slate-600">Strategic</div>
        </div>
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg text-center">
          <div className={`font-bold text-red-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{categoryStats.emergency}</div>
          <div className="text-xs sm:text-sm text-slate-600">Emergency</div>
        </div>
      </div>

      {/* Filters - Responsive */}
      <div className={`flex gap-2 sm:gap-4 ${isMobile ? 'flex-col' : ''}`}>
        <Search
          placeholder="Search actions..."
          allowClear
          onSearch={setSearchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={isMobile ? 'w-full' : ''}
          style={isMobile ? {} : { width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="Category"
          allowClear
          className={isMobile ? 'w-full' : ''}
          style={isMobile ? {} : { width: 150 }}
          onChange={setCategoryFilter}
        >
          <Option value="personnel">Personnel</Option>
          <Option value="financial">Financial</Option>
          <Option value="system">System</Option>
          <Option value="strategic">Strategic</Option>
          <Option value="emergency">Emergency</Option>
        </Select>
        <Select
          placeholder="Severity"
          allowClear
          className={isMobile ? 'w-full' : ''}
          style={isMobile ? {} : { width: 150 }}
          onChange={setSeverityFilter}
        >
          <Option value="low">Low</Option>
          <Option value="normal">Normal</Option>
          <Option value="high">High</Option>
          <Option value="critical">Critical</Option>
        </Select>
      </div>

      {/* Table - Mobile Optimized */}
      <div className="overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: isMobile ? 10 : 20,
            showSizeChanger: !isMobile,
            showTotal: (total) => `Total ${total} actions`,
            size: isMobile ? 'small' : 'default'
          }}
          className="shadow-lg"
          scroll={{ x: isMobile ? 600 : 'auto' }}
          size={isMobile ? 'small' : 'default'}
        />
      </div>
    </div>
  );
};

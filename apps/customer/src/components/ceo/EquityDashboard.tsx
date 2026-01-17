// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Card, Statistic, Tag, Space, message, Spin, Popconfirm } from 'antd';
import { DollarOutlined, TeamOutlined, TrophyOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

interface Shareholder {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  employee_equity: Array<{
    id: string;
    shares_percentage: number;
    shares_total?: number;
    equity_type: string;
    grant_date: string;
  }>;
}

export const EquityDashboard: React.FC = () => {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchShareholders();
    
    // Check screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchShareholders = async () => {
    setLoading(true);
    try {
      // Use service-role edge function to bypass any RLS on employee_equity
      const { data, error } = await supabase.functions.invoke('get-equity-dashboard', { body: {} });
      if (error) throw error;
      const list = (data as any)?.shareholders || [];
      setShareholders(list);
    } catch (error) {
      console.error('Error fetching shareholders:', error);
      message.error('Failed to load shareholder data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShares = async (employeeId: string, equityId: string, employeeName: string) => {
    try {
      if (!equityId || equityId === 'undefined') {
        message.error('Invalid equity ID');
        return;
      }

      const { error } = await supabase
        .from('employee_equity')
        .delete()
        .eq('id', equityId);

      if (error) throw error;

      message.success(`Equity removed for ${employeeName}`);
      fetchShareholders(); // Refresh list
    } catch (error: any) {
      console.error('Error removing equity:', error);
      message.error(error.message || 'Failed to remove equity');
    }
  };

  const totalEquity = shareholders.reduce((sum, emp) => 
    sum + (emp.employee_equity?.[0]?.shares_percentage || 0), 0
  );

  const unallocatedEquity = 100 - totalEquity;

  // Mobile columns - simplified view
  const mobileColumns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
          #{index + 1}
        </span>
      ),
    },
    {
      title: 'Shareholder',
      key: 'name',
      render: (_: any, record: Shareholder) => (
        <div className="flex flex-col">
          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
            {record.first_name} {record.last_name}
          </div>
          <div style={{ fontSize: '11px', color: '#898989' }}>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Equity',
      key: 'equity',
      width: 60,
      render: (_: any, record: Shareholder) => {
        const equity = record.employee_equity?.[0];
        const percentage = equity?.shares_percentage || 0;
        
        return (
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ff6b00' }}>
            {percentage}%
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: Shareholder) => {
        const equity = record.employee_equity?.[0];
        if (!equity) return null;
        
        return (
          <Popconfirm
            title="Remove shares?"
            description={`Remove ${record.first_name}'s equity?`}
            onConfirm={() => handleRemoveShares(record.id, equity.id, `${record.first_name} ${record.last_name}`)}
            okText="Remove"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tag 
              icon={<DeleteOutlined />} 
              color="red"
              style={{ cursor: 'pointer', fontSize: '11px' }}
            >
              Remove
            </Tag>
          </Popconfirm>
        );
      },
    },
  ];

  // Desktop columns - full view
  const desktopColumns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 70,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
          #{index + 1}
        </span>
      ),
    },
    {
      title: 'Shareholder',
      key: 'name',
      render: (_: any, record: Shareholder) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1a1a1a' }}>
            {record.first_name} {record.last_name}
          </div>
          <div style={{ fontSize: '12px', color: '#898989' }}>
            {record.email}
          </div>
        </div>
      ),
      sorter: (a: Shareholder, b: Shareholder) => 
        a.first_name.localeCompare(b.first_name),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      render: (position: string) => {
        const isCLevel = /chief|ceo|cfo|cto|coo|president/i.test(position);
        return (
          <Tag color={isCLevel ? 'gold' : 'blue'} style={{ fontWeight: 600 }}>
            {position}
          </Tag>
        );
      },
    },
    {
      title: 'Equity Stake',
      key: 'equity',
      render: (_: any, record: Shareholder) => {
        const equity = record.employee_equity?.[0];
        const percentage = equity?.shares_percentage || 0;
        const shares = equity?.shares_total;
        
        return (
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ff6b00' }}>
              {percentage}%
            </div>
            {typeof shares === 'number' && (
              <div style={{ fontSize: '12px', color: '#475569' }}>
                {shares.toLocaleString()} shares
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#898989', textTransform: 'uppercase' }}>
              {equity?.equity_type || 'Stock'}
            </div>
          </div>
        );
      },
      sorter: (a: Shareholder, b: Shareholder) => 
        (a.employee_equity?.[0]?.shares_percentage || 0) - 
        (b.employee_equity?.[0]?.shares_percentage || 0),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Grant Date',
      key: 'grant_date',
      render: (_: any, record: Shareholder) => {
        const grantDate = record.employee_equity?.[0]?.grant_date;
        if (!grantDate) return '-';
        return new Date(grantDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Shareholder) => {
        const equity = record.employee_equity?.[0];
        if (!equity) return null;
        
        return (
          <Popconfirm
            title="Remove equity shares?"
            description={`This will permanently remove all equity for ${record.first_name} ${record.last_name}.`}
            onConfirm={() => handleRemoveShares(record.id, equity.id, `${record.first_name} ${record.last_name}`)}
            okText="Remove"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tag 
              icon={<DeleteOutlined />} 
              color="red"
              style={{ cursor: 'pointer' }}
            >
              Remove
            </Tag>
          </Popconfirm>
        );
      },
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">
          🎯 Equity Ownership Dashboard
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Track C-suite and key executive equity stakes
        </p>
      </div>

      {/* Statistics Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Total Shareholders</span>}
            value={shareholders.length}
            prefix={<TeamOutlined className="text-base sm:text-lg" />}
            valueStyle={{ color: '#1890ff', fontSize: isMobile ? '20px' : '24px' }}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Total Allocated Equity</span>}
            value={totalEquity}
            suffix="%"
            prefix={<DollarOutlined className="text-base sm:text-lg" />}
            valueStyle={{ color: '#3f8600', fontSize: isMobile ? '18px' : '24px' }}
            precision={2}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Unallocated Equity</span>}
            value={unallocatedEquity}
            suffix="%"
            prefix={<TrophyOutlined className="text-base sm:text-lg" />}
            valueStyle={{ color: '#faad14', fontSize: isMobile ? '20px' : '24px' }}
            precision={2}
          />
        </Card>
        <Card>
          <Statistic
            title={<span className="text-xs sm:text-sm">Largest Stake</span>}
            value={shareholders[0]?.employee_equity?.[0]?.shares_percentage || 0}
            suffix="%"
            valueStyle={{ color: '#cf1322', fontSize: isMobile ? '20px' : '24px' }}
            precision={2}
          />
        </Card>
      </div>

      {/* Equity Allocation Progress Bar */}
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Equity Allocation Overview</h3>
        <div className="space-y-2">
          {shareholders.slice(0, 10).map((emp, index) => {
            const percentage = emp.employee_equity?.[0]?.shares_percentage || 0;
            return (
              <div key={emp.id} className="flex items-center space-x-2 sm:space-x-3">
                <div className={`${isMobile ? 'w-16' : 'w-24'} text-xs sm:text-sm font-medium text-slate-600 truncate`}>
                  {emp.first_name} {emp.last_name.substring(0, 1)}.
                </div>
                <div className="flex-1">
                    <div className={`${isMobile ? 'h-4' : 'h-6'} bg-slate-100 rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
                        style={{ width: `${percentage}%`, transition: 'width 0.3s' }}
                      />
                    </div>
                </div>
                <div className={`${isMobile ? 'w-12' : 'w-20'} text-right text-xs sm:text-sm font-semibold text-slate-700`}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Shareholders Table */}
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Complete Shareholder Registry</h3>
        <div className="overflow-hidden">
          <Table
            columns={columns}
            dataSource={shareholders}
            rowKey="id"
            loading={loading}
            pagination={{ 
              pageSize: isMobile ? 5 : 20, 
              showSizeChanger: !isMobile,
              size: isMobile ? 'small' : 'default'
            }}
            className="shadow-lg"
            scroll={{ x: isMobile ? 600 : 800 }}
            size={isMobile ? 'small' : 'default'}
          />
        </div>
      </Card>

      {unallocatedEquity < 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="text-red-600 font-semibold">
            ⚠️ Warning: Total equity allocation exceeds 100%. 
            Please review and adjust equity stakes.
          </div>
        </Card>
      )}

      {unallocatedEquity > 0 && unallocatedEquity <= 30 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="text-yellow-700 font-medium">
            💡 Consider allocating remaining {unallocatedEquity.toFixed(2)}% equity 
            to key executives or reserve for future options pool.
          </div>
        </Card>
      )}
    </div>
  );
};


// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Modal, Card, Statistic, Row, Col, Table, Tag, Button, message } from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  RiseOutlined,
  TeamOutlined,
  ShoppingOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface Report {
  id: string;
  report_type: string;
  title: string;
  description: string;
  period_start: string;
  period_end: string;
  data: any;
  summary: string;
  generated_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ReportsViewer: React.FC<Props> = ({ visible, onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchReports();
    }
  }, [visible]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
      if (data && data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch real data for report
      const [employeesRes, approvalsRes] = await Promise.all([
        supabase.from('employees').select('id, employment_status, salary'),
        supabase.from('ceo_financial_approvals').select('id, amount, status')
      ]);

      const employees = employeesRes.data || [];
      const approvals = approvalsRes.data || [];
      
      const reportData = {
        employees: employees.length,
        active_employees: employees.filter(e => e.employment_status === 'active').length,
        total_payroll: employees.reduce((sum, e) => sum + (e.salary || 0), 0),
        pending_approvals: approvals.filter(a => a.status === 'pending').length,
        approved_amount: approvals.filter(a => a.status === 'approved').reduce((sum, a) => sum + (a.amount || 0), 0),
      };

      const { error } = await supabase
        .from('ceo_reports')
        .insert([
          {
            report_type: 'custom',
            title: 'Current Company Snapshot',
            description: 'Real-time company metrics and status',
            period_start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
            period_end: dayjs().format('YYYY-MM-DD'),
            data: reportData,
            summary: `${reportData.employees} total employees, ${reportData.active_employees} active. $${reportData.total_payroll.toLocaleString()} annual payroll. ${reportData.pending_approvals} pending approvals.`,
            generated_by: user?.id,
          }
        ]);

      if (error) throw error;

      message.success('Report generated successfully!');
      fetchReports();
    } catch (error: any) {
      console.error('Error generating report:', error);
      message.error('Failed to generate report');
    }
  };

  const getReportIcon = (type: string) => {
    const icons: Record<string, any> = {
      financial: <DollarOutlined style={{ fontSize: 24 }} />,
      operations: <ShoppingOutlined style={{ fontSize: 24 }} />,
      personnel: <TeamOutlined style={{ fontSize: 24 }} />,
      growth: <RiseOutlined style={{ fontSize: 24 }} />,
      custom: <FileTextOutlined style={{ fontSize: 24 }} />,
    };
    return icons[type] || <FileTextOutlined style={{ fontSize: 24 }} />;
  };

  const renderReportData = (report: Report) => {
    const data = report.data;
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
          <p className="text-slate-600 mb-4">{report.description}</p>
          <div className="text-sm text-slate-500">
            Period: {dayjs(report.period_start).format('MMM D')} - {dayjs(report.period_end).format('MMM D, YYYY')}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Summary</h4>
          <p>{report.summary}</p>
        </div>

        <Row gutter={[16, 16]}>
          {Object.entries(data).map(([key, value]: [string, any]) => (
            <Col span={8} key={key}>
              <Card>
                <Statistic
                  title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  value={typeof value === 'number' ? value : value}
                  prefix={key.includes('revenue') || key.includes('amount') || key.includes('payroll') ? '$' : ''}
                  precision={key.includes('rate') ? 1 : 0}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>Company Reports & Analytics</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-slate-600">{reports.length} reports available</p>
          </div>
          <Button type="primary" onClick={generateNewReport} icon={<FileTextOutlined />}>
            Generate New Report
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow ${
                selectedReport?.id === report.id ? 'border-2 border-blue-500' : ''
              }`}
              onClick={() => setSelectedReport(report)}
            >
              <div className="text-center">
                <div className="mb-2 text-blue-600">{getReportIcon(report.report_type)}</div>
                <div className="font-semibold text-sm mb-1">{report.title}</div>
                <Tag color="blue">{report.report_type}</Tag>
                <div className="text-xs text-slate-500 mt-2">
                  {dayjs(report.generated_at).format('MMM D')}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {selectedReport && (
          <Card className="mt-4">
            {renderReportData(selectedReport)}
          </Card>
        )}
      </div>
    </Modal>
  );
};


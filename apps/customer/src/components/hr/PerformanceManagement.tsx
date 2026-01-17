// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Select, Input, DatePicker, Rate, message, Card, Row, Col, Statistic, Tag, Divider } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_date: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  goals: string;
  comments: string;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    position: string;
    department?: { name: string };
  };
}

const PerformanceManagement: React.FC = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Fetch regular employees (active only)
      const { data: regularEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, position, department_id, departments(name), user_id')
        .eq('employment_status', 'active')
        .order('last_name');

      if (employeesError) throw employeesError;

      // Fetch C-suite executives
      const { data: executives, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, title, department, name, email')
        .not('user_id', 'is', null);

      if (execError) {
        console.error('Error fetching executives:', execError);
      }

      // Combine both lists
      const allEmployees: any[] = [];

      // Add regular employees
      if (regularEmployees) {
        allEmployees.push(...regularEmployees);
      }

      // Add C-suite executives that don't already exist as employees
      if (executives) {
        for (const exec of executives) {
          const existsAsEmployee = regularEmployees?.some(
            (emp: any) => emp.user_id === exec.user_id
          );

          if (!existsAsEmployee && exec.user_id && exec.name) {
            const nameParts = exec.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            allEmployees.push({
              id: exec.id,
              first_name: firstName,
              last_name: lastName,
              email: exec.email || '',
              position: exec.title || exec.role.toUpperCase(),
              department_id: null,
              departments: { name: exec.department || 'Executive' },
              user_id: exec.user_id,
              is_executive: true,
            });
          }
        }
      }

      // Sort by last name
      allEmployees.sort((a, b) => a.last_name.localeCompare(b.last_name));

      setEmployees(allEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          employee:employees!performance_reviews_employee_id_fkey(
            id,
            first_name,
            last_name,
            email,
            position,
            department:departments(name)
          )
        )
        `)
        .order('review_date', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      message.error('Failed to load performance reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = () => {
    form.resetFields();
    setSelectedReview(null);
    setModalVisible(true);
  };

  const handleEditReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    form.setFieldsValue({
      ...review,
      review_date: review.review_date ? dayjs(review.review_date) : null,
      review_period: review.review_period_start && review.review_period_end
        ? [dayjs(review.review_period_start), dayjs(review.review_period_end)]
        : null,
    });
    setModalVisible(true);
  };

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setViewModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const reviewData = {
        employee_id: values.employee_id,
        review_date: values.review_date.format('YYYY-MM-DD'),
        review_period_start: values.review_period?.[0]?.format('YYYY-MM-DD'),
        review_period_end: values.review_period?.[1]?.format('YYYY-MM-DD'),
        overall_rating: values.overall_rating,
        strengths: values.strengths,
        areas_for_improvement: values.areas_for_improvement,
        goals: values.goals,
        comments: values.comments,
      };

      if (selectedReview) {
        const { error } = await supabase
          .from('performance_reviews')
          .update(reviewData)
          .eq('id', selectedReview.id);

        if (error) throw error;
        message.success('Performance review updated successfully');
      } else {
        const { error } = await supabase
          .from('performance_reviews')
          .insert([reviewData]);

        if (error) throw error;
        message.success('Performance review created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchReviews();
    } catch (error: any) {
      console.error('Error saving review:', error);
      message.error('Failed to save performance review');
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'green';
    if (rating >= 3.5) return 'blue';
    if (rating >= 2.5) return 'orange';
    return 'red';
  };

  const calculateStats = () => {
    if (reviews.length === 0) return { average: 0, total: 0, thisYear: 0 };
    
    const thisYear = new Date().getFullYear();
    const thisYearReviews = reviews.filter(r => 
      new Date(r.review_date).getFullYear() === thisYear
    );
    
    const average = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length;
    
    return {
      average: average.toFixed(1),
      total: reviews.length,
      thisYear: thisYearReviews.length,
    };
  };

  const stats = calculateStats();

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (record: PerformanceReview) => {
        const emp = record.employee;
        if (!emp) return 'N/A';
        return `${emp.first_name} ${emp.last_name}`;
      },
    },
    {
      title: 'Position',
      key: 'position',
      render: (record: PerformanceReview) => record.employee?.position || 'N/A',
    },
    {
      title: 'Review Date',
      dataIndex: 'review_date',
      key: 'review_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Rating',
      dataIndex: 'overall_rating',
      key: 'overall_rating',
      render: (rating: number) => (
        <Tag color={getRatingColor(rating)}>
          <Rate disabled value={rating} style={{ fontSize: '14px' }} />
          <span style={{ marginLeft: 8 }}>{rating}/5</span>
        </Tag>
      ),
    },
    {
      title: 'Review Period',
      key: 'period',
      render: (record: PerformanceReview) => {
        if (!record.review_period_start || !record.review_period_end) return 'N/A';
        return `${dayjs(record.review_period_start).format('MMM D')} - ${dayjs(record.review_period_end).format('MMM D, YYYY')}`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PerformanceReview) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewReview(record)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditReview(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Rating"
              value={stats.average}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Reviews"
              value={stats.total}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Reviews This Year"
              value={stats.thisYear}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Performance Reviews"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateReview}
          >
            New Review
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={reviews}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={selectedReview ? 'Edit Performance Review' : 'Create Performance Review'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="employee_id"
            label="Employee"
            rules={[{ required: true, message: 'Please select an employee' }]}
          >
            <Select
              placeholder="Select employee"
              showSearch
              optionFilterProp="children"
              disabled={!!selectedReview}
            >
              {employees.map(emp => (
                <Option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} - {emp.position}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="review_date"
            label="Review Date"
            rules={[{ required: true, message: 'Please select review date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="review_period"
            label="Review Period"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="overall_rating"
            label="Overall Rating"
            rules={[{ required: true, message: 'Please provide a rating' }]}
          >
            <Rate allowHalf />
          </Form.Item>

          <Form.Item
            name="strengths"
            label="Strengths"
          >
            <TextArea rows={3} placeholder="List key strengths..." />
          </Form.Item>

          <Form.Item
            name="areas_for_improvement"
            label="Areas for Improvement"
          >
            <TextArea rows={3} placeholder="List areas that need improvement..." />
          </Form.Item>

          <Form.Item
            name="goals"
            label="Goals"
          >
            <TextArea rows={3} placeholder="Set goals for the next period..." />
          </Form.Item>

          <Form.Item
            name="comments"
            label="Additional Comments"
          >
            <TextArea rows={4} placeholder="Additional comments or notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Performance Review Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedReview && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <strong>Employee:</strong> {selectedReview.employee 
                  ? `${selectedReview.employee.first_name} ${selectedReview.employee.last_name}`
                  : 'N/A'}
              </Col>
              <Col span={12}>
                <strong>Position:</strong> {selectedReview.employee?.position || 'N/A'}
              </Col>
              <Col span={12}>
                <strong>Review Date:</strong> {dayjs(selectedReview.review_date).format('MMMM D, YYYY')}
              </Col>
              <Col span={12}>
                <strong>Rating:</strong>{' '}
                <Tag color={getRatingColor(selectedReview.overall_rating || 0)}>
                  {selectedReview.overall_rating || 0}/5
                </Tag>
              </Col>
              {selectedReview.review_period_start && selectedReview.review_period_end && (
                <Col span={24}>
                  <strong>Review Period:</strong>{' '}
                  {dayjs(selectedReview.review_period_start).format('MMMM D, YYYY')} - {dayjs(selectedReview.review_period_end).format('MMMM D, YYYY')}
                </Col>
              )}
            </Row>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <strong>Overall Rating:</strong>
              <div style={{ marginTop: 8 }}>
                <Rate disabled value={selectedReview.overall_rating || 0} />
                <span style={{ marginLeft: 8 }}>{selectedReview.overall_rating || 0}/5</span>
              </div>
            </div>

            {selectedReview.strengths && (
              <div style={{ marginBottom: 16 }}>
                <strong>Strengths:</strong>
                <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedReview.strengths}</p>
              </div>
            )}

            {selectedReview.areas_for_improvement && (
              <div style={{ marginBottom: 16 }}>
                <strong>Areas for Improvement:</strong>
                <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedReview.areas_for_improvement}</p>
              </div>
            )}

            {selectedReview.goals && (
              <div style={{ marginBottom: 16 }}>
                <strong>Goals:</strong>
                <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedReview.goals}</p>
              </div>
            )}

            {selectedReview.comments && (
              <div>
                <strong>Additional Comments:</strong>
                <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedReview.comments}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PerformanceManagement;


import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Badge, Tag, Typography, message, Popconfirm } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined, PlusOutlined, DeleteOutlined, GithubOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function CodeReviewQueue() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchReviews();
    fetchDevelopers();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cto_code_reviews')
        .select('*, author:auth.users!author_id(email), reviewer:auth.users!reviewer_id(email)')
        .order('created_at', { ascending: false });

      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      message.error('Failed to load code reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    try {
      const { data } = await supabase.from('cto_developers').select('user_id, user:auth.users(email)');
      setDevelopers(data || []);
    } catch (error) {
      console.error('Error fetching developers:', error);
    }
  };

  const handleCreate = () => {
    setEditingReview(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (review: any) => {
    setEditingReview(review);
    form.setFieldsValue(review);
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingReview) {
        await supabase.from('cto_code_reviews').update(values).eq('id', editingReview.id);
        message.success('Code review updated successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('cto_code_reviews').insert({
          ...values,
          author_id: values.author_id || user?.id,
        });
        message.success('Code review created successfully');
      }
      setModalVisible(false);
      fetchReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to save code review');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('cto_code_reviews').delete().eq('id', id);
      message.success('Code review deleted successfully');
      fetchReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to delete code review');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('cto_code_reviews').update({
        status: 'approved',
        reviewer_id: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      message.success('Code review approved');
      fetchReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to approve review');
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('cto_code_reviews').update({
        status: 'changes_requested',
        reviewer_id: user?.id,
        review_notes: notes,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      message.success('Changes requested');
      fetchReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to request changes');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: 'Pending' },
      approved: { color: 'success', text: 'Approved' },
      changes_requested: { color: 'warning', text: 'Changes Requested' },
      merged: { color: 'processing', text: 'Merged' },
      rejected: { color: 'error', text: 'Rejected' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Badge status={config.color as any} text={config.text} />;
  };

  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const approvedToday = reviews.filter(r => 
    r.status === 'approved' && 
    new Date(r.updated_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div>
      <Space className="mb-4" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} className="m-0">Code Review Queue</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Review
        </Button>
      </Space>

      <Space className="mb-4" size="large">
        <Card>
          <Space>
            <Text strong>Pending Reviews:</Text>
            <Badge count={pendingReviews} style={{ backgroundColor: '#fa8c16' }} />
          </Space>
        </Card>
        <Card>
          <Space>
            <Text strong>Approved Today:</Text>
            <Badge count={approvedToday} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        </Card>
      </Space>

      <Card>
        <Table
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: 'PR #',
              dataIndex: 'pr_number',
              key: 'pr_number',
              render: (text) => text ? <Text code>{text}</Text> : '-',
            },
            {
              title: 'Title',
              dataIndex: 'pr_title',
              key: 'pr_title',
              render: (text, record) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{text}</Text>
                  {record.repository && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <GithubOutlined /> {record.repository}
                      {record.branch && ` / ${record.branch}`}
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              title: 'Author',
              dataIndex: 'author',
              key: 'author',
              render: (author) => author?.email || 'Unknown',
            },
            {
              title: 'Reviewer',
              dataIndex: 'reviewer',
              key: 'reviewer',
              render: (reviewer) => reviewer?.email || <Text type="secondary">Unassigned</Text>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => getStatusBadge(status),
            },
            {
              title: 'Quality Score',
              dataIndex: 'quality_score',
              key: 'quality_score',
              render: (score) => {
                if (!score) return '-';
                const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#f5222d';
                return <Tag color={color}>{score}/100</Tag>;
              },
            },
            {
              title: 'Created',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (val) => new Date(val).toLocaleDateString(),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 200,
              render: (_, record) => (
                <Space>
                  {record.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleApprove(record.id)}
                      >
                        Approve
                      </Button>
                      <Popconfirm
                        title="Request changes?"
                        description={
                          <Input.TextArea
                            placeholder="Reason for changes"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReject(record.id, e.target.value);
                              }
                            }}
                          />
                        }
                        onConfirm={() => {}}
                        okText="Request Changes"
                      >
                        <Button size="small" danger icon={<CloseCircleOutlined />}>
                          Request Changes
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                  <Popconfirm title="Delete this review?" onConfirm={() => handleDelete(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingReview ? 'Edit Code Review' : 'Add Code Review'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="pr_number" label="PR Number">
            <Input placeholder="PR-123" />
          </Form.Item>
          <Form.Item name="pr_title" label="PR Title" rules={[{ required: true }]}>
            <Input placeholder="Add new feature" />
          </Form.Item>
          <Form.Item name="pr_url" label="PR URL">
            <Input placeholder="https://github.com/..." />
          </Form.Item>
          <Form.Item name="repository" label="Repository">
            <Input placeholder="craven-delivery" />
          </Form.Item>
          <Form.Item name="branch" label="Branch">
            <Input placeholder="feature/new-feature" />
          </Form.Item>
          <Form.Item name="author_id" label="Author">
            <Select placeholder="Select author" allowClear>
              {developers.map(d => (
                <Select.Option key={d.user_id} value={d.user_id}>
                  {d.user?.email || 'Unknown'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reviewer_id" label="Reviewer">
            <Select placeholder="Select reviewer" allowClear>
              {developers.map(d => (
                <Select.Option key={d.user_id} value={d.user_id}>
                  {d.user?.email || 'Unknown'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="changes_requested">Changes Requested</Select.Option>
              <Select.Option value="merged">Merged</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="review_notes" label="Review Notes">
            <TextArea rows={4} placeholder="Review comments and feedback" />
          </Form.Item>
          <Form.Item name="quality_score" label="Quality Score (0-100)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}




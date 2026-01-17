import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, InputNumber, Select, Tag, message, Card } from 'antd';
import { CalendarOutlined, VideoCameraOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  status: string;
}

export const BoardMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    // TODO: Implement once board_meetings table is created
    setMeetings([]);
    setLoading(false);
  };

  const scheduleMeeting = async (values: any) => {
    // TODO: Implement once board_meetings table is created
    message.info('Meeting scheduling will be available once the database is configured');
    setModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Meeting',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Meeting) => (
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-600">{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (date: string, record: Meeting) => (
        <div>
          <div className="font-medium">{dayjs(date).format('MMM D, YYYY')}</div>
          <div className="text-sm text-slate-500">{dayjs(date).format('h:mm A')} ({record.duration_minutes} min)</div>
        </div>
      ),
      sorter: (a: Meeting, b: Meeting) => dayjs(a.scheduled_at).unix() - dayjs(b.scheduled_at).unix(),
    },
    {
      title: 'Link',
      dataIndex: 'meeting_url',
      key: 'meeting_url',
      render: (url: string) => (
        url ? (
          <Button
            type="link"
            icon={<VideoCameraOutlined />}
            href={url}
            target="_blank"
            size="small"
          >
            Join Meeting
          </Button>
        ) : (
          <span className="text-slate-400">In-person</span>
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          scheduled: 'blue',
          'in-progress': 'green',
          completed: 'default',
          cancelled: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  const upcomingMeetings = meetings.filter(m => 
    dayjs(m.scheduled_at).isAfter(dayjs()) && m.status === 'scheduled'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Board Meetings</h2>
          <p className="text-slate-600">Schedule and manage executive meetings</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setModalVisible(true)}
        >
          Schedule Meeting
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{upcomingMeetings.length}</div>
            <div className="text-sm text-slate-600">Upcoming</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {meetings.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{meetings.length}</div>
            <div className="text-sm text-slate-600">Total Meetings</div>
          </div>
        </Card>
      </div>

      <Table
        columns={columns}
        dataSource={meetings}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        className="shadow-lg"
      />

      <Modal
        title={
          <div className="flex items-center gap-2">
            <CalendarOutlined />
            <span>Schedule Board Meeting</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form layout="vertical" form={form} onFinish={scheduleMeeting}>
          <Form.Item
            label="Meeting Title"
            name="title"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g., Q1 Board Review" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Meeting agenda and details..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Date & Time"
              name="scheduled_at"
              rules={[{ required: true }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Duration (minutes)"
              name="duration_minutes"
              initialValue={60}
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: '100%' }} min={15} max={480} step={15} />
            </Form.Item>
          </div>

          <Form.Item label="Video Conference URL" name="meeting_url">
            <Input placeholder="https://zoom.us/j/..." prefix={<VideoCameraOutlined />} />
          </Form.Item>

          <Form.Item label="Meeting Password" name="meeting_password">
            <Input.Password placeholder="Optional password for video call" />
          </Form.Item>

          <Form.Item>
            <div className="flex gap-3">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }} className="flex-1">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" icon={<CalendarOutlined />} className="flex-1">
                Schedule Meeting
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


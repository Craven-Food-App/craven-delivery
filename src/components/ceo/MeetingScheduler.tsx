import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, Table, Button, Tag, message } from 'antd';
import { CalendarOutlined, VideoCameraOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  status: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const MeetingScheduler: React.FC<Props> = ({ visible, onClose }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchMeetings();
    }
  }, [visible]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_meetings')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleMeeting = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ceo_meetings')
        .insert([
          {
            title: values.title,
            description: values.description,
            meeting_type: values.meeting_type,
            scheduled_at: dayjs(values.scheduled_at).toISOString(),
            duration_minutes: values.duration_minutes,
            location: values.location,
            meeting_url: values.meeting_url,
            organizer_id: user?.id,
            organizer_name: user?.email?.split('@')[0] || 'CEO',
          }
        ]);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'scheduled_meeting',
        p_action_category: 'system',
        p_target_type: 'meeting',
        p_target_id: null,
        p_target_name: values.title,
        p_description: `Scheduled ${values.meeting_type} meeting: ${values.title}`,
        p_severity: 'normal'
      });

      message.success('Meeting scheduled successfully!');
      setShowForm(false);
      form.resetFields();
      fetchMeetings();
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      message.error(error.message || 'Failed to schedule meeting');
    }
  };

  const columns = [
    {
      title: 'Meeting',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Meeting) => (
        <div>
          <div className="font-semibold">{title}</div>
          <Tag color="blue">{record.meeting_type.toUpperCase()}</Tag>
        </div>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MMM D, YYYY')}</div>
          <div className="text-sm text-slate-500">{dayjs(date).format('h:mm A')}</div>
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
      render: (minutes: number) => `${minutes} min`,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => (
        <div className="flex items-center gap-2">
          {location?.includes('zoom') || location?.includes('meet') ? (
            <VideoCameraOutlined />
          ) : (
            <EnvironmentOutlined />
          )}
          <span>{location}</span>
        </div>
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

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined />
          <span>Meeting Scheduler</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <div className="space-y-4">
        {!showForm ? (
          <>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-600">Upcoming meetings</p>
              </div>
              <Button type="primary" onClick={() => setShowForm(true)}>
                Schedule New Meeting
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={meetings}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
            />
          </>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-4">Schedule New Meeting</h3>
            <Form layout="vertical" form={form} onFinish={scheduleMeeting}>
              <Form.Item
                label="Meeting Title"
                name="title"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g., Q1 All-Hands Meeting" />
              </Form.Item>

              <Form.Item label="Description" name="description">
                <TextArea rows={3} placeholder="Meeting agenda and details..." />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  label="Meeting Type"
                  name="meeting_type"
                  rules={[{ required: true }]}
                  initialValue="team"
                >
                  <Select>
                    <Option value="all-hands">All-Hands</Option>
                    <Option value="executive">Executive</Option>
                    <Option value="department">Department</Option>
                    <Option value="team">Team</Option>
                    <Option value="one-on-one">One-on-One</Option>
                    <Option value="board">Board Meeting</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Duration (minutes)"
                  name="duration_minutes"
                  rules={[{ required: true }]}
                  initialValue={60}
                >
                  <InputNumber style={{ width: '100%' }} min={15} max={480} step={15} />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  label="Date & Time"
                  name="scheduled_at"
                  rules={[{ required: true }]}
                >
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label="Location"
                  name="location"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Conference Room or Zoom link" />
                </Form.Item>
              </div>

              <Form.Item label="Meeting URL (optional)" name="meeting_url">
                <Input placeholder="https://zoom.us/..." />
              </Form.Item>

              <div className="flex gap-3">
                <Button onClick={() => {
                  setShowForm(false);
                  form.resetFields();
                }} className="flex-1">
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" className="flex-1">
                  Schedule Meeting
                </Button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </Modal>
  );
};


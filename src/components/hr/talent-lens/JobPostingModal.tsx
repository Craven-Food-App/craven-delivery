import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Space, message, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { JobPosting } from './types';

const { TextArea } = Input;
const { Option } = Select;

interface JobPostingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPosting?: JobPosting | null;
}

const JobPostingModal: React.FC<JobPostingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editingPosting,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (editingPosting) {
      form.setFieldsValue({
        title: editingPosting.title,
        department: editingPosting.department,
        location: editingPosting.location,
        salary_min: editingPosting.salaryRange.min ? editingPosting.salaryRange.min / 100 : undefined,
        salary_max: editingPosting.salaryRange.max ? editingPosting.salaryRange.max / 100 : undefined,
        requirements: editingPosting.requirements || [],
        description: editingPosting.description,
        status: editingPosting.status,
      });
    } else {
      form.resetFields();
    }
  }, [editingPosting, visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const postingData = {
        title: values.title,
        department: values.department,
        location: values.location,
        salary_min: values.salary_min ? Math.round(values.salary_min * 100) : null,
        salary_max: values.salary_max ? Math.round(values.salary_max * 100) : null,
        requirements: values.requirements || [],
        description: values.description || null,
        status: values.status || 'active',
      };

      if (editingPosting) {
        // Update existing posting
        const { error } = await supabase
          .from('job_postings')
          .update(postingData)
          .eq('id', editingPosting.id);

        if (error) throw error;
        message.success('Job posting updated successfully');
      } else {
        // Create new posting
        const { error } = await supabase
          .from('job_postings')
          .insert([postingData]);

        if (error) throw error;
        message.success('Job posting created successfully');
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving job posting:', error);
      message.error(`Failed to save job posting: ${error.message}`);
    }
  };

  return (
    <Modal
      title={editingPosting ? 'Edit Job Posting' : 'Create Job Posting'}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {editingPosting ? 'Update' : 'Create'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'active',
          requirements: [],
        }}
      >
        <Form.Item
          name="title"
          label="Job Title"
          rules={[{ required: true, message: 'Please enter job title' }]}
        >
          <Input placeholder="e.g., Senior Software Engineer" />
        </Form.Item>

        <Form.Item
          name="department"
          label="Department"
          rules={[{ required: true, message: 'Please enter department' }]}
        >
          <Input placeholder="e.g., Engineering, Sales, Marketing" />
        </Form.Item>

        <Form.Item
          name="location"
          label="Location"
          rules={[{ required: true, message: 'Please enter location' }]}
        >
          <Input placeholder="e.g., Remote, New York, NY, San Francisco, CA" />
        </Form.Item>

        <Space style={{ width: '100%' }} direction="vertical">
          <Form.Item
            name="salary_min"
            label="Salary Range (Annual, in thousands)"
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              placeholder="Min (e.g., 80 for $80K)"
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => (value ? `$${value}K` : '')}
              parser={(value) => (value ? parseFloat(value.replace(/\$|K/g, '')) : 0)}
            />
          </Form.Item>

          <Form.Item
            name="salary_max"
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              placeholder="Max (e.g., 120 for $120K)"
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => (value ? `$${value}K` : '')}
              parser={(value) => (value ? parseFloat(value.replace(/\$|K/g, '')) : 0)}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="description"
          label="Job Description"
        >
          <TextArea
            rows={4}
            placeholder="Describe the role, responsibilities, and what you're looking for..."
          />
        </Form.Item>

        <Form.Item
          name="requirements"
          label="Requirements"
          tooltip="List key skills, qualifications, or requirements for this position"
        >
          <Form.List name="requirements">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={name}
                      rules={[{ required: true, message: 'Please enter requirement' }]}
                    >
                      <Input placeholder="e.g., 5+ years React experience" style={{ width: 400 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Requirement
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="active">Active</Option>
            <Option value="paused">Paused</Option>
            <Option value="closed">Closed</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JobPostingModal;















































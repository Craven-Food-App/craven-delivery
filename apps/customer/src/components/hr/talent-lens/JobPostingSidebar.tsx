import React from 'react';
import { Card, Badge, Typography, Space, Tag, Button } from 'antd';
import { EnvironmentOutlined, DollarOutlined, EditOutlined } from '@ant-design/icons';
import { JobPosting } from './types';

const { Title, Text } = Typography;

interface JobPostingSidebarProps {
  postings: JobPosting[];
  selectedPostingId: string | null;
  onSelectPosting: (id: string | null) => void;
  onEditPosting?: (posting: JobPosting) => void;
}

const JobPostingSidebar: React.FC<JobPostingSidebarProps> = ({
  postings,
  selectedPostingId,
  onSelectPosting,
  onEditPosting,
}) => {
  const formatSalary = (min: number, max: number) => {
    const minK = Math.floor(min / 1000);
    const maxK = Math.floor(max / 1000);
    return `$${minK}K - $${maxK}K`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'paused':
        return 'orange';
      case 'closed':
        return 'red';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        Job Postings
      </Title>
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          size="small"
          hoverable
          onClick={() => onSelectPosting(null)}
          style={{
            cursor: 'pointer',
            border: selectedPostingId === null ? '2px solid #1890ff' : '1px solid #d9d9d9',
          }}
        >
          <Text strong>All Applicants</Text>
        </Card>

        {postings.map((posting) => (
          <Card
            key={posting.id}
            size="small"
            hoverable
            onClick={() => onSelectPosting(posting.id)}
            style={{
              cursor: 'pointer',
              border: selectedPostingId === posting.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
            }}
            actions={onEditPosting ? [
              <EditOutlined
                key="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPosting(posting);
                }}
                style={{ cursor: 'pointer', fontSize: 16 }}
              />
            ] : undefined}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Title level={5} style={{ margin: 0, flex: 1 }}>
                  {posting.title}
                </Title>
                <Badge
                  status={getStatusColor(posting.status) as any}
                  text={posting.status}
                  style={{ textTransform: 'capitalize' }}
                />
              </div>

              <Space size="small">
                <EnvironmentOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {posting.location}
                </Text>
              </Space>

              {posting.salaryRange.min && posting.salaryRange.max && (
                <Space size="small">
                  <DollarOutlined />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatSalary(posting.salaryRange.min, posting.salaryRange.max)}
                  </Text>
                </Space>
              )}

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {posting.applicantCount || 0} applicants
                </Text>
              </div>

              <div>
                <Tag color="blue" style={{ fontSize: 11 }}>
                  {posting.department}
                </Tag>
              </div>
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default JobPostingSidebar;


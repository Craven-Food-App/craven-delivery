import React from 'react';
import { Card, Tag, Space, Typography, Badge, Progress } from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  MailOutlined,
  LinkedinOutlined,
} from '@ant-design/icons';
import { Applicant } from './types';

const { Text, Paragraph } = Typography;

interface ApplicantCardProps {
  applicant: Applicant;
  onClick: () => void;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({ applicant, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'reviewing':
        return 'orange';
      case 'shortlisted':
        return 'green';
      case 'rejected':
        return 'red';
      case 'offered':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getFitScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 80) return 'success';
    if (score >= 60) return 'processing';
    if (score >= 40) return 'warning';
    return 'exception';
  };

  const getFitScoreLabel = (score?: number) => {
    if (!score) return 'Not Scored';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Poor';
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ cursor: 'pointer', height: '100%' }}
      styles={{ body: { padding: 16 } }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* Header with Name and Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 16 }}>
              {applicant.name}
            </Text>
          </div>
          <Badge
            status={getStatusColor(applicant.status) as any}
            text={applicant.status}
            style={{ textTransform: 'capitalize', fontSize: 12 }}
          />
        </div>

        {/* Job Posting (if available) */}
        {applicant.jobPostingTitle && (
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 11 }}>
              {applicant.jobPostingTitle}
            </Tag>
          </div>
        )}

        {/* Current Role and Company */}
        <Space size="small">
          <UserOutlined />
          <Text type="secondary" style={{ fontSize: 13 }}>
            {applicant.currentRole}
            {applicant.currentCompany && ` at ${applicant.currentCompany}`}
          </Text>
        </Space>

        {/* Location */}
        {applicant.location && (
          <Space size="small">
            <EnvironmentOutlined />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {applicant.location}
            </Text>
          </Space>
        )}

        {/* Experience */}
        {applicant.yearsExperience > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {applicant.yearsExperience} years experience
          </Text>
        )}

        {/* Fit Score */}
        {applicant.fitScore !== undefined && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12 }}>Fit Score</Text>
              <Text strong style={{ fontSize: 12 }}>
                {applicant.fitScore}/100
              </Text>
            </div>
            <Progress
              percent={applicant.fitScore}
              size="small"
              status={getFitScoreColor(applicant.fitScore) as any}
              showInfo={false}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {getFitScoreLabel(applicant.fitScore)}
            </Text>
          </div>
        )}

        {/* Skills (limited display) */}
        {applicant.skills && applicant.skills.length > 0 && (
          <div>
            <Space wrap size={[4, 4]}>
              {applicant.skills.slice(0, 4).map((skill, index) => (
                <Tag key={index} style={{ fontSize: 11, margin: 0 }}>
                  {skill}
                </Tag>
              ))}
              {applicant.skills.length > 4 && (
                <Tag style={{ fontSize: 11, margin: 0 }}>
                  +{applicant.skills.length - 4} more
                </Tag>
              )}
            </Space>
          </div>
        )}

        {/* Contact Info */}
        <Space size="middle" style={{ marginTop: 8 }}>
          {applicant.email && (
            <a href={`mailto:${applicant.email}`} onClick={(e) => e.stopPropagation()}>
              <MailOutlined style={{ color: '#1890ff' }} />
            </a>
          )}
          {applicant.linkedinUrl && (
            <a
              href={applicant.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <LinkedinOutlined style={{ color: '#0077b5' }} />
            </a>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export default ApplicantCard;


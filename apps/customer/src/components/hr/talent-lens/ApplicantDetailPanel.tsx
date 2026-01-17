import React from 'react';
import { Drawer, Typography, Space, Tag, Divider, Button, Progress, Card, List, Alert } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Applicant } from './types';

const { Title, Text, Paragraph } = Typography;

interface ApplicantDetailPanelProps {
  applicant: Applicant | null;
  visible: boolean;
  onClose: () => void;
  onAnalyze?: (applicantId: string) => void;
  analyzing?: boolean;
}

const ApplicantDetailPanel: React.FC<ApplicantDetailPanelProps> = ({
  applicant,
  visible,
  onClose,
  onAnalyze,
  analyzing = false,
}) => {
  if (!applicant) return null;

  const getFitScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 80) return 'success';
    if (score >= 60) return 'processing';
    if (score >= 40) return 'warning';
    return 'exception';
  };

  const getFitScoreLabel = (score?: number) => {
    if (!score) return 'Not Scored';
    if (score >= 80) return 'Excellent Fit';
    if (score >= 60) return 'Good Fit';
    if (score >= 40) return 'Moderate Fit';
    return 'Poor Fit';
  };

  const formatSalary = (amount: number) => {
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <Drawer
      title={
        <Space>
          <UserOutlined />
          <span>{applicant.name}</span>
        </Space>
      }
      placement="right"
      width={600}
      onClose={onClose}
      open={visible}
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Job Posting */}
        {applicant.jobPostingTitle && (
          <Card size="small" title="Applied For">
            <Text strong>{applicant.jobPostingTitle}</Text>
          </Card>
        )}

        {/* Contact Information */}
        <Card size="small" title="Contact Information">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {applicant.email && (
              <Space>
                <MailOutlined />
                <a href={`mailto:${applicant.email}`}>{applicant.email}</a>
              </Space>
            )}
            {applicant.phone && (
              <Space>
                <PhoneOutlined />
                <a href={`tel:${applicant.phone}`}>{applicant.phone}</a>
              </Space>
            )}
            {applicant.linkedinUrl && (
              <Space>
                <LinkedinOutlined />
                <a href={applicant.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  LinkedIn Profile
                </a>
              </Space>
            )}
            {applicant.location && (
              <Space>
                <EnvironmentOutlined />
                <Text>{applicant.location}</Text>
              </Space>
            )}
          </Space>
        </Card>

        {/* Professional Information */}
        <Card size="small" title="Professional Information">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <UserOutlined />
              <Text strong>{applicant.currentRole}</Text>
            </Space>
            {applicant.currentCompany && (
              <Text type="secondary" style={{ marginLeft: 24 }}>
                {applicant.currentCompany}
              </Text>
            )}
            {applicant.yearsExperience > 0 && (
              <Text type="secondary" style={{ marginLeft: 24 }}>
                {applicant.yearsExperience} years of experience
              </Text>
            )}
          </Space>
        </Card>

        {/* Skills */}
        {applicant.skills && applicant.skills.length > 0 && (
          <Card size="small" title="Skills">
            <Space wrap size={[8, 8]}>
              {applicant.skills.map((skill, index) => (
                <Tag key={index} color="blue">
                  {skill}
                </Tag>
              ))}
            </Space>
          </Card>
        )}

        {/* Education */}
        {applicant.education && (
          <Card size="small" title="Education">
            <Space>
              <FileTextOutlined />
              <Text>{applicant.education}</Text>
            </Space>
          </Card>
        )}

        {/* Summary */}
        {applicant.summary && (
          <Card size="small" title="Summary">
            <Paragraph>{applicant.summary}</Paragraph>
          </Card>
        )}

        {/* AI Analysis Section */}
        {applicant.fitScore !== undefined || applicant.aiAnalysis ? (
          <Card size="small" title="AI Analysis">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Fit Score */}
              {applicant.fitScore !== undefined && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong>Overall Fit Score</Text>
                    <Text strong style={{ fontSize: 18 }}>
                      {applicant.fitScore}/100
                    </Text>
                  </div>
                  <Progress
                    percent={applicant.fitScore}
                    status={getFitScoreColor(applicant.fitScore) as any}
                    strokeColor={
                      applicant.fitScore >= 80
                        ? '#52c41a'
                        : applicant.fitScore >= 60
                        ? '#1890ff'
                        : applicant.fitScore >= 40
                        ? '#faad14'
                        : '#ff4d4f'
                    }
                  />
                  <Text type="secondary">{getFitScoreLabel(applicant.fitScore)}</Text>
                </div>
              )}

              {/* Strengths */}
              {applicant.aiAnalysis?.strengths && applicant.aiAnalysis.strengths.length > 0 && (
                <div>
                  <Title level={5}>
                    <ThunderboltOutlined /> Strengths
                  </Title>
                  <List
                    size="small"
                    dataSource={applicant.aiAnalysis.strengths}
                    renderItem={(item) => (
                      <List.Item>
                        <Text>{item}</Text>
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {/* Concerns */}
              {applicant.aiAnalysis?.concerns && applicant.aiAnalysis.concerns.length > 0 && (
                <div>
                  <Title level={5}>
                    <WarningOutlined /> Concerns
                  </Title>
                  <List
                    size="small"
                    dataSource={applicant.aiAnalysis.concerns}
                    renderItem={(item) => (
                      <List.Item>
                        <Text type="secondary">{item}</Text>
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {/* Reasoning */}
              {applicant.aiAnalysis?.reasoning && (
                <div>
                  <Title level={5}>Analysis</Title>
                  <Paragraph>{applicant.aiAnalysis.reasoning}</Paragraph>
                </div>
              )}

              {/* Offer Recommendation */}
              {applicant.aiAnalysis?.recommendedOffer && (
                <Card size="small" title={<><DollarOutlined /> Recommended Offer</>} style={{ background: '#f6ffed' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Salary Range: </Text>
                      <Text>
                        {formatSalary(applicant.aiAnalysis.recommendedOffer.salaryMin)} -{' '}
                        {formatSalary(applicant.aiAnalysis.recommendedOffer.salaryMax)}
                      </Text>
                    </div>
                    <div>
                      <Text strong>Recommended: </Text>
                      <Text style={{ fontSize: 16, color: '#52c41a' }}>
                        {formatSalary(applicant.aiAnalysis.recommendedOffer.salaryRecommended)}
                      </Text>
                    </div>
                    {applicant.aiAnalysis.recommendedOffer.title && (
                      <div>
                        <Text strong>Title: </Text>
                        <Text>{applicant.aiAnalysis.recommendedOffer.title}</Text>
                      </div>
                    )}
                    {applicant.aiAnalysis.recommendedOffer.benefits &&
                      applicant.aiAnalysis.recommendedOffer.benefits.length > 0 && (
                        <div>
                          <Text strong>Benefits: </Text>
                          <Space wrap>
                            {applicant.aiAnalysis.recommendedOffer.benefits.map((benefit, index) => (
                              <Tag key={index}>{benefit}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                    {applicant.aiAnalysis.recommendedOffer.startDateSuggestion && (
                      <div>
                        <Text strong>Suggested Start Date: </Text>
                        <Text>{applicant.aiAnalysis.recommendedOffer.startDateSuggestion}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              )}
            </Space>
          </Card>
        ) : (
          <Alert
            message="No AI Analysis Available"
            description="Click 'Analyze Candidate' to generate an AI-powered fit analysis and offer recommendation."
            type="info"
            showIcon
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => onAnalyze?.(applicant.id)}
                loading={analyzing}
              >
                Analyze Candidate
              </Button>
            }
          />
        )}
      </Space>
    </Drawer>
  );
};

export default ApplicantDetailPanel;


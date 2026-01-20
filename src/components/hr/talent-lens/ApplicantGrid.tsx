import React from 'react';
import { Row, Col, Empty } from 'antd';
import { Applicant } from './types';
import ApplicantCard from './ApplicantCard';

interface ApplicantGridProps {
  applicants: Applicant[];
  onApplicantClick: (applicant: Applicant) => void;
  loading?: boolean;
}

const ApplicantGrid: React.FC<ApplicantGridProps> = ({
  applicants,
  onApplicantClick,
  loading = false,
}) => {
  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={i}>
            <div style={{ height: 300, background: '#f0f0f0', borderRadius: 8 }} />
          </Col>
        ))}
      </Row>
    );
  }

  if (applicants.length === 0) {
    return (
      <Empty
        description="No applicants found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: '60px 0' }}
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {applicants.map((applicant) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={applicant.id}>
          <ApplicantCard
            applicant={applicant}
            onClick={() => onApplicantClick(applicant)}
          />
        </Col>
      ))}
    </Row>
  );
};

export default ApplicantGrid;

















































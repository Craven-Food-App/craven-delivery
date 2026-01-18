import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { DashboardStats } from './types';

const { Text } = Typography;

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Total Applicants"
            value={stats.totalApplicants}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="New Applicants"
            value={stats.newApplicants}
            prefix={<UserAddOutlined />}
            valueStyle={{ color: '#52c41a' }}
            suffix={
              stats.trendUp !== undefined && (
                <span style={{ fontSize: 14, marginLeft: 8 }}>
                  {stats.trendUp ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                </span>
              )
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Shortlisted"
            value={stats.shortlisted}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Offers Extended"
            value={stats.offersExtended}
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatsCards;





































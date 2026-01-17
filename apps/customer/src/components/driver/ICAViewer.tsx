import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export const ICAViewer: React.FC = () => {
  return (
    <Card
      title={
        <Space>
          <FileTextOutlined style={{ color: '#ff7a00' }} />
          <Text strong style={{ fontSize: '18px' }}>
            Crave'n Inc. Feeder Independent Contractor Agreement
          </Text>
        </Space>
      }
      style={{
        borderRadius: '12px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Title level={3} style={{ color: '#ff7a00', marginBottom: '4px' }}>
            CRAVE'N INC.
          </Title>
          <Text strong style={{ fontSize: '16px' }}>
            Feeder Independent Contractor Agreement & Terms Addendum
          </Text>
          <br />
          <Text type="secondary">Effective: October 29, 2025</Text>
        </div>

        <Divider />

        {/* Section 1 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            1. Introduction
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            This Crave'n Feeder Independent Contractor Agreement & Terms Addendum ("Agreement") is entered
            into between Crave'n Inc. ("Crave'n") and the individual applying to perform delivery services ("Feeder").
            By accepting this Agreement electronically, Feeder agrees to the terms contained herein. This Agreement
            is incorporated into the Crave'n Terms of Service and Privacy Policy.
          </Paragraph>
        </div>

        {/* Section 2 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            2. Independent Contractor Status
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders operate as independent contractors, not employees or agents of Crave'n. Feeders determine their
            own schedules and methods of delivery. Nothing in this Agreement creates an employment, partnership,
            or joint-venture relationship. Feeders are responsible for: (a) providing and maintaining their own vehicles
            and equipment; (b) paying all taxes, insurance, fuel, and expenses; and (c) complying with all laws.
          </Paragraph>
        </div>

        {/* Section 3 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            3. Eligibility
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders must: (a) be at least 18 years old; (b) hold a valid driver's license and maintain insurance and
            registration; (c) pass a background check and motor vehicle record review; and (d) maintain an active
            Crave'n Feeder App account.
          </Paragraph>
        </div>

        {/* Section 4 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            4. Compensation
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders are compensated per completed delivery according to Crave'n's pay model, which may include
            base pay, customer tips, promotions, bonuses, and incentives. All payments are made through approved
            third-party payment processors. Crave'n is not responsible for transfer delays caused by external
            processors or incorrect payout details.
          </Paragraph>
        </div>

        {/* Section 5 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            5. Taxes
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders are solely responsible for reporting and paying applicable income and self-employment taxes.
            Crave'n may issue an IRS Form 1099 as required by law.
          </Paragraph>
        </div>

        {/* Section 6 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            6. Conduct & Standards
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders must perform deliveries safely and professionally, follow all traffic laws, and treat customers and
            merchants with respect. Repeated complaints, unsafe behavior, or fraud may result in account
            deactivation.
          </Paragraph>
        </div>

        {/* Section 7 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            7. Insurance & Liability
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Feeders must maintain required vehicle insurance. Crave'n assumes no liability for damages, accidents, or
            injuries occurring during deliveries.
          </Paragraph>
        </div>

        {/* Section 8 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            8. Dispute Resolution
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Any disputes arising from this Agreement shall be resolved through binding arbitration administered by the
            American Arbitration Association (AAA) in Toledo, Ohio, under applicable rules. Class actions are waived.
          </Paragraph>
        </div>

        {/* Section 9 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            9. Termination
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            Either party may terminate this Agreement at any time. Outstanding payments will be made in the next
            payout cycle.
          </Paragraph>
        </div>

        {/* Section 10 */}
        <div>
          <Title level={4} style={{ color: '#262626', marginBottom: '8px' }}>
            10. Acknowledgment & Signature (Digital)
          </Title>
          <Paragraph style={{ fontSize: '14px', lineHeight: '1.6' }}>
            By selecting "I Agree", Feeder confirms they understand and accept this Agreement.
          </Paragraph>
        </div>

        <Divider />

        {/* Contact Information */}
        <div style={{ 
          background: '#f0f9ff', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #91d5ff'
        }}>
          <Title level={5} style={{ margin: 0, marginBottom: '8px', color: '#1890ff' }}>
            Contact
          </Title>
          <Text style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            <strong>Crave'n Inc.</strong>
          </Text>
          <Text style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            1121 W Sylvania Ave., Toledo, OH 43612
          </Text>
          <Text style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Email: customerservice@cravenusa.com | privacy@craven.com
          </Text>
          <Text style={{ fontSize: '13px', display: 'block' }}>
            Phone: 216-435-0821
          </Text>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            © 2025 Crave'n Inc. All Rights Reserved.
          </Text>
        </div>
      </Space>
    </Card>
  );
};


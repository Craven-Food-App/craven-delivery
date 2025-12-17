import React from 'react';
import { ConfigProvider, Layout, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { executiveTheme } from '@/config/antd-theme';
import ArticlesOfIncorporationGenerator from '@/components/board/ArticlesOfIncorporationGenerator';
import cravenLogo from '@/assets/craven-logo.png';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ArticlesGeneratorPortal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ConfigProvider theme={executiveTheme}>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* Header */}
        <Header
          style={{
            background: '#ffffff',
            padding: '0 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            height: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={cravenLogo}
              alt="Crave'N"
              style={{ height: 36, width: 'auto' }}
            />
            <div style={{ borderLeft: '1px solid #e5e7eb', height: 32 }} />
            <div>
              <Title level={4} style={{ margin: 0, color: '#111827', fontSize: 18 }}>
                <FileTextOutlined style={{ marginRight: 8, color: '#eb2f96' }} />
                Articles Generator
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Technology Department • Document Generation
              </Text>
            </div>
          </div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/hub')}
              style={{
                borderColor: '#d1d5db',
                color: '#374151',
              }}
            >
              Back to Hub
            </Button>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: '24px',
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <ArticlesOfIncorporationGenerator />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default ArticlesGeneratorPortal;


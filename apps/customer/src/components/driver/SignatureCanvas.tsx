// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Button, Card, Space, Typography, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import SignatureCanvas from 'react-signature-canvas';

const { Text } = Typography;

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  disabled?: boolean;
}

export const DriverSignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, disabled = false }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setSaved(false);
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }

    const dataUrl = sigCanvas.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      setSaved(true);
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
  };

  return (
    <Card
      style={{
        borderRadius: '12px',
        border: '2px solid #ff7a00',
        background: '#fff'
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '16px', color: '#262626' }}>
            Sign Below
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Use your mouse or touch screen to draw your signature
          </Text>
        </div>

        {saved && (
          <Alert
            message="Signature Captured"
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
          />
        )}

        <div 
          style={{ 
            border: '2px dashed #d9d9d9',
            borderRadius: '8px',
            background: saved ? '#f6ffed' : '#fafafa',
            padding: '8px',
            position: 'relative'
          }}
        >
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              style: {
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: 'white',
                cursor: disabled ? 'not-allowed' : 'crosshair'
              }
            }}
            onEnd={handleEnd}
            disabled={disabled || saved}
          />
          
          {isEmpty && !saved && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                color: '#bfbfbf',
                fontSize: '14px'
              }}
            >
              <EditOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
              Sign here
            </div>
          )}
        </div>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button 
            icon={<DeleteOutlined />}
            onClick={clear}
            disabled={disabled || saved}
          >
            Clear
          </Button>
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={save}
            disabled={isEmpty || disabled || saved}
            style={{
              background: isEmpty ? '#d9d9d9' : '#ff7a00',
              borderColor: isEmpty ? '#d9d9d9' : '#ff7a00'
            }}
          >
            {saved ? 'Signature Saved' : 'Save Signature'}
          </Button>
        </Space>

        <Alert
          message="Legal Notice"
          description="By signing, you agree that this electronic signature has the same legal effect as a handwritten signature."
          type="info"
          showIcon
          style={{ fontSize: '12px' }}
        />
      </Space>
    </Card>
  );
};


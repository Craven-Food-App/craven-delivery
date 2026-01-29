import React from 'react';
import { Burger, Button, Group } from '@mantine/core';
import { IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CompanyHeaderProps {
  opened?: boolean;
  onToggle?: () => void;
  portalName?: string;
  userEmail?: string;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  opened = false,
  onToggle,
  portalName = 'Company Portal',
  userEmail = '',
}) => {
  const navigate = useNavigate();

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/hub');
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        height: 60,
        minHeight: 60,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        {onToggle && (
          <Burger
            opened={opened}
            onClick={onToggle}
            hiddenFrom="sm"
            size="sm"
            style={{ marginRight: 12 }}
          />
        )}
        <div
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: '#FF6B35',
            marginRight: 16,
            whiteSpace: 'nowrap',
          }}
        >
          Crave'n
        </div>
        <div
          style={{
            borderLeft: '1px solid #e5e7eb',
            height: 24,
            marginRight: 16,
          }}
        />
        <div
          style={{
            fontSize: 14,
            color: '#6b7280',
            marginRight: 16,
            whiteSpace: 'nowrap',
          }}
        >
          {portalName}
        </div>
        <div
          style={{
            borderLeft: '1px solid #e5e7eb',
            height: 24,
            marginRight: 16,
          }}
        />
        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1f2937',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {userEmail.split('@')[0] || 'Corporate User'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            Corporate HQ
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginLeft: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#FF6B35',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {userEmail.charAt(0).toUpperCase() || 'C'}
        </div>
        <Button
          onClick={handleBackToHub}
          leftSection={<IconHome size={14} />}
          variant="light"
          style={{
            color: '#FF6B35',
            height: 32,
            fontSize: 12,
            padding: '0 14px',
            borderRadius: 4,
          }}
        >
          Back to Hub
        </Button>
        <Button
          onClick={handleSignOut}
          variant="outline"
          style={{
            borderColor: '#d1d5db',
            color: '#374151',
            height: 32,
            fontSize: 12,
            padding: '0 14px',
            borderRadius: 4,
            background: '#ffffff',
          }}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};


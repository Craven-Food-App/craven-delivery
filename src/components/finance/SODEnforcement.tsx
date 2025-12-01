import React from 'react';
import { Alert, Text, Group, Badge } from '@mantine/core';
import { IconAlertTriangle, IconShield } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface SODViolationProps {
  violations: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  onDismiss?: () => void;
}

/**
 * Segregation of Duties Violation Alert Component
 * Displays SOD violations when detected
 */
export const SODViolationAlert: React.FC<SODViolationProps> = ({ 
  violations, 
  severity = 'high',
  onDismiss 
}) => {
  const colorMap = {
    low: 'gray',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };

  if (violations.length === 0) return null;

  return (
    <Alert
      icon={<IconShield size={16} />}
      title={`Segregation of Duties Violation${violations.length > 1 ? 's' : ''} Detected`}
      color={colorMap[severity]}
      withCloseButton={!!onDismiss}
      onClose={onDismiss}
      mb="md"
    >
      <Text size="sm" mb="xs">
        The following segregation of duties rules are being violated:
      </Text>
      <Group gap="xs" mt="xs">
        {violations.map((violation, idx) => (
          <Badge key={idx} color={colorMap[severity]} variant="filled">
            {violation}
          </Badge>
        ))}
      </Group>
      <Text size="sm" mt="md" c="dimmed">
        This action cannot be completed. Please contact your supervisor or system administrator.
      </Text>
    </Alert>
  );
};

/**
 * SOD Check Wrapper Component
 * Wraps actions to check for SOD violations before allowing execution
 */
interface SODCheckWrapperProps {
  permissionCodes: string[];
  onViolation?: (violations: string[]) => void;
  children: (hasViolation: boolean, violations: string[]) => React.ReactNode;
}

export const SODCheckWrapper: React.FC<SODCheckWrapperProps> = ({
  permissionCodes,
  onViolation,
  children,
}) => {
  const [violations, setViolations] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    checkSOD();
  }, [permissionCodes]);

  const checkSOD = async () => {
    if (permissionCodes.length === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call SOD check function
      const { data, error } = await supabase.rpc('check_sod_violation', {
        p_user_id: user.id,
        p_permission_codes: permissionCodes,
      });

      if (error) throw error;

      if (data) {
        // Fetch violation details
        const { data: violationDetails } = await supabase
          .from('sod_rules')
          .select('rule_name, violation_severity')
          .eq('is_active', true)
          .eq('enforcement_level', 'hard')
          .limit(10);

        const violationNames = violationDetails?.map(v => v.rule_name) || [];
        setViolations(violationNames);

        if (violationNames.length > 0 && onViolation) {
          onViolation(violationNames);
        }
      } else {
        setViolations([]);
      }
    } catch (error) {
      console.error('Error checking SOD:', error);
    } finally {
      setLoading(false);
    }
  };

  return <>{children(violations.length > 0, violations)}</>;
};


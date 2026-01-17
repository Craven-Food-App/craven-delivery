// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Descriptions, Button, InputNumber, Form, message,
  Typography, Alert, Space, Divider
} from 'antd';
import { CalculatorOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { calculateFinalCompensation, type FinalCompensation } from '@/utils/exitWorkflowUtils';
import { processFinalPayroll } from '@/utils/exitWorkflowPayroll';
import { generateTerminationLetter, generateFinalSettlementStatement } from '@/utils/exitWorkflowDocuments';
import { sendTerminationNotice } from '@/utils/exitWorkflowNotifications';

const { Title, Text } = Typography;

interface Props {
  workflowId: string;
  employeeId: string;
  effectiveDate: string;
  terminationType?: string;
  onUpdate: () => void;
}

export const FinalSettlementStep: React.FC<Props> = ({
  workflowId,
  employeeId,
  effectiveDate,
  terminationType,
  onUpdate
}) => {
  const [compensation, setCompensation] = useState<FinalCompensation | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [workflow, setWorkflow] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWorkflow();
  }, [workflowId]);

  const fetchWorkflow = async () => {
    const { data } = await supabase
      .from('exit_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();
    
    if (data) {
      setWorkflow(data);
      if (data.final_compensation) {
        // Load existing compensation data
        setCompensation({
          accruedSalary: data.final_compensation || 0,
          unusedPTO: data.unused_pto_days || 0,
          ptoPayout: data.pto_payout || 0,
          severance: data.severance_amount || 0,
          proRatedBonus: 0,
          total: (data.final_compensation || 0) + (data.pto_payout || 0) + (data.severance_amount || 0),
        });
      }
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const values = form.getFieldsValue();
      const severanceMonths = values.severance_months || 0;

      const calc = await calculateFinalCompensation(
        employeeId,
        effectiveDate,
        severanceMonths
      );

      setCompensation(calc);
      message.success('Compensation calculated');
    } catch (error: any) {
      message.error(error.message || 'Failed to calculate compensation');
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveSettlement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!compensation) {
        message.error('Please calculate compensation first');
        return;
      }

      // Get severance months from form
      const severanceMonths = form.getFieldValue('severance_months') || 0;

      // Process final payroll
      const payrollResult = await processFinalPayroll(
        workflowId,
        employeeId,
        effectiveDate,
        severanceMonths
      );

      if (!payrollResult.success) {
        message.error(payrollResult.error || 'Failed to process payroll');
        return;
      }

      // Generate documents
      const terminationLetter = await generateTerminationLetter(workflowId, employeeId);
      const settlementStatement = await generateFinalSettlementStatement(workflowId);

      if (terminationLetter) {
        message.success('Termination letter generated');
      }

      // Send termination notice email
      const { data: employee } = await supabase
        .from('employees')
        .select('email, first_name, last_name')
        .eq('id', employeeId)
        .single();

      if (employee) {
        const workflowData = await supabase
          .from('exit_workflows')
          .select('termination_reason')
          .eq('id', workflowId)
          .single();
        
        await sendTerminationNotice(
          workflowId,
          employee.email,
          `${employee.first_name} ${employee.last_name}`,
          effectiveDate,
          terminationType || 'without_cause',
          workflowData?.data?.termination_reason
        );
      }

      // Update workflow status to final_settlement
      await supabase
        .from('exit_workflows')
        .update({
          status: 'final_settlement',
          final_compensation: compensation.total,
          severance_amount: compensation.severance,
          unused_pto_days: compensation.unusedPTO,
          pto_payout: compensation.ptoPayout,
          final_pay_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      // Mark calculate_settlement step as completed
      await supabase
        .from('exit_workflow_steps')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: `Final settlement: $${compensation.total.toLocaleString()}`,
        })
        .eq('workflow_id', workflowId)
        .eq('step_name', 'calculate_settlement');

      message.success('Final settlement processed and documents generated');
      fetchWorkflow();
      onUpdate();
    } catch (error: any) {
      message.error(error.message || 'Failed to save settlement');
      console.error(error);
    }
  };

  return (
    <div>
      <Alert
        message="Final Settlement"
        description="Calculate and record the final compensation including accrued salary, unused PTO, and severance (if applicable)."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="severance_months"
            label="Severance (Months)"
            tooltip="Enter number of months of severance pay (if applicable)"
          >
            <InputNumber
              min={0}
              max={24}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleCalculate}
              loading={calculating}
              block
            >
              Calculate Final Compensation
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {compensation && (
        <Card>
          <Title level={4}>Compensation Breakdown</Title>
          <Divider />
          
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Accrued Salary">
              <Text strong>${compensation.accruedSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Unused PTO Days">
              {compensation.unusedPTO.toFixed(1)} days
            </Descriptions.Item>
            <Descriptions.Item label="PTO Payout">
              <Text strong>${compensation.ptoPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Severance">
              <Text strong>${compensation.severance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Pro-Rated Bonus">
              ${compensation.proRatedBonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Descriptions.Item>
            <Descriptions.Item label="Total Final Compensation">
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                ${compensation.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSaveSettlement}
              size="large"
            >
              Save Final Settlement
            </Button>
            <Button onClick={handleCalculate}>
              Recalculate
            </Button>
          </Space>
        </Card>
      )}

      {workflow?.final_compensation && (
        <Card style={{ marginTop: 16 }}>
          <Alert
            message="Settlement Already Recorded"
            description={`Final settlement has been calculated and saved. Total: $${workflow.final_compensation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            type="success"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};


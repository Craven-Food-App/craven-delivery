import React, { useEffect, useState } from 'react';
import { Stack, Title, Loader, Center } from '@mantine/core';
import { trainingRepository } from '@/lib/cxo/repositories/trainingRepository';
import { ProgressSummary } from './ProgressSummary';
import { TrainingTimeline } from './TrainingTimeline';
import { CxoTrainingAudit } from '@/types/cxo-training';
import { supabase } from '@/integrations/supabase/client';

const CxoTrainingProgress: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<CxoTrainingAudit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [summaryData, auditData] = await Promise.all([
        trainingRepository.getProgressSummary(user.id),
        trainingRepository.getAuditLogByUserId(user.id, 100),
      ]);

      setSummary(summaryData);
      setAuditLog(auditData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  const overallProgress = summary
    ? Math.round(
        ((summary.completedModules + summary.completedLessons) /
          (summary.totalModules + summary.totalLessons)) *
          100
      )
    : 0;

  return (
    <Stack gap="lg">
      <Title order={2}>Training Progress</Title>

      {summary && (
        <ProgressSummary
          summary={{
            ...summary,
            overallProgress,
          }}
        />
      )}

      <TrainingTimeline auditLog={auditLog} />
    </Stack>
  );
};

export default CxoTrainingProgress;


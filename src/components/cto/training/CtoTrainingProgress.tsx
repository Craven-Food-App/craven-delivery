import React, { useEffect, useState } from 'react';
import { Stack, Title, Loader, Center } from '@mantine/core';
import { ctoTrainingRepository } from '@/lib/cto/repositories/ctoTrainingRepository';
import { ProgressSummary } from './ProgressSummary';
import { TrainingTimeline } from './TrainingTimeline';
import { CtoTrainingAudit } from '@/types/cto-training';
import { supabase } from '@/integrations/supabase/client';

const CtoTrainingProgress: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<CtoTrainingAudit[]>([]);
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
        ctoTrainingRepository.getProgressSummary(user.id),
        ctoTrainingRepository.getAuditLogByUserId(user.id, 100),
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

export default CtoTrainingProgress;



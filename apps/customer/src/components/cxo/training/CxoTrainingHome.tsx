import React, { useEffect, useState } from 'react';
import { Stack, Title, Text, Button, Group, Loader, Center, Alert, Card } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { trainingRepository } from '@/lib/cxo/repositories/trainingRepository';
import { CxoTrainingModule, CxoTrainingProgress } from '@/types/cxo-training';
import { TrainingModuleCard } from './TrainingModuleCard';
import { ProgressSummary } from './ProgressSummary';
import { IconArrowRight, IconBook } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

const CxoTrainingHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<CxoTrainingModule[]>([]);
  const [progress, setProgress] = useState<CxoTrainingProgress[]>([]);
  const [summary, setSummary] = useState<any>(null);
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

      const [modulesData, progressData, summaryData] = await Promise.all([
        trainingRepository.getAllModules(),
        trainingRepository.getProgressByUserId(user.id),
        trainingRepository.getProgressSummary(user.id),
      ]);

      setModules(modulesData);
      setProgress(progressData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: string) => {
    return progress.find((p) => p.moduleId === moduleId && !p.lessonId);
  };

  const getModuleWithProgress = (module: CxoTrainingModule) => {
    const moduleProgress = getModuleProgress(module.id);
    const lessons = []; // We'll load this separately if needed
    return {
      ...module,
      progress: moduleProgress,
      lessonsCount: 0, // TODO: Load from lessons
      completedLessonsCount: 0, // TODO: Calculate from progress
    };
  };

  const handleStartModule = (moduleId: string) => {
    navigate(`/cxo/training/modules/${moduleId}`);
  };

  const handleContinueModule = (moduleId: string) => {
    navigate(`/cxo/training/modules/${moduleId}`);
  };

  const handleReviewModule = (moduleId: string) => {
    navigate(`/cxo/training/modules/${moduleId}`);
  };

  const handleStartTraining = () => {
    // Find first incomplete module
    const incompleteModule = modules.find((m) => {
      const prog = getModuleProgress(m.id);
      return !prog || prog.status !== 'completed';
    });

    if (incompleteModule) {
      navigate(`/cxo/training/modules/${incompleteModule.id}`);
    } else {
      // All modules complete, go to first module
      navigate(`/cxo/training/modules/${modules[0]?.id}`);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Hero Section */}
      <Card padding="xl" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack gap="md">
          <Group gap="sm">
            <IconBook size={32} color="white" />
            <Title order={1} c="white">
              CXO Training & Enablement
            </Title>
          </Group>
          <Text c="white" size="lg" maw={600}>
            Welcome to the CXO Command Center training program. Complete these modules to master
            the CXO Portal and become fully operational in your role.
          </Text>
          <Button
            size="lg"
            leftSection={<IconArrowRight size={20} />}
            onClick={handleStartTraining}
            variant="white"
            color="white"
          >
            Start Training
          </Button>
        </Stack>
      </Card>

      {/* Progress Summary */}
      {summary && <ProgressSummary summary={summary} />}

      {/* Module List */}
      <div>
        <Title order={2} mb="md">
          Training Modules
        </Title>
        <Stack gap="md">
          {modules.length === 0 ? (
            <Alert color="orange" title="Training System Setup Required">
              <Text size="sm" mb="xs">
                The training database tables have not been created yet. To enable the training system:
              </Text>
              <Text size="sm" component="ol" style={{ paddingLeft: '20px' }}>
                <li>Run the migration: <code>20250131000009_create_cxo_training_schema.sql</code></li>
                <li>Refresh this page after the migration completes</li>
              </Text>
            </Alert>
          ) : (
            modules.map((module) => (
              <TrainingModuleCard
                key={module.id}
                module={getModuleWithProgress(module)}
                onStart={() => handleStartModule(module.id)}
                onContinue={() => handleContinueModule(module.id)}
                onReview={() => handleReviewModule(module.id)}
              />
            ))
          )}
        </Stack>
      </div>
    </Stack>
  );
};

export default CxoTrainingHome;


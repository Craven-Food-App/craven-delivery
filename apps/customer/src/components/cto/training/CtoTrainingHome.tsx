import React, { useEffect, useState } from 'react';
import { Stack, Title, Text, Button, Group, Loader, Center, Alert, Card } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ctoTrainingRepository } from '@/lib/cto/repositories/ctoTrainingRepository';
import { CtoTrainingModule, CtoTrainingProgress } from '@/types/cto-training';
import { TrainingModuleCard } from './TrainingModuleCard';
import { ProgressSummary } from './ProgressSummary';
import { IconArrowRight, IconBook } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

const CtoTrainingHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<CtoTrainingModule[]>([]);
  const [progress, setProgress] = useState<CtoTrainingProgress[]>([]);
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
        ctoTrainingRepository.getAllModules(),
        ctoTrainingRepository.getProgressByUserId(user.id),
        ctoTrainingRepository.getProgressSummary(user.id),
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

  const [modulesWithProgress, setModulesWithProgress] = useState<any[]>([]);

  useEffect(() => {
    if (modules.length > 0 && progress.length >= 0) {
      loadModulesWithProgress();
    }
  }, [modules, progress]);

  const loadModulesWithProgress = async () => {
    const modulesWithProg = await Promise.all(
      modules.map(async (module) => {
        const moduleProgress = getModuleProgress(module.id);
        const lessons = await ctoTrainingRepository.getLessonsByModuleId(module.id);
        const completedLessons = progress.filter(
          (p) => p.lessonId && lessons.some((l) => l.id === p.lessonId) && p.status === 'completed'
        ).length;
        
        return {
          ...module,
          progress: moduleProgress,
          lessonsCount: lessons.length,
          completedLessonsCount: completedLessons,
        };
      })
    );
    setModulesWithProgress(modulesWithProg);
  };

  const handleStartModule = (moduleId: string) => {
    navigate(`/cto/training/modules/${moduleId}`);
  };

  const handleContinueModule = (moduleId: string) => {
    navigate(`/cto/training/modules/${moduleId}`);
  };

  const handleReviewModule = (moduleId: string) => {
    navigate(`/cto/training/modules/${moduleId}`);
  };

  const handleStartTraining = () => {
    // Find first incomplete module
    const incompleteModule = modules.find((m) => {
      const prog = getModuleProgress(m.id);
      return !prog || prog.status !== 'completed';
    });

    if (incompleteModule) {
      navigate(`/cto/training/modules/${incompleteModule.id}`);
    } else if (modules.length > 0) {
      // All modules complete, go to first module
      navigate(`/cto/training/modules/${modules[0].id}`);
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
      <Card padding="xl" withBorder style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}>
        <Stack gap="md">
          <Group gap="sm">
            <IconBook size={32} color="white" />
            <Title order={1} c="white">
              CTO Training & Enablement
            </Title>
          </Group>
          <Text c="white" size="lg" maw={600}>
            Welcome to the CTO Portal training program. This comprehensive guide will walk you through
            every aspect of your portal, from infrastructure management to team oversight. Complete
            these modules to master the CTO Command Center and become fully operational in your role.
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
                <li>Run the migration: <code>20250131000016_create_cto_training_schema.sql</code></li>
                <li>Run the seed migration to add training content</li>
                <li>Refresh this page after the migration completes</li>
              </Text>
            </Alert>
          ) : modulesWithProgress.length > 0 ? (
            modulesWithProgress.map((module) => (
              <TrainingModuleCard
                key={module.id}
                module={module}
                onStart={() => handleStartModule(module.id)}
                onContinue={() => handleContinueModule(module.id)}
                onReview={() => handleReviewModule(module.id)}
              />
            ))
          ) : (
            modules.map((module) => {
              const moduleWithProgress = {
                ...module,
                progress: getModuleProgress(module.id),
                lessonsCount: 0,
                completedLessonsCount: 0,
              };
              return (
                <TrainingModuleCard
                  key={module.id}
                  module={moduleWithProgress}
                  onStart={() => handleStartModule(module.id)}
                  onContinue={() => handleContinueModule(module.id)}
                  onReview={() => handleReviewModule(module.id)}
                />
              );
            })
          )}
        </Stack>
      </div>
    </Stack>
  );
};

export default CtoTrainingHome;


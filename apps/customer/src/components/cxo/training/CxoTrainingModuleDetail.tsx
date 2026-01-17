import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Title, Text, Button, Group, Loader, Center, Card, Badge } from '@mantine/core';
import { trainingRepository } from '@/lib/cxo/repositories/trainingRepository';
import { CxoTrainingModule, CxoTrainingLesson, CxoTrainingProgress } from '@/types/cxo-training';
import { LessonListItem } from './LessonListItem';
import { IconArrowLeft, IconClock, IconExternalLink, IconArrowRight } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

const CxoTrainingModuleDetail: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<CxoTrainingModule | null>(null);
  const [lessons, setLessons] = useState<CxoTrainingLesson[]>([]);
  const [progress, setProgress] = useState<CxoTrainingProgress[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (moduleId) {
      loadData();
    }
  }, [moduleId]);

  const loadData = async () => {
    if (!moduleId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [moduleData, lessonsData, progressData] = await Promise.all([
        trainingRepository.getModuleById(moduleId),
        trainingRepository.getLessonsByModuleId(moduleId),
        trainingRepository.getProgressByUserId(user.id),
      ]);

      setModule(moduleData);
      setLessons(lessonsData);
      setProgress(progressData);

      // Mark module as started if not already
      const moduleProgress = progressData.find((p) => p.moduleId === moduleId && !p.lessonId);
      if (!moduleProgress) {
        await trainingRepository.upsertProgress(user.id, moduleId, null, {
          status: 'in_progress',
          lastAccessedAt: new Date().toISOString(),
        });
        await trainingRepository.createAuditEntry(user.id, 'module_started', moduleId, null);
      }
    } catch (error) {
      console.error('Error loading module data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLessonProgress = (lessonId: string) => {
    return progress.find((p) => p.lessonId === lessonId);
  };

  const handleStartLesson = (lessonId: string) => {
    navigate(`/cxo/training/lessons/${lessonId}`);
  };

  const handleContinueLesson = (lessonId: string) => {
    navigate(`/cxo/training/lessons/${lessonId}`);
  };

  const handleReviewLesson = (lessonId: string) => {
    navigate(`/cxo/training/lessons/${lessonId}`);
  };

  const handleStartFromFirst = () => {
    const firstLesson = lessons[0];
    if (firstLesson) {
      navigate(`/cxo/training/lessons/${firstLesson.id}`);
    }
  };

  const handleResume = () => {
    const incompleteLesson = lessons.find((lesson) => {
      const prog = getLessonProgress(lesson.id);
      return !prog || prog.status !== 'completed';
    });
    if (incompleteLesson) {
      navigate(`/cxo/training/lessons/${incompleteLesson.id}`);
    } else {
      handleStartFromFirst();
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!module) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Text>Module not found</Text>
      </Center>
    );
  }

  const completedLessons = lessons.filter((l) => {
    const prog = getLessonProgress(l.id);
    return prog?.status === 'completed';
  }).length;

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cxo/training')}>
          Back to Training
        </Button>
      </Group>

      {/* Module Header */}
      <Card padding="lg" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2} mb="xs">
              {module.title}
            </Title>
            <Text c="dimmed">{module.description}</Text>
          </div>
          <Group gap="md">
            <Group gap={4}>
              <IconClock size={16} />
              <Text size="sm">{module.estimatedMinutes} min</Text>
            </Group>
            {module.associatedRoute && (
              <Group gap={4}>
                <IconExternalLink size={16} />
                <Text size="sm" c="blue">
                  Covers: {module.associatedRoute}
                </Text>
              </Group>
            )}
            <Badge>
              {completedLessons} / {lessons.length} lessons completed
            </Badge>
          </Group>
          <Group>
            <Button leftSection={<IconArrowRight size={16} />} onClick={handleStartFromFirst}>
              Start from First Lesson
            </Button>
            <Button variant="light" onClick={handleResume}>
              Resume
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Lessons List */}
      <div>
        <Title order={3} mb="md">
          Lessons
        </Title>
        <Stack gap="md">
          {lessons.length === 0 ? (
            <Card padding="lg" withBorder>
              <Text c="dimmed" ta="center">
                No lessons available for this module yet.
              </Text>
            </Card>
          ) : (
            lessons.map((lesson) => (
              <LessonListItem
                key={lesson.id}
                lesson={lesson}
                progress={getLessonProgress(lesson.id)}
                onStart={() => handleStartLesson(lesson.id)}
                onContinue={() => handleContinueLesson(lesson.id)}
                onReview={() => handleReviewLesson(lesson.id)}
              />
            ))
          )}
        </Stack>
      </div>
    </Stack>
  );
};

export default CxoTrainingModuleDetail;


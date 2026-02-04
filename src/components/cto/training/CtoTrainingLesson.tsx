// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Loader,
  Center,
  Card,
  Badge,
  Divider,
} from '@mantine/core';
import { ctoTrainingRepository } from '@/lib/cto/repositories/ctoTrainingRepository';
import { CtoTrainingLessonWithDetails, CtoTrainingProgress } from '@/types/cto-training';
import { StepChecklist } from './StepChecklist';
import { QuizQuestion } from './QuizQuestion';
import { IconArrowLeft, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

// Simple markdown renderer (basic implementation)
const renderMarkdown = (markdown: string) => {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'ordered' | 'unordered' | null = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('## ')) {
      if (currentList.length > 0) {
        elements.push(renderList(currentList, listType!));
        currentList = [];
        listType = null;
      }
      elements.push(
        <Title key={index} order={3} mt="md" mb="sm">
          {trimmed.substring(3)}
        </Title>
      );
    } else if (trimmed.startsWith('### ')) {
      if (currentList.length > 0) {
        elements.push(renderList(currentList, listType!));
        currentList = [];
        listType = null;
      }
      elements.push(
        <Title key={index} order={4} mt="md" mb="sm">
          {trimmed.substring(4)}
        </Title>
      );
    }
    // Ordered list
    else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ordered') {
        if (currentList.length > 0 && listType) {
          elements.push(renderList(currentList, listType));
        }
        currentList = [];
        listType = 'ordered';
      }
      currentList.push(trimmed.replace(/^\d+\.\s/, ''));
    }
    // Unordered list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'unordered') {
        if (currentList.length > 0 && listType) {
          elements.push(renderList(currentList, listType));
        }
        currentList = [];
        listType = 'unordered';
      }
      currentList.push(trimmed.substring(2));
    }
    // Note/Warning callouts
    else if (trimmed.startsWith('Note:') || trimmed.startsWith('⚠')) {
      if (currentList.length > 0 && listType) {
        elements.push(renderList(currentList, listType));
        currentList = [];
        listType = null;
      }
      elements.push(
        <Card key={index} padding="sm" bg="blue.0" withBorder mt="sm" mb="sm">
          <Text size="sm">{trimmed}</Text>
        </Card>
      );
    }
    // Regular paragraph
    else if (trimmed) {
      if (currentList.length > 0 && listType) {
        elements.push(renderList(currentList, listType));
        currentList = [];
        listType = null;
      }
      elements.push(
        <Text key={index} size="sm" mt="xs" mb="xs">
          {trimmed}
        </Text>
      );
    } else {
      if (currentList.length > 0 && listType) {
        elements.push(renderList(currentList, listType));
        currentList = [];
        listType = null;
      }
      elements.push(<br key={index} />);
    }
  });

  if (currentList.length > 0 && listType) {
    elements.push(renderList(currentList, listType));
  }

  return <div>{elements}</div>;
};

const renderList = (items: string[], type: 'ordered' | 'unordered') => {
  if (type === 'ordered') {
    return (
      <ol key={`list-${Math.random()}`} style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
        {items.map((item, idx) => (
          <li key={idx}>
            <Text size="sm">{item}</Text>
          </li>
        ))}
      </ol>
    );
  } else {
    return (
      <ul key={`list-${Math.random()}`} style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
        {items.map((item, idx) => (
          <li key={idx}>
            <Text size="sm">{item}</Text>
          </li>
        ))}
      </ul>
    );
  }
};

const CtoTrainingLesson: React.FC = () => {
  const { lessonId: paramLessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract lessonId from URL if not in params (for CTO Portal routing)
  const lessonId = paramLessonId || location.pathname.split('/training/lessons/')[1]?.split('/')[0] || null;
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<CtoTrainingLessonWithDetails | null>(null);
  const [progress, setProgress] = useState<CtoTrainingProgress | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadData();
    }
  }, [lessonId]);

  const loadData = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [lessonData, progressData] = await Promise.all([
        ctoTrainingRepository.getLessonWithDetails(lessonId),
        ctoTrainingRepository.getProgressForLesson(user.id, lessonId),
      ]);

      setLesson(lessonData);
      setProgress(progressData);
      setCompletedSteps(progressData?.completedSteps || []);

      // Mark lesson as started if not already
      if (!progressData) {
        await ctoTrainingRepository.upsertProgress(user.id, lessonData?.moduleId || null, lessonId, {
          status: 'in_progress',
          lastAccessedAt: new Date().toISOString(),
        });
        await ctoTrainingRepository.createAuditEntry(
          user.id,
          'lesson_started',
          lessonData?.moduleId || null,
          lessonId
        );
      } else {
        await ctoTrainingRepository.upsertProgress(user.id, lessonData?.moduleId || null, lessonId, {
          lastAccessedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error loading lesson data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepToggle = async (stepId: string, completed: boolean) => {
    if (!userId || !lessonId) return;

    let newCompletedSteps = [...completedSteps];
    if (completed) {
      if (!newCompletedSteps.includes(stepId)) {
        newCompletedSteps.push(stepId);
      }
    } else {
      newCompletedSteps = newCompletedSteps.filter((id) => id !== stepId);
    }

    setCompletedSteps(newCompletedSteps);
    await ctoTrainingRepository.markStepCompleted(userId, lessonId, stepId);
    await ctoTrainingRepository.createAuditEntry(userId, 'step_completed', lesson?.moduleId || null, lessonId, {
      stepId,
    });

    // Check if all required steps are completed
    const requiredSteps = lesson?.steps.filter((s) => s.isRequired) || [];
    const allRequiredCompleted = requiredSteps.every((s) => newCompletedSteps.includes(s.id));

    if (allRequiredCompleted && requiredSteps.length > 0) {
      notifications.show({
        title: 'Great Progress!',
        message: 'All required steps completed. You can mark this lesson as complete.',
        color: 'green',
      });
    }
  };

  const handleQuizAnswerChange = (quizId: string, answer: any) => {
    setQuizAnswers((prev) => ({ ...prev, [quizId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!userId || !lesson) return;

    let correctCount = 0;
    lesson.quizzes.forEach((quiz) => {
      const userAnswer = quizAnswers[quiz.id];
      if (userAnswer && JSON.stringify(userAnswer) === JSON.stringify(quiz.correctAnswer)) {
        correctCount++;
      }
    });

    const score = lesson.quizzes.length > 0 ? (correctCount / lesson.quizzes.length) * 100 : 0;

    await ctoTrainingRepository.upsertProgress(user.id, lesson.moduleId, lesson.id, {
      quizScore: score,
    });

    await ctoTrainingRepository.createAuditEntry(user.id, 'quiz_submitted', lesson.moduleId, lesson.id, {
      score,
      correctCount,
      totalQuestions: lesson.quizzes.length,
    });

    setShowQuizResults(true);
    notifications.show({
      title: 'Quiz Submitted',
      message: `You scored ${score.toFixed(0)}%`,
      color: score >= 70 ? 'green' : 'orange',
    });
  };

  const handleCompleteLesson = async () => {
    if (!userId || !lesson) return;

    const success = await ctoTrainingRepository.upsertProgress(user.id, lesson.moduleId, lesson.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    if (success) {
      await ctoTrainingRepository.createAuditEntry(user.id, 'lesson_completed', lesson.moduleId, lesson.id);
      notifications.show({
        title: 'Lesson Completed!',
        message: 'Great work! You have completed this lesson.',
        color: 'green',
      });
      // Navigate back to module
      navigate(`/cto/training/modules/${lesson.moduleId}`);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!lesson) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Text>Lesson not found</Text>
      </Center>
    );
  }

  const requiredSteps = lesson.steps.filter((s) => s.isRequired);
  const allRequiredCompleted = requiredSteps.every((s) => completedSteps.includes(s.id));

  return (
    <Stack gap="lg">
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(`/cto/training/modules/${lesson.moduleId}`)}
        >
          Back to Module
        </Button>
      </Group>

      {/* Lesson Header */}
      <Card padding="lg" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2} mb="xs">
              {lesson.title}
            </Title>
            {lesson.subtitle && <Text c="dimmed">{lesson.subtitle}</Text>}
          </div>
          <Group gap="md">
            {lesson.associatedRoute && (
              <Group gap={4}>
                <IconExternalLink size={16} />
                <Text size="sm" c="blue">
                  Related to: {lesson.associatedRoute}
                </Text>
              </Group>
            )}
            <Badge>{lesson.estimatedMinutes} min</Badge>
            {progress?.status === 'completed' && (
              <Badge color="green" leftSection={<IconCheck size={14} />}>
                Completed
              </Badge>
            )}
          </Group>
        </Stack>
      </Card>

      {/* Content */}
      <Card padding="lg" withBorder>
        <Title order={3} mb="md">
          Lesson Content
        </Title>
        {renderMarkdown(lesson.contentMarkdown)}
      </Card>

      {/* Steps Checklist */}
      {lesson.steps.length > 0 && (
        <Card padding="lg" withBorder>
          <StepChecklist
            steps={lesson.steps}
            completedStepIds={completedSteps}
            onStepToggle={handleStepToggle}
          />
        </Card>
      )}

      {/* Quiz */}
      {lesson.quizzes.length > 0 && (
        <Card padding="lg" withBorder>
          <Title order={3} mb="md">
            Knowledge Check
          </Title>
          <Stack gap="md">
            {lesson.quizzes.map((quiz) => (
              <QuizQuestion
                key={quiz.id}
                quiz={quiz}
                userAnswer={quizAnswers[quiz.id]}
                onAnswerChange={(answer) => handleQuizAnswerChange(quiz.id, answer)}
                showResult={showQuizResults}
                readonly={showQuizResults}
              />
            ))}
            {!showQuizResults && (
              <Button onClick={handleSubmitQuiz} disabled={lesson.quizzes.some((q) => !quizAnswers[q.id])}>
                Submit Quiz
              </Button>
            )}
          </Stack>
        </Card>
      )}

      {/* Complete Lesson Button */}
      {allRequiredCompleted && progress?.status !== 'completed' && (
        <Card padding="lg" withBorder bg="green.0">
          <Group justify="space-between">
            <div>
              <Text fw={500} c="green" mb="xs">
                All required steps completed!
              </Text>
              <Text size="sm" c="dimmed">
                Mark this lesson as complete to continue.
              </Text>
            </div>
            <Button leftSection={<IconCheck size={16} />} onClick={handleCompleteLesson} color="green">
              Mark as Complete
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
};

export default CtoTrainingLesson;


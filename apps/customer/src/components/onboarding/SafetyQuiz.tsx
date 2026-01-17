import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Radio, Progress, Stack, Text, Group, Box, Loader, Center, Badge } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Shield, CheckCircle, XCircle } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  section: string;
  display_order: number;
}

const TOTAL_POINTS = 25;
const REQUIRED_POINTS = 24; // 95% of 25

export const SafetyQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      setAnswers(new Array(questions.length).fill(''));
    }
  }, [questions]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_quiz_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data as QuizQuestion[]);
      } else {
        toast({
          title: "Error",
          description: "No quiz questions found. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = () => {
    let totalPointsEarned = 0;
    
    questions.forEach((question, index) => {
      if (answers[index] === question.correct_answer) {
        totalPointsEarned += question.points;
      }
    });

    const percentage = (totalPointsEarned / TOTAL_POINTS) * 100;
    const passed = totalPointsEarned >= REQUIRED_POINTS;
    
    setShowResults(true);

    if (!passed) {
      toast({
        title: "Try Again",
        description: `You scored ${totalPointsEarned}/${TOTAL_POINTS} points (${percentage.toFixed(0)}%). You need ${REQUIRED_POINTS} points (95%) to pass.`,
        variant: "destructive",
      });
    }
  };

  const completeTask = async () => {
    let totalPointsEarned = 0;
    
    questions.forEach((question, index) => {
      if (answers[index] === question.correct_answer) {
        totalPointsEarned += question.points;
      }
    });

    const passed = totalPointsEarned >= REQUIRED_POINTS;

    if (!passed) {
      toast({
        title: "Quiz Not Passed",
        description: `You scored ${totalPointsEarned}/${TOTAL_POINTS} points. You need ${REQUIRED_POINTS} points (95%) to complete this required task.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!application) return;

      const { data: task } = await supabase
        .from('onboarding_tasks')
        .select('id')
        .eq('driver_id', application.id)
        .in('task_key', ['pass_safety_quiz', 'safety_quiz'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (task) {
        const { error: completeError } = await supabase.functions.invoke('complete-onboarding-task', {
          body: {
            task_id: task.id,
            driver_id: application.id,
          },
        });

        if (completeError) {
          throw completeError;
        }
      }

      toast({
        title: "Safety Quiz Passed! 🎉",
        description: `Congratulations! You scored ${totalPointsEarned}/${TOTAL_POINTS} points.`,
      });

      setTimeout(() => navigate('/enhanced-onboarding'), 2000);
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setCurrentQuestion(0);
    setAnswers(new Array(questions.length).fill(''));
    setShowResults(false);
  };

  const getTotalPointsEarned = () => {
    let total = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correct_answer) {
        total += question.points;
      }
    });
    return total;
  };

  const getCurrentQuestion = () => questions[currentQuestion];
  const currentQ = getCurrentQuestion();

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
        <Center style={{ height: '100vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="#ff7a00" />
            <Text c="dimmed">Loading quiz questions...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (questions.length === 0) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
        <Center style={{ height: '100vh' }}>
          <Card p="xl">
            <Text c="dimmed" ta="center">
              No quiz questions available. Please contact support.
            </Text>
          </Card>
        </Center>
      </Box>
    );
  }

  const totalPointsEarned = getTotalPointsEarned();
  const percentage = (totalPointsEarned / TOTAL_POINTS) * 100;
  const passed = totalPointsEarned >= REQUIRED_POINTS;

  if (showResults) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
        <Box style={{ maxWidth: 672, margin: '0 auto' }}>
          <Card>
            <Stack gap="lg" p="lg">
              <Group gap="xs">
                {passed ? (
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                ) : (
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                )}
                <Text fw={600} size="lg">
                  {passed ? 'Quiz Passed!' : 'Quiz Failed'}
                </Text>
              </Group>
              <Box ta="center">
                <Text fw={700} size="3xl" mb="xs" c={passed ? '#22c55e' : '#ef4444'}>
                  {totalPointsEarned}/{TOTAL_POINTS}
                </Text>
                <Text size="lg" c="dimmed" mb="xs">
                  {percentage.toFixed(0)}% - {passed ? 'Passed!' : 'Not Passed'}
                </Text>
                <Badge color={passed ? 'green' : 'red'} size="lg">
                  Need {REQUIRED_POINTS} points (95%) to pass
                </Badge>
              </Box>

              {passed ? (
                <>
                  <Card p="md" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }}>
                    <Text fw={500} c="#166534" ta="center">
                      Excellent work! You've demonstrated strong safety knowledge. Redirecting...
                    </Text>
                  </Card>
                  {!submitting && (
                    <Button onClick={completeTask} fullWidth color="#ff7a00" loading={submitting}>
                      Complete Task
                    </Button>
                  )}
                </>
              ) : (
                <Card p="md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
                  <Text c="#991b1b" ta="center">
                    You need at least {REQUIRED_POINTS} points (95%) to pass. Please review the questions and try again.
                  </Text>
                </Card>
              )}

              {!passed && (
                <Button onClick={retakeQuiz} fullWidth color="#ff7a00">
                  Retake Quiz
                </Button>
              )}
            </Stack>
          </Card>
        </Box>
      </Box>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const options = currentQ ? [
    { label: 'A', value: 'A' as const, text: currentQ.option_a },
    { label: 'B', value: 'B' as const, text: currentQ.option_b },
    { label: 'C', value: 'C' as const, text: currentQ.option_c },
    { label: 'D', value: 'D' as const, text: currentQ.option_d },
  ] : [];

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
      <Box style={{ maxWidth: 672, margin: '0 auto' }}>
        <Button
          variant="subtle"
          onClick={() => navigate('/enhanced-onboarding')}
          mb="md"
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Onboarding
        </Button>

        <Card>
          <Stack gap="lg" p="lg">
            <div>
              <Group gap="xs" mb="md" justify="space-between">
                <Group gap="xs">
                  <Shield size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                  <Text fw={600} size="lg">
                    Safety Quiz - Question {currentQuestion + 1} of {questions.length}
                  </Text>
                </Group>
                {currentQ && (
                  <Badge color="blue" variant="light">
                    {currentQ.points} {currentQ.points === 1 ? 'point' : 'points'}
                  </Badge>
                )}
              </Group>
              <Progress value={progress} size="sm" color="blue" mb="xs" />
              <Text size="sm" c="dimmed">
                Total: {TOTAL_POINTS} points | Need {REQUIRED_POINTS} points (95%) to pass
              </Text>
            </div>

            {currentQ && (
              <>
                <div>
                  <Text fw={500} size="lg" mb="md">
                    {currentQ.question_text}
                  </Text>

                  <Radio.Group
                    value={answers[currentQuestion] || ''}
                    onChange={(value) => handleAnswer(value as 'A' | 'B' | 'C' | 'D')}
                  >
                    <Stack gap="md">
                      {options.map((option) => (
                        <Card
                          key={option.value}
                          withBorder
                          p="md"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleAnswer(option.value)}
                        >
                          <Group>
                            <Radio value={option.value} />
                            <Text style={{ flex: 1 }}>
                              <Text component="span" fw={600}>{option.label}. </Text>
                              {option.text}
                            </Text>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </Radio.Group>
                </div>

                <Group gap="md" mt="md">
                  <Button
                    onClick={handleBack}
                    disabled={currentQuestion === 0}
                    variant="outline"
                    style={{ flex: 1 }}
                    leftSection={<ArrowLeft size={16} />}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!answers[currentQuestion]}
                    style={{ flex: 1 }}
                    color="#ff7a00"
                    rightSection={<ArrowRight size={16} />}
                  >
                    {currentQuestion === questions.length - 1 ? 'Submit Quiz' : 'Next'}
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};

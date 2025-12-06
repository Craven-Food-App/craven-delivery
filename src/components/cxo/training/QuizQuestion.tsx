import React, { useState } from 'react';
import { Stack, Radio, Checkbox, TextInput, Text, Card, Button, Group, Alert } from '@mantine/core';
import { CxoTrainingQuiz } from '@/types/cxo-training';
import { IconCheck, IconX } from '@tabler/icons-react';

interface QuizQuestionProps {
  quiz: CxoTrainingQuiz;
  userAnswer?: any;
  onAnswerChange: (answer: any) => void;
  showResult?: boolean;
  readonly?: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  quiz,
  userAnswer,
  onAnswerChange,
  showResult = false,
  readonly = false,
}) => {
  const isCorrect = showResult && userAnswer && JSON.stringify(userAnswer) === JSON.stringify(quiz.correctAnswer);

  const renderQuestion = () => {
    switch (quiz.questionType) {
      case 'multiple_choice':
        return (
          <Radio.Group
            value={userAnswer || ''}
            onChange={(value) => onAnswerChange(value)}
            disabled={readonly}
          >
            <Stack gap="sm" mt="sm">
              {quiz.options?.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  disabled={readonly}
                />
              ))}
            </Stack>
          </Radio.Group>
        );

      case 'true_false':
        return (
          <Radio.Group
            value={userAnswer?.toString() || ''}
            onChange={(value) => onAnswerChange(value === 'true')}
            disabled={readonly}
          >
            <Stack gap="sm" mt="sm">
              <Radio value="true" label="True" disabled={readonly} />
              <Radio value="false" label="False" disabled={readonly} />
            </Stack>
          </Radio.Group>
        );

      case 'short_answer':
        return (
          <TextInput
            value={userAnswer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Enter your answer"
            disabled={readonly}
            mt="sm"
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card padding="lg" withBorder>
      <Stack gap="md">
        <div>
          <Text fw={600} size="sm" c="dimmed" mb="xs">
            Question
          </Text>
          <Text fw={500}>{quiz.question}</Text>
        </div>

        {renderQuestion()}

        {showResult && (
          <Alert
            color={isCorrect ? 'green' : 'red'}
            icon={isCorrect ? <IconCheck size={16} /> : <IconX size={16} />}
          >
            {isCorrect ? (
              <Text size="sm">Correct! Well done.</Text>
            ) : (
              <Stack gap="xs">
                <Text size="sm">Incorrect. The correct answer is:</Text>
                <Text size="sm" fw={500}>
                  {typeof quiz.correctAnswer === 'object'
                    ? JSON.stringify(quiz.correctAnswer)
                    : quiz.correctAnswer?.toString()}
                </Text>
              </Stack>
            )}
          </Alert>
        )}
      </Stack>
    </Card>
  );
};


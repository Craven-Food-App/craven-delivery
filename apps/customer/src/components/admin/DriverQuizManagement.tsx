import React, { useState, useEffect } from 'react';
import { Card, Button, TextInput, Select, Stack, Group, Text, Box, Table, Badge, Modal, ActionIcon, NumberInput } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash, ArrowUp, ArrowDown, Save, X } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  section: 'basic_operations' | 'safety_procedures';
  display_order: number;
  is_active: boolean;
}

export const DriverQuizManagement: React.FC = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<QuizQuestion>>({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    points: 1,
    section: 'basic_operations',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_quiz_questions')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setQuestions((data as QuizQuestion[]) || []);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz questions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingQuestion) {
        // Update existing
        const { error } = await supabase
          .from('driver_quiz_questions')
          .update({
            ...formData,
            updated_by: user?.id,
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Question updated successfully.",
        });
      } else {
        // Create new
        const maxOrder = questions.length > 0 
          ? Math.max(...questions.map(q => q.display_order)) 
          : 0;
        
        const { error } = await supabase
          .from('driver_quiz_questions')
          .insert([{
            question_text: formData.question_text!,
            option_a: formData.option_a!,
            option_b: formData.option_b!,
            option_c: formData.option_c!,
            option_d: formData.option_d!,
            correct_answer: formData.correct_answer!,
            points: formData.points!,
            section: formData.section!,
            display_order: maxOrder + 1,
            is_active: formData.is_active!,
            updated_by: user?.id,
          }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Question added successfully.",
        });
      }

      setEditingQuestion(null);
      setShowAddModal(false);
      setFormData({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        points: 1,
        section: 'basic_operations',
        display_order: 0,
        is_active: true,
      });
      await loadQuestions();
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save question.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('driver_quiz_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Question deleted successfully.",
      });
      await loadQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (question: QuizQuestion) => {
    try {
      const { error } = await supabase
        .from('driver_quiz_questions')
        .update({ is_active: !question.is_active })
        .eq('id', question.id);

      if (error) throw error;
      await loadQuestions();
    } catch (error: any) {
      console.error('Error toggling active:', error);
      toast({
        title: "Error",
        description: "Failed to update question status.",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (question: QuizQuestion, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === question.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const otherQuestion = questions[newIndex];
    
    try {
      // Swap display orders
      await supabase
        .from('driver_quiz_questions')
        .update({ display_order: otherQuestion.display_order })
        .eq('id', question.id);

      await supabase
        .from('driver_quiz_questions')
        .update({ display_order: question.display_order })
        .eq('id', otherQuestion.id);

      await loadQuestions();
    } catch (error: any) {
      console.error('Error reordering:', error);
      toast({
        title: "Error",
        description: "Failed to reorder questions.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      points: question.points,
      section: question.section,
      display_order: question.display_order,
      is_active: question.is_active,
    });
  };

  const totalPoints = questions.filter(q => q.is_active).reduce((sum, q) => sum + q.points, 0);

  return (
    <Box>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="xl">Driver Quiz Management</Text>
            <Text size="sm" c="dimmed">
              Manage quiz questions for driver onboarding. Total active points: {totalPoints}/25
            </Text>
          </div>
          <Button
            onClick={() => {
              setShowAddModal(true);
              setEditingQuestion(null);
              setFormData({
                question_text: '',
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: '',
                correct_answer: 'A',
                points: 1,
                section: 'basic_operations',
                display_order: 0,
                is_active: true,
              });
            }}
            leftSection={<Plus size={16} />}
            color="#ff7a00"
          >
            Add Question
          </Button>
        </Group>

        <Card>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Question</Table.Th>
                <Table.Th>Section</Table.Th>
                <Table.Th>Points</Table.Th>
                <Table.Th>Correct</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {questions.map((question, index) => (
                <Table.Tr key={question.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleReorder(question, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={14} />
                      </ActionIcon>
                      <Text size="sm">{question.display_order}</Text>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleReorder(question, 'down')}
                        disabled={index === questions.length - 1}
                      >
                        <ArrowDown size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {question.question_text}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={question.section === 'basic_operations' ? 'blue' : 'orange'}
                      variant="light"
                    >
                      {question.section === 'basic_operations' ? 'Basic Ops' : 'Safety'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green">{question.points}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="violet">{question.correct_answer}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={question.is_active ? 'green' : 'gray'}>
                      {question.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => startEdit(question)}
                        color="blue"
                      >
                        <Edit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleToggleActive(question)}
                        color={question.is_active ? 'orange' : 'green'}
                      >
                        {question.is_active ? <X size={14} /> : <Plus size={14} />}
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleDelete(question.id)}
                        color="red"
                      >
                        <Trash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          opened={showAddModal || editingQuestion !== null}
          onClose={() => {
            setShowAddModal(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Edit Question' : 'Add New Question'}
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Question Text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              required
            />

            <TextInput
              label="Option A"
              value={formData.option_a}
              onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
              required
            />

            <TextInput
              label="Option B"
              value={formData.option_b}
              onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
              required
            />

            <TextInput
              label="Option C"
              value={formData.option_c}
              onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
              required
            />

            <TextInput
              label="Option D"
              value={formData.option_d}
              onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
              required
            />

            <Select
              label="Correct Answer"
              value={formData.correct_answer}
              onChange={(value) => setFormData({ ...formData, correct_answer: value as 'A' | 'B' | 'C' | 'D' })}
              data={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
              ]}
              required
            />

            <NumberInput
              label="Points"
              value={formData.points}
              onChange={(value) => setFormData({ ...formData, points: Number(value) || 1 })}
              min={1}
              max={2}
              required
            />

            <Select
              label="Section"
              value={formData.section}
              onChange={(value) => setFormData({ ...formData, section: value as 'basic_operations' | 'safety_procedures' })}
              data={[
                { value: 'basic_operations', label: 'Basic Operations' },
                { value: 'safety_procedures', label: 'Safety & Procedures' },
              ]}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingQuestion(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} leftSection={<Save size={16} />} color="#ff7a00">
                {editingQuestion ? 'Update' : 'Add'} Question
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
};


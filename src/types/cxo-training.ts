export interface CxoTrainingModule {
  id: string;
  key: string;
  title: string;
  description: string;
  orderIndex: number;
  estimatedMinutes: number;
  associatedRoute: string | null;
  createdAt: string;
}

export interface CxoTrainingLesson {
  id: string;
  moduleId: string;
  title: string;
  subtitle: string | null;
  contentMarkdown: string;
  associatedRoute: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  createdAt: string;
}

export interface CxoTrainingStep {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  relatedUiKey: string | null;
  orderIndex: number;
  isRequired: boolean;
  createdAt: string;
}

export interface QuizOption {
  value: string;
  label: string;
}

export interface CxoTrainingQuiz {
  id: string;
  lessonId: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options: QuizOption[] | null;
  correctAnswer: any; // JSONB - can be string, array, boolean, etc.
  orderIndex: number;
  createdAt: string;
}

export type TrainingProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CxoTrainingProgress {
  id: string;
  userId: string;
  moduleId: string | null;
  lessonId: string | null;
  status: TrainingProgressStatus;
  completedSteps: string[] | null; // Array of step IDs
  quizScore: number | null;
  lastAccessedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type TrainingAuditEventType =
  | 'module_started'
  | 'module_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_submitted'
  | 'step_completed';

export interface CxoTrainingAudit {
  id: string;
  userId: string;
  eventType: TrainingAuditEventType;
  moduleId: string | null;
  lessonId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

// Extended types with relationships
export interface CxoTrainingModuleWithProgress extends CxoTrainingModule {
  progress?: CxoTrainingProgress;
  lessonsCount?: number;
  completedLessonsCount?: number;
}

export interface CxoTrainingLessonWithDetails extends CxoTrainingLesson {
  steps: CxoTrainingStep[];
  quizzes: CxoTrainingQuiz[];
  progress?: CxoTrainingProgress;
}

export interface TrainingProgressSummary {
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  totalEstimatedMinutes: number;
  completedEstimatedMinutes: number;
  overallProgress: number; // 0-100
}


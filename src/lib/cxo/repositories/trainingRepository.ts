import { supabase } from '@/integrations/supabase/client';
import {
  CxoTrainingModule,
  CxoTrainingLesson,
  CxoTrainingStep,
  CxoTrainingQuiz,
  CxoTrainingProgress,
  CxoTrainingAudit,
  CxoTrainingModuleWithProgress,
  CxoTrainingLessonWithDetails,
  TrainingProgressStatus,
} from '@/types/cxo-training';

export const trainingRepository = {
  // =====================================================
  // MODULES
  // =====================================================
  async getAllModules(): Promise<CxoTrainingModule[]> {
    const { data, error } = await supabase
      .from('cxo_training_modules')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Training tables not found. Please run migration: 20250131000009_create_cxo_training_schema.sql');
        return [];
      }
      console.error('Error fetching training modules:', error);
      return [];
    }

    return (data || []).map(this.mapModule);
  },

  async getModuleById(id: string): Promise<CxoTrainingModule | null> {
    const { data, error } = await supabase
      .from('cxo_training_modules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('CXO Training tables not found. Please run migration: 20250131000009_create_cxo_training_schema.sql');
        return null;
      }
      console.error('Error fetching training module:', error);
      return null;
    }

    return data ? this.mapModule(data) : null;
  },

  async getModuleByKey(key: string): Promise<CxoTrainingModule | null> {
    const { data, error } = await supabase
      .from('cxo_training_modules')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('CXO Training tables not found. Please run migration: 20250131000009_create_cxo_training_schema.sql');
        return null;
      }
      console.error('Error fetching training module by key:', error);
      return null;
    }

    return data ? this.mapModule(data) : null;
  },

  // =====================================================
  // LESSONS
  // =====================================================
  async getLessonsByModuleId(moduleId: string): Promise<CxoTrainingLesson[]> {
    const { data, error } = await supabase
      .from('cxo_training_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('CXO Training tables not found. Please run migration: 20250131000009_create_cxo_training_schema.sql');
        return [];
      }
      console.error('Error fetching training lessons:', error);
      return [];
    }

    return (data || []).map(this.mapLesson);
  },

  async getLessonById(id: string): Promise<CxoTrainingLesson | null> {
    const { data, error } = await supabase
      .from('cxo_training_lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching training lesson:', error);
      return null;
    }

    return data ? this.mapLesson(data) : null;
  },

  async getLessonWithDetails(id: string): Promise<CxoTrainingLessonWithDetails | null> {
    const lesson = await this.getLessonById(id);
    if (!lesson) return null;

    const [steps, quizzes] = await Promise.all([
      this.getStepsByLessonId(id),
      this.getQuizzesByLessonId(id),
    ]);

    return {
      ...lesson,
      steps,
      quizzes,
    };
  },

  // =====================================================
  // STEPS
  // =====================================================
  async getStepsByLessonId(lessonId: string): Promise<CxoTrainingStep[]> {
    const { data, error } = await supabase
      .from('cxo_training_steps')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching training steps:', error);
      return [];
    }

    return (data || []).map(this.mapStep);
  },

  // =====================================================
  // QUIZZES
  // =====================================================
  async getQuizzesByLessonId(lessonId: string): Promise<CxoTrainingQuiz[]> {
    const { data, error } = await supabase
      .from('cxo_training_quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching training quizzes:', error);
      return [];
    }

    return (data || []).map(this.mapQuiz);
  },

  // =====================================================
  // PROGRESS
  // =====================================================
  async getProgressByUserId(userId: string): Promise<CxoTrainingProgress[]> {
    const { data, error } = await supabase
      .from('cxo_training_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('CXO Training tables not found. Please run migration: 20250131000009_create_cxo_training_schema.sql');
        return [];
      }
      console.error('Error fetching training progress:', error);
      return [];
    }

    return (data || []).map(this.mapProgress);
  },

  async getProgressForModule(userId: string, moduleId: string): Promise<CxoTrainingProgress | null> {
    const { data, error } = await supabase
      .from('cxo_training_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .is('lesson_id', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching module progress:', error);
      return null;
    }

    return data ? this.mapProgress(data) : null;
  },

  async getProgressForLesson(userId: string, lessonId: string): Promise<CxoTrainingProgress | null> {
    const { data, error } = await supabase
      .from('cxo_training_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching lesson progress:', error);
      return null;
    }

    return data ? this.mapProgress(data) : null;
  },

  async upsertProgress(
    userId: string,
    moduleId: string | null,
    lessonId: string | null,
    updates: Partial<CxoTrainingProgress>
  ): Promise<boolean> {
    const updateData: any = {
      user_id: userId,
      module_id: moduleId,
      lesson_id: lessonId,
    };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.completedSteps !== undefined) updateData.completed_steps = updates.completedSteps;
    if (updates.quizScore !== undefined) updateData.quiz_score = updates.quizScore;
    if (updates.lastAccessedAt !== undefined) updateData.last_accessed_at = updates.lastAccessedAt;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

    const { error } = await supabase
      .from('cxo_training_progress')
      .upsert(updateData, {
        onConflict: 'user_id,module_id,lesson_id',
      });

    if (error) {
      console.error('Error upserting training progress:', error);
      return false;
    }

    return true;
  },

  async markStepCompleted(userId: string, lessonId: string, stepId: string): Promise<boolean> {
    const progress = await this.getProgressForLesson(userId, lessonId);
    const completedSteps = progress?.completedSteps || [];
    
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    return await this.upsertProgress(userId, null, lessonId, {
      completedSteps,
      status: 'in_progress',
      lastAccessedAt: new Date().toISOString(),
    });
  },

  // =====================================================
  // AUDIT
  // =====================================================
  async createAuditEntry(
    userId: string,
    eventType: CxoTrainingAudit['eventType'],
    moduleId: string | null,
    lessonId: string | null,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const { error } = await supabase.from('cxo_training_audit').insert({
      user_id: userId,
      event_type: eventType,
      module_id: moduleId,
      lesson_id: lessonId,
      metadata: metadata || null,
    });

    if (error) {
      console.error('Error creating audit entry:', error);
      return false;
    }

    return true;
  },

  async getAuditLogByUserId(userId: string, limit: number = 50): Promise<CxoTrainingAudit[]> {
    const { data, error } = await supabase
      .from('cxo_training_audit')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return (data || []).map(this.mapAudit);
  },

  // =====================================================
  // SUMMARY / STATS
  // =====================================================
  async getProgressSummary(userId: string): Promise<{
    totalModules: number;
    completedModules: number;
    totalLessons: number;
    completedLessons: number;
    totalEstimatedMinutes: number;
    completedEstimatedMinutes: number;
  }> {
    const [modules, lessonsResult, progress] = await Promise.all([
      this.getAllModules(),
      supabase
        .from('cxo_training_lessons')
        .select('id, module_id, estimated_minutes')
        .then(({ data, error }) => {
          if (error && error.code === 'PGRST205') {
            return [];
          }
          return data || [];
        }),
      this.getProgressByUserId(userId),
    ]);

    const lessons = lessonsResult;

    const completedModules = progress.filter(
      (p) => p.moduleId && !p.lessonId && p.status === 'completed'
    ).length;

    const completedLessons = progress.filter(
      (p) => p.lessonId && p.status === 'completed'
    ).length;

    const totalEstimatedMinutes =
      modules.reduce((sum, m) => sum + m.estimatedMinutes, 0) +
      lessons.reduce((sum: number, l: any) => sum + (l.estimated_minutes || 0), 0);

    const completedEstimatedMinutes = progress
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => {
        if (p.moduleId && !p.lessonId) {
          const module = modules.find((m) => m.id === p.moduleId);
          return sum + (module?.estimatedMinutes || 0);
        }
        if (p.lessonId) {
          const lesson = lessons.find((l: any) => l.id === p.lessonId);
          return sum + (lesson?.estimated_minutes || 0);
        }
        return sum;
      }, 0);

    return {
      totalModules: modules.length,
      completedModules,
      totalLessons: lessons.length,
      completedLessons,
      totalEstimatedMinutes,
      completedEstimatedMinutes,
    };
  },

  // =====================================================
  // MAPPERS
  // =====================================================
  mapModule(data: any): CxoTrainingModule {
    return {
      id: data.id,
      key: data.key,
      title: data.title,
      description: data.description,
      orderIndex: data.order_index,
      estimatedMinutes: data.estimated_minutes,
      associatedRoute: data.associated_route,
      createdAt: data.created_at,
    };
  },

  mapLesson(data: any): CxoTrainingLesson {
    return {
      id: data.id,
      moduleId: data.module_id,
      title: data.title,
      subtitle: data.subtitle,
      contentMarkdown: data.content_markdown,
      associatedRoute: data.associated_route,
      orderIndex: data.order_index,
      estimatedMinutes: data.estimated_minutes,
      createdAt: data.created_at,
    };
  },

  mapStep(data: any): CxoTrainingStep {
    return {
      id: data.id,
      lessonId: data.lesson_id,
      title: data.title,
      description: data.description,
      relatedUiKey: data.related_ui_key,
      orderIndex: data.order_index,
      isRequired: data.is_required,
      createdAt: data.created_at,
    };
  },

  mapQuiz(data: any): CxoTrainingQuiz {
    return {
      id: data.id,
      lessonId: data.lesson_id,
      question: data.question,
      questionType: data.question_type,
      options: data.options,
      correctAnswer: data.correct_answer,
      orderIndex: data.order_index,
      createdAt: data.created_at,
    };
  },

  mapProgress(data: any): CxoTrainingProgress {
    return {
      id: data.id,
      userId: data.user_id,
      moduleId: data.module_id,
      lessonId: data.lesson_id,
      status: data.status,
      completedSteps: data.completed_steps || [],
      quizScore: data.quiz_score,
      lastAccessedAt: data.last_accessed_at,
      completedAt: data.completed_at,
      createdAt: data.created_at,
    };
  },

  mapAudit(data: any): CxoTrainingAudit {
    return {
      id: data.id,
      userId: data.user_id,
      eventType: data.event_type,
      moduleId: data.module_id,
      lessonId: data.lesson_id,
      metadata: data.metadata,
      createdAt: data.created_at,
    };
  },
};


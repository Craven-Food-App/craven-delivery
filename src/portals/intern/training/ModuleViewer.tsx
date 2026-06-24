import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileText,
  Video,
  Target,
  Award,
  AlertCircle,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { TrainingModule, ModuleProgress, DeliveryType } from '@/types/internTraining';
import { formatDuration } from '@/types/internTraining';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ContentSection {
  id: string;
  title: string;
  content: string;
  duration_minutes: number;
  quiz?: QuizQuestion[];
}

interface ModuleViewerProps {
  module: TrainingModule;
  progress: ModuleProgress | null;
  onClose: () => void;
  onProgressUpdate: (progress: Partial<ModuleProgress>) => void;
  onComplete: (score: number) => void;
}

// Generate module content based on module type
function generateModuleContent(module: TrainingModule): ContentSection[] {
  if (module.name.includes('Welcome')) {
    return [
      {
        id: 'intro',
        title: 'Welcome to Crave\'n Delivery',
        content: `<div class="space-y-6">
          <div class="aspect-video bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <div class="text-center text-white"><div class="text-6xl mb-4">🚀</div><h2 class="text-2xl font-bold">Welcome Video</h2></div>
          </div>
          <h3 class="text-xl font-bold">Our Mission</h3>
          <p class="text-gray-600">At Crave'n, we power on-demand local commerce, food, grocery, retail, convenience, and same-day courier (CX), connecting customers and businesses with local merchants and Feeders while creating flexible opportunities for delivery partners.</p>
          <h3 class="text-xl font-bold">Our Values</h3>
          <ul class="space-y-2"><li><strong>Customer First:</strong> Every decision starts with customer experience</li><li><strong>Innovation:</strong> We constantly seek better ways to serve</li><li><strong>Integrity:</strong> We do the right thing</li><li><strong>Teamwork:</strong> Together we achieve more</li></ul>
        </div>`,
        duration_minutes: 15,
      },
      {
        id: 'team',
        title: 'Meet the Team',
        content: `<div class="space-y-6">
          <p class="text-gray-600">Our leadership team brings decades of combined experience in technology, logistics, and customer service.</p>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4 text-center"><div class="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">👨‍💼</div><h4 class="font-bold">CEO</h4></div>
            <div class="bg-gray-50 rounded-xl p-4 text-center"><div class="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">👩‍💻</div><h4 class="font-bold">CTO</h4></div>
          </div>
        </div>`,
        duration_minutes: 10,
      },
      {
        id: 'expectations',
        title: 'Intern Expectations',
        content: `<div class="space-y-6">
          <div class="bg-orange-50 border-l-4 border-orange-500 p-4"><h4 class="font-bold text-orange-800">Professional Standards</h4><ul class="mt-2 text-orange-700"><li>• Arrive on time and prepared</li><li>• Communicate proactively</li><li>• Meet deadlines</li><li>• Ask questions</li></ul></div>
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4"><h4 class="font-bold text-blue-800">Growth Mindset</h4><ul class="mt-2 text-blue-700"><li>• Be open to feedback</li><li>• Take initiative</li><li>• Collaborate</li><li>• Share ideas</li></ul></div>
        </div>`,
        duration_minutes: 10,
        quiz: [
          { id: 'q1', question: 'What is one of Crave\'n\'s core values?', options: ['Profit First', 'Customer First', 'Speed First', 'Cost First'], correctIndex: 1, explanation: 'Customer First - every decision starts with customer experience.' },
          { id: 'q2', question: 'What should you do when you need clarification?', options: ['Figure it out yourself', 'Ask questions', 'Skip the task', 'Wait'], correctIndex: 1, explanation: 'Asking questions is an expected professional standard.' },
        ],
      },
    ];
  }
  
  if (module.name.includes('Safety')) {
    return [
      {
        id: 'safety',
        title: 'Safety Overview',
        content: `<div class="space-y-6">
          <div class="bg-red-50 border border-red-200 rounded-xl p-6"><div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl">⚠️</div><h3 class="text-xl font-bold text-red-800">Safety is Our Priority</h3></div><p class="text-red-700">Safety isn't just a policy-it's a core value. Every team member is responsible for maintaining a safe environment.</p></div>
          <h3 class="text-xl font-bold">Key Safety Principles</h3>
          <div class="space-y-3"><div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"><span class="text-2xl">🛡️</span><div><h4 class="font-bold">Prevention First</h4><p class="text-sm text-gray-600">Identify hazards before they cause harm</p></div></div><div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"><span class="text-2xl">📢</span><div><h4 class="font-bold">Speak Up</h4><p class="text-sm text-gray-600">Report unsafe conditions immediately</p></div></div></div>
        </div>`,
        duration_minutes: 20,
      },
      {
        id: 'compliance',
        title: 'Compliance & Reporting',
        content: `<div class="space-y-6">
          <h3 class="text-xl font-bold">Data Protection</h3>
          <ul class="space-y-2"><li class="flex items-start gap-2"><span class="text-green-500">✓</span>Never share customer data outside approved systems</li><li class="flex items-start gap-2"><span class="text-green-500">✓</span>Use strong, unique passwords</li><li class="flex items-start gap-2"><span class="text-green-500">✓</span>Report suspected data breaches immediately</li></ul>
          <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6"><h3 class="font-bold text-yellow-800">Reporting Channels</h3><p class="text-yellow-700">Your Manager • HR Department • Anonymous Hotline: 1-800-CRAVEN-ETHICS</p></div>
        </div>`,
        duration_minutes: 20,
        quiz: [
          { id: 'q1', question: 'What should you do if you discover a data breach?', options: ['Ignore it', 'Fix it yourself', 'Report immediately', 'Wait and see'], correctIndex: 2, explanation: 'Data breaches must be reported immediately.' },
          { id: 'q2', question: 'Which is appropriate for sensitive ethical concerns?', options: ['Social media', 'Anonymous Hotline', 'Personal email', 'Text a friend'], correctIndex: 1, explanation: 'The Anonymous Hotline is for sensitive concerns.' },
          { id: 'q3', question: 'What is the passing score for this module?', options: ['60%', '70%', '80%', '90%'], correctIndex: 2, explanation: 'Safety requires 80% due to its importance.' },
        ],
      },
    ];
  }

  // Default content for other modules
  return [
    {
      id: 'intro',
      title: 'Introduction',
      content: `<div class="space-y-6">
        <div class="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center"><div class="text-center text-white"><div class="text-6xl mb-4">📚</div><h2 class="text-2xl font-bold">${module.name}</h2></div></div>
        <h3 class="text-xl font-bold">Module Overview</h3>
        <p class="text-gray-600">${module.description}</p>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 class="font-bold text-blue-800">What You'll Learn</h4><ul class="mt-2 text-blue-700"><li>• Key concepts and best practices</li><li>• Practical applications</li><li>• Role-specific skills</li></ul></div>
      </div>`,
      duration_minutes: Math.floor(module.duration_minutes * 0.5),
    },
    {
      id: 'content',
      title: 'Core Content',
      content: `<div class="space-y-6">
        <p class="text-gray-600">This section covers the main content. Pay attention as it will be assessed.</p>
        <div class="space-y-4"><div class="bg-gray-50 rounded-lg p-4"><h4 class="font-bold">Key Concept 1</h4><p class="text-sm text-gray-600">Understanding fundamentals and their application.</p></div><div class="bg-gray-50 rounded-lg p-4"><h4 class="font-bold">Key Concept 2</h4><p class="text-sm text-gray-600">Best practices and common pitfalls.</p></div></div>
      </div>`,
      duration_minutes: Math.floor(module.duration_minutes * 0.5),
      quiz: [
        { id: 'q1', question: `What is the primary focus of ${module.name}?`, options: ['General info', module.description?.split('.')[0] || 'Core competencies', 'Admin procedures', 'Social activities'], correctIndex: 1, explanation: `This module focuses on ${module.description?.toLowerCase() || 'key skills'}.` },
      ],
    },
  ];
}

// Quiz Component
const QuizView: React.FC<{ questions: QuizQuestion[]; onComplete: (score: number, total: number) => void; passingScore?: number }> = ({ questions, onComplete, passingScore }) => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const q = questions[current];
  const answered = answers[q.id] !== undefined;
  const correct = answers[q.id] === q.correctIndex;

  const handleSelect = (i: number) => {
    if (answered) return;
    setAnswers({ ...answers, [q.id]: i });
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (current < questions.length - 1) setCurrent(current + 1);
    else {
      setShowResults(true);
      const score = questions.filter(x => answers[x.id] === x.correctIndex).length;
      onComplete(score, questions.length);
    }
  };

  const score = questions.filter(x => answers[x.id] === x.correctIndex).length;
  const pct = Math.round((score / questions.length) * 100);
  const passed = !passingScore || pct >= passingScore;

  if (showResults) {
    return (
      <div className="text-center py-8">
        <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
          {passed ? <CheckCircle2 className="w-12 h-12 text-green-500" /> : <AlertCircle className="w-12 h-12 text-red-500" />}
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>{passed ? 'Quiz Passed!' : 'Quiz Not Passed'}</h3>
        <p className="text-gray-600">You scored {score}/{questions.length} ({pct}%)</p>
        {passingScore && <p className="text-sm text-gray-500 mt-2">Passing: {passingScore}%</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Question {current + 1} of {questions.length}</span>
        <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === current ? 'bg-orange-500' : answers[questions[i].id] !== undefined ? (answers[questions[i].id] === questions[i].correctIndex ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-200'}`} />)}</div>
      </div>
      <h3 className="text-lg font-bold">{q.question}</h3>
      <div className="space-y-3">
        {q.options.map((opt, i) => {
          const sel = answers[q.id] === i;
          const isCorrect = i === q.correctIndex;
          let cls = 'bg-white border-gray-200';
          if (answered) { if (isCorrect) cls = 'bg-green-50 border-green-500'; else if (sel) cls = 'bg-red-50 border-red-500'; }
          else if (sel) cls = 'bg-orange-50 border-orange-500';
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={answered} className={`w-full p-4 rounded-lg border-2 text-left ${cls}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answered && isCorrect ? 'border-green-500 bg-green-500' : answered && sel ? 'border-red-500 bg-red-500' : sel ? 'border-orange-500' : 'border-gray-300'}`}>
                  {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                  {answered && sel && !isCorrect && <X className="w-4 h-4 text-white" />}
                </div>
                <span>{opt}</span>
              </div>
            </button>
          );
        })}
      </div>
      {showExplanation && q.explanation && <div className={`p-4 rounded-lg ${correct ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}><p className={`text-sm ${correct ? 'text-green-700' : 'text-yellow-700'}`}><strong>{correct ? '✓ Correct!' : '✗ Incorrect.'}</strong> {q.explanation}</p></div>}
      {answered && <button onClick={handleNext} className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center justify-center gap-2">{current < questions.length - 1 ? 'Next Question' : 'See Results'}<ChevronRight className="w-5 h-5" /></button>}
    </div>
  );
};

// Main Module Viewer
const ModuleViewer: React.FC<ModuleViewerProps> = ({ module, progress, onClose, onProgressUpdate, onComplete }) => {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [quizScores, setQuizScores] = useState<Record<string, { c: number; t: number }>>({});
  const [timeSpent, setTimeSpent] = useState(progress?.time_spent_minutes || 0);
  const [showQuiz, setShowQuiz] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sections = generateModuleContent(module);
  const section = sections[sectionIdx];
  const isLast = sectionIdx === sections.length - 1;
  const allDone = sections.every(s => completed[s.id]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeSpent(t => t + 1), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const pct = Math.round((Object.values(completed).filter(Boolean).length / sections.length) * 100);
    onProgressUpdate({ progress_percent: pct, time_spent_minutes: timeSpent });
  }, [completed, timeSpent]);

  const handleComplete = () => {
    setCompleted({ ...completed, [section.id]: true });
    if (section.quiz?.length) setShowQuiz(true);
    else if (!isLast) setSectionIdx(sectionIdx + 1);
  };

  const handleQuizDone = (c: number, t: number) => {
    setQuizScores({ ...quizScores, [section.id]: { c, t } });
    setTimeout(() => { setShowQuiz(false); if (!isLast) setSectionIdx(sectionIdx + 1); }, 2000);
  };

  const handleModuleDone = () => {
    let tc = 0, tt = 0;
    Object.values(quizScores).forEach(q => { tc += q.c; tt += q.t; });
    onComplete(tt > 0 ? Math.round((tc / tt) * 100) : 100);
  };

  const icon = (t: DeliveryType) => t === 'Video' ? <Video className="w-5 h-5" /> : t === 'Interactive' ? <Target className="w-5 h-5" /> : <FileText className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">{icon(module.delivery_type)}<div><h2 className="font-bold text-lg">{module.name}</h2><p className="text-sm opacity-90">{formatDuration(module.duration_minutes)} • {module.delivery_type}</p></div></div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-6 h-6" /></button>
          </div>
          <div className="mt-4"><div className="flex justify-between text-sm mb-2"><span>Progress</span><span>{Math.round((Object.values(completed).filter(Boolean).length / sections.length) * 100)}%</span></div><div className="h-2 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${(Object.values(completed).filter(Boolean).length / sections.length) * 100}%` }} /></div></div>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-b flex gap-2 overflow-x-auto">
          {sections.map((s, i) => <button key={s.id} onClick={() => { setSectionIdx(i); setShowQuiz(false); }} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${i === sectionIdx ? 'bg-orange-500 text-white' : completed[s.id] ? 'bg-green-100 text-green-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{completed[s.id] && <CheckCircle2 className="w-4 h-4 inline mr-1" />}{s.title}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {showQuiz && section.quiz ? (
            <div><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Target className="w-6 h-6 text-orange-500" />Knowledge Check</h3><QuizView questions={section.quiz} onComplete={handleQuizDone} passingScore={module.passing_score || undefined} /></div>
          ) : (
            <div><h3 className="text-xl font-bold mb-4">{section.title}</h3><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content) }} /></div>
          )}
        </div>
        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500"><span className="flex items-center gap-1"><Clock className="w-4 h-4" />{timeSpent} min</span>{module.passing_score && <span className="flex items-center gap-1"><Target className="w-4 h-4" />Pass: {module.passing_score}%</span>}</div>
          <div className="flex items-center gap-3">
            {sectionIdx > 0 && <button onClick={() => { setSectionIdx(sectionIdx - 1); setShowQuiz(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"><ChevronLeft className="w-5 h-5" />Previous</button>}
            {!showQuiz && (
              !completed[section.id] ? <button onClick={handleComplete} className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center gap-2">{section.quiz ? 'Take Quiz' : 'Mark Complete'}<ChevronRight className="w-5 h-5" /></button>
              : isLast && allDone ? <button onClick={handleModuleDone} className="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 flex items-center gap-2"><Award className="w-5 h-5" />Complete Module</button>
              : !isLast ? <button onClick={() => setSectionIdx(sectionIdx + 1)} className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center gap-2">Next<ChevronRight className="w-5 h-5" /></button>
              : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleViewer;


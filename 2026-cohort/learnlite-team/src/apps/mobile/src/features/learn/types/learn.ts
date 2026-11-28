export interface PackSource {
  source_id: string;
  title: string;
  publisher: string;
  url: string;
  reuse: string;
}

export interface AIChoice {
  word: string;
  p: number;
}

export interface ReadItem {
  item_id: string;
  type: 'read';
  heading: string;
  body: string;
  source_id: string;
}

export interface QuestionItem {
  item_id: string;
  type: 'next_word' | 'spot_the_error' | 'single_choice';
  prompt: string;
  options: string[];
  correct: number;
  feedback: string;
  ai_choices?: AIChoice[];
  illustrative?: boolean;
  source_id: string;
}

export type LessonItem = ReadItem | QuestionItem;

export interface PackLesson {
  lesson_id: string;
  number: number;
  title: string;
  minutes: number;
  objective: string;
  items: LessonItem[];
}

export interface ContentPack {
  pack_id: string;
  pack_version: string;
  title: string;
  sources: PackSource[];
  lessons: PackLesson[];
}

export interface LockedLesson {
  number: number;
  title: string;
  description: string;
}

/** One record per learner + question. Answering again overwrites it and adds an attempt. */
export interface AnswerRecord {
  id: string;
  learnerID: string;
  lessonID: string;
  questionID: string;
  answer: string;
  correct: boolean;
  attempts: number;
  offline: boolean;
  savedAt: string;
  synced: boolean;
}

export interface LessonCompletion {
  completedAt: string;
  score: number;
  total: number;
}

export interface LastActivity {
  lessonID: string;
  step: number;
  at: string;
  label: string;
}

export interface LearnState {
  onboarded: boolean;
  /** The on-device copy of the content pack. Lesson screens read only from this. */
  pack: ContentPack | null;
  downloadedAt: string | null;
  /** Current step index per lesson. */
  positions: Record<string, number>;
  completed: Record<string, LessonCompletion>;
  answers: Record<string, AnswerRecord>;
  lastActivity: LastActivity | null;
  /** Lesson open in the reader when the app was last closed, so a relaunch goes back to it. */
  openLessonID: string | null;
  simulateOffline: boolean;
  moduleCelebrated: boolean;
  finishOnboarding: () => void;
  downloadModule: () => void;
  removeDownload: () => void;
  openLesson: (lessonID: string) => void;
  closeLesson: () => void;
  goToStep: (lessonID: string, step: number) => void;
  saveAnswer: (input: { lessonID: string; questionID: string; answer: string; correct: boolean; offline: boolean }) => void;
  completeLesson: (lessonID: string) => { moduleJustCompleted: boolean };
  setSimulateOffline: (value: boolean) => void;
  resetProgress: () => void;
}

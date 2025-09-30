// Define what a candidate looks like
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeText?: string;
  resumeFile?: {
    name: string;
    type: string;
    size: number;
    storageId: string; // IndexedDB ID
    uploadedAt: string;
    url?: string; // ✅ Optional - generated dynamically for preview
  };
  status: 'not-started' | 'in-progress' | 'paused' | 'completed';
  totalScore: number;
  answers: Answer[];
  createdAt: string;
  completedAt?: string;
}


// Define what an answer looks like  
export interface Answer {
  question: string;
  answer: string;
  score: number;
  timeUsed: number; // in seconds
  maxTime: number;  // time allocated
  wasPasted?: boolean; // ✅ ADD: Paste detection flag
  pasteCount?: number; // ✅ ADD: Number of times pasted
}

// Define what a question looks like
export interface Question {
  id: string;
  question: string;
  timeLimit: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
}


export interface InterviewState {
  currentSession: InterviewSession | null;
  allSessions: InterviewSession[];
  selectedSubject: string;
  isActive: boolean;
  isPaused: boolean;
}

// Define candidates state
export interface CandidatesState {
  list: Candidate[];
  currentCandidate: Candidate | null;
}
export interface InterviewSession {
  id: string;
  candidateId: string;
  candidateName: string;
  subject: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  status: 'not-started' | 'in-progress' | 'paused' | 'completed';
  currentQuestionIndex: number;
  timeRemaining: number;
  startedAt: string;
  completedAt?: string;
  totalScore: number;
  averageScore: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
  subject: string;
}

export interface InterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
  score: number;
  timeUsed: number;
  maxTime: number;
  timestamp: string;
  wasPasted?: boolean; 
  pasteCount?: number; 
}

export interface InterviewState {
  currentSession: InterviewSession | null;
  allSessions: InterviewSession[];
  selectedSubject: string;
  isActive: boolean;
  isPaused: boolean;
}



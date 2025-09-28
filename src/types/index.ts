// Define what a candidate looks like
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeText?: string;
  resumeFile?: {
    name: string;
    type: string; // 'application/pdf' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  
    size: number;
    url: string; // blob URL for preview
    uploadedAt: string;
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
}

// Define what a question looks like
export interface Question {
  id: string;
  question: string;
  timeLimit: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
}

// Define interview state
export interface InterviewState {
  currentQuestion: number;
  questions: Question[];
  answers: Answer[];
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number;
  currentCandidateId: string | null;
  status: 'not-started' | 'in-progress' | 'paused' | 'completed';
}

// Define candidates state
export interface CandidatesState {
  list: Candidate[];
  currentCandidate: Candidate | null;
}

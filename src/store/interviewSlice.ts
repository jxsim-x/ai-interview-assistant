import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InterviewState, Question, Answer } from '../types';

const initialState: InterviewState = {
  currentQuestion: 0,
  questions: [],
  answers: [],
  isActive: false,
  isPaused: false,
  timeRemaining: 0,
  currentCandidateId: null,
  status: 'not-started'
};

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    // Start interview with questions
    startInterview: (state, action: PayloadAction<{questions: Question[]; candidateId: string}>) => {
      const { questions, candidateId } = action.payload;
      state.questions = questions;
      state.currentQuestion = 0;
      state.answers = [];
      state.isActive = true;
      state.isPaused = false;
      state.status = 'in-progress';
      state.currentCandidateId = candidateId;
      state.timeRemaining = questions[0]?.timeLimit || 60;
      
      console.log('🚀 Interview started with', questions.length, 'questions');
    },
    
    // Submit current answer and move to next
    submitAnswer: (state, action: PayloadAction<{answer: string; timeUsed: number; score?: number}>) => {
      const currentQ = state.questions[state.currentQuestion];
      const newAnswer: Answer = {
        question: currentQ.question,
        answer: action.payload.answer,
        score: action.payload.score || 0,
        timeUsed: action.payload.timeUsed,
        maxTime: currentQ.timeLimit
      };
      
      state.answers.push(newAnswer);
      console.log('✅ Answer submitted for question', state.currentQuestion + 1);
      
      // Move to next question or complete interview
      if (state.currentQuestion < state.questions.length - 1) {
        state.currentQuestion++;
        state.timeRemaining = state.questions[state.currentQuestion].timeLimit;
        console.log('➡️ Moving to question', state.currentQuestion + 1);
      } else {
        state.isActive = false;
        state.status = 'completed';
        console.log('🎉 Interview completed!');
      }
    },
    
    // Update timer
    updateTimer: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    
    // Pause/Resume interview
    pauseInterview: (state) => {
      state.isPaused = true;
      state.status = 'paused';
      console.log('⏸️ Interview paused');
    },
    
    resumeInterview: (state) => {
      state.isPaused = false;
      state.status = 'in-progress';
      console.log('▶️ Interview resumed');
    },
    
    // Reset interview state
    resetInterview: (state) => {
      Object.assign(state, initialState);
      console.log('🔄 Interview reset');
    }
  }
});

export const {
  startInterview,
  submitAnswer, 
  updateTimer,
  pauseInterview,
  resumeInterview,
  resetInterview
} = interviewSlice.actions;

export default interviewSlice.reducer;

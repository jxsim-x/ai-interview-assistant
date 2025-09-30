import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InterviewSession, InterviewQuestion, InterviewAnswer, InterviewState } from '../types';

const initialState: InterviewState = {
  currentSession: null,
  allSessions: [],
  selectedSubject: 'React Developer',
  isActive: false,
  isPaused: false,
};

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    startInterview: (state, action: PayloadAction<InterviewSession>) => {
      state.currentSession = action.payload;
      state.isActive = true;
      state.isPaused = false;
      console.log('🚀 [INTERVIEW] Started interview for:', action.payload.candidateName);
    },

    submitAnswer: (state, action: PayloadAction<InterviewAnswer>) => {
      if (state.currentSession) {
        state.currentSession.answers.push(action.payload);
        state.currentSession.currentQuestionIndex++;
        
        // Check if interview is complete
        if (state.currentSession.currentQuestionIndex >= state.currentSession.questions.length) {
          state.currentSession.status = 'completed';
          state.currentSession.completedAt = new Date().toISOString();
          
          // Calculate scores
          const totalScore = state.currentSession.answers.reduce((sum, ans) => sum + ans.score, 0);
          state.currentSession.totalScore = totalScore;
          state.currentSession.averageScore = Math.round(totalScore / state.currentSession.answers.length);
          
          state.isActive = false;
          console.log('✅ [INTERVIEW] Interview completed with average score:', state.currentSession.averageScore);
        } else {
          // Set time for next question
          const nextQuestion = state.currentSession.questions[state.currentSession.currentQuestionIndex];
          state.currentSession.timeRemaining = nextQuestion.timeLimit;
        }
      }
    },

    updateTimer: (state, action: PayloadAction<number>) => {
      if (state.currentSession && state.isActive && !state.isPaused) {
        state.currentSession.timeRemaining = Math.max(0, action.payload);
      }
    },

    pauseInterview: (state) => {
      state.isPaused = true;
      if (state.currentSession) {
        state.currentSession.status = 'paused';
      }
      console.log('⏸️ [INTERVIEW] Interview paused');
    },

    resumeInterview: (state) => {
      state.isPaused = false;
      if (state.currentSession) {
        state.currentSession.status = 'in-progress';
      }
      console.log('▶️ [INTERVIEW] Interview resumed');
    },

completeInterview: (state) => {
  if (state.currentSession) {
    state.currentSession.status = 'completed';
    state.currentSession.completedAt = new Date().toISOString();
    
    // ✅ FIXED: Proper score calculation including zeros
    const answers = state.currentSession.answers;
    const totalScore = answers.reduce((sum, ans) => sum + (ans.score || 0), 0);
    
    // ✅ Handle case where no valid answers
    const validAnswerCount = answers.length;
    const averageScore = validAnswerCount > 0 
      ? Math.round(totalScore / validAnswerCount) 
      : 0; // ✅ If no answers, score is 0
    
    state.currentSession.totalScore = totalScore;
    state.currentSession.averageScore = averageScore;
    
    console.log(`🏁 [INTERVIEW] Completed - Total: ${totalScore}, Average: ${averageScore}%, Answers: ${validAnswerCount}`);
            
            // 🔧 FIX: Calculate final scores if not already done
            if (!state.currentSession.averageScore || state.currentSession.averageScore === 0) {
            const totalScore = state.currentSession.answers.reduce((sum, ans) => sum + ans.score, 0);
            state.currentSession.totalScore = totalScore;
            state.currentSession.averageScore = Math.round(totalScore / state.currentSession.answers.length);
            }
            
            // 🔧 FIX: Ensure allSessions is initialized before pushing
            if (!state.allSessions) {
            console.warn('⚠️ [INTERVIEW] allSessions was undefined, initializing...');
            state.allSessions = [];
            }
            
            // Save completed session
            state.allSessions.push(state.currentSession);
            
            console.log('🏁 [INTERVIEW] Interview completed and saved');
            console.log('📊 [INTERVIEW] Average Score:', state.currentSession.averageScore);
            console.log('💾 [INTERVIEW] Total sessions saved:', state.allSessions.length);
            
            // Clear active session
            state.currentSession = null;
            state.isActive = false;
            state.isPaused = false;
        }
    },

    setSelectedSubject: (state, action: PayloadAction<string>) => {
      state.selectedSubject = action.payload;
      console.log('📚 [INTERVIEW] Subject changed to:', action.payload);
    },

    resetInterview: (state) => {
      state.currentSession = null;
      state.isActive = false;
      state.isPaused = false;
      console.log('🔄 [INTERVIEW] Interview reset');
    }
  },
});

export const {
  startInterview,
  submitAnswer,
  updateTimer,
  pauseInterview,
  resumeInterview,
  completeInterview,
  setSelectedSubject,
  resetInterview
} = interviewSlice.actions;

export default interviewSlice.reducer;

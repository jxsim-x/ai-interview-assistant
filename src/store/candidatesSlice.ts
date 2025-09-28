import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Candidate, CandidatesState } from '../types';
import { v4 as uuidv4 } from 'uuid';

const initialState: CandidatesState = {
  list: [],
  currentCandidate: null
};

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    // ⭐ UX-ENHANCED: Add candidate with better duplicate handling
    addCandidate: (state, action: PayloadAction<Omit<Candidate, 'id' | 'status' | 'totalScore' | 'answers' | 'createdAt'>>) => {
      const { name, email, phone } = action.payload;
      
      // Always create new candidate when explicitly called
      const newCandidate: Candidate = {
        id: uuidv4(),
        status: 'not-started',
        totalScore: 0,
        answers: [],
        createdAt: new Date().toISOString(),
        ...action.payload,
        resumeFile: action.payload.resumeFile,
      };
      
      state.list.push(newCandidate);
      state.currentCandidate = newCandidate;
      
      console.log('✅ [UX-ENHANCED] New candidate added:', newCandidate.name);
    },
    
    // ⭐ UX-ENHANCED: Update existing candidate
    updateExistingCandidate: (state, action: PayloadAction<Omit<Candidate, 'id' | 'status' | 'totalScore' | 'answers' | 'createdAt'>>) => {
      const { name, email, phone } = action.payload;
      
      if (state.currentCandidate) {
        // Update existing candidate
        state.currentCandidate.name = name;
        state.currentCandidate.email = email;
        state.currentCandidate.phone = phone;
        state.currentCandidate.resumeText = action.payload.resumeText;
        
        // Update in the list too
        const candidateIndex = state.list.findIndex(c => c.id === state.currentCandidate!.id);
        if (candidateIndex !== -1) {
          state.list[candidateIndex] = state.currentCandidate;
        }
        
        console.log('✅ [UX-ENHANCED] Existing candidate updated:', state.currentCandidate.name);
      }
    },
    
    // ⭐ UX-ENHANCED: Reset current session but preserve candidates list
    resetCurrentSession: (state) => {
      state.currentCandidate = null;
      console.log('🔄 [UX-ENHANCED] Current session reset, candidates preserved');
    },
    
    // Check if candidate exists and set as current
    checkExistingCandidate: (state, action: PayloadAction<{email: string; name?: string}>) => {
      const { email, name } = action.payload;
      
      const existingCandidate = state.list.find(candidate => 
        candidate.email.toLowerCase() === email.toLowerCase()
      );
      
      if (existingCandidate) {
        state.currentCandidate = existingCandidate;
        console.log('✅ [UX-ENHANCED] Existing candidate found and set as current:', existingCandidate.name);
      } else {
        console.log('ℹ️ [UX-ENHANCED] No existing candidate found for:', email);
      }
    },
    
    // Update candidate information
    updateCandidate: (state, action: PayloadAction<{id: string; updates: Partial<Candidate>}>) => {
      const { id, updates } = action.payload;
      const candidateIndex = state.list.findIndex(c => c.id === id);
      
      if (candidateIndex !== -1) {
        state.list[candidateIndex] = { ...state.list[candidateIndex], ...updates };
        
        // Update current candidate if it's the same one
        if (state.currentCandidate?.id === id) {
          state.currentCandidate = state.list[candidateIndex];
        }
        
        console.log('✅ [UX-ENHANCED] Candidate updated:', id);
      }
    },
    
    // Set current candidate for interview
    setCurrentCandidate: (state, action: PayloadAction<Candidate>) => {
      state.currentCandidate = action.payload;
      console.log('✅ [UX-ENHANCED] Current candidate set:', action.payload.name);
    },
    
    // Clear current candidate
    clearCurrentCandidate: (state) => {
      state.currentCandidate = null;
      console.log('✅ [UX-ENHANCED] Current candidate cleared');
    },
    
    // Delete candidate (for testing purposes)
    deleteCandidate: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.list = state.list.filter(c => c.id !== id);
      
      if (state.currentCandidate?.id === id) {
        state.currentCandidate = null;
      }
      
      console.log('🗑️ [UX-ENHANCED] Candidate deleted:', id);
    },
    
    // Clear all candidates (for testing)
    clearAllCandidates: (state) => {
      state.list = [];
      state.currentCandidate = null;
      console.log('🧹 [UX-ENHANCED] All candidates cleared');
    }
  }
});

export const { 
  addCandidate, 
  updateExistingCandidate,
  updateCandidate, 
  setCurrentCandidate, 
  clearCurrentCandidate,
  resetCurrentSession,
  checkExistingCandidate,
  deleteCandidate,
  clearAllCandidates
} = candidatesSlice.actions;

export default candidatesSlice.reducer;

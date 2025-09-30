import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import candidatesReducer from './candidatesSlice';
import interviewReducer from './interviewSlice';

// Configure what gets saved to localStorage
const persistConfig = {
  key: 'ai-interview-assistant',
  storage,
  version: 1, // 🔧 ADD: Version for migration tracking
  whitelist: ['candidates', 'interview'],
  // 🔧 ADD: Migration to fix corrupted state
  migrate: (state: any) => {
    console.log('🔄 [STORE] Running state migration check...');
    
    if (state && state._persist) {
      // Fix corrupted allSessions array
      if (state.interview && !Array.isArray(state.interview.allSessions)) {
        console.warn('⚠️ [STORE] Fixing corrupted allSessions - was:', typeof state.interview.allSessions);
        state.interview.allSessions = [];
      }
      
      // Fix corrupted candidates list
      if (state.candidates && !Array.isArray(state.candidates.list)) {
        console.warn('⚠️ [STORE] Fixing corrupted candidates list - was:', typeof state.candidates.list);
        state.candidates.list = [];
      }
      
      console.log('✅ [STORE] State migration completed successfully');
    }
    
    return Promise.resolve(state);
  }
};


// Combine all reducers
const rootReducer = combineReducers({
  candidates: candidatesReducer,
  interview: interviewReducer
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools
});

// Create persistor
export const persistor = persistStore(store);

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

console.log('🏪 Redux store configured with persistence');

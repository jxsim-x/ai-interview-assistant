import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import candidatesReducer from './candidatesSlice';
import interviewReducer from './interviewSlice';

// Configure what gets saved to localStorage
const persistConfig = {
  key: 'ai-interview-assistant',
  storage,
  whitelist: ['candidates', 'interview'], // Only persist these slices
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

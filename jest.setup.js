'use strict';

// Minimal environment shims expected by React Native internals.
if (typeof global.__DEV__ === 'undefined') {
  global.__DEV__ = true;
}

// Mock react-native-url-polyfill so supabase.ts's polyfill import is a no-op.
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock react-native with only the pieces our source files actually reference
// so we never trigger TurboModule lookups for SettingsManager etc.
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  StyleSheet: { create: jest.fn((s) => s), flatten: jest.fn((s) => s) },
}));

// Mock expo-notifications so notification tests don't need a real Expo runtime.
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

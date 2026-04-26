'use strict';

// Minimal mock for react-native/Libraries/BatchedBridge/NativeModules.
// jest-expo's setup.js requires this module and calls Object.defineProperty
// on the .default export to add Expo native module mocks. We need a plain
// object with UIManager so those calls don't throw.
const mockModules = {
  UIManager: {},
  Networking: { sendRequest: jest.fn(), abortRequest: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn() },
  Timing: { createTimer: jest.fn(), deleteTimer: jest.fn() },
  PlatformConstants: { getConstants: () => ({ isTesting: true }) },
  StatusBarManager: { getConstants: () => ({ HEIGHT: 44 }), setStyle: jest.fn(), setHidden: jest.fn() },
  SettingsManager: { settings: {}, watchKeys: jest.fn() },
  I18nManager: { getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: false, localeIdentifier: 'en_US' }) },
  AccessibilityManager: { getMultipleRecommendedTimeoutsMillis: jest.fn() },
  BlobModule: { getConstants: () => ({ BLOB_URI_SCHEME: 'content', BLOB_URI_HOST: null }), addNetworkingHandler: jest.fn(), enableBlobSupport: jest.fn(), disableBlobSupport: jest.fn(), createFromParts: jest.fn(), sendBlob: jest.fn(), release: jest.fn() },
};

module.exports = mockModules;
module.exports.default = mockModules;

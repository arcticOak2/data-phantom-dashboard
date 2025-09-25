// Jest setup file for integration tests

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.TEST_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:9092',
  TEST_USER: {
    username: 'testuser',
    email: 'testuser@example.com',
    name: 'Test User'
  }
};

// Global test helpers
global.makeAuthenticatedRequest = async (method, endpoint, data = null, token = null) => {
  const axios = require('axios');
  const config = {
    method,
    url: `${global.TEST_CONFIG.BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token || 'mock-auth-token-for-testing'}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
};

// Global test data storage
global.TEST_DATA = {
  playgroundId: null,
  taskId: null,
  authToken: null
};

// Console output formatting for tests
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('✅') || message.includes('❌') || message.includes('⚠️')) {
    originalLog(`[TEST] ${message}`);
  } else {
    originalLog(...args);
  }
};

console.error = (...args) => {
  const message = args.join(' ');
  originalError(`[TEST ERROR] ${message}`);
};

// Test environment setup
beforeAll(() => {
  console.log('🚀 Setting up integration test environment...');
  console.log(`📊 Testing with user: ${global.TEST_CONFIG.TEST_USER.username}`);
  console.log(`🌐 API Base URL: ${global.TEST_CONFIG.BASE_URL}`);
});

afterAll(() => {
  console.log('🧹 Cleaning up integration test environment...');
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});






















































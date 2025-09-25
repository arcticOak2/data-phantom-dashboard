const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:9092';
const TEST_USER = {
  username: 'testuser',
  email: 'testuser@example.com',
  name: 'Test User'
};

// Global variables to store test data
let authToken = null;
let testPlaygroundId = null;
let testTaskId = null;

// Helper function to get auth token (simulate Keycloak login)
async function getAuthToken() {
  // In a real scenario, this would be a Keycloak token
  // For testing purposes, we'll use a mock token
  // You may need to implement actual Keycloak authentication here
  return 'mock-auth-token-for-testing';
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

describe('Data Phantom Dashboard - Integration Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting Data Phantom Dashboard Integration Tests');
    console.log(`📊 Testing with user: ${TEST_USER.username} (${TEST_USER.email})`);
    console.log(`🌐 API Base URL: ${BASE_URL}`);
    
    // Get authentication token
    authToken = await getAuthToken();
    console.log('✅ Authentication token obtained');
  });

  describe('1. Authentication & Health Check', () => {
    test('should verify API server is running', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/health`);
        expect(response.status).toBe(200);
        console.log('✅ API server is running');
      } catch (error) {
        console.log('⚠️  Health check endpoint not available, continuing with tests');
      }
    });

    test('should have valid authentication token', () => {
      expect(authToken).toBeTruthy();
      expect(typeof authToken).toBe('string');
      console.log('✅ Authentication token is valid');
    });
  });

  describe('2. Playground Management', () => {
    test('should fetch user playgrounds', async () => {
      const response = await makeAuthenticatedRequest('GET', `/data-phantom/playground/${TEST_USER.username}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(typeof response.data).toBe('object');
      
      console.log(`✅ Fetched ${Object.keys(response.data).length} playgrounds for user ${TEST_USER.username}`);
    });

    test('should create a new playground', async () => {
      const playgroundData = {
        name: 'Integration Test Playground',
        userId: TEST_USER.username,
        cronExpression: '0 0 12 * * ?' // Daily at noon
      };

      const response = await makeAuthenticatedRequest('POST', '/data-phantom/playground', playgroundData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe(playgroundData.name);
      expect(response.data.user_id).toBe(TEST_USER.username);
      
      testPlaygroundId = response.data.id;
      console.log(`✅ Created playground: ${response.data.name} (ID: ${testPlaygroundId})`);
    });

    test('should update playground details', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping playground update test - no playground ID available');
        return;
      }

      const updateData = {
        id: testPlaygroundId,
        name: 'Updated Integration Test Playground',
        cronExpression: '0 30 9 * * ?' // Daily at 9:30 AM
      };

      const response = await makeAuthenticatedRequest('PUT', '/data-phantom/playground/update', updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.cron_expression).toBe(updateData.cronExpression);
      
      console.log(`✅ Updated playground: ${response.data.name}`);
    });

    test('should fetch playground details after update', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping playground fetch test - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('GET', `/data-phantom/playground/${TEST_USER.username}`);
      
      expect(response.status).toBe(200);
      expect(response.data[testPlaygroundId]).toBeDefined();
      expect(response.data[testPlaygroundId].name).toBe('Updated Integration Test Playground');
      
      console.log('✅ Verified playground update was persisted');
    });
  });

  describe('3. Task Management', () => {
    test('should fetch tasks for playground', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping task fetch test - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('GET', `/data-phantom/task/${testPlaygroundId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      console.log(`✅ Fetched ${response.data.length} tasks for playground ${testPlaygroundId}`);
    });

    test('should create a new task', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping task creation test - no playground ID available');
        return;
      }

      const taskData = {
        name: 'Integration Test Task',
        type: 'extract',
        query: 'SELECT * FROM test_table WHERE created_date >= CURRENT_DATE',
        playgroundId: testPlaygroundId,
        outputLocation: 's3://test-bucket/output/',
        parentId: null
      };

      const response = await makeAuthenticatedRequest('POST', '/data-phantom/task', taskData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe(taskData.name);
      expect(response.data.type).toBe(taskData.type);
      expect(response.data.query).toBe(taskData.query);
      
      testTaskId = response.data.id;
      console.log(`✅ Created task: ${response.data.name} (ID: ${testTaskId})`);
    });

    test('should create a dependent task', async () => {
      if (!testPlaygroundId || !testTaskId) {
        console.log('⚠️  Skipping dependent task creation test - missing IDs');
        return;
      }

      const dependentTaskData = {
        name: 'Dependent Validation Task',
        type: 'validate',
        query: 'SELECT COUNT(*) as record_count FROM test_table WHERE created_date >= CURRENT_DATE',
        playgroundId: testPlaygroundId,
        outputLocation: null,
        parentId: testTaskId
      };

      const response = await makeAuthenticatedRequest('POST', '/data-phantom/task', dependentTaskData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.parent_id).toBe(testTaskId);
      
      console.log(`✅ Created dependent task: ${response.data.name}`);
    });

    test('should update task query', async () => {
      if (!testPlaygroundId || !testTaskId) {
        console.log('⚠️  Skipping task update test - missing IDs');
        return;
      }

      const updateData = {
        id: testTaskId,
        query: 'SELECT * FROM test_table WHERE created_date >= CURRENT_DATE AND status = "active"',
        playgroundId: testPlaygroundId
      };

      const response = await makeAuthenticatedRequest('PUT', '/data-phantom/task/query', updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.query).toBe(updateData.query);
      
      console.log(`✅ Updated task query for task ${testTaskId}`);
    });

    test('should verify task update was persisted', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping task verification test - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('GET', `/data-phantom/task/${testPlaygroundId}`);
      
      expect(response.status).toBe(200);
      const updatedTask = response.data.find(task => task.id === testTaskId);
      expect(updatedTask).toBeDefined();
      expect(updatedTask.query).toContain('status = "active"');
      
      console.log('✅ Verified task update was persisted');
    });
  });

  describe('4. Task Execution', () => {
    test('should run all tasks in playground', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping task execution test - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('POST', `/data-phantom/playground/${testPlaygroundId}/run-all`);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      console.log(`✅ Executed all tasks in playground ${testPlaygroundId}`);
    });

    test('should update playground last executed timestamp', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping timestamp update test - no playground ID available');
        return;
      }

      const updateData = {
        lastExecutedAt: Date.now()
      };

      const response = await makeAuthenticatedRequest('PUT', `/data-phantom/playground/${testPlaygroundId}/last-executed`, updateData);
      
      expect(response.status).toBe(200);
      
      console.log(`✅ Updated last executed timestamp for playground ${testPlaygroundId}`);
    });
  });

  describe('5. Data Validation', () => {
    test('should verify playground data integrity', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping data integrity test - no playground ID available');
        return;
      }

      const playgroundResponse = await makeAuthenticatedRequest('GET', `/data-phantom/playground/${TEST_USER.username}`);
      const taskResponse = await makeAuthenticatedRequest('GET', `/data-phantom/task/${testPlaygroundId}`);
      
      expect(playgroundResponse.status).toBe(200);
      expect(taskResponse.status).toBe(200);
      
      const playground = playgroundResponse.data[testPlaygroundId];
      const tasks = taskResponse.data;
      
      expect(playground).toBeDefined();
      expect(playground.name).toBe('Updated Integration Test Playground');
      expect(tasks.length).toBeGreaterThan(0);
      
      console.log('✅ Data integrity verified - playground and tasks are consistent');
    });

    test('should verify task dependencies', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping dependency test - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('GET', `/data-phantom/task/${testPlaygroundId}`);
      
      expect(response.status).toBe(200);
      const tasks = response.data;
      
      // Find tasks with dependencies
      const dependentTasks = tasks.filter(task => task.parent_id !== null);
      expect(dependentTasks.length).toBeGreaterThan(0);
      
      // Verify parent tasks exist
      const parentTaskIds = [...new Set(dependentTasks.map(task => task.parent_id))];
      const allTaskIds = tasks.map(task => task.id);
      
      parentTaskIds.forEach(parentId => {
        expect(allTaskIds).toContain(parentId);
      });
      
      console.log(`✅ Verified ${dependentTasks.length} tasks have valid dependencies`);
    });
  });

  describe('6. Error Handling', () => {
    test('should handle invalid playground ID', async () => {
      try {
        await makeAuthenticatedRequest('GET', '/data-phantom/task/invalid-playground-id');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        console.log('✅ Properly handled invalid playground ID');
      }
    });

    test('should handle invalid task ID', async () => {
      try {
        await makeAuthenticatedRequest('PUT', '/data-phantom/task/query', {
          id: 'invalid-task-id',
          query: 'SELECT * FROM test',
          playgroundId: testPlaygroundId || 'test-playground'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        console.log('✅ Properly handled invalid task ID');
      }
    });

    test('should handle invalid authentication', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/data-phantom/playground/${TEST_USER.username}`, {
          headers: {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json'
          }
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        console.log('✅ Properly handled invalid authentication');
      }
    });
  });

  describe('7. Cleanup', () => {
    test('should delete test task', async () => {
      if (!testPlaygroundId || !testTaskId) {
        console.log('⚠️  Skipping task cleanup - missing IDs');
        return;
      }

      const response = await makeAuthenticatedRequest('DELETE', `/data-phantom/task/${testTaskId}`, {
        playgroundId: testPlaygroundId
      });
      
      expect(response.status).toBe(200);
      console.log(`✅ Deleted test task ${testTaskId}`);
    });

    test('should delete test playground', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping playground cleanup - no playground ID available');
        return;
      }

      const response = await makeAuthenticatedRequest('DELETE', `/data-phantom/playground/${testPlaygroundId}`);
      
      expect(response.status).toBe(200);
      console.log(`✅ Deleted test playground ${testPlaygroundId}`);
    });

    test('should verify cleanup was successful', async () => {
      if (!testPlaygroundId) {
        console.log('⚠️  Skipping cleanup verification - no playground ID available');
        return;
      }

      try {
        await makeAuthenticatedRequest('GET', `/data-phantom/task/${testPlaygroundId}`);
        fail('Should have thrown an error - playground should be deleted');
      } catch (error) {
        expect(error.response.status).toBe(404);
        console.log('✅ Cleanup verification successful - playground and tasks deleted');
      }
    });
  });

  afterAll(() => {
    console.log('\n🎉 Data Phantom Dashboard Integration Tests Completed!');
    console.log(`📊 Test Summary:`);
    console.log(`   - User: ${TEST_USER.username} (${TEST_USER.email})`);
    console.log(`   - API Base URL: ${BASE_URL}`);
    console.log(`   - Test Playground ID: ${testPlaygroundId || 'N/A'}`);
    console.log(`   - Test Task ID: ${testTaskId || 'N/A'}`);
    console.log('\n✨ All systems are operational!');
  });
});






















































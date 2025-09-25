#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:9092',
  testUser: {
    username: 'testuser',
    email: 'testuser@example.com',
    name: 'Test User'
  },
  testTimeout: 30000, // 30 seconds
  retryAttempts: 3
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSection(message) {
  log('\n' + '-'.repeat(40), 'yellow');
  log(`  ${message}`, 'yellow');
  log('-'.repeat(40), 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test runner class
class IntegrationTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
  }

  async runTests() {
    logHeader('Data Phantom Dashboard - Integration Test Runner');
    logInfo(`Testing with user: ${config.testUser.username} (${config.testUser.email})`);
    logInfo(`API Base URL: ${config.apiBaseUrl}`);
    logInfo(`Test Timeout: ${config.testTimeout}ms`);
    logInfo(`Retry Attempts: ${config.retryAttempts}`);

    this.results.startTime = new Date();

    try {
      // Check if API server is running
      await this.checkApiServer();

      // Run the integration tests
      await this.runJestTests();

      // Generate test report
      this.generateReport();

    } catch (error) {
      logError(`Test runner failed: ${error.message}`);
      process.exit(1);
    }
  }

  async checkApiServer() {
    logSection('Checking API Server Status');
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${config.apiBaseUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        logSuccess('API server is running and healthy');
      } else {
        logWarning('API server responded but health check failed');
      }
    } catch (error) {
      logWarning('API server health check failed - continuing with tests');
      logInfo('Make sure your backend server is running on port 9092');
    }
  }

  async runJestTests() {
    logSection('Running Integration Tests');

    const jestConfig = {
      testEnvironment: 'node',
      testTimeout: config.testTimeout,
      verbose: true,
      colors: true,
      testMatch: ['**/tests/integration/api.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js']
    };

    // Create temporary jest config
    const jestConfigPath = path.join(__dirname, 'jest.config.temp.js');
    fs.writeFileSync(jestConfigPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);

    try {
      const command = `npx jest --config ${jestConfigPath} --runInBand --detectOpenHandles`;
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          API_BASE_URL: config.apiBaseUrl,
          NODE_ENV: 'test'
        }
      });
      
      logSuccess('All integration tests completed successfully');
    } catch (error) {
      logError('Some integration tests failed');
      throw error;
    } finally {
      // Clean up temporary config
      if (fs.existsSync(jestConfigPath)) {
        fs.unlinkSync(jestConfigPath);
      }
    }
  }

  generateReport() {
    logSection('Generating Test Report');
    
    this.results.endTime = new Date();
    const duration = this.results.endTime - this.results.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      user: config.testUser,
      apiBaseUrl: config.apiBaseUrl,
      duration: `${duration}ms`,
      results: this.results,
      summary: {
        status: this.results.failed === 0 ? 'PASSED' : 'FAILED',
        message: this.results.failed === 0 
          ? 'All systems are operational!' 
          : `${this.results.failed} test(s) failed`
      }
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    logHeader('Test Summary');
    logInfo(`Duration: ${duration}ms`);
    logInfo(`Total Tests: ${this.results.total}`);
    logInfo(`Passed: ${this.results.passed}`);
    logInfo(`Failed: ${this.results.failed}`);
    logInfo(`Skipped: ${this.results.skipped}`);
    
    if (this.results.failed === 0) {
      logSuccess('🎉 All integration tests passed!');
      logSuccess('✨ Data Phantom Dashboard is fully operational!');
    } else {
      logError(`❌ ${this.results.failed} test(s) failed`);
      logError('Please check the test output above for details');
    }

    logInfo(`Detailed report saved to: ${reportPath}`);
  }
}

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--api-url' && i + 1 < args.length) {
      options.apiUrl = args[i + 1];
      i++;
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  logHeader('Integration Test Runner Help');
  logInfo('Usage: node test-runner.js [options]');
  logInfo('');
  logInfo('Options:');
  logInfo('  --api-url <url>     API base URL (default: http://localhost:9092)');
  logInfo('  --timeout <ms>      Test timeout in milliseconds (default: 30000)');
  logInfo('  --help, -h          Show this help message');
  logInfo('');
  logInfo('Environment Variables:');
  logInfo('  API_BASE_URL        API base URL (overrides --api-url)');
  logInfo('');
  logInfo('Examples:');
  logInfo('  node test-runner.js');
  logInfo('  node test-runner.js --api-url http://localhost:8080');
  logInfo('  node test-runner.js --timeout 60000');
}

// Main execution
async function main() {
  const options = parseArguments();
  
  // Update config with CLI options
  if (options.apiUrl) {
    config.apiBaseUrl = options.apiUrl;
  }
  if (options.timeout) {
    config.testTimeout = options.timeout;
  }

  const runner = new IntegrationTestRunner();
  await runner.runTests();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { IntegrationTestRunner, config };






















































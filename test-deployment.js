#!/usr/bin/env node

/**
 * Local Deployment Testing Script
 *
 * This script simulates Render deployment conditions locally
 * to identify deployment issues before pushing to Render.
 *
 * Usage:
 *   node test-deployment.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const coloredLevel = level === 'ERROR' ? colors.red :
                      level === 'WARNING' ? colors.yellow :
                      level === 'SUCCESS' ? colors.green :
                      level === 'INFO' ? colors.cyan :
                      colors.blue;

  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${coloredLevel}${level}:${colors.reset} ${message}`);

  if (data && typeof data === 'object') {
    console.log(`${colors.magenta}Data:${colors.reset}`, JSON.stringify(data, null, 2));
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHttpEndpoint(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout }, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: response.statusCode, data: parsed, url });
        } catch (e) {
          resolve({ status: response.statusCode, data: data.substring(0, 500), url });
        }
      });
    });

    request.on('error', (error) => {
      reject({ error: error.message, url, timeout: false });
    });

    request.on('timeout', () => {
      request.destroy();
      reject({ error: 'Request timeout', url, timeout: true });
    });
  });
}

async function simulateRenderEnvironment() {
  log('INFO', '🔧 Simulating Render Environment...');

  // Set environment variables like Render would
  process.env.NODE_ENV = 'production';

  // Simulate Render's PORT assignment (what it should be, not what it is)
  process.env.PORT = '10000'; // This is where the binding should happen

  // Simulate other Render environment variables
  process.env.RENDER_SERVICE_ID = 'simulation-service-id';
  process.env.RENDER_SERVICE_URL = 'https://simulated-service.onrender.com';
  process.env.DEBUG = 'true'; // Enable debug mode for testing

  log('SUCCESS', 'Render environment variables simulated');
  log('INFO', `NODE_ENV: ${process.env.NODE_ENV}`);
  log('INFO', `PORT: ${process.env.PORT}`);
}

async function startServer() {
  log('INFO', '🚀 Starting test server...');

  const serverProcess = spawn('node', ['server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });

  let serverReady = false;
  let serverOutput = '';

  return new Promise((resolve, reject) => {

    // Collect all server output for analysis
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      process.stdout.write(`${colors.blue}[SERVER]${colors.reset} ${output}`);

      // Look for the critical bind success message
      if (output.includes('Application is listening on port')) {
        serverReady = true;
        log('SUCCESS', 'Server shows listening confirmation');
      }

      // Look for critical error messages
      if (output.includes('Error:')) {
        log('WARNING', 'Server error detected in output');
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      serverOutput += errorOutput;
      process.stderr.write(`${colors.red}[SERVER ERROR]${colors.reset} ${errorOutput}`);
    });

    serverProcess.on('error', (error) => {
      log('ERROR', `Server process failed to start: ${error.message}`);
      reject(error);
    });

    serverProcess.on('close', (code) => {
      if (code !== 0) {
        log('ERROR', `Server process exited with code ${code}`);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Wait for server to start up
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds

    const checkReady = async () => {
      if (serverReady) {
        resolve({ serverProcess, serverOutput });
        return;
      }

      if (attempts >= maxAttempts) {
        log('ERROR', 'Server failed to start within timeout');
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
        return;
      }

      attempts++;
      setTimeout(checkReady, 1000);
    };

    checkReady();
  });
}

async function runHealthTests(serverProcess) {
  log('INFO', '🏥 Running Health Tests...');

  await sleep(1000); // Give server time to fully initialize

  const tests = [
    { name: 'Basic Health Check', url: 'http://localhost:10000/health' },
    { name: 'API Health Check', url: 'http://localhost:10000/api/health' },
    { name: 'Debug System', url: 'http://localhost:10000/debug/system' },
    { name: 'Debug Network', url: 'http://localhost:10000/debug/network' },
    { name: 'Debug Ports', url: 'http://localhost:10000/debug/ports' },
    { name: 'Debug Monitor', url: 'http://localhost:10000/debug/monitor' }
  ];

  const results = {};
  let passingTests = 0;

  for (const test of tests) {
    try {
      log('INFO', `Testing ${test.name}: ${test.url}`);
      const result = await testHttpEndpoint(test.url, 3000);

      if (result.status === 200) {
        log('SUCCESS', `${test.name}: ✅ Passed (Status: ${result.status})`);
        results[test.name] = { status: 'PASSED', httpStatus: result.status };
        passingTests++;
      } else {
        log('WARNING', `${test.name}: ⚠️ Status ${result.status}`);
        results[test.name] = { status: 'FAILED', httpStatus: result.status };
      }
    } catch (error) {
      log('ERROR', `${test.name}: ❌ Failed - ${error.error}`);
      results[test.name] = { status: 'FAILED', error: error.error };
    }

    await sleep(500); // Brief delay between tests
  }

  results.summary = {
    total: tests.length,
    passing: passingTests,
    successRate: Math.round((passingTests / tests.length) * 100)
  };

  log('INFO', `🏁 Health Test Results: ${passingTests}/${tests.length} passed (${results.summary.successRate}%)`);

  return results;
}

async function analyzeServerOutput(output) {
  log('INFO', '📊 Analyzing Server Output...');

  const analysis = {
    listeningConfirmed: false,
    bindSuccess: false,
    errors: [],
    warnings: [],
    criticalMessages: []
  };

  const lines = output.split('\n');

  for (const line of lines) {
    // Check for listening confirmation
    if (line.includes('Application is listening on port')) {
      analysis.listeningConfirmed = true;
      analysis.criticalMessages.push('✅ Found port listening confirmation');
    }

    // Check for binding success messages
    if (line.includes('PORT_VALIDATION: Server responding correctly')) {
      analysis.bindSuccess = true;
      analysis.criticalMessages.push('✅ Found successful port validation');
    }

    // Look for errors
    if (line.includes('Error:') || line.includes('ERROR')) {
      analysis.errors.push(line.trim());
    }

    // Look for warnings
    if (line.includes('WARNING') || line.includes('⚠️')) {
      analysis.warnings.push(line.trim());
    }
  }

  // Log analysis results
  if (analysis.listeningConfirmed) {
    log('SUCCESS', '✅ Server reported listening on port');
  } else {
    log('ERROR', '❌ Server did not report listening on port');
  }

  if (analysis.bindSuccess) {
    log('SUCCESS', '✅ Server reports successful binding');
  } else {
    log('ERROR', '❌ Server binding validation failed');
  }

  if (analysis.errors.length > 0) {
    log('WARNING', `📋 Found ${analysis.errors.length} errors`);
    analysis.errors.forEach(error => log('ERROR', error));
  }

  if (analysis.warnings.length > 0) {
    log('WARNING', `📋 Found ${analysis.warnings.length} warnings`);
    analysis.warnings.forEach(warning => log('WARNING', warning));
  }

  return analysis;
}

async function runComprehensiveTest() {
  log('INFO', '🔬 Starting Comprehensive Render Deployment Test...');

  const testResults = {
    simulationSuccess: false,
    serverStarted: false,
    healthTests: null,
    outputAnalysis: null,
    overallSuccess: false
  };

  try {
    // Step 1: Simulate Render environment
    log('INFO', '📋 Step 1: Environment Simulation');
    await simulateRenderEnvironment();
    testResults.simulationSuccess = true;
    log('SUCCESS', '✅ Environment simulation completed');

    // Step 2: Start server
    log('INFO', '📋 Step 2: Server Startup');
    const { serverProcess, serverOutput } = await startServer();
    testResults.serverStarted = true;
    log('SUCCESS', '✅ Server started successfully');

    // Step 3: Run health tests
    log('INFO', '📋 Step 3: Health Verification');
    testResults.healthTests = await runHealthTests(serverProcess);
    log('SUCCESS', '✅ Health tests completed');

    // Step 4: Analyze output
    log('INFO', '📋 Step 4: Output Analysis');
    testResults.outputAnalysis = await analyzeServerOutput(serverOutput);
    log('SUCCESS', '✅ Output analysis completed');

    // Step 5: Cleanup
    log('INFO', '📋 Step 5: Cleanup');
    serverProcess.kill('SIGTERM');
    await sleep(2000);
    log('SUCCESS', '✅ Server(process terminated gracefully');

    // Determine overall success
    const healthPassRate = testResults.healthTests?.summary?.successRate || 0;
    const bindingSuccess = testResults.outputAnalysis.listeningConfirmed && testResults.outputAnalysis.bindSuccess;

    testResults.overallSuccess = testResults.simulationSuccess &&
                                testResults.serverStarted &&
                                healthPassRate >= 80 &&
                                bindingSuccess;

    // Final report
    log('INFO', '🎯 TEST RESULTS SUMMARY');
    log('INFO', `Environment: ${testResults.simulationSuccess ? '✅' : '❌'}`);
    log('INFO', `Server Start: ${testResults.serverStarted ? '✅' : '❌'}`);
    log('INFO', `Health Tests: ${healthPassRate}% pass rate`);
    log('INFO', `Binding Success: ${bindingSuccess ? '✅' : '❌'}`);

    if (testResults.overallSuccess) {
      log('SUCCESS', '🎉 OVERALL RESULT: Deployment appears READY for Render!');
      log('SUCCESS', '✅ No blocking issues detected');
    } else {
      log('ERROR', '❌ OVERALL RESULT: Issues detected - review details above');
      log('WARNING', '🔍 Fix issues before deploying to Render');

      // Provide specific recommendations
      if (!testResults.outputAnalysis.listeningConfirmed) {
        log('WARNING', '🔧 Issue: Server not confirming port binding');
        log('WARNING', '🔧 Check: Ensure PORT is properly configured in config/environment.js');
      }

      if (testResults.healthTests?.summary?.successRate < 80) {
        log('WARNING', '🔧 Issue: Health checks failing');
        log('WARNING', '🔧 Check: Server may not be fully accessible');
      }
    }

  } catch (error) {
    log('ERROR', `❌ Test failed: ${error.message}`);
    testResults.overallSuccess = false;

    // Provide troubleshooting guidance
    log('WARNING', '🔧 Troubleshooting Steps:');
    log('WARNING', '1. Check if port 10000 is already in use locally');
    log('WARNING', '2. Verify node server.js can run manually');
    log('WARNING', '3. Check for syntax errors in configuration');
    log('WARNING', '4. Ensure all dependencies are installed (npm install)');
  }

  return testResults;
}

// Main execution
if (require.main === module) {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║          RENDER DEPLOYMENT TEST TOOL         ║');
  console.log('║                                              ║');
  console.log('║  Simulates production Render environment     ║');
  console.log('║  Identifies deployment issues locally        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  runComprehensiveTest().then((results) => {
    const exitCode = results.overallSuccess ? 0 : 1;
    process.exit(exitCode);
  }).catch((error) => {
    log('ERROR', `Critical error: ${error.message}`);
    process.exit(1);
  });
}
#!/usr/bin/env node

/**
 * Advanced Server Diagnostics Tool
 *
 * This script performs comprehensive diagnostics on the Node.js server
 * to identify the root cause of "No open ports detected" issues.
 *
 * Usage:
 *   node debug-server.js [endpoint]
 *
 * Endpoints:
 *   - system: Server system diagnostics
 *   - network: Network interface information
 *   - ports: Port binding diagnostics
 *   - monitor: Real-time monitoring data
 *   - all: Run all diagnostics (default)
 */

const https = require('https');
const http = require('http');

// Configuration
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const PORT = process.env.PORT || 10000;
const BASE_URL = `http://localhost:${PORT}`;

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

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const coloredLevel = level === 'ERROR' ? colors.red :
                      level === 'WARNING' ? colors.yellow :
                      level === 'SUCCESS' ? colors.green :
                      colors.blue;

  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${coloredLevel}${level}:${colors.reset} ${message}`);

  if (data && typeof data === 'object') {
    console.log(`${colors.magenta}Data:${colors.reset}`, JSON.stringify(data, null, 2));
  }
}

async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/debug/${endpoint}`;
    log('INFO', `Testing endpoint: ${url}`);

    const startTime = Date.now();

    const request = http.get(url, { timeout: 10000 }, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const responseTime = Date.now() - startTime;
        let parsedData;

        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = { raw: data };
        }

        resolve({
          statusCode: response.statusCode,
          responseTime,
          data: parsedData,
          url
        });
      });
    });

    request.on('error', (error) => {
      reject({
        error: error.message,
        url,
        responseTime: Date.now() - startTime
      });
    });

    request.on('timeout', () => {
      request.destroy();
      reject({
        error: 'Request timeout',
        url,
        timeout: true
      });
    });
  });
}

async function runSystemDiagnostics() {
  log('INFO', 'Running System Diagnostics...');

  try {
    const response = await makeRequest('system');

    if (response.statusCode === 200) {
      log('SUCCESS', 'System diagnostics retrieved successfully');
      log('INFO', `Response time: ${response.responseTime}ms`);

      // Analyze critical data
      const data = response.data;

      // Check Node.js version
      log('INFO', `Node.js Version: ${data.server.nodeVersion}`);

      // Check port configuration
      log('INFO', `Assigned Port: ${data.server.nodeVersion === 'production' ? data.environment.PORT : 'Using environment variable'}`);

      // Check if Render service ID is present
      if (data.environment.has_RENDER_SERVICE_ID) {
        log('SUCCESS', 'Running on Render (service ID detected)');
      } else {
        log('WARNING', 'Render service ID not detected - may be development');
      }

      return { success: true, data };
    } else {
      log('ERROR', `System diagnostics failed with status ${response.statusCode}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    log('ERROR', `System diagnostics failed: ${error.error || error.message}`);
    return { success: false, error };
  }
}

async function runNetworkDiagnostics() {
  log('INFO', 'Running Network Diagnostics...');

  try {
    const response = await makeRequest('network');

    if (response.statusCode === 200) {
      log('SUCCESS', 'Network diagnostics retrieved successfully');

      const data = response.data;

      log('INFO', `Hostname: ${data.hostname}`);
      log('INFO', `Platform: ${data.platform}`);
      log('INFO', `Release: ${data.release}`);

      log('INFO', 'Network Interfaces:');
      data.networkInterfaces.forEach(iface => {
        log('INFO', `  ${iface.interface}:`);
        iface.addresses.forEach(addr => {
          const type = addr.family === 'IPv4' ? 'IPv4' : 'IPv6';
          const internal = addr.internal ? '(internal)' : '';
          log('INFO', `    ${type}: ${addr.address} ${internal}`);
        });
      });

      return { success: true, data };
    } else {
      log('ERROR', `Network diagnostics failed with status ${response.statusCode}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    log('ERROR', `Network diagnostics failed: ${error.error || error.message}`);
    return { success: false, error };
  }
}

async function runPortDiagnostics() {
  log('INFO', 'Running Port Diagnostics...');

  try {
    const response = await makeRequest('ports');

    if (response.statusCode === 200) {
      const data = response.data;

      if (data.listening) {
        log('SUCCESS', `Port ${data.binding.port} is listening successfully`);
        log('SUCCESS', `Server bound to ${data.binding.host}:${data.binding.port}`);
      } else {
        log('ERROR', `Port ${data.binding.port} is not listening`);
        if (data.error) {
          log('ERROR', `Port binding error: ${data.error}`);
        }
      }

      if (data.binding && data.binding.host === '0.0.0.0') {
        log('SUCCESS', 'Server bound to all interfaces (0.0.0.0) - good for production');
      } else if (data.binding && data.binding.host === '127.0.0.1') {
        log('WARNING', 'Server bound to localhost (127.0.0.1) - may not be accessible');
      }

      return { success: data.listening, data };
    } else {
      log('ERROR', `Port diagnostics failed with status ${response.statusCode}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    log('ERROR', `Port diagnostics failed: ${error.error || error.message}`);
    return { success: false, error };
  }
}

async function runMonitorDiagnostics() {
  log('INFO', 'Running Monitor Diagnostics...');

  try {
    const response = await makeRequest('monitor');

    if (response.statusCode === 200) {
      const data = response.data;

      log('INFO', `Server Status: ${data.serverStatus}`);
      log('INFO', `Internal Accessibility: ${data.accessibility.internal ? 'YES' : 'NO'}`);
      log('INFO', `Response Status: ${data.accessibility.status || 'N/A'}`);
      log('INFO', `Response Time: ${data.accessibility.responseTime || 'N/A'}ms`);

      if (data.accessibility.internal && data.accessibility.status === 200) {
        log('SUCCESS', 'Server is fully accessible and responding');
      } else if (!data.accessibility.internal) {
        log('ERROR', 'Server is not internally accessible');
        if (data.accessibility.error) {
          log('ERROR', `Accessibility error: ${data.accessibility.error}`);
        }
      } else if (data.accessibility.status !== 200) {
        log('WARNING', `Server responding with status ${data.accessibility.status}`);
      }

      return { success: true, data };
    } else {
      log('ERROR', `Monitor diagnostics failed with status ${response.statusCode}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    log('ERROR', `Monitor diagnostics failed: ${error.error || error.message}`);
    return { success: false, error };
  }
}

async function runAllDiagnostics() {
  log('INFO', '🔬 Starting Comprehensive Server Diagnostics...');
  log('INFO', `Testing server at ${BASE_URL}`);

  const results = {
    summary: {},
    details: {}
  };

  // Test basic connectivity first
  try {
    log('INFO', 'Testing basic server accessibility...');
    const basicResponse = await makeRequest('system');
    results.summary.connectivityOk = basicResponse.statusCode === 200;
    log(results.summary.connectivityOk ? 'SUCCESS' : 'ERROR', 'Basic connectivity test completed');
  } catch (error) {
    log('ERROR', 'Basic connectivity test failed');
    results.summary.connectivityOk = false;
  }

  if (!results.summary.connectivityOk) {
    log('ERROR', '❌ Server is not responding - cannot run diagnostics');
    log('ERROR', 'Please check if the server is running and accessible');
    return results;
  }

  // Run all diagnostics
  log('INFO', 'Running full diagnostic suite...');

  results.details.system = await runSystemDiagnostics();
  results.details.network = await runNetworkDiagnostics();
  results.details.ports = await runPortDiagnostics();
  results.details.monitor = await runMonitorDiagnostics();

  // Generate summary
  results.summary.allTestsPass = Object.values(results.details).every(test => test.success !== false);
  results.summary.passing = Object.values(results.details).filter(test => test.success).length;
  results.summary.total = Object.keys(results.details).length;

  log('INFO', '🎯 Diagnostic Summary:');
  log('INFO', `Tests Passed: ${results.summary.passing}/${results.summary.total}`);

  if (results.summary.allTestsPass) {
    log('SUCCESS', '✅ All diagnostics passed - server appears healthy');
  } else {
    log('ERROR', '❌ Some diagnostics failed - check details below');

    // Show which tests failed
    Object.entries(results.details).forEach(([testName, result]) => {
      if (result.success === false) {
        log('ERROR', `❌ ${testName}: Failed`);
      }
    });
  }

  return results;
}

// Main execution
async function main() {
  const endpoint = process.argv[2] || 'all';

  if (endpoint === 'all') {
    await runAllDiagnostics();
  } else if (endpoint === 'system') {
    await runSystemDiagnostics();
  } else if (endpoint === 'network') {
    await runNetworkDiagnostics();
  } else if (endpoint === 'ports') {
    await runPortDiagnostics();
  } else if (endpoint === 'monitor') {
    await runMonitorDiagnostics();
  } else {
    log('ERROR', `Unknown endpoint: ${endpoint}`);
    log('INFO', 'Available endpoints: system, network, ports, monitor, all');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    log('ERROR', `Diagnostic script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllDiagnostics,
  runSystemDiagnostics,
  runNetworkDiagnostics,
  runPortDiagnostics,
  runMonitorDiagnostics
};
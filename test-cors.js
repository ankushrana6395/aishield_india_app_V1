#!/usr/bin/env node

/**
 * CORS Testing Script
 *
 * Tests CORS configuration and connectivity to the running server
 * to ensure frontend can connect properly.
 */

const https = require('https');
const http = require('http');

const origin = 'https://aishield-india-app-v1.onrender.com';
const baseUrl = 'http://localhost:10000'; // Assuming local server runs on 10000

console.log('🧪 CORS Test Configuration:');
console.log('   Target Origin:', origin);
console.log('   Server URL:', baseUrl);
console.log('   Test Endpoint: /api/courses/admin/courses');
console.log('   Method: OPTIONS (preflight)\n');

// Test basic connectivity
async function testHealthCheck() {
  return new Promise((resolve, reject) => {
    console.log('🏥 Testing health check...');
    const request = http.get(`${baseUrl}/health`, (response) => {
      const data = [];
      response.on('data', chunk => data.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(data).toString();
        try {
          const json = JSON.parse(body);
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: json
          });
        } catch (e) {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: 'Invalid JSON'
          });
        }
      });
    });
    request.on('error', error => reject(error));
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Test CORS preflight
async function testCORSPreflight() {
  return new Promise((resolve, reject) => {
    console.log('🌐 Testing CORS preflight...');

    const request = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/api/courses/admin/courses',
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
        'Accept': '*/*'
      }
    }, (response) => {
      const data = [];
      response.on('data', chunk => data.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(data).toString();
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: body,
          allowedOrigin: response.headers['access-control-allow-origin'],
          corsCredentials: response.headers['access-control-allow-credentials']
        });
      });
    });

    request.on('error', error => reject(error));
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
    request.end();
  });
}

// Main test runner
async function runCORSTests() {
  console.log('🚀 Starting CORS Configuration Tests...\n');

  try {
    // Test 1: Basic server connectivity
    console.log('📋 TEST 1: Server Connectivity');
    const healthResult = await testHealthCheck();

    if (healthResult.status === 200) {
      console.log('✅ HEALTH CHECK: Server is responding');
      console.log(`   Status: ${healthResult.status}`);
      console.log(`   Response: ${JSON.stringify(healthResult.body)}\n`);
    } else {
      throw new Error(`Health check failed with status ${healthResult.status}`);
    }

    // Test 2: CORS preflight
    console.log('📋 TEST 2: CORS Preflight Check');
    const corsResult = await testCORSPreflight();

    console.log(`   Preflight Status: ${corsResult.status}`);

    if (corsResult.allowedOrigin) {
      console.log(`✅ ALLOWED ORIGIN: ${corsResult.allowedOrigin}`);
      if (corsResult.allowedOrigin === origin) {
        console.log('🎉 SUCCESS: Your Render domain is allowed!');
      } else {
        console.log(`⚠️  DIFFERENT ORIGIN: ${corsResult.allowedOrigin} (not ${origin})`);
      }
    } else {
      console.log('❌ ALLOWED ORIGIN: Header missing');
    }

    console.log(`   Credentials Allowed: ${corsResult.corsCredentials === 'true' ? '✅ Yes' : '❌ No'}\n`);

    if (corsResult.status === 200 && corsResult.allowedOrigin === origin) {
      console.log('🎉 CORS TEST CONCLUSION:');
      console.log('✅ CORS is properly configured');
      console.log('✅ Render domain is allowed');
      console.log('✅ Course creation should work on Render');
      console.log('\n🚀 Deploy to Render - CORS issues are fixed!');
    } else {
      console.log('⚠️  CORS TEST CONCLUSION:');
      console.log('❌ CORS issues may exist on Render');
      console.log(`❌ Preflight status: ${corsResult.status}`);
      if (corsResult.status !== 200) {
        console.log('❌ Server is rejecting the preflight request');
      }
      if (corsResult.allowedOrigin !== origin) {
        console.log('❌ Server is not allowing the Render domain');
      }
    }

  } catch (error) {
    console.log('❌ CORS TEST FAILED:');
    console.log(`Error: ${error.message}`);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure your server is running on port 10000');
    console.log('2. Test with: node server.js (runs on port 10000)');
    console.log('3. Check that CLIENT_URL is set correctly in environment');
    console.log('4. Verify the server logs for CORS debug messages');
  }
}

if (require.main === module) {
  runCORSTests().then(() => {
    console.log('\n🧪 CORS testing completed');
  }).catch(error => {
    console.error('CORS test script error:', error.message);
    process.exit(1);
  });
}
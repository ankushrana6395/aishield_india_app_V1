#!/usr/bin/env node

/**
 * Script to run database clearing on Render production server
 * Upload this file to Render and run it instead of running locally
 */

// Configure environment for production
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '10000'; // Default Render port

// Import your production script
const { clearDatabase } = require('./clear-database-production.js');

// Run if this script is called directly
if (require.main === module) {
  console.log('🚀 Starting database clearing on Render production server...\n');
  clearDatabase().then(() => {
    console.log('\n✅ Script completed successfully on Render!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Script failed on Render:', error);
    process.exit(1);
  });
}

module.exports = { clearDatabase };

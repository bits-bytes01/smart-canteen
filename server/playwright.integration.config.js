const { defineConfig } = require('@playwright/test');

const testMongoUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen_test';

module.exports = defineConfig({
  testDir: './integration',
  use: {
    baseURL: 'http://127.0.0.1:3100'
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3100/',
    reuseExistingServer: false,
    env: {
      MONGO_URI: testMongoUri,
      JWT_SECRET: 'ci-only-smart-canteen-test-secret',
      PORT: '3100',
      TIMEZONE: 'UTC',
      WHATSAPP_ENABLED: 'false'
    }
  }
});

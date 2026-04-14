/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  // Isolate modules between tests to avoid Prisma singleton conflicts
  resetModules: true,
  clearMocks: true,
};

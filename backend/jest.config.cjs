/* Jest config (ts-jest preset). passWithNoTests is set deliberately:
   there are no test files in the repo yet, and we'd rather CI's test step
   pass-with-a-note than fail red on an empty suite — that way the step is
   wired and ready the moment the first real test lands, without blocking
   the pipeline in the meantime. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  passWithNoTests: true,
  clearMocks: true,
};

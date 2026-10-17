import { authService } from './authService';

async function runAuthTests() {
  console.log('--- Running Authentication Integration Tests ---');

  // Test 1: Valid Login - Export Manager
  const resValid = await authService.authenticate(
    'export.manager@ceylonintelligence.lk',
    'ExportMgr2026!'
  );
  if (!resValid || !resValid.token || resValid.user.role !== 'Export Manager') {
    throw new Error('Test 1 Failed: Valid Export Manager login rejected');
  }
  console.log('✓ Test 1 Passed: Valid Export Manager authenticated');

  // Test 2: Valid Login - Admin
  const resAdmin = await authService.authenticate(
    'admin@ceylonintelligence.lk',
    'CeylonAdmin2026!'
  );
  if (!resAdmin || resAdmin.user.role !== 'Admin') {
    throw new Error('Test 2 Failed: Valid Admin login rejected');
  }
  console.log('✓ Test 2 Passed: Valid Admin authenticated');

  // Test 3: Invalid Password
  const resBadPass = await authService.authenticate(
    'admin@ceylonintelligence.lk',
    'WrongPassword!'
  );
  if (resBadPass !== null) {
    throw new Error('Test 3 Failed: Invalid password was accepted');
  }
  console.log('✓ Test 3 Passed: Invalid password rejected');

  // Test 4: Unknown User
  const resUnknown = await authService.authenticate(
    'nonexistent@tea.lk',
    'SomePass'
  );
  if (resUnknown !== null) {
    throw new Error('Test 4 Failed: Nonexistent email was accepted');
  }
  console.log('✓ Test 4 Passed: Nonexistent user rejected');

  // Test 5: Verify Token
  const verified = authService.verifyToken(resValid.token);
  if (!verified) {
    throw new Error('Test 5 Failed: Generated token could not be verified');
  }
  console.log('✓ Test 5 Passed: JWT verification succeeded');

  console.log('All Authentication Tests Passed Successfully!');
}

runAuthTests().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});

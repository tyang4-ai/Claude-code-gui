---
name: test-guardian
description: |
  Verifies all tests pass and enforces 100% coverage for production quality.
  Use after any code changes to ensure quality standards are met.
allowed-tools: ["Bash", "Read"]
user-invocable: true
---

# Test Guardian Skill

## Purpose
Ensure all tests pass with 100% coverage for core modules and 95% overall.

## When to Use
- After implementing any new feature
- After modifying existing code
- Before marking any task as complete
- When validating code quality

## Usage

1. **Run unit tests with coverage:**
   ```bash
   npm run test:unit:coverage
   ```

2. **Check coverage thresholds:**
   - Core modules (`src/core/**`): Must be 100%
   - Feature modules (`src/modules/**`): Must be 100%
   - Components (`src/components/**`): Must be 95%+
   - Overall: Must be 95%+

3. **Run E2E tests:**
   ```bash
   npm run test:e2e
   ```

4. **Run Rust tests:**
   ```bash
   npm run test:rust
   ```

## Output Format
```
✅ Test Results:
- Unit Tests: PASSED (X tests)
- Coverage: XX% (meets threshold)
- E2E Tests: PASSED (X scenarios)
- Rust Tests: PASSED (X tests)

OR

❌ Test Failures:
- Failed tests: [list]
- Coverage below threshold: XX% < 95%
- Action required: [specific fixes needed]
```

## Files Involved
- `vitest.config.ts` - Coverage configuration
- `src/__tests__/**` - Test files
- `coverage/lcov-report/index.html` - Coverage report
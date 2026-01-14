---
name: screenshot-verifier
description: |
  Captures and verifies UI screenshots for documentation and visual regression.
  Use after UI changes to document the interface.
allowed-tools: ["Bash", "Read", "Glob"]
user-invocable: true
---

# Screenshot Verifier Skill

## Purpose
Capture UI screenshots for documentation and verify visual appearance.

## When to Use
- After implementing new UI features
- After modifying existing UI components
- When documenting features
- For visual regression testing

## Usage

1. **Run E2E tests with screenshot capture:**
   ```bash
   npm run test:e2e -- --project=chromium
   ```

2. **Check for documentation screenshots:**
   ```bash
   ls screenshots/
   ```

3. **Verify test screenshots:**
   ```bash
   ls test-results/screenshots/
   ```

## Output Format
```
✅ Screenshots Captured:
- Documentation: X screenshots in /screenshots
- Test artifacts: X screenshots in /test-results
- Key screens documented:
  - 01-welcome-view.png
  - 02-new-session.png
  - 03-mcp-manager.png
  [etc.]

OR

⚠️ Missing Screenshots:
- Expected screens not captured: [list]
- Action: Run E2E tests to generate
```

## Files Involved
- `e2e/app.spec.ts` - Screenshot tests
- `screenshots/` - Documentation images
- `test-results/screenshots/` - Test artifacts
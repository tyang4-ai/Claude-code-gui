---
name: build-verifier
description: |
  Verifies the application builds successfully for production.
  Checks TypeScript compilation, Vite build, and Tauri build.
allowed-tools: ["Bash", "Read"]
user-invocable: true
---

# Build Verifier Skill

## Purpose
Ensure the application compiles and builds without errors.

## When to Use
- Before committing code
- After major dependency updates
- After structural changes
- Before marking features complete

## Usage

1. **TypeScript compilation check:**
   ```bash
   npx tsc --noEmit
   ```

2. **Frontend build:**
   ```bash
   npm run build
   ```

3. **Tauri development build test:**
   ```bash
   npm run tauri dev
   ```
   Wait for app to start, then close.

## Output Format
```
✅ Build Verification:
- TypeScript: No errors
- Vite Build: Success (bundle size: X MB)
- Tauri: Launches successfully

OR

❌ Build Failures:
- TypeScript errors: [list]
- Build errors: [details]
- Action required: [fixes]
```

## Files Involved
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Build configuration
- `src-tauri/tauri.conf.json` - Tauri config
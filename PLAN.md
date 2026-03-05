# Plan: Adapt Claude Code Viewer for Blackbox AI CLI

## ✅ COMPLETED

This plan has been fully implemented. All 6 phases have been completed.

---

## Overview

This project has been adapted from claude-code-viewer to work with Blackbox AI CLI.

## Key Differences

| Aspect | Claude Code | Blackbox AI CLI |
|--------|-------------|------------------|
| Data Directory | `~/.claude/` | `~/.blackboxcli/` |
| Session Logs | JSONL format | JSON format |
| Message Schema | type/content | role/parts |

---

## Implementation Status

### Phase 1: Core Infrastructure Changes ✅

- [x] Modified `src/server/lib/config/paths.ts` to use `~/.blackbox-cli-viewer/cache`
- [x] Updated `ApplicationContext.ts` to read Blackbox CLI paths
- [x] Renamed package from `@kimuson/claude-code-viewer` to `@sarthak/blackbox-cli-viewer`
- [x] Updated CLI options and environment variables (CCV_* → BBCV_*)

### Phase 2: Data Layer Changes ✅

- [x] Created `src/lib/blackbox-schema/` for Blackbox format parsing
- [x] Updated `SessionRepository.ts` to read from `logs.json` format
- [x] Updated `ProjectRepository.ts` to discover projects from `~/.blackboxcli/tmp/`
- [x] Created `src/server/core/blackbox-cli/` module

### Phase 3: API & Services Changes ✅

- [x] Removed `@anthropic-ai/claude-agent-sdk` dependency
- [x] Created SDK stubs in `src/@anthropic-ai/`
- [x] Created `BlackboxCliController`, `BlackboxCliLifeCycleService`, `BlackboxCliSessionProcessService`
- [x] Updated routes from `/api/claude-code` to `/api/blackbox-cli`

### Phase 4: Frontend Changes ✅

- [x] Updated all i18n messages (en, ja, zh_CN)
- [x] Renamed `ClaudeCodeSettingsForm.tsx` to `BlackboxSettingsForm.tsx`
- [x] Updated branding throughout UI
- [x] Updated API queries (`claudeCodeMetaQuery` → `blackboxCliMetaQuery`)

### Phase 5: Feature Adaptation ✅

- [x] Updated `bbOptionsFormSchema` for Blackbox CLI options
- [x] Updated feature flags to use camelCase
- [x] Updated queries and references
- [x] Fixed import paths for all services

### Phase 6: Testing & Documentation ✅

- [x] Updated README.md with comprehensive documentation
- [x] Updated PLAN.md with completion status
- [x] Updated CHANGELOG.md
- [x] Verified build and typecheck

---

## Environment Variables Mapping

| Claude Code Viewer | Blackbox CLI Viewer |
|-------------------|----------------------|
| `CCV_PASSWORD` | `BBCV_PASSWORD` |
| `CCV_CC_EXECUTABLE_PATH` | `BBCV_BB_EXECUTABLE_PATH` |
| `CCV_GLOBAL_CLAUDE_DIR` | `BBCV_GLOBAL_BLACKBOX_DIR` |
| `CCV_TERMINAL_DISABLED` | `BBCV_TERMINAL_DISABLED` |
| `CCV_API_ONLY` | `BBCV_API_ONLY` |

---

## Commits

| Phase | Commit | Description |
|-------|--------|-------------|
| 1 | `70e044d` | Core Infrastructure |
| 2 | `afa93c8` | Data Layer |
| 3 | `4183357` | API & Services |
| 4 | `6626e5f` | Frontend Branding |
| 5 | `3bbce7a` | Feature Adaptation |
| 6 | (pending) | Testing & Documentation |

---

## Attribution

This project is a fork of [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) by [@d-kimuson](https://github.com/d-kimuson).

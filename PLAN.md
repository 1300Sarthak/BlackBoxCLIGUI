# Plan: Adapt Claude Code Viewer for Blackbox AI CLI

## Overview

This plan outlines the steps to modify the claude-code-viewer project to work with Blackbox AI CLI instead of Claude Code.

## Key Differences

| Aspect | Claude Code | Blackbox AI CLI |
|--------|-------------|-----------------|
| **Data Directory** | `~/.claude/` | `~/.blackboxcli/` |
| **Session Logs** | `~/.claude/projects/<project>/<session-id>.jsonl` | `~/.blackboxcli/tmp/<hash>/logs.json` |
| **Session Format** | JSONL (one JSON per line) | JSON array of messages |
| **Checkpoint Format** | N/A | `~/.blackboxcli/tmp/<hash>/checkpoint-session-*.json` |
| **Settings** | CLI flags | `~/.blackboxcli/settings.json` |
| **Todos** | Built into sessions | `~/.blackboxcli/todos/<session-id>.json` |
| **Message Schema** | `type: "user"/"assistant"`, `message.content` | `role: "user"/"model"`, `parts[].text` |

## Message Schema Comparison

### Claude Code Format
```json
{
  "type": "user",
  "message": { "content": "Hello" },
  "uuid": "...",
  "timestamp": "...",
  "sessionId": "...",
  "cwd": "..."
}
```

### Blackbox AI CLI Format (logs.json)
```json
{
  "sessionId": "...",
  "messageId": 0,
  "type": "user",
  "message": "Hello",
  "timestamp": "2026-02-28T17:50:04.166Z"
}
```

### Blackbox Checkpoint Format
```json
[
  {
    "role": "user",
    "parts": [{ "text": "Hello" }]
  },
  {
    "role": "model",
    "parts": [{ "text": "Hi there!" }]
  }
]
```

---

## Implementation Plan

### Phase 1: Core Infrastructure Changes

#### 1.1 Update Configuration Paths
- [ ] Modify `src/server/lib/config/paths.ts` to use `~/.blackboxcli` instead of `~/.claude`
- [ ] Update `ApplicationContext.ts` to read Blackbox CLI paths
- [ ] Create new path constants for:
  - `blackboxCliDirPath` → `~/.blackboxcli`
  - `blackboxTmpDirPath` → `~/.blackboxcli/tmp`
  - `blackboxSettingsPath` → `~/.blackboxcli/settings.json`
  - `blackboxTodosDirPath` → `~/.blackboxcli/todos`

#### 1.2 Update CLI Entry Point
- [ ] Rename `package.json` name from `@kimuson/claude-code-viewer` to `@blackbox/blackbox-cli-viewer`
- [ ] Update CLI options in `src/server/main.ts`:
  - Change `--claude-dir` to `--blackbox-dir`
  - Change `--executable` to point to Blackbox CLI
  - Update all references from "Claude Code" to "Blackbox AI CLI"
- [ ] Update all environment variable names (CCV_ → BBCV_)

---

### Phase 2: Data Layer Changes

#### 2.1 Create New Conversation Schema for Blackbox
- [ ] Create `src/lib/conversation-schema/entry/BlackboxLogEntrySchema.ts`
- [ ] Create `src/lib/conversation-schema/entry/BlackboxCheckpointSchema.ts`
- [ ] Create adapters to normalize Blackbox format to internal format

#### 2.2 Update Session Repository
- [ ] Modify `SessionRepository.ts` to read from Blackbox CLI log format
- [ ] Implement session discovery from `~/.blackboxcli/tmp/<hash>/` directories
- [ ] Parse both `logs.json` and `checkpoint-session-*.json` files
- [ ] Map Blackbox session structure to the app's internal format

#### 2.3 Update Project Repository
- [ ] Modify `ProjectRepository.ts` to:
  - Discover projects from working directories (based on `cwd` in logs)
  - Group sessions by project directory
  - Handle the different project discovery mechanism

#### 2.4 Create BlackboxSettingsService
- [ ] Create `src/server/core/settings/services/BlackboxSettingsService.ts`
- [ ] Read settings from `~/.blackboxcli/settings.json`
- [ ] Expose model selection, agent configuration, MCP servers

---

### Phase 3: API & Service Changes

#### 3.1 Remove Claude Code SDK Dependencies
- [ ] Remove `@anthropic-ai/claude-agent-sdk` from dependencies
- [ ] Remove `@anthropic-ai/claude-code` from dependencies
- [ ] Remove `@anthropic-ai/sdk` from dependencies

#### 3.2 Update ClaudeCodeService → BlackboxCliService
- [ ] Create `src/server/core/blackbox-cli/services/BlackboxCliService.ts`
- [ ] Implement Blackbox CLI process management:
  - Start new Blackbox CLI sessions
  - Send messages to running sessions
  - Handle session lifecycle

#### 3.3 Update Session Process Controller
- [ ] Adapt to Blackbox CLI process management

---

### Phase 4: Frontend Changes

#### 4.1 Update Branding & UI Text
- [ ] Update all "Claude Code" references to "Blackbox AI CLI"
- [ ] Update logos and icons
- [ ] Update documentation and help text

#### 4.2 Update Settings UI
- [ ] Add Blackbox-specific settings:
  - Model selection (from `settings.json`)
  - Agent selection
  - MCP server configuration

#### 4.3 Update Session Display
- [ ] Adapt message rendering for Blackbox format
- [ ] Handle function calls/responses in Blackbox format

---

### Phase 5: Features to Adapt

#### 5.1 Keep Working
- Session log viewing
- Project management (adapted)
- Search functionality
- Git operations
- Terminal panel
- File preview
- Todo viewer (read from `~/.blackboxcli/todos/`)

#### 5.2 Needs Adaptation
- Session start/resume (different CLI command)
- Tool approval (different permission model)
- Model selection (different models available)

---

### Phase 6: Testing & Documentation

#### 6.1 Update Tests
- [ ] Update all test fixtures to use Blackbox format
- [ ] Update mock data directories
- [ ] Update E2E tests

#### 6.2 Update Documentation
- [ ] Update README.md
- [ ] Update CLAUDE.md → BLACKBOX.md
- [ ] Update docs/dev.md
- [ ] Update PRIVACY.md

---

## Environment Variables Mapping

| Claude Code Viewer | Blackbox CLI Viewer |
|-------------------|---------------------|
| `CCV_PASSWORD` | `BBCV_PASSWORD` |
| `CCV_CC_EXECUTABLE_PATH` | `BBCV_EXECUTABLE_PATH` |
| `CCV_GLOBAL_CLAUDE_DIR` | `BBCV_GLOBAL_BLACKBOX_DIR` |
| `CCV_TERMINAL_DISABLED` | `BBCV_TERMINAL_DISABLED` |
| `CCV_API_ONLY` | `BBCV_API_ONLY` |

---

## Estimated Effort

| Phase | Estimated Hours |
|-------|-----------------|
| Phase 1: Core Infrastructure | 4-6 hours |
| Phase 2: Data Layer | 8-12 hours |
| Phase 3: API & Services | 6-8 hours |
| Phase 4: Frontend | 4-6 hours |
| Phase 5: Feature Adaptation | 4-8 hours |
| Phase 6: Testing & Docs | 4-6 hours |
| **Total** | **30-46 hours** |

---

## Next Steps

1. **Confirm the plan** - Review and approve this plan
2. **Start implementation** - Begin with Phase 1

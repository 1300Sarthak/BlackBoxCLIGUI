# Blackbox CLI Viewer

A full-featured web-based Blackbox AI CLI client that provides complete interactive functionality for managing Blackbox AI CLI projects. Start new conversations, resume existing sessions, monitor running tasks in real-time, and browse your conversation history—all through a modern web interface.

[![License](https://img.shields.io/github/license/1300Sarthak/BlackBoxCLIGUI)](https://github.com/1300Sarthak/BlackBoxCLIGUI/blob/main/LICENSE)

## Introduction

Blackbox CLI Viewer is a web-based Blackbox AI CLI client focused on **comprehensive session log analysis**. It preserves and organizes all conversation data through strict schema validation and a progressive disclosure UI that reveals details on demand.

**Core Philosophy**: Zero data loss + Effective organization + Remote-friendly design

## Features

| Feature | Description |
| --- | --- |
| View Chat Logs | View Blackbox AI CLI session logs in real-time through the web UI. Supports historical logs from the Blackbox CLI data directory (~/.blackboxcli/...) |
| Search Conversations | Full-text search across conversations with \`⌘K\` (macOS) or \`Ctrl+K\` (Linux). Search within a specific project or across all projects. |
| Start Conversations | Start Blackbox AI CLI sessions directly from the viewer |
| Resume Sessions | Resume conversations directly from existing session logs |
| File Upload & Preview | Upload images, PDFs, and text files directly from the chat interface |
| Review Changes | Built-in Git Diff Viewer lets you review all changes directly within the viewer |
| Commit Changes | Execute Git commits directly from the web interface |
| Terminal Panel | Bottom panel terminal over WebSocket for running shell commands without leaving the UI |
| Multi-language Support | Full internationalization support (English, Japanese, Chinese) |

## Installation & Usage

### Prerequisites

- **Node.js**: Version 20.19.0 or later
- **Blackbox AI CLI**: Install from [blackbox.ai/cli](https://www.blackbox.ai/cli)

### Quick Start (CLI)

Run directly from npm without installation:

\`\`\`bash
npx @sarthak/blackbox-cli-viewer@latest --port 3400
\`\`\`

Alternatively, install globally:

\`\`\`bash
npm install -g @sarthak/blackbox-cli-viewer
blackbox-cli-viewer --port 3400
\`\`\`

The server will start on port 3400 (or the default port 3000). Open \`http://localhost:3400\` in your browser to access the interface.

**Available Options:**

\`\`\`bash
blackbox-cli-viewer [options]

Options:
  -p, --port <port>                Port to listen on (default: 3000)
  -h, --hostname <hostname>        Hostname to listen on (default: localhost)
  -P, --password <password>        Password for authentication
  -e, --executable <executable>    Path to Blackbox AI CLI executable
  --blackbox-dir <blackbox-dir>    Path to Blackbox directory
  --terminal-disabled              Disable the in-app terminal panel
  --terminal-shell <path>          Shell executable for terminal sessions
  --terminal-unrestricted          Disable restricted shell flags for bash
  --api-only                       Run in API-only mode without Web UI
\`\`\`

### Docker Deployment

Build the image locally:

\`\`\`bash
docker build -t blackbox-cli-viewer .
\`\`\`

Run the container directly:

\`\`\`bash
docker run --rm -p 3400:3400 \\
  -e PORT=3400 \\
  -e BBCV_PASSWORD=your-password \\
  -v ~/.blackboxcli:/root/.blackboxcli \\
  blackbox-cli-viewer
\`\`\`

## Data Source

The application reads Blackbox AI CLI conversation logs from:

| Data Type | Location | Format |
|-----------|----------|--------|
| Session Logs | \`~/.blackboxcli/tmp/<hash>/logs.json\` | JSON array of messages |
| Checkpoints | \`~/.blackboxcli/tmp/<hash>/checkpoint-session-*.json\` | JSON array |
| Settings | \`~/.blackboxcli/settings.json\` | JSON object |
| Todos | \`~/.blackboxcli/todos/<session-id>.json\` | JSON object |

### Message Format

Blackbox CLI uses a simple message format:

\`\`\`json
{
  "sessionId": "session-uuid",
  "messageId": 0,
  "type": "user",
  "message": "Hello, how are you?",
  "timestamp": "2026-03-04T12:00:00.000Z"
}
\`\`\`

## Requirements

### System Requirements

- **Node.js**: Version 20.19.0 or later
- **Operating Systems**: macOS and Linux (Windows is not supported)

### Blackbox AI CLI Compatibility

- **Minimum Version**: Blackbox AI CLI latest version

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`BBCV_ENV\` | Environment mode (development/production) | production |
| \`PORT\` | Server port | 3000 |
| \`HOSTNAME\` | Server hostname | localhost |
| \`BBCV_PASSWORD\` | Authentication password | (none) |
| \`BBCV_BB_EXECUTABLE_PATH\` | Path to Blackbox CLI | (auto-detect) |
| \`BBCV_GLOBAL_BLACKBOX_DIR\` | Path to Blackbox directory | ~/.blackboxcli |
| \`BBCV_TERMINAL_DISABLED\` | Disable terminal panel | (unset) |
| \`BBCV_TERMINAL_SHELL\` | Shell executable | (auto-detect) |
| \`BBCV_TERMINAL_UNRESTRICTED\` | Unrestricted shell mode | (unset) |
| \`BBCV_API_ONLY\` | API-only mode | (unset) |

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Chat    │ │ Session │ │ Git     │ │ Search  │           │
│  │ View    │ │ List    │ │ Diff    │ │ Dialog  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Hono/Effect)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ BlackboxCli │ │ Session     │ │ Project     │           │
│  │ Service     │ │ Repository  │ │ Repository  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                          │ File System
┌─────────────────────────────────────────────────────────────┐
│                    Blackbox CLI Data                         │
│  ~/.blackboxcli/                                             │
│  ├── tmp/<hash>/logs.json                                    │
│  ├── settings.json                                           │
│  └── todos/<session-id>.json                                 │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Development

### Setup

\`\`\`bash
# Clone the repository
git clone https://github.com/1300Sarthak/BlackBoxCLIGUI.git
cd BlackBoxCLIGUI

# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run dev
\`\`\`

### Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run build\` | Build the project for production |
| \`npm run dev\` | Start development server |
| \`npm run typecheck\` | Run TypeScript type checking |
| \`npm run lint\` | Run linting |
| \`npm run test\` | Run tests |

## Privacy

For information about privacy and network communication, see [PRIVACY.md](./PRIVACY.md).

## License

This project is available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'feat: add amazing feature

Co-authored-by: Qwen-Coder <qwen-coder@alibabacloud.com>'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## Attribution

This project is a fork of [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) by [@d-kimuson](https://github.com/d-kimuson), adapted to work with Blackbox AI CLI.

### Key Changes from Original

- Data layer adapted to read from \`~/.blackboxcli/\` instead of \`~/.claude/\`
- Session format parsing changed from JSONL to JSON
- Removed Anthropic SDK dependencies
- Branding updated throughout
- Configuration paths and environment variables renamed (CCV_* → BBCV_*)

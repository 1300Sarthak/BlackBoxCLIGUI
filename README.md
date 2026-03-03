# Blackbox CLI Viewer

A full-featured web-based Blackbox AI CLI client that provides complete interactive functionality for managing Blackbox AI CLI projects. Start new conversations, resume existing sessions, monitor running tasks in real-time, and browse your conversation history—all through a modern web interface.

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
| Multi-language Support | Full internationalization support |

## Installation & Usage

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
  --api-only                       Run in API-only mode without Web UI
\`\`\`

### Docker Deployment

Build the image locally:

\`\`\`bash
docker build -t blackbox-cli-viewer .
\`\`\`

Run the container directly:

\`\`\`bash
docker run --rm -p 3400:3400 \
  -e PORT=3400 \
  -e BBCV_PASSWORD=your-password \
  blackbox-cli-viewer
\`\`\`

## Data Source

The application reads Blackbox AI CLI conversation logs from:

- **Location**: \`~/.blackboxcli/tmp/<hash>/logs.json\`
- **Format**: JSON files containing conversation entries
- **Auto-detection**: Automatically discovers new projects and sessions

## Requirements

### System Requirements

- **Node.js**: Version 20.19.0 or later
- **Operating Systems**: macOS and Linux (Windows is not supported)

### Blackbox AI CLI Compatibility

- **Minimum Version**: Blackbox AI CLI latest version

### Environment Variables

**BBCV_ENV Consideration**: If you have \`BBCV_ENV=development\` set in your environment, the application will start in development mode. For production use, set \`BBCV_ENV=production\` or leave it unset.

## Configuration

### Command-Line Options and Environment Variables

| Command-Line Option | Environment Variable | Description | Default |
| --- | --- | --- | --- |
| \`-p, --port <port>\` | \`PORT\` | Port number for the viewer to run on | \`3000\` |
| \`-h, --hostname <hostname>\` | \`HOSTNAME\` | Hostname to listen on for remote access | \`localhost\` |
| \`-P, --password <password>\` | \`BBCV_PASSWORD\` | Password for authentication | (none) |
| \`-e, --executable <executable>\` | \`BBCV_BB_EXECUTABLE_PATH\` | Path to Blackbox AI CLI installation | (auto-detect) |
| \`--blackbox-dir <blackbox-dir>\` | \`BBCV_GLOBAL_BLACKBOX_DIR\` | Path to Blackbox directory | \`~/.blackboxcli\` |
| \`--terminal-disabled\` | \`BBCV_TERMINAL_DISABLED\` | Disable the in-app terminal panel | (unset) |
| \`--terminal-shell <path>\` | \`BBCV_TERMINAL_SHELL\` | Shell executable for terminal sessions | (auto-detect) |
| \`--terminal-unrestricted\` | \`BBCV_TERMINAL_UNRESTRICTED\` | Disable restricted shell flags for bash | (unset) |
| \`--api-only\` | \`BBCV_API_ONLY\` | Run in API-only mode | (unset) |

## Privacy

For information about privacy and network communication, see [PRIVACY.md](./PRIVACY.md).

## License

This project is available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Attribution

This project is a fork of [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) by [@d-kimuson](https://github.com/d-kimuson), adapted to work with Blackbox AI CLI.

---
globs: ["src/main/**/*.ts"]
description: "Electron main process rules"
---

# Electron Main Process Rules

You are in the Electron MAIN PROCESS (Node.js context).

## Critical Rules
- This is Node.js - you have full access to Node APIs (fs, path, os, etc.)
- All network requests (REST API, WebSocket) happen HERE
- Use `ipcMain.handle()` for async operations returning data
- Use `ipcMain.on()` for fire-and-forget messages
- NEVER expose raw ipcRenderer - use contextBridge in preload.ts
- WebSocket connections managed via singleton WebSocketManager
- API calls use axios with 10s timeout

## IPC Channel Naming
- `bitunix:*` for Bitunix API operations
- `system:*` for system information
- `window:*` for window controls

## Performance
- WebSocket updates throttled to 4/sec (250ms intervals)
- Cache mainWindow reference (don't call getAllWindows() repeatedly)
- Clean up all intervals/timeouts on disconnect/cleanup

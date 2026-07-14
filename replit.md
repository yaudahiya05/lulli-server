# lulli-server (Jadibot Developer Console)

A WhatsApp bot dashboard server for remotely managing and monitoring bots in real time.

## Stack
- **Runtime**: Node.js 20 (ESM)
- **Server**: Express + Socket.io
- **Messaging**: MQTT over TLS (HiveMQ cloud)
- **Frontend**: Vanilla HTML/CSS/JS in `public/` and `index.html`

## How to run
```
node index.js
```
Starts the HTTP + WebSocket server on port 5000.

## Key files
- `index.js` — main server (Express routes, MQTT client, Socket.io handlers)
- `index.html` — single-page dashboard UI
- `public/script.js` — client-side logic
- `public/style.css` — styles

## User preferences
<!-- Add any preferences here -->

const { WebSocketServer } = require('ws');
const { resolveUserFromToken, getTokenFromCookieHeader } = require('../middleware/auth');

const sseChannels = new Map(); // userId -> Set<ServerResponse>
const wsChannels = new Map(); // userId -> Set<WebSocket>

const toUserId = (value) => Number(value);

function getMapChannel(map, userId) {
  const id = toUserId(userId);
  if (!map.has(id)) map.set(id, new Set());
  return map.get(id);
}

function cleanupChannel(map, userId, client) {
  const id = toUserId(userId);
  const channel = map.get(id);
  if (!channel) return;
  channel.delete(client);
  if (channel.size === 0) map.delete(id);
}

function registerSseClient(userId, res) {
  getMapChannel(sseChannels, userId).add(res);
}

function unregisterSseClient(userId, res) {
  cleanupChannel(sseChannels, userId, res);
}

function registerWsClient(userId, socket) {
  getMapChannel(wsChannels, userId).add(socket);
}

function unregisterWsClient(userId, socket) {
  cleanupChannel(wsChannels, userId, socket);
}

function writeSseEvent(res, event, payload) {
  const envelope = payload && typeof payload === 'object' && payload.type
    ? payload
    : {
        type: event,
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        data: payload || {},
      };
  const data = JSON.stringify(envelope);
  if (envelope.id) {
    res.write(`id: ${envelope.id}\n`);
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
}

function pushEvent(userId, event, payload) {
  const id = toUserId(userId);
  const sseClients = sseChannels.get(id);
  const wsClients = wsChannels.get(id);

  if (sseClients?.size) {
    for (const client of [...sseClients]) {
      try {
        writeSseEvent(client, event, payload);
      } catch {
        unregisterSseClient(id, client);
      }
    }
  }

  if (wsClients?.size) {
    const envelope = payload && typeof payload === 'object' && payload.type
      ? payload
      : {
          type: event,
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          data: payload || {},
        };
    const message = JSON.stringify(envelope);
    for (const socket of [...wsClients]) {
      try {
        if (socket.readyState === socket.OPEN) socket.send(message);
        else unregisterWsClient(id, socket);
      } catch {
        unregisterWsClient(id, socket);
      }
    }
  }
}

function setupNotificationWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    const devOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];
    for (const origin of devOrigins) {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    }
  }

  httpServer.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/api/notifications/ws') return;
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.includes(origin)) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      const token = getTokenFromCookieHeader(req.headers.cookie || '');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const user = await resolveUserFromToken(token);
      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.userId = user.id;
        registerWsClient(user.id, ws);

        ws.send(JSON.stringify({ event: 'connected', payload: { ok: true } }));

        ws.on('pong', () => { ws.isAlive = true; });
        ws.on('close', () => unregisterWsClient(user.id, ws));
        ws.on('error', () => unregisterWsClient(user.id, ws));
      });
    } catch {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  const heartbeat = setInterval(() => {
    for (const [userId, sockets] of wsChannels.entries()) {
      for (const ws of [...sockets]) {
        if (ws.isAlive === false) {
          try { ws.terminate(); } catch {}
          unregisterWsClient(userId, ws);
          continue;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch { unregisterWsClient(userId, ws); }
      }
    }
  }, 25000);

  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

module.exports = {
  registerSseClient,
  unregisterSseClient,
  pushEvent,
  setupNotificationWebSocket,
};

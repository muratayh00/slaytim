const roomChannels = new Map(); // roomId -> Set<ServerResponse>
const roomPresence = new Map();  // roomId -> Map<userId, username>

const getRoomChannel = (roomId) => {
  const key = String(roomId);
  if (!roomChannels.has(key)) roomChannels.set(key, new Set());
  return roomChannels.get(key);
};

const cleanupRoomChannel = (roomId, res) => {
  const key = String(roomId);
  const channel = roomChannels.get(key);
  if (!channel) return;
  if (res) channel.delete(res);
  if (channel.size === 0) roomChannels.delete(key);
};

const writeEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcastPresence = (roomId) => {
  const channel = roomChannels.get(String(roomId));
  if (!channel || channel.size === 0) return;
  const presence = roomPresence.get(String(roomId));
  const onlineCount = presence ? presence.size : 0;
  const onlineUsers = presence ? [...presence.values()] : [];
  for (const client of [...channel]) {
    try {
      writeEvent(client, 'presence', { onlineCount, onlineUsers });
    } catch {
      unregisterRoomSseClient(roomId, client);
    }
  }
};

const registerRoomSseClient = (roomId, res, userId, username) => {
  getRoomChannel(roomId).add(res);

  // Track presence
  const key = String(roomId);
  if (!roomPresence.has(key)) roomPresence.set(key, new Map());
  if (userId) roomPresence.get(key).set(String(userId), username || 'Kullanıcı');

  broadcastPresence(roomId);
};

const unregisterRoomSseClient = (roomId, res, userId) => {
  cleanupRoomChannel(roomId, res);

  // Remove from presence
  const key = String(roomId);
  if (userId && roomPresence.has(key)) {
    roomPresence.get(key).delete(String(userId));
    if (roomPresence.get(key).size === 0) roomPresence.delete(key);
  }

  broadcastPresence(roomId);
};

const pushRoomMessage = (roomId, message) => {
  const channel = roomChannels.get(String(roomId));
  if (!channel || channel.size === 0) return;

  for (const client of [...channel]) {
    try {
      writeEvent(client, 'room_message', { message });
    } catch {
      unregisterRoomSseClient(roomId, client);
    }
  }
};

const getRoomPresence = (roomId) => {
  const presence = roomPresence.get(String(roomId));
  return {
    onlineCount: presence ? presence.size : 0,
    onlineUsers: presence ? [...presence.values()] : [],
  };
};

module.exports = {
  registerRoomSseClient,
  unregisterRoomSseClient,
  pushRoomMessage,
  getRoomPresence,
};

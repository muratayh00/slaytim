const roomChannels = new Map(); // roomId -> Set<ServerResponse>

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

const registerRoomSseClient = (roomId, res) => {
  getRoomChannel(roomId).add(res);
};

const unregisterRoomSseClient = (roomId, res) => {
  cleanupRoomChannel(roomId, res);
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

module.exports = {
  registerRoomSseClient,
  unregisterRoomSseClient,
  pushRoomMessage,
};

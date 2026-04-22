const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { sanitizeText } = require('../lib/sanitize');
const { toSlug, uniqueSlug } = require('../lib/slug');
const logger = require('../lib/logger');
const {
  registerRoomSseClient,
  unregisterRoomSseClient,
  pushRoomMessage,
  getRoomPresence,
} = require('../services/room-chat-stream.service');

const roomSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, username: true, avatarUrl: true } },
  _count: { select: { members: true } },
};

const MAX_OWNED_ROOMS = 2;

/**
 * Resolves a room by either numeric ID or slug string.
 * Returns { id } (numeric) or null if not found.
 */
const resolveRoom = async (idOrSlug) => {
  const trimmed = String(idOrSlug || '').trim();
  if (!trimmed) return null;

  const numericId = Number(trimmed);
  if (Number.isInteger(numericId) && numericId > 0) {
    return prisma.room.findUnique({ where: { id: numericId }, select: { id: true } });
  }
  return prisma.room.findUnique({ where: { slug: trimmed }, select: { id: true } });
};

const normalizeRoomPassword = (value) => {
  const password = String(value || '').trim();
  if (!password) return null;
  return password;
};

const getAll = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const where = {
      isPublic: true,
      ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
    };
    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: roomSelect,
      take: 100,
    });
    if (!req.user?.id) return res.json({ rooms });

    const followRows = await prisma.roomMember.findMany({
      where: { userId: req.user.id, roomId: { in: rooms.map((r) => r.id) } },
      select: { roomId: true },
    });
    const followed = new Set(followRows.map((r) => r.roomId));
    res.json({
      rooms: rooms.map((room) => ({ ...room, isFollowing: followed.has(room.id) })),
    });
  } catch (err) {
    logger.error('Failed to fetch rooms', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

const getMine = async (req, res) => {
  try {
    const memberships = await prisma.roomMember.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { room: { select: roomSelect } },
      take: 100,
    });
    res.json({ rooms: memberships.map((m) => ({ ...m.room, memberRole: m.role })) });
  } catch (err) {
    logger.error('Failed to fetch your rooms', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch your rooms' });
  }
};

const getOne = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const id = resolved.id;
    const room = await prisma.room.findUnique({
      where: { id },
      select: {
        ...roomSelect,
        members: {
          take: 50,
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            createdAt: true,
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const viewerIsMember = req.user?.id
      ? Boolean(await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId: id, userId: req.user.id } },
          select: { id: true },
        }))
      : false;

    if (!room.isPublic && !viewerIsMember) {
      return res.status(200).json({
        id: room.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        isPublic: false,
        requiresPassword: true,
        owner: room.owner,
        _count: room._count,
        viewerIsMember: false,
      });
    }

    res.json({ ...room, viewerIsMember });
  } catch (err) {
    logger.error('Failed to fetch room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

const create = async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 100);
    const description = sanitizeText(req.body?.description, 500) || null;
    const isPublic = req.body?.isPublic !== false;
    const accessPassword = normalizeRoomPassword(req.body?.accessPassword);
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!isPublic) {
      if (!accessPassword || accessPassword.length < 4) {
        return res.status(400).json({ error: 'Kapali oda icin en az 4 karakter sifre gerekli' });
      }
    }

    const ownedRoomCount = await prisma.room.count({
      where: { ownerId: req.user.id },
    });
    if (ownedRoomCount >= MAX_OWNED_ROOMS) {
      return res.status(400).json({
        error: `En fazla ${MAX_OWNED_ROOMS} oda acabilirsin`,
        code: 'ROOM_LIMIT_REACHED',
        maxRooms: MAX_OWNED_ROOMS,
      });
    }

    const slug = await uniqueSlug(prisma.room, toSlug(name));
    const passwordHash = !isPublic && accessPassword ? await bcrypt.hash(accessPassword, 10) : null;
    const room = await prisma.room.create({
      data: {
        ownerId: req.user.id,
        name,
        slug,
        description,
        isPublic,
        accessPasswordHash: passwordHash,
        members: {
          create: [{ userId: req.user.id, role: 'owner' }],
        },
      },
      select: roomSelect,
    });
    res.status(201).json(room);
  } catch (err) {
    logger.error('Failed to create room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const update = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const id = resolved.id;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const data = {};
    if (req.body?.name !== undefined) {
      const name = sanitizeText(req.body?.name, 100);
      if (!name) return res.status(400).json({ error: 'Invalid name' });
      data.name = name;
      data.slug = await uniqueSlug(prisma.room, toSlug(name), id);
    }
    if (req.body?.description !== undefined) data.description = sanitizeText(req.body?.description, 500) || null;
    if (req.body?.isPublic !== undefined) data.isPublic = Boolean(req.body?.isPublic);

    const nextIsPublic = data.isPublic === undefined ? room.isPublic : data.isPublic;
    if (!nextIsPublic) {
      const accessPassword = normalizeRoomPassword(req.body?.accessPassword);
      if (accessPassword) {
        data.accessPasswordHash = await bcrypt.hash(accessPassword, 10);
      } else if (!room.accessPasswordHash) {
        return res.status(400).json({ error: 'Kapali oda icin sifre zorunlu' });
      }
    } else if (data.isPublic === true) {
      data.accessPasswordHash = null;
    }

    const updated = await prisma.room.update({ where: { id }, data, select: roomSelect });
    res.json(updated);
  } catch (err) {
    logger.error('Failed to update room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const join = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.isPublic) {
      const password = normalizeRoomPassword(req.body?.password);
      if (!password || !room.accessPasswordHash) {
        return res.status(403).json({ error: 'Bu oda sifre korumali' });
      }
      const ok = await bcrypt.compare(password, room.accessPasswordHash);
      if (!ok) return res.status(403).json({ error: 'Oda sifresi hatali' });
    }

    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId, userId: req.user.id } },
      create: { roomId, userId: req.user.id, role: 'member' },
      update: {},
    });
    res.json({ joined: true });
  } catch (err) {
    logger.error('Failed to join room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to join room' });
  }
};

const accessByName = async (req, res) => {
  try {
    const rawName = sanitizeText(req.body?.name, 100);
    const password = normalizeRoomPassword(req.body?.password);
    if (!rawName || !password) return res.status(400).json({ error: 'Oda adi ve sifre gerekli' });

    const normalizedSlug = toSlug(rawName);
    const room = await prisma.room.findFirst({
      where: {
        isPublic: false,
        OR: [
          { name: rawName },
          { slug: normalizedSlug },
        ],
      },
      select: { id: true, slug: true, accessPasswordHash: true },
    });

    if (!room || !room.accessPasswordHash) {
      return res.status(404).json({ error: 'Kapali oda bulunamadi' });
    }

    const ok = await bcrypt.compare(password, room.accessPasswordHash);
    if (!ok) return res.status(403).json({ error: 'Oda sifresi hatali' });

    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
      create: { roomId: room.id, userId: req.user.id, role: 'member' },
      update: {},
    });

    res.json({ joined: true, roomId: room.id, slug: room.slug });
  } catch (err) {
    logger.error('Odaya giris basarisiz', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Odaya giris basarisiz' });
  }
};

const leave = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId === req.user.id) {
      return res.status(400).json({ error: 'Owner cannot leave room' });
    }

    await prisma.roomMember.deleteMany({
      where: { roomId, userId: req.user.id },
    });
    res.json({ joined: false });
  } catch (err) {
    logger.error('Failed to leave room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to leave room' });
  }
};

const follow = async (req, res) => join(req, res);
const unfollow = async (req, res) => leave(req, res);

const deleteRoom = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const room = await prisma.room.findUnique({ where: { id: resolved.id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.room.delete({ where: { id: resolved.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete room', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;

    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await prisma.roomMessage.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.roomId !== roomId) return res.status(400).json({ error: 'Message does not belong to this room' });

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.id } },
      select: { role: true },
    });
    const isOwnerOrAdmin = membership?.role === 'owner' || req.user.isAdmin;
    if (message.userId !== req.user.id && !isOwnerOrAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.roomMessage.delete({ where: { id: messageId } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete message', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

const ensureRoomMember = async (roomId, userId) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isPublic: true, ownerId: true },
  });
  if (!room) return { error: { code: 404, message: 'Room not found' } };

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { id: true, role: true },
  });
  if (!membership) return { error: { code: 403, message: 'Room membership required' } };
  return { room, membership };
};

const getMessages = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;
    const { error } = await ensureRoomMember(roomId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    const beforeId = Number(req.query.beforeId || 0);
    const limit = Math.max(10, Math.min(80, Number(req.query.limit || 30)));
    const where = {
      roomId,
      ...(Number.isInteger(beforeId) && beforeId > 0 ? { id: { lt: beforeId } } : {}),
    };

    const rows = await prisma.roomMessage.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    const messages = rows.reverse();
    const nextBeforeId = rows.length ? rows[rows.length - 1].id : null;
    return res.json({ messages, nextBeforeId, hasMore: rows.length === limit });
  } catch (err) {
    logger.error('Failed to fetch room messages', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to fetch room messages' });
  }
};

const createMessage = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;
    const { error } = await ensureRoomMember(roomId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    const content = sanitizeText(req.body?.content, 1500);
    if (!content || content.length < 1) {
      return res.status(400).json({ error: 'Mesaj boş olamaz' });
    }

    const message = await prisma.roomMessage.create({
      data: {
        roomId,
        userId: req.user.id,
        content,
      },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    pushRoomMessage(roomId, message);
    return res.status(201).json({ message });
  } catch (err) {
    logger.error('Failed to create room message', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to create room message' });
  }
};

const streamMessages = async (req, res) => {
  try {
    const resolved = await resolveRoom(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Room not found' });
    const roomId = resolved.id;
    const { error } = await ensureRoomMember(roomId, req.user.id);
    if (error) return res.status(error.code).json({ error: error.message });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const { onlineCount, onlineUsers } = getRoomPresence(roomId);
    res.write(`event: ready\ndata: ${JSON.stringify({ roomId, ok: true, onlineCount, onlineUsers })}\n\n`);

    registerRoomSseClient(roomId, res, req.user.id, req.user.username);
    const heartbeat = setInterval(() => {
      if (res.writableEnded) return;
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unregisterRoomSseClient(roomId, res, req.user.id);
    });
  } catch (err) {
    logger.error('Failed to open room stream', { error: err.message, stack: err.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to open room stream' });
    }
  }
};

module.exports = {
  getAll,
  getMine,
  getOne,
  create,
  update,
  join,
  leave,
  follow,
  unfollow,
  accessByName,
  deleteRoom,
  deleteMessage,
  getMessages,
  createMessage,
  streamMessages,
};

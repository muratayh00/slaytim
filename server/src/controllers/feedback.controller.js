const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');

const DATA_DIR = path.join(__dirname, '../../data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedbacks.jsonl');

const VALID_TYPES = ['general', 'feature', 'bug'];

const submit = async (req, res) => {
  try {
    const { type, message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Mesaj zorunlu' });
    }

    const entry = JSON.stringify({
      type: VALID_TYPES.includes(type) ? type : 'general',
      message: String(message).slice(0, 1000).trim(),
      userId: req.user?.id || null,
      ip: req.ip,
      createdAt: new Date().toISOString(),
    });

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    await fs.promises.appendFile(FEEDBACK_FILE, entry + '\n', 'utf8');

    res.json({ ok: true });
  } catch (err) {
    logger.error('Failed to save feedback', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Geri bildirim kaydedilemedi' });
  }
};

module.exports = { submit };

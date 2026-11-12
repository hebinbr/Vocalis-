/**
 * Vocalis - Background Web Worker de Lembretes Vocais
 * Executa em thread isolada que NÃO sofre o throttling agressivo
 * imposto pelos navegadores em abas em segundo plano.
 * Checa os horários agendados a cada 10 segundos e emite eventos de disparo.
 */

let reminders = [];
let firedMap = new Set();
let timerId = null;

const DAY_MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function checkReminders() {
  const now = new Date();
  const dayIndex = now.getDay();
  const currentDay = DAY_MAP[dayIndex];
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;
  const dateStr = now.toISOString().split('T')[0];

  for (const rem of reminders) {
    if (!rem.is_active) continue;

    // Verifica se hoje está nos dias da semana selecionados
    const days = Array.isArray(rem.days_mask) ? rem.days_mask : [];
    if (!days.includes(currentDay)) continue;

    // Verifica se bate com o horário programado
    if (rem.time_str === currentTime) {
      const triggerKey = `${rem.id}_${dateStr}_${currentTime}`;
      if (!firedMap.has(triggerKey)) {
        firedMap.add(triggerKey);
        
        self.postMessage({
          type: 'TRIGGER_REMINDER',
          reminder: rem,
          currentTime,
          currentDay,
          dateStr
        });
      }
    }
  }

  // Limpa chaves antigas se o conjunto crescer muito (>200)
  if (firedMap.size > 200) {
    const todayPrefix = dateStr;
    const nextFired = new Set();
    for (const key of firedMap) {
      if (key.includes(todayPrefix)) {
        nextFired.add(key);
      }
    }
    firedMap = nextFired;
  }
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SET_REMINDERS') {
    reminders = Array.isArray(payload) ? payload : [];
    checkReminders();
  }

  if (type === 'START') {
    if (!timerId) {
      timerId = setInterval(checkReminders, 10000); // 10 segundos
      checkReminders();
    }
  }

  if (type === 'STOP') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  if (type === 'TEST_TRIGGER') {
    const dummy = payload || {
      id: 99999,
      title: 'Lembrete de Teste Vocal',
      category: 'aquecimento',
      sound_alert: true,
      time_str: 'Agora'
    };
    self.postMessage({
      type: 'TRIGGER_REMINDER',
      reminder: dummy,
      currentTime: 'Agora',
      isTest: true
    });
  }
});

// Inicia o loop imediatamente ao instanciar
timerId = setInterval(checkReminders, 10000);

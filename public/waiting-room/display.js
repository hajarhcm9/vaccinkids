(function () {
  const tokenKey = 'vaccinkids.waitingRoom.accessToken';
  const centreKey = 'vaccinkids.waitingRoom.centreId';
  const state = {
    token: localStorage.getItem(tokenKey),
    centreId: localStorage.getItem(centreKey),
    timer: null,
  };

  const setupView = document.getElementById('setupView');
  const displayView = document.getElementById('displayView');
  const setupForm = document.getElementById('setupForm');
  const connectButton = document.getElementById('connectButton');
  const exitButton = document.getElementById('exitButton');
  const setupError = document.getElementById('setupError');
  const displayError = document.getElementById('displayError');
  const currentNumber = document.getElementById('currentNumber');
  const currentName = document.getElementById('currentName');
  const nextList = document.getElementById('nextList');
  const waitingCount = document.getElementById('waitingCount');
  const totalCount = document.getElementById('totalCount');
  const pendingCount = document.getElementById('pendingCount');
  const doneCount = document.getElementById('doneCount');
  const clockTime = document.getElementById('clockTime');
  const syncTime = document.getElementById('syncTime');

  function setError(target, message) {
    target.textContent = message || '';
  }

  function escapeHtml(value) {
    return String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function unwrap(response) {
    return response && response.data !== undefined ? response.data : response;
  }

  async function api(path, options) {
    const response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options && options.headers ? options.headers : {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || `Requete echouee (${response.status})`);
    }
    return payload;
  }

  function showSetup() {
    displayView.classList.add('hidden');
    setupView.classList.remove('hidden');
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  function showDisplay() {
    setupView.classList.add('hidden');
    displayView.classList.remove('hidden');
  }

  function entryName(entry) {
    return [entry.bebe_prenom, entry.bebe_nom].filter(Boolean).join(' ') || 'Patient';
  }

  function renderQueue(entries) {
    const serving = entries.find((entry) => entry.statut === 'EN_COURS');
    const waiting = entries.filter((entry) => entry.statut === 'EN_ATTENTE');
    const done = entries.filter((entry) => entry.statut === 'TERMINE');

    currentNumber.textContent = serving ? String(serving.numero_attente).padStart(2, '0') : '--';
    currentName.textContent = serving ? entryName(serving) : 'Aucun enfant appele';

    waitingCount.textContent = `${waiting.length} en attente`;
    totalCount.textContent = String(entries.length);
    pendingCount.textContent = String(waiting.length);
    doneCount.textContent = String(done.length);

    if (waiting.length === 0) {
      nextList.innerHTML = '<li class="empty">La file est vide pour le moment.</li>';
      return;
    }

    nextList.innerHTML = waiting
      .slice(0, 9)
      .map(
        (entry) => `
          <li>
            <strong>${escapeHtml(String(entry.numero_attente).padStart(2, '0'))}</strong>
            <span>${escapeHtml(entryName(entry))}</span>
          </li>
        `,
      )
      .join('');
  }

  async function refreshQueue() {
    if (!state.centreId) return;
    setError(displayError, '');

    try {
      const payload = await api(`/api/file-attente/centre/${encodeURIComponent(state.centreId)}`);
      const data = unwrap(payload) || {};
      renderQueue(Array.isArray(data.entries) ? data.entries : []);
      syncTime.textContent = `Mis a jour ${new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch (error) {
      setError(displayError, error.message);
      if (/401|403|token|auth/i.test(error.message)) {
        localStorage.removeItem(tokenKey);
        state.token = null;
        showSetup();
      }
    }
  }

  function tickClock() {
    clockTime.textContent = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleSetup(event) {
    event.preventDefault();
    setError(setupError, '');
    connectButton.disabled = true;

    try {
      const form = new FormData(setupForm);
      const centreId = String(form.get('centreId') || '').trim();
      if (!/^\d+$/.test(centreId)) {
        throw new Error('Centre ID invalide.');
      }

      const payload = await api('/api/auth/personnel/login', {
        method: 'POST',
        body: JSON.stringify({
          cin: form.get('cin'),
          mot_de_passe: form.get('password'),
        }),
      });
      const auth = unwrap(payload) || {};
      const tokens = auth.tokens || auth;
      const user = auth.user || {};
      if (!tokens.accessToken || !['admin', 'infirmier'].includes(user.role)) {
        throw new Error('Compte admin ou infirmier requis.');
      }

      state.token = tokens.accessToken;
      state.centreId = centreId;
      localStorage.setItem(tokenKey, state.token);
      localStorage.setItem(centreKey, state.centreId);

      startDisplay();
    } catch (error) {
      setError(setupError, error.message);
    } finally {
      connectButton.disabled = false;
    }
  }

  function startDisplay() {
    showDisplay();
    tickClock();
    refreshQueue();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(refreshQueue, 10000);
  }

  function handleExit() {
    localStorage.removeItem(tokenKey);
    state.token = null;
    showSetup();
  }

  setupForm.addEventListener('submit', handleSetup);
  exitButton.addEventListener('click', handleExit);
  setInterval(tickClock, 1000);
  tickClock();

  if (state.token && state.centreId) {
    startDisplay();
  } else {
    showSetup();
  }
})();

(function () {
  const state = {
    accessToken: null,
    csrfToken: null,
    refreshPromise: null,
  };

  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginButton');
  const refreshButton = document.getElementById('refreshButton');
  const logoutButton = document.getElementById('logoutButton');
  const loginError = document.getElementById('loginError');
  const dashboardError = document.getElementById('dashboardError');
  const kpiGrid = document.getElementById('kpiGrid');
  const centresTable = document.getElementById('centresTable');
  const personnelTable = document.getElementById('personnelTable');
  const centresCount = document.getElementById('centresCount');
  const personnelCount = document.getElementById('personnelCount');
  const systemList = document.getElementById('systemList');
  const systemStatus = document.getElementById('systemStatus');
  const lastUpdated = document.getElementById('lastUpdated');

  function unwrap(response) {
    return response && response.data !== undefined ? response.data : response;
  }

  function asArray(value, key) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value[key])) return value[key];
    return [];
  }

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

  async function request(path, options) {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}),
        ...(options && options.headers ? options.headers : {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || `Requete echouee (${response.status})`);
    }
    return payload;
  }

  async function refreshSession() {
    if (!state.csrfToken) throw new Error('Session admin expiree.');
    if (!state.refreshPromise) {
      state.refreshPromise = request('/api/auth/web-admin/refresh', {
        method: 'POST',
        headers: { 'X-CSRF-Token': state.csrfToken },
      })
        .then((payload) => {
          const session = unwrap(payload) || {};
          state.accessToken = session.accessToken;
          state.csrfToken = session.csrfToken;
          return state.accessToken;
        })
        .finally(() => {
          state.refreshPromise = null;
        });
    }
    return state.refreshPromise;
  }

  async function api(path, options, retry = true) {
    try {
      return await request(path, options);
    } catch (error) {
      if (retry && state.csrfToken && /401|token|auth|session/i.test(error.message)) {
        await refreshSession();
        return request(path, options);
      }
      throw error;
    }
  }

  function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  }

  function showLogin() {
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
  }

  function saveSession(session) {
    state.accessToken = session.accessToken;
    state.csrfToken = session.csrfToken;
  }

  function clearSession() {
    state.accessToken = null;
    state.csrfToken = null;
  }

  function renderKpis(stats) {
    const items = [
      ['Centres actifs', stats.centres_actifs],
      ['Personnel', stats.total_personnel],
      ['Parents', stats.total_parents],
      ['Bebes', stats.total_bebes],
      ['Sessions a venir', stats.sessions_a_venir],
      ['RDV en attente', stats.rdv_en_attente],
      ['RDV confirmes', stats.rdv_confirmes],
      ['Alertes stock', stats.alertes_stock],
    ];

    kpiGrid.innerHTML = items
      .map(
        ([label, value]) => `
          <dl class="kpi">
            <dt>${label}</dt>
            <dd>${value ?? 0}</dd>
          </dl>
        `,
      )
      .join('');
  }

  function renderCentres(centres) {
    centresCount.textContent = String(centres.length);
    centresTable.innerHTML = centres
      .slice(0, 8)
      .map((centre) => {
        const active = centre.est_actif !== false;
        return `
          <tr>
            <td>${escapeHtml(centre.nom)}</td>
            <td>${escapeHtml(centre.ville || centre.adresse)}</td>
            <td><span class="tag ${active ? 'ok' : 'warn'}">${active ? 'Actif' : 'Inactif'}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  function renderPersonnel(personnel) {
    personnelCount.textContent = String(personnel.length);
    personnelTable.innerHTML = personnel
      .slice(0, 8)
      .map(
        (person) => `
          <tr>
            <td>${escapeHtml([person.prenom, person.nom].filter(Boolean).join(' ') || person.cin)}</td>
            <td>${escapeHtml(person.role)}</td>
            <td>${escapeHtml(person.centre_nom || person.centre_id)}</td>
          </tr>
        `,
      )
      .join('');
  }

  function renderSystem(system) {
    const items = [
      ['Base de donnees', system.dbSize],
      ['Personnel actif', system.activePersonnel],
      ['Uptime DB', formatUptime(system.dbUptime)],
      ['Tables suivies', Object.keys(system.tableCounts || {}).length],
    ];

    systemList.innerHTML = items
      .map(
        ([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `,
      )
      .join('');
  }

  function formatUptime(value) {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([unit, amount]) => `${amount} ${unit}`)
        .join(' ');
    }
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return String(value);
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }

  function formatMemory(value) {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    const bytes = value.heapUsed || value.rss || value.used;
    if (!bytes) return '-';
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  }

  async function loadDashboard() {
    setError(dashboardError, '');
    refreshButton.disabled = true;

    try {
      const [statsRes, centresRes, personnelRes, systemRes] = await Promise.all([
        api('/api/statistiques/dashboard'),
        api('/api/admin/centres'),
        api('/api/admin/personnel'),
        api('/api/admin/system-info'),
      ]);

      const centresData = unwrap(centresRes) || {};
      const personnelData = unwrap(personnelRes) || {};

      renderKpis(unwrap(statsRes) || {});
      renderCentres(asArray(centresData, 'centres'));
      renderPersonnel(asArray(personnelData, 'personnel'));
      renderSystem(unwrap(systemRes) || {});
      systemStatus.textContent = 'API connectee';
      systemStatus.classList.add('ok');
      lastUpdated.textContent = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      setError(dashboardError, error.message);
      if (/401|403|token|auth/i.test(error.message)) {
        clearSession();
        showLogin();
      }
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError(loginError, '');
    loginButton.disabled = true;

    try {
      const form = new FormData(loginForm);
      const payload = await request('/api/auth/web-admin/login', {
        method: 'POST',
        body: JSON.stringify({
          cin: form.get('cin'),
          mot_de_passe: form.get('password'),
        }),
      });
      const session = unwrap(payload) || {};
      if (!session.accessToken || !session.csrfToken) throw new Error('Compte admin requis.');
      saveSession(session);
      showDashboard();
      await loadDashboard();
    } catch (error) {
      clearSession();
      setError(loginError, error.message);
    } finally {
      loginButton.disabled = false;
    }
  }

  async function handleLogout() {
    try {
      if (state.csrfToken) {
        await request('/api/auth/web-admin/logout', {
          method: 'POST',
          headers: { 'X-CSRF-Token': state.csrfToken },
        });
      }
    } finally {
      clearSession();
      showLogin();
    }
  }

  loginForm.addEventListener('submit', handleLogin);
  refreshButton.addEventListener('click', loadDashboard);
  logoutButton.addEventListener('click', handleLogout);

  showLogin();
})();

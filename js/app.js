/* Efficient Planner — amorçage, navigation, actions et rappels */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const Views = EP.Views;
  const esc = U.esc;

  const ROUTES = ['dashboard', 'tasks', 'calendar', 'school', 'work', 'personal', 'settings'];
  const TITLES = {
    dashboard: 'Tableau de bord',
    tasks: 'Tâches',
    calendar: 'Calendrier',
    school: 'École',
    work: 'Travail',
    personal: 'Personnel',
    settings: 'Réglages'
  };

  let lastRouteKey = null;
  let reminderTimer = null;
  const firedReminders = new Set();

  /* ---------------- État d'interface ---------------- */
  function uiState() {
    EP.ui = EP.ui || {};
    if (!EP.ui.tasks) EP.ui.tasks = { q: '', cat: 'all', status: 'open', priority: 'all', sort: 'due' };
    if (!EP.ui.calendar) {
      const settings = Store.get().settings;
      EP.ui.calendar = {
        mode: settings.defaultView || 'month',
        cursor: U.todayKey(),
        cats: { school: true, work: true, personal: true },
        schedules: true,
        scroll: null
      };
    }
    if (!EP.ui.school) EP.ui.school = {
      tab: 'overview', sessionId: null, courseTab: 'tasks',
      workKind: 'all', workCourse: 'all', workStatus: 'open',
      assessmentCourse: 'all', assessmentStatus: 'all', hypo: {}, target: {}
    };
    if (!EP.ui.work) EP.ui.work = { tab: 'projects', project: 'all', status: 'open' };
    if (!EP.ui.personal) EP.ui.personal = { tab: 'overview' };
    return EP.ui;
  }

  /* ---------------- Routage ---------------- */
  function parseHash() {
    const raw = String(location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch (e) { return part; }
    });
    if (!parts.length) return ['dashboard'];
    if (ROUTES.indexOf(parts[0]) < 0) return ['dashboard'];
    return parts;
  }

  function go(hash) {
    const target = hash.charAt(0) === '#' ? hash : '#/' + String(hash).replace(/^\/?/, '');
    if (location.hash === target) render();
    else location.hash = target;
  }

  function routeView(route) {
    const top = route[0];
    const sub = route.slice(1);
    if (top === 'school' || top === 'work') return Views[top](sub);
    if (typeof Views[top] === 'function') return Views[top](sub);
    return Views.dashboard(sub);
  }

  function errorView(message) {
    return {
      title: 'Erreur',
      html: '<div class="view-inner"><section class="card">' + UI.empty(
        'alert',
        'Cette vue n\'a pas pu s\'afficher',
        message || 'Une erreur inattendue est survenue.',
        '<button type="button" class="btn btn-primary" data-action="app:reload">Recharger la vue</button>'
      ) + '</section></div>'
    };
  }

  function render() {
    const route = parseHash();
    const key = route.join('/');
    const routeChanged = key !== lastRouteKey;
    lastRouteKey = key;
    const viewEl = document.getElementById('view');
    if (!viewEl) return;

    let result;
    try {
      result = routeView(route) || { html: '' };
    } catch (err) {
      console.error('Erreur de rendu :', err);
      result = errorView(err && err.message ? err.message : '');
    }

    viewEl.innerHTML = result.html || '';
    document.title = (result.title ? result.title + ' · ' : '') + 'Efficient Planner';
    document.body.dataset.route = route[0];

    const topTitle = document.getElementById('topbar-title');
    if (topTitle) topTitle.textContent = result.title || TITLES[route[0]] || 'Efficient Planner';

    updateChrome(route, result);

    if (typeof result.mount === 'function') {
      try { result.mount(); } catch (err) {
        console.error('Erreur de montage :', err);
        UI.toast('Une partie de la page n\'a pas pu s\'initialiser.', { type: 'error' });
      }
    }

    if (routeChanged) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.body.classList.remove('sidebar-open');
      closeSidebarAria();
    }
    if (routeChanged && viewEl.focus) {
      try { viewEl.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------- Apparence ---------------- */
  function contrastInk(hex) {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6 && h.length !== 3) return '#ffffff';
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.62 ? '#101828' : '#ffffff';
  }

  function applySettings() {
    const settings = Store.get().settings || {};
    const root = document.documentElement;
    const theme = settings.theme || 'system';
    const systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const dark = theme === 'dark' || (theme === 'system' && systemDark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    const accent = settings.accent || '#6366f1';
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-soft', U.hexToRgba(accent, dark ? 0.24 : 0.13));
    root.style.setProperty('--accent-ink', contrastInk(accent));
    root.style.setProperty('--school', Store.catColor('school'));
    root.style.setProperty('--work', Store.catColor('work'));
    root.style.setProperty('--personal', Store.catColor('personal'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1020' : '#f6f7fb');
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = UI.icon(dark ? 'sun' : 'moon', 18);
      themeBtn.setAttribute('title', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
      themeBtn.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
    }
  }

  /* ---------------- Chrome (navigation, compteurs, badges) ---------------- */
  function updateChrome(route) {
    uiState();
    const current = route ? route[0] : parseHash()[0];
    U.qsa('[data-nav]').forEach((link) => {
      const active = link.dataset.nav === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    const state = Store.get();
    const activeTasks = state.tasks.filter((t) => !t.archived && t.status !== 'done');
    const counts = {
      tasks: activeTasks.length,
      school: activeTasks.filter((t) => t.category === 'school').length,
      work: activeTasks.filter((t) => t.category === 'work').length,
      personal: activeTasks.filter((t) => t.category === 'personal').length
    };
    Object.keys(counts).forEach((key) => {
      const el = document.getElementById('nav-count-' + key);
      if (!el) return;
      el.textContent = counts[key];
      el.hidden = !counts[key];
    });

    const late = Select.overdueTasks();
    const today = Select.todayTasks().filter((t) => t.status !== 'done');
    const badge = document.getElementById('notif-count');
    if (badge) {
      const total = late.length + today.length;
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.hidden = total === 0;
    }
    const notifBtn = document.getElementById('notif-toggle');
    if (notifBtn) notifBtn.setAttribute('aria-label', 'Notifications : ' + (late.length + today.length) + ' élément(s) à traiter');

    const banner = document.getElementById('storage-banner');
    if (banner) banner.hidden = Store.storageOk();

    const dateEl = document.getElementById('sidebar-today');
    if (dateEl) dateEl.textContent = U.fmtDate(new Date(), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* ---------------- Barre latérale ---------------- */
  function closeSidebarAria() {
    const btn = document.getElementById('sidebar-toggle');
    if (btn) btn.setAttribute('aria-expanded', document.body.classList.contains('sidebar-open') ? 'true' : 'false');
  }

  function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
    closeSidebarAria();
  }

  /* ---------------- Recherche globale ---------------- */
  const SEARCH_GROUPS = [
    { key: 'tasks', label: 'Tâches', icon: 'tasks' },
    { key: 'courses', label: 'Cours', icon: 'book' },
    { key: 'assessments', label: 'Évaluations', icon: 'award' },
    { key: 'projects', label: 'Projets', icon: 'folder' },
    { key: 'events', label: 'Événements', icon: 'calendar' },
    { key: 'habits', label: 'Habitudes', icon: 'repeat' },
    { key: 'notes', label: 'Objectifs et listes', icon: 'list' }
  ];

  function searchResultsHtml(query) {
    const q = String(query || '').trim();
    if (q.length < 2) {
      return '<div class="search-prompt">' + UI.icon('search', 22) +
        '<p><strong>Tapez au moins deux caractères.</strong></p>' +
        '<p class="muted">La recherche couvre les tâches, cours, évaluations, projets, événements, habitudes, objectifs et listes.</p></div>';
    }
    const results = Select.globalSearch(q);
    let total = 0;
    const html = SEARCH_GROUPS.map((group) => {
      const list = results[group.key] || [];
      if (!list.length) return '';
      total += list.length;
      return '<div class="search-group"><h3>' + UI.icon(group.icon, 14) + esc(group.label) + '<span>' + list.length + '</span></h3>' +
        list.slice(0, 8).map((row) => {
          const kind = group.key === 'notes' ? (row.kind || 'goal') : group.key.replace(/s$/, '');
          const itemLabel = group.key === 'notes' ? (row.kind === 'list' ? 'Liste' : 'Objectif') : group.label.replace(/s$/, '');
          return '<button type="button" class="search-result" data-search-kind="' + esc(kind) + '" data-search-id="' + esc(row.item.id) + '">' +
            '<span class="search-result-icon">' + UI.icon(group.icon, 16) + '</span>' +
            '<span class="search-result-main"><span class="search-result-title">' + esc(row.title) + '</span>' +
            (row.subtitle ? '<span class="search-result-sub">' + esc(row.subtitle) + '</span>' : '') + '</span>' +
            '<span class="search-result-type">' + esc(itemLabel) + '</span>' +
          '</button>';
        }).join('') + '</div>';
    }).join('');
    if (!total) {
      return '<div class="search-prompt">' + UI.icon('search', 22) +
        '<p><strong>Aucun résultat pour « ' + esc(q) + ' »</strong></p>' +
        '<p class="muted">Essayez un mot plus court, un code de cours ou une étiquette.</p></div>';
    }
    return '<p class="result-count search-count">' + total + ' résultat' + (total > 1 ? 's' : '') + '</p>' + html;
  }

  function bindSearchResults(wrap) {
    const box = wrap.querySelector('#search-results');
    if (!box) return;
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-search-kind]');
      if (!btn) return;
      openSearchResult(btn.dataset.searchKind, btn.dataset.searchId);
    });
  }

  function openSearchResult(kind, id) {
    if (!id) return;
    UI.closeModal();
    const run = () => {
      if (kind === 'task') EP.Forms.task(id);
      else if (kind === 'course') go('#/school/course/' + id);
      else if (kind === 'assessment') EP.Forms.assessment(null, id);
      else if (kind === 'project') go('#/work/project/' + id);
      else if (kind === 'event') EP.Forms.event(id);
      else if (kind === 'habit') EP.Forms.habit(id);
      else if (kind === 'goal') EP.Forms.goal(id);
      else if (kind === 'list') EP.Forms.list(id);
    };
    setTimeout(run, 40);
  }

  function openSearch() {
    const wrap = UI.modal({
      title: 'Recherche globale',
      subtitle: 'Trouvez n\'importe quoi dans votre espace.',
      size: 'lg',
      cancel: false,
      submitLabel: null,
      body:
        '<div class="global-search">' +
          '<div class="search-box search-box-lg">' + UI.icon('search', 18) +
            '<input type="search" id="global-search-input" placeholder="Tâche, cours, projet, évaluation…" autocomplete="off" autofocus>' +
          '</div>' +
          '<div id="search-results" class="search-results">' + searchResultsHtml('') + '</div>' +
          '<div class="search-foot"><span><kbd>Entrée</kbd> ouvrir le premier résultat</span><span><kbd>Échap</kbd> fermer</span></div>' +
        '</div>',
      footerLeft: '',
      onMount: function (form, modalWrap) {
        bindSearchResults(modalWrap);
        const input = modalWrap.querySelector('#global-search-input');
        const box = modalWrap.querySelector('#search-results');
        const run = U.debounce(() => { if (box) box.innerHTML = searchResultsHtml(input.value); }, 110);
        if (input) {
          input.addEventListener('input', run);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const first = box && box.querySelector('[data-search-kind]');
              if (first) openSearchResult(first.dataset.searchKind, first.dataset.searchId);
            }
          });
        }
      }
    });
    return wrap;
  }

  /* ---------------- Notifications et rappels ---------------- */
  function notificationsHtml() {
    const late = Select.overdueTasks();
    const today = Select.todayTasks().filter((t) => t.status !== 'done');
    const tomorrow = Select.upcomingTasks(2).filter((t) => !U.sameDay(t.due, new Date()));
    const events = Select.upcomingEvents(2);
    const settings = Store.get().settings;
    const rows = [];

    rows.push('<section class="notif-section"><h3>' + UI.icon('alert', 15) + ' En retard <span>' + late.length + '</span></h3>' +
      (late.length ? '<div class="task-list compact-list">' + late.slice(0, 4).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' : '<p class="muted small">Aucune tâche en retard.</p>') + '</section>');
    rows.push('<section class="notif-section"><h3>' + UI.icon('sun', 15) + ' Aujourd\'hui <span>' + today.length + '</span></h3>' +
      (today.length ? '<div class="task-list compact-list">' + today.slice(0, 5).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' : '<p class="muted small">Rien à faire aujourd\'hui.</p>') + '</section>');
    rows.push('<section class="notif-section"><h3>' + UI.icon('calendar', 15) + ' Prochains jours <span>' + (tomorrow.length + events.length) + '</span></h3>' +
      (tomorrow.length || events.length ?
        '<div class="task-list compact-list">' + tomorrow.slice(0, 3).map((t) => UI.taskRow(t, { compact: true })).join('') +
        '<div class="agenda-list">' + events.slice(0, 4).map((e) => EP.Views.shared.agendaRow(e, { showCat: true })).join('') + '</div></div>' :
        '<p class="muted small">Aucune échéance imminente.</p>') + '</section>');

    return '<div class="notif-panel">' +
      '<div class="callout ' + (settings.notifications ? 'callout-ok' : 'callout-info') + '">' + UI.icon(settings.notifications ? 'bell' : 'info', 17) +
        '<div>' + (settings.notifications ? 'Les rappels sont activés.' : 'Les rappels sont désactivés. Activez-les dans les réglages.') + '</div></div>' +
      rows.join('') +
    '</div>';
  }

  function openNotifications() {
    UI.modal({
      title: 'Notifications',
      subtitle: 'Ce qui mérite votre attention maintenant.',
      size: 'sm',
      cancel: false,
      submitLabel: null,
      body: notificationsHtml(),
      footerLeft: '<button type="button" class="btn btn-soft" id="notif-settings">' + UI.icon('settings', 15) + ' Réglages des rappels</button>',
      onMount: function (form, wrap) {
        const btn = wrap.querySelector('#notif-settings');
        if (btn) btn.addEventListener('click', () => {
          UI.closeModal();
          setTimeout(() => go('#/settings'), 60);
        });
      }
    });
  }

  function reminderText(occ, minutes) {
    const before = minutes >= 1440 ? 'demain' : minutes >= 60 ? 'dans ' + Math.round(minutes / 60) + ' h' : 'dans ' + minutes + ' min';
    return occ.title + ' · ' + before + ' (' + U.fmtTime(occ.start) + ')';
  }

  function triggerReminder(occ, minutes) {
    const text = reminderText(occ, minutes);
    UI.toast('Rappel : ' + text, {
      type: 'info',
      duration: 9000,
      action: {
        label: 'Voir',
        onClick: () => {
          if (occ.source === 'course') go('#/school/course/' + occ.courseId);
          else EP.Forms.event(occ.id);
        }
      }
    });
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        const n = new Notification('Efficient Planner — ' + occ.title, {
          body: (occ.location ? occ.location + ' · ' : '') + 'Commence à ' + U.fmtTime(occ.start),
          tag: occ.occurrenceKey,
          silent: false
        });
        n.onclick = function () {
          window.focus();
          if (occ.source === 'course') go('#/school/course/' + occ.courseId);
          else EP.Forms.event(occ.id);
          n.close();
        };
      } catch (e) { /* ignore */ }
    }
  }

  function checkReminders() {
    const settings = Store.get().settings;
    if (!settings || !settings.notifications) return;
    const now = Date.now();
    let events = [];
    try {
      events = Select.eventsInRange(U.addDays(new Date(), -1), U.addDays(new Date(), 2), { includeSchedules: false });
    } catch (e) { return; }
    events.forEach((occ) => {
      const reminders = Array.isArray(occ.reminders) ? occ.reminders : [];
      if (!reminders.length) return;
      const start = U.parseDate(occ.start);
      if (!start) return;
      reminders.forEach((minutes) => {
        const mins = Number(minutes) || 0;
        if (!mins) return;
        const trigger = start.getTime() - mins * 60000;
        const key = (occ.occurrenceKey || occ.id) + ':' + mins;
        if (now >= trigger && now - trigger < 90000 && !firedReminders.has(key)) {
          firedReminders.add(key);
          triggerReminder(occ, mins);
        }
      });
    });
  }

  function startReminderLoop() {
    clearInterval(reminderTimer);
    reminderTimer = setInterval(checkReminders, 30000);
    setTimeout(checkReminders, 2500);
  }

  /* ---------------- Onboarding ---------------- */
  function markOnboarded() {
    const state = Store.get();
    if (!state.meta.onboarded) {
      state.meta.onboarded = true;
      Store.flush();
    }
  }

  function maybeOnboard() {
    const state = Store.get();
    if (state.meta.onboarded) return;
    const empty = !state.tasks.length && !state.courses.length && !state.events.length && !state.projects.length && !state.habits.length;
    if (!empty) { markOnboarded(); return; }

    UI.modal({
      title: 'Bienvenue dans Efficient Planner',
      subtitle: 'Un seul espace pour l\'école, le travail et la vie personnelle.',
      size: 'sm',
      cancel: false,
      submitLabel: 'Commencer à zéro',
      footerLeft: '<button type="button" class="btn btn-soft" id="onboard-demo">' + UI.icon('sparkles', 15) + ' Voir un exemple</button>',
      body:
        '<div class="onboarding">' +
          '<div class="onboarding-mark">' + UI.icon('sparkles', 28) + '</div>' +
          '<p class="onboarding-lead">Trois espaces distincts, un seul tableau de bord.</p>' +
          '<ul class="onboarding-list">' +
            '<li><span class="onboarding-dot" style="--c:var(--school)"></span><div><strong>École</strong><span>Cours, travaux, évaluations et moyennes pondérées calculées automatiquement.</span></div></li>' +
            '<li><span class="onboarding-dot" style="--c:var(--work)"></span><div><strong>Travail</strong><span>Projets, tâches, réunions et échéances suivis sans mélange.</span></div></li>' +
            '<li><span class="onboarding-dot" style="--c:var(--personal)"></span><div><strong>Personnel</strong><span>Événements, habitudes, objectifs et petites listes du quotidien.</span></div></li>' +
          '</ul>' +
          '<p class="muted small">Tout est enregistré localement dans votre navigateur. Vous pourrez exporter vos données à tout moment.</p>' +
        '</div>',
      onMount: function (form, wrap) {
        const demo = wrap.querySelector('#onboard-demo');
        if (demo) demo.addEventListener('click', () => {
          markOnboarded();
          Store.loadDemo();
          UI.closeModal();
          UI.toast('Un exemple complet a été chargé. Explorez librement.', { type: 'success', duration: 6000 });
          go('#/dashboard');
          render();
        });
      },
      onClose: markOnboarded,
      onSubmit: function () {
        markOnboarded();
        UI.toast('Votre espace est prêt. Créez une première tâche avec le bouton +.', { type: 'success', duration: 6000 });
        return true;
      }
    });
  }

  /* ---------------- Actions ---------------- */
  function defaultsFrom(el) {
    const ds = el.dataset || {};
    const out = {};
    if (ds.cat) out.category = ds.cat;
    if (ds.course) out.courseId = ds.course;
    if (ds.project) out.projectId = ds.project;
    if (ds.date) out.date = ds.date;
    if (ds.time) out.time = ds.time;
    return out;
  }

  async function deleteTask(id) {
    const t = Store.find('tasks', id);
    if (!t) return;
    const ok = await UI.confirm({
      title: 'Supprimer la tâche ?',
      message: '« ' + t.title + ' » sera définitivement retirée.',
      confirmLabel: 'Supprimer',
      danger: true
    });
    if (!ok) return;
    Store.remove('tasks', id);
    UI.toast('Tâche supprimée.', { type: 'info' });
  }

  function toggleHabit(id, dateKey) {
    const habit = Store.find('habits', id);
    if (!habit) return;
    const key = dateKey || U.todayKey();
    const log = Object.assign({}, habit.log || {});
    if (log[key]) delete log[key];
    else log[key] = true;
    Store.put('habits', id, { log: log });
  }

  function toggleListItem(listId, itemId) {
    const list = Store.find('lists', listId);
    if (!list) return;
    const items = (list.items || []).map((item) => item.id === itemId ? Object.assign({}, item, { done: !item.done }) : item);
    Store.put('lists', listId, { items: items });
  }

  function deleteListItem(listId, itemId) {
    const list = Store.find('lists', listId);
    if (!list) return;
    Store.put('lists', listId, { items: (list.items || []).filter((item) => item.id !== itemId) });
  }

  function incrementGoal(id) {
    const goal = Store.find('goals', id);
    if (!goal) return;
    const target = Number(goal.target) || 0;
    const current = Number(goal.current) || 0;
    const next = Math.min(target, current + 1);
    if (next === current) {
      UI.toast('Objectif déjà atteint.', { type: 'info' });
      return;
    }
    Store.put('goals', id, { current: next });
    if (next >= target) UI.toast('Objectif atteint : ' + goal.title, { type: 'success' });
  }

  async function handleAction(action, el) {
    const ds = el.dataset || {};
    const id = ds.id;

    switch (action) {
      case 'app:reload':
        render();
        break;
      case 'sidebar:toggle':
        toggleSidebar();
        break;
      case 'theme:toggle': {
        const current = Store.get().settings.theme || 'system';
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        Store.setSettings({ theme: dark ? 'light' : 'dark' });
        applySettings();
        if (current === 'system') UI.toast('Thème ' + (dark ? 'clair' : 'sombre') + ' appliqué.', { type: 'info', duration: 2000 });
        break;
      }
      case 'task:new':
        EP.Forms.task(null, defaultsFrom(el));
        break;
      case 'task:edit':
        EP.Forms.task(id);
        break;
      case 'task:toggle': {
        const t = Store.find('tasks', id);
        if (!t) break;
        if (t.status === 'done') {
          Store.put('tasks', id, { status: 'todo', completedAt: null, archived: false });
          UI.toast('Tâche rouverte.', { type: 'info', duration: 2200 });
        } else {
          Store.put('tasks', id, { status: 'done', progress: 100 });
          UI.toast('Tâche terminée. Bien joué.', { type: 'success', duration: 2400 });
        }
        break;
      }
      case 'task:delete':
        await deleteTask(id);
        break;
      case 'event:new':
        EP.Forms.event(null, defaultsFrom(el));
        break;
      case 'event:edit':
        EP.Forms.event(id);
        break;
      case 'course:new':
        EP.Forms.course(null, defaultsFrom(el));
        break;
      case 'course:edit':
        EP.Forms.course(id);
        break;
      case 'course:open':
        go('#/school/course/' + id);
        break;
      case 'assessment:new':
        EP.Forms.assessment(ds.course || null);
        break;
      case 'assessment:edit':
        EP.Forms.assessment(null, id);
        break;
      case 'assessment:grade':
        EP.Forms.gradeAssessment(id);
        break;
      case 'project:new':
        EP.Forms.project();
        break;
      case 'project:edit':
        EP.Forms.project(id);
        break;
      case 'project:open':
        go('#/work/project/' + id);
        break;
      case 'habit:new':
        EP.Forms.habit();
        break;
      case 'habit:edit':
        EP.Forms.habit(id);
        break;
      case 'habit:toggle':
        toggleHabit(id, ds.date);
        break;
      case 'goal:new':
        EP.Forms.goal();
        break;
      case 'goal:edit':
        EP.Forms.goal(id);
        break;
      case 'goal:inc':
        incrementGoal(id);
        break;
      case 'list:new':
        EP.Forms.list();
        break;
      case 'list:edit':
        EP.Forms.list(id);
        break;
      case 'list:toggle':
        toggleListItem(id, ds.item);
        break;
      case 'list:delete-item':
        deleteListItem(id, ds.item);
        break;
      case 'session:new':
        EP.Forms.session();
        break;
      case 'session:edit':
        EP.Forms.session(id);
        break;
      case 'session:activate': {
        const sessions = Store.get().sessions;
        sessions.forEach((s) => { if (s.id !== id && s.active) Store.put('sessions', s.id, { active: false }); });
        Store.put('sessions', id, { active: true });
        UI.toast('Session activée.', { type: 'success' });
        break;
      }
      case 'school:tab':
        EP.ui.school.tab = ds.tab || 'overview';
        render();
        break;
      case 'course:tab':
        EP.ui.school.courseTab = ds.tab || 'tasks';
        render();
        break;
      case 'work:tab':
        EP.ui.work.tab = ds.tab || 'projects';
        render();
        break;
      case 'personal:tab':
        EP.ui.personal.tab = ds.tab || 'overview';
        render();
        break;
      case 'cal:day': {
        uiState();
        EP.ui.calendar.mode = 'day';
        EP.ui.calendar.cursor = ds.date || U.todayKey();
        render();
        break;
      }
      case 'search:open':
        openSearch();
        break;
      case 'notifications:open':
        openNotifications();
        break;
      case 'demo:load': {
        const ok = await UI.confirm({
          title: 'Charger les données d\'exemple ?',
          message: 'Un jeu de données complet remplacera le contenu actuel.',
          confirmLabel: 'Charger l\'exemple',
          danger: true
        });
        if (!ok) break;
        Store.loadDemo();
        UI.toast('Données d\'exemple chargées.', { type: 'success' });
        go('#/dashboard');
        break;
      }
      default:
        console.warn('Action non gérée :', action);
    }
  }

  /* ---------------- Écouteurs globaux ---------------- */
  function bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        e.preventDefault();
        const action = actionEl.dataset.action;
        Promise.resolve(handleAction(action, actionEl)).catch((err) => {
          console.error(err);
          UI.toast(err && err.message ? err.message : 'Cette action a échoué.', { type: 'error' });
        });
        return;
      }
      const scrim = e.target.closest('#sidebar-scrim');
      if (scrim) document.body.classList.remove('sidebar-open');
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);

    window.addEventListener('hashchange', render);

    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      const tag = active ? active.tagName : '';
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (active && active.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!UI.isModalOpen()) openSearch();
        return;
      }
      if (typing || UI.isModalOpen() || mod || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        EP.Forms.task(null);
      } else if (e.key === '/') {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape') {
        document.body.classList.remove('sidebar-open');
        closeSidebarAria();
      }
    });

    window.addEventListener('ep:storage-error', () => {
      const banner = document.getElementById('storage-banner');
      if (banner) banner.hidden = false;
      UI.toast('La sauvegarde locale a échoué. Exportez vos données dès que possible.', { type: 'error', duration: 9000 });
    });

    if (window.matchMedia) {
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
          const theme = Store.get().settings.theme;
          if (theme === 'system') applySettings();
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      } catch (e) { /* ignore */ }
    }

    window.addEventListener('beforeunload', () => Store.flush());
  }

  /* ---------------- Démarrage ---------------- */
  function init() {
    Store.load();
    uiState();
    applySettings();
    bindGlobalEvents();
    Store.subscribe((reason) => {
      applySettings();
      if (reason === 'settings' && parseHash()[0] === 'settings') {
        updateChrome(parseHash());
        return;
      }
      render();
    });
    render();
    startReminderLoop();
    setTimeout(maybeOnboard, 450);
  }

  EP.App = {
    render: render,
    go: go,
    applySettings: applySettings,
    openSearch: openSearch,
    openNotifications: openNotifications,
    handleAction: handleAction,
    checkReminders: checkReminders,
    parseHash: parseHash
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Efficient Planner — réglages, apparence et données */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const esc = U.esc;
  const Views = EP.Views;

  const THEMES = [
    { key: 'light', label: 'Clair', icon: 'sun' },
    { key: 'dark', label: 'Sombre', icon: 'moon' },
    { key: 'system', label: 'Système', icon: 'circle' }
  ];

  function switchRow(id, label, hint, checked) {
    return '<label class="setting-row">' +
      '<span class="setting-copy"><strong>' + esc(label) + '</strong>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span>' +
      '<span class="switch-field switch-inline"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="switch"></span></span>' +
    '</label>';
  }

  function statPill(value, label) {
    return '<div class="data-stat"><strong>' + U.num(value, 0) + '</strong><span>' + esc(label) + '</span></div>';
  }

  function themePicker(current) {
    return '<div class="theme-picker">' + THEMES.map((t) =>
      '<button type="button" class="theme-choice' + (current === t.key ? ' is-active' : '') + '" data-theme-choice="' + t.key + '">' +
        '<span class="theme-swatch theme-' + t.key + '"><span></span></span>' +
        '<span>' + UI.icon(t.icon, 15) + esc(t.label) + '</span>' +
      '</button>').join('') + '</div>';
  }

  function colorRow(key, label, value) {
    return '<label class="color-setting">' +
      '<span class="color-setting-label"><span class="color-dot" style="--c:' + esc(value) + '"></span>' + esc(label) + '</span>' +
      '<input type="color" class="color-input" id="color-' + key + '" value="' + esc(value) + '">' +
    '</label>';
  }

  function notificationStatus() {
    if (!('Notification' in window)) return 'Les notifications système ne sont pas offertes par ce navigateur. Les rappels resteront visibles dans l\'application.';
    const p = Notification.permission;
    if (p === 'granted') return 'Notifications système autorisées. Vous recevrez un rappel avant chaque événement concerné.';
    if (p === 'denied') return 'Notifications système refusées par le navigateur. Les rappels s\'afficheront dans l\'application.';
    return 'Le navigateur demandera l\'autorisation quand vous activerez les rappels.';
  }

  Views.settings = function () {
    const settings = Store.get().settings;
    const stats = Select.dataStats();
    const cats = Store.CATEGORIES;

    const html =
      '<div class="view-inner settings-view">' +
        '<div class="page-head">' +
          '<div><p class="eyebrow">Configuration</p><h1>Réglages</h1><p class="page-sub">Personnalisez l\'apparence, l\'organisation et vos données.</p></div>' +
          '<div class="page-actions">' +
            '<button type="button" class="btn btn-soft" id="settings-export">' + UI.icon('download', 16) + ' Exporter</button>' +
            '<button type="button" class="btn btn-primary" id="settings-quick-add">' + UI.icon('plus', 16) + ' Nouvelle tâche</button>' +
          '</div>' +
        '</div>' +

        '<div class="settings-grid">' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('users', 17) + ' Profil</h2><p>Un prénom suffit pour personnaliser l\'accueil.</p></div></div>' +
            '<div class="form-grid">' +
              UI.field('Votre prénom', '<input type="text" class="input" id="setting-name" value="' + esc(settings.userName || '') + '" placeholder="Ex. : Camille" maxlength="40">', { cls: 'span-2' }) +
              UI.field('Catégorie par défaut', '<select class="input" id="setting-default-cat">' +
                Object.values(cats).map((c) => '<option value="' + c.key + '"' + (settings.defaultCategory === c.key ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('') +
              '</select>', { cls: 'span-2', hint: 'Utilisée par la saisie rapide et les nouveaux éléments.' }) +
            '</div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('sun', 17) + ' Apparence</h2><p>Thème clair, sombre ou selon votre système.</p></div></div>' +
            themePicker(settings.theme) +
            '<div class="color-settings">' +
              '<div class="field-label">Couleur principale</div>' +
              '<label class="color-setting"><span class="color-setting-label"><span class="color-dot" style="--c:' + esc(settings.accent) + '"></span>Accent de l\'interface</span>' +
                '<input type="color" class="color-input" id="color-accent" value="' + esc(settings.accent) + '"></label>' +
              '<div class="field-label">Couleurs des espaces</div>' +
              colorRow('school', cats.school.label, Store.catColor('school')) +
              colorRow('work', cats.work.label, Store.catColor('work')) +
              colorRow('personal', cats.personal.label, Store.catColor('personal')) +
            '</div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('dashboard', 17) + ' Organisation</h2><p>Adaptez l\'application à votre rythme.</p></div></div>' +
            '<div class="form-grid">' +
              UI.field('Début de la semaine', '<select class="input" id="setting-week-start">' +
                '<option value="1"' + (Number(settings.weekStartsOn) === 1 ? ' selected' : '') + '>Lundi</option>' +
                '<option value="0"' + (Number(settings.weekStartsOn) === 0 ? ' selected' : '') + '>Dimanche</option>' +
              '</select>') +
              UI.field('Vue du calendrier', '<select class="input" id="setting-default-view">' +
                [['month', 'Mois'], ['week', 'Semaine'], ['day', 'Jour']].map((v) => '<option value="' + v[0] + '"' + (settings.defaultView === v[0] ? ' selected' : '') + '>' + v[1] + '</option>').join('') +
              '</select>') +
              UI.field('Archivage automatique', '<div class="input-suffix"><input type="number" class="input" id="setting-archive" min="1" max="120" value="' + (Number(settings.archiveAfterDays) || 7) + '"><span>jours</span></div>', { hint: 'Délai après lequel une tâche terminée est archivée.' }) +
              UI.field('Rappel par défaut', '<select class="input" id="setting-default-reminder">' +
                Store.REMINDER_OPTIONS.map((r) => '<option value="' + r.value + '"' + (Number(settings.defaultReminder) === Number(r.value) ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') +
              '</select>') +
            '</div>' +
            switchRow('setting-compact', 'Listes compactes', 'Masquer les détails secondaires dans les listes de tâches.', settings.compactTasks) +
            switchRow('setting-dashboard-habits', 'Habitudes sur l\'accueil', 'Afficher le suivi rapide des habitudes au tableau de bord.', settings.dashboardHabits) +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('bell', 17) + ' Rappels et notifications</h2><p>Ne manquez plus un événement important.</p></div></div>' +
            switchRow('setting-notifications', 'Activer les rappels', 'Affiche un rappel avant les événements qui en possèdent un.', settings.notifications) +
            '<div class="callout callout-info settings-info">' + UI.icon('info', 17) + '<div id="notification-status">' + esc(notificationStatus()) + '</div></div>' +
            '<p class="muted small">Les rappels fonctionnent lorsque l\'application est ouverte. Aucune donnée n\'est envoyée à un serveur.</p>' +
          '</section>' +

          '<section class="card span-2 data-card">' +
            '<div class="card-head"><div><h2>' + UI.icon('download', 17) + ' Vos données</h2><p>Tout est enregistré localement dans votre navigateur. Exportez régulièrement pour garder une copie.</p></div>' +
              '<span class="storage-pill' + (Store.storageOk() ? ' is-ok' : ' is-error') + '">' + UI.icon(Store.storageOk() ? 'check' : 'alert', 13) + (Store.storageOk() ? ' Enregistrement local actif' : ' Stockage indisponible') + '</span>' +
            '</div>' +
            '<div class="data-stats">' +
              statPill(stats.tasks, 'tâches') + statPill(stats.courses, 'cours') + statPill(stats.assessments, 'évaluations') +
              statPill(stats.events, 'événements') + statPill(stats.projects, 'projets') + statPill(stats.habits, 'habitudes') +
            '</div>' +
            '<div class="data-actions">' +
              '<button type="button" class="btn btn-soft" id="settings-export-2">' + UI.icon('download', 16) + ' Exporter en JSON</button>' +
              '<button type="button" class="btn btn-soft" id="settings-import-btn">' + UI.icon('upload', 16) + ' Importer un fichier</button>' +
              '<input type="file" id="settings-import" accept="application/json,.json" hidden>' +
              '<button type="button" class="btn btn-ghost" id="settings-demo">' + UI.icon('sparkles', 16) + ' Charger les données d\'exemple</button>' +
              '<button type="button" class="btn btn-ghost danger-text" id="settings-reset">' + UI.icon('trash', 16) + ' Effacer toutes les données</button>' +
            '</div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('sparkles', 17) + ' Raccourcis</h2><p>Pour aller plus vite au clavier.</p></div></div>' +
            '<div class="shortcut-list">' +
              '<div><span>Nouvelle tâche</span><kbd>N</kbd></div>' +
              '<div><span>Recherche globale</span><kbd>Ctrl</kbd><kbd>K</kbd></div>' +
              '<div><span>Fermer une fenêtre</span><kbd>Échap</kbd></div>' +
            '</div>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('sparkles', 17) + ' Nouveautés</h2><p>Ce qui a été ajouté récemment.</p></div></div>' +
            '<ul class="muted small" style="margin:0;padding-left:1.2rem;line-height:1.7">' +
              '<li>Application installable (PWA) : fonctionne hors ligne et s’ajoute à l’écran d’accueil.</li>' +
              '<li>URL dédiées : /suivi-notes, /habitudes, /projets, /bilan-hebdo, /profil.</li>' +
              '<li>Calendrier : création, modification, déplacement par glisser-déposer, détection de conflits.</li>' +
              '<li>École : moyennes pondérées, projection, note nécessaire, validation des pondérations.</li>' +
              '<li>Tâches récurrentes : jours au choix, intervalle en semaines, nombre d’occurrences ou date de fin.</li>' +
              '<li>Échéances des tâches : affichage facultatif en petites bannières dans le calendrier.</li>' +
              '<li>Tâches, projets, habitudes, objectifs, listes et recherche globale.</li>' +
            '</ul>' +
          '</section>' +

          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('info', 17) + ' À propos</h2><p>Efficient Planner, version 1.0.</p></div></div>' +
            '<p class="muted small">Une application personnelle pour l\'école, le travail et la vie quotidienne. Aucune connexion requise, aucune donnée transmise. Vos informations restent dans ce navigateur.</p>' +
            '<p class="muted small">Dernière sauvegarde : ' + esc(U.fmtDateTime(Store.get().meta.updatedAt) || '—') + '</p>' +
          '</section>' +
        '</div>' +
      '</div>';

    return {
      title: 'Réglages',
      html: html,
      mount: function () {
        const set = (patch, cb) => { Store.setSettings(patch); if (cb) cb(); };

        const name = document.getElementById('setting-name');
        if (name) {
          const saveName = U.debounce(() => Store.setSettings({ userName: name.value.trim() }), 350);
          name.addEventListener('input', saveName);
        }

        const bindSelect = (id, key, transform) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('change', () => set({ [key]: transform ? transform(el.value) : el.value }));
        };
        bindSelect('setting-default-cat', 'defaultCategory');
        bindSelect('setting-week-start', 'weekStartsOn', Number);
        bindSelect('setting-default-view', 'defaultView');
        bindSelect('setting-default-reminder', 'defaultReminder', Number);
        bindSelect('setting-archive', 'archiveAfterDays', (v) => U.clamp(Number(v) || 7, 1, 120));

        U.qsa('[data-theme-choice]').forEach((btn) => {
          btn.addEventListener('click', () => {
            Store.setSettings({ theme: btn.dataset.themeChoice });
            U.qsa('[data-theme-choice]').forEach((b) => b.classList.toggle('is-active', b === btn));
            EP.App.applySettings();
          });
        });

        const bindColor = (id, patchFn) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('input', () => { set(patchFn(el.value)); });
        };
        bindColor('color-accent', (v) => ({ accent: v }));
        bindColor('color-school', (v) => ({ colors: { school: v } }));
        bindColor('color-work', (v) => ({ colors: { work: v } }));
        bindColor('color-personal', (v) => ({ colors: { personal: v } }));

        const compact = document.getElementById('setting-compact');
        if (compact) compact.addEventListener('change', () => set({ compactTasks: compact.checked }));
        const dashHabits = document.getElementById('setting-dashboard-habits');
        if (dashHabits) dashHabits.addEventListener('change', () => set({ dashboardHabits: dashHabits.checked }));

        const notif = document.getElementById('setting-notifications');
        if (notif) {
          notif.addEventListener('change', async () => {
            const enabled = notif.checked;
            set({ notifications: enabled });
            if (enabled && 'Notification' in window && Notification.permission === 'default') {
              try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
            }
            const status = document.getElementById('notification-status');
            if (status) status.textContent = notificationStatus();
          });
        }

        const exportBtn = () => {
          const file = 'efficient-planner-' + U.todayKey() + '.json';
          U.download(file, Store.exportJSON());
          UI.toast('Sauvegarde exportée : ' + file, { type: 'success' });
        };
        ['settings-export', 'settings-export-2'].forEach((id) => {
          const btn = document.getElementById(id);
          if (btn) btn.addEventListener('click', exportBtn);
        });

        const importBtn = document.getElementById('settings-import-btn');
        const importFile = document.getElementById('settings-import');
        const doImport = async (file) => {
          if (!file) return;
          const ok = await UI.confirm({
            title: 'Remplacer vos données ?',
            message: 'Le fichier « ' + file.name + ' » remplacera tout le contenu actuel de l\'application.',
            detail: 'Une copie de vos données actuelles est conservée localement avant l\'importation.',
            confirmLabel: 'Importer',
            danger: true
          });
          if (!ok) return;
          try {
            const text = await file.text();
            Store.importJSON(text);
            UI.toast('Données importées avec succès.', { type: 'success' });
            EP.App.go('#/dashboard');
            EP.App.render();
          } catch (err) {
            UI.toast(err && err.message ? err.message : 'Fichier illisible.', { type: 'error' });
          }
        };
        if (importBtn && importFile) {
          importBtn.addEventListener('click', () => importFile.click());
          importFile.addEventListener('change', () => {
            doImport(importFile.files && importFile.files[0]);
            importFile.value = '';
          });
        }

        const demo = document.getElementById('settings-demo');
        if (demo) {
          demo.addEventListener('click', async () => {
            const ok = await UI.confirm({
              title: 'Charger les données d\'exemple ?',
              message: 'Un jeu de données complet remplacera le contenu actuel pour vous faire visiter l\'application.',
              confirmLabel: 'Charger l\'exemple',
              danger: true
            });
            if (!ok) return;
            Store.loadDemo();
            UI.toast('Données d\'exemple chargées.', { type: 'success' });
            EP.App.go('#/dashboard');
          });
        }

        const reset = document.getElementById('settings-reset');
        if (reset) {
          reset.addEventListener('click', async () => {
            const ok = await UI.confirm({
              title: 'Effacer toutes les données ?',
              message: 'Tâches, cours, notes, événements, projets et habitudes seront supprimés de ce navigateur.',
              detail: 'Exportez d\'abord une sauvegarde si vous souhaitez pouvoir revenir en arrière.',
              confirmLabel: 'Tout effacer',
              danger: true
            });
            if (!ok) return;
            Store.reset({ demo: false, onboarded: true });
            UI.toast('Toutes les données ont été effacées.', { type: 'info' });
            EP.App.go('#/dashboard');
          });
        }

        const quick = document.getElementById('settings-quick-add');
        if (quick) quick.addEventListener('click', () => EP.Forms.task(null));
      }
    };
  };
})();

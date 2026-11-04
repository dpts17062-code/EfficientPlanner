/* Efficient Planner — gestion des tâches */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const esc = U.esc;
  const Views = EP.Views;

  const DEFAULTS = { q: '', cat: 'all', status: 'open', priority: 'all', sort: 'due' };
  function filters() {
    if (!EP.ui.tasks) EP.ui.tasks = Object.assign({}, DEFAULTS);
    return EP.ui.tasks;
  }

  function matchesSearch(t, q) {
    if (!q) return true;
    const course = t.courseId ? Store.find('courses', t.courseId) : null;
    const project = t.projectId ? Store.find('projects', t.projectId) : null;
    return U.matchesQuery([t.title, t.description, t.notes, (t.tags || []).join(' '), course && course.code, course && course.name, project && project.name].filter(Boolean).join(' '), q);
  }

  function filteredTasks() {
    const f = filters();
    let list = Store.get().tasks.slice();
    if (f.status === 'archived') list = list.filter((t) => t.archived);
    else if (f.status === 'done') list = list.filter((t) => !t.archived && t.status === 'done');
    else if (f.status === 'open') list = list.filter((t) => !t.archived && t.status !== 'done');
    else if (f.status === 'all') list = list.filter((t) => !t.archived);
    else list = list.filter((t) => !t.archived && t.status === f.status);

    if (f.cat !== 'all') list = list.filter((t) => t.category === f.cat);
    if (f.priority !== 'all') list = list.filter((t) => t.priority === f.priority);
    list = list.filter((t) => matchesSearch(t, f.q));

    if (f.status === 'done') {
      list = U.sortBy(list, (t) => t.completedAt || t.due || t.createdAt, true);
    } else if (f.sort === 'priority') {
      list = U.sortBy(list, (t) => Store.priority(t.priority).rank, true);
      list = U.sortBy(list, (t) => (t.due ? U.parseDate(t.due) : null));
    } else if (f.sort === 'created') {
      list = U.sortBy(list, (t) => t.createdAt, true);
    } else if (f.sort === 'title') {
      list = list.slice().sort((a, b) => String(a.title).localeCompare(String(b.title), 'fr'));
    } else {
      list = U.sortBy(list, (t) => (t.due ? U.parseDate(t.due) : null));
    }
    return list;
  }

  const GROUPS = [
    { key: 'overdue', label: 'En retard', icon: 'alert' },
    { key: 'today', label: "Aujourd'hui", icon: 'sun' },
    { key: 'tomorrow', label: 'Demain', icon: 'calendar' },
    { key: 'week', label: 'Cette semaine', icon: 'calendar' },
    { key: 'later', label: 'Plus tard', icon: 'calendar' },
    { key: 'none', label: 'Sans échéance', icon: 'list' },
    { key: 'done', label: 'Terminées', icon: 'check' }
  ];

  function resultsHtml() {
    const f = filters();
    const list = filteredTasks();
    if (!list.length) {
      const hasAny = Store.get().tasks.length > 0;
      return '<div class="task-results-empty">' + UI.empty(
        hasAny ? 'search' : 'tasks',
        hasAny ? 'Aucun résultat' : 'Aucune tâche pour l\'instant',
        hasAny ? 'Essayez de modifier vos filtres ou votre recherche.' : 'Créez votre première tâche : elle apparaîtra sur le tableau de bord et dans votre agenda.',
        hasAny ? '<button type="button" class="btn btn-soft" data-clear-filters>Réinitialiser les filtres</button>' : '<button type="button" class="btn btn-primary" data-action="task:new">' + UI.icon('plus', 16) + ' Nouvelle tâche</button>'
      ) + '</div>';
    }
    if (f.sort !== 'due' || f.status === 'archived') {
      return '<div class="task-list">' + list.map((t) => UI.taskRow(t)).join('') + '</div>';
    }
    if (f.status === 'done') {
      return '<div class="task-list">' + list.map((t) => UI.taskRow(t)).join('') + '</div>';
    }
    const grouped = U.groupBy(list, (t) => Select.taskBucket(t));
    return GROUPS.filter((g) => grouped[g.key] && grouped[g.key].length).map((g) => {
      const items = grouped[g.key];
      return '<section class="task-group">' +
        '<div class="task-group-head"><h3>' + UI.icon(g.icon, 15) + ' ' + esc(g.label) + '</h3><span class="count-pill">' + items.length + '</span></div>' +
        '<div class="task-list">' + items.map((t) => UI.taskRow(t)).join('') + '</div>' +
      '</section>';
    }).join('');
  }

  function updateCount() {
    const el = document.getElementById('task-count');
    if (!el) return;
    const list = filteredTasks();
    const total = Store.get().tasks.filter((t) => !t.archived && t.status !== 'done').length;
    el.textContent = list.length + ' tâche' + (list.length > 1 ? 's' : '') + (filters().q ? ' trouvée' + (list.length > 1 ? 's' : '') : '') + ' · ' + total + ' ouverte' + (total > 1 ? 's' : '');
  }

  function updateList() {
    const box = document.getElementById('task-results');
    if (!box) return;
    box.innerHTML = resultsHtml();
    updateCount();
    updateChipStates();
  }

  function updateChipStates() {
    const f = filters();
    const tasks = Store.get().tasks.filter((t) => !t.archived);
    const open = tasks.filter((t) => t.status !== 'done');
    const counts = {
      all: open.length,
      school: open.filter((t) => t.category === 'school').length,
      work: open.filter((t) => t.category === 'work').length,
      personal: open.filter((t) => t.category === 'personal').length
    };
    U.qsa('[data-task-cat]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.taskCat === f.cat);
      const badge = btn.querySelector('.filter-count');
      if (badge) badge.textContent = counts[btn.dataset.taskCat] || 0;
    });
  }

  Views.tasks = function () {
    const f = filters();
    const tasks = Store.get().tasks.filter((t) => !t.archived);
    const open = tasks.filter((t) => t.status !== 'done');
    const counts = {
      all: open.length,
      school: open.filter((t) => t.category === 'school').length,
      work: open.filter((t) => t.category === 'work').length,
      personal: open.filter((t) => t.category === 'personal').length
    };
    const chips = [{ key: 'all', label: 'Toutes', icon: 'layers' }].concat(Object.values(Store.CATEGORIES).map((c) => ({ key: c.key, label: c.label, icon: c.icon })));
    const archivedCount = Store.get().tasks.filter((t) => t.archived).length;

    const html =
      '<div class="view-inner tasks-view">' +
        '<div class="page-head">' +
          '<div><p class="eyebrow">Organisation</p><h1>Tâches</h1><p class="page-sub">Toutes vos responsabilités, filtrables en un clic.</p></div>' +
          '<button type="button" class="btn btn-primary" data-action="task:new">' + UI.icon('plus', 16) + ' Nouvelle tâche</button>' +
        '</div>' +

        '<section class="card filter-card">' +
          '<div class="search-row">' +
            '<div class="search-box">' + UI.icon('search', 17) + '<input type="search" id="task-search" placeholder="Rechercher une tâche, une étiquette, un cours…" value="' + esc(f.q) + '" autocomplete="off">' +
            (f.q ? '<button type="button" class="icon-btn icon-btn-sm" data-clear-search aria-label="Effacer">' + UI.icon('x', 14) + '</button>' : '') +
            '</div>' +
            '<span class="result-count" id="task-count"></span>' +
          '</div>' +
          '<div class="filter-chips">' +
            chips.map((c) => {
              const color = c.key === 'all' ? 'var(--accent)' : Store.catColor(c.key);
              return '<button type="button" class="filter-chip' + (f.cat === c.key ? ' is-active' : '') + '" data-task-cat="' + c.key + '" style="--c:' + color + '">' +
                UI.icon(c.icon, 14) + esc(c.label) + '<span class="filter-count">' + (counts[c.key] || 0) + '</span></button>';
            }).join('') +
          '</div>' +
          '<div class="filter-row">' +
            '<label class="filter-select"><span>Statut</span><select id="filter-status">' +
              [['open', 'Ouvertes'], ['all', 'Toutes (actives)'], ['todo', 'À faire'], ['doing', 'En cours'], ['waiting', 'En attente'], ['done', 'Terminées'], ['archived', 'Archivées' + (archivedCount ? ' (' + archivedCount + ')' : '')]].map((s) =>
                '<option value="' + s[0] + '"' + (f.status === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') +
            '</select></label>' +
            '<label class="filter-select"><span>Priorité</span><select id="filter-priority">' +
              '<option value="all"' + (f.priority === 'all' ? ' selected' : '') + '>Toutes</option>' +
              Object.values(Store.PRIORITIES).map((p) => '<option value="' + p.key + '"' + (f.priority === p.key ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') +
            '</select></label>' +
            '<label class="filter-select"><span>Trier par</span><select id="filter-sort">' +
              [['due', 'Échéance'], ['priority', 'Priorité'], ['created', 'Création'], ['title', 'Alphabétique']].map((s) =>
                '<option value="' + s[0] + '"' + (f.sort === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') +
            '</select></label>' +
            '<button type="button" class="link-btn clear-filters" data-clear-filters>Tout effacer</button>' +
          '</div>' +
        '</section>' +

        '<div id="task-results" class="task-results">' + resultsHtml() + '</div>' +
      '</div>';

    return {
      title: 'Tâches',
      html: html,
      mount: function () {
        const search = document.getElementById('task-search');
        if (search) {
          const run = U.debounce(() => { f.q = search.value; updateList(); }, 120);
          search.addEventListener('input', run);
          const clear = document.querySelector('[data-clear-search]');
          if (clear) clear.addEventListener('click', () => { f.q = ''; search.value = ''; updateList(); });
        }
        U.qsa('[data-task-cat]').forEach((btn) => {
          btn.addEventListener('click', () => { f.cat = btn.dataset.taskCat; updateList(); });
        });
        ['status', 'priority', 'sort'].forEach((key) => {
          const el = document.getElementById('filter-' + key);
          if (el) el.addEventListener('change', () => { f[key] = el.value; updateList(); });
        });
        U.qsa('[data-clear-filters]').forEach((btn) => {
          btn.addEventListener('click', () => {
            Object.assign(f, DEFAULTS);
            EP.App.render();
          });
        });
        updateCount();
      }
    };
  };

  Views.tasks.updateList = updateList;
})();

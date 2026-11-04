/* Efficient Planner — espace travail et projets */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const S = EP.Views.shared;
  const esc = U.esc;
  const Views = EP.Views;

  function workState() {
    if (!EP.ui.work) EP.ui.work = { tab: 'projects', project: 'all', status: 'open' };
    return EP.ui.work;
  }

  function workTasks() {
    return Store.get().tasks.filter((t) => t.category === 'work' && !t.archived);
  }

  function projectStatusChip(status) {
    const labels = { active: 'En cours', paused: 'En pause', done: 'Terminé' };
    return '<span class="chip project-status status-' + esc(status) + '"><span class="chip-dot"></span>' + esc(labels[status] || 'Projet') + '</span>';
  }

  function projectCard(project) {
    const stats = Select.projectStats(project.id);
    const late = stats.overdue > 0;
    return '<a class="project-card" href="#/work/project/' + esc(project.id) + '" style="--c:' + esc(project.color || '#0ea5e9') + '">' +
      '<div class="project-card-head">' + projectStatusChip(project.status) +
        '<span class="project-due' + (late ? ' is-overdue' : '') + '">' + UI.icon('calendar', 13) + (project.due ? U.fmtDate(project.due, { day: 'numeric', month: 'short' }) : 'Sans échéance') + '</span>' +
      '</div>' +
      '<h3>' + esc(project.name) + '</h3>' +
      '<p class="project-desc">' + esc(project.description || 'Aucune description.') + '</p>' +
      '<div class="project-progress-label"><span>Progression</span><strong>' + stats.progress + ' %</strong></div>' +
      UI.progressBar(stats.progress, { color: project.color || '#0ea5e9' }) +
      '<div class="project-foot">' +
        '<span>' + stats.open + ' tâche' + (stats.open > 1 ? 's' : '') + ' ouverte' + (stats.open > 1 ? 's' : '') + '</span>' +
        '<span>' + stats.done + ' / ' + stats.total + ' terminées</span>' +
      '</div>' +
    '</a>';
  }

  function projectPage(id) {
    const project = Store.find('projects', id);
    if (!project) {
      return {
        title: 'Projet introuvable',
        html: '<div class="view-inner"><section class="card">' + UI.empty('folder', 'Projet introuvable', 'Ce projet a peut-être été supprimé.', '<a class="btn btn-primary" href="#/work">Retour au travail</a>') + '</section></div>'
      };
    }
    const stats = Select.projectStats(project.id);
    const tasks = Store.get().tasks.filter((t) => t.projectId === project.id);
    const open = tasks.filter((t) => t.status !== 'done');
    const done = tasks.filter((t) => t.status === 'done');
    const now = new Date();
    const meetings = Select.eventsInRange(now, U.addDays(now, 45), { categories: { work: true }, includeSchedules: false })
      .filter((o) => o.projectId === project.id);

    const hero = '<section class="project-hero" style="--c:' + esc(project.color || '#0ea5e9') + '">' +
      '<div class="project-hero-main">' +
        '<a class="back-link" href="#/work">' + UI.icon('arrow-left', 15) + ' Travail</a>' +
        '<div class="project-title-row">' + projectStatusChip(project.status) +
          '<span class="project-due' + (stats.overdue ? ' is-overdue' : '') + '">' + UI.icon('calendar', 13) + (project.due ? 'Échéance ' + U.fmtDate(project.due, { day: 'numeric', month: 'long' }) : 'Sans échéance') + '</span>' +
        '</div>' +
        '<h1>' + esc(project.name) + '</h1>' +
        '<p class="project-hero-desc">' + esc(project.description || 'Aucune description pour ce projet.') + '</p>' +
        '<div class="hero-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="task:new" data-cat="work" data-project="' + esc(project.id) + '">' + UI.icon('plus', 15) + ' Nouvelle tâche</button>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="project:edit" data-id="' + esc(project.id) + '">' + UI.icon('pencil', 15) + ' Modifier</button>' +
        '</div>' +
      '</div>' +
      '<div class="project-hero-side">' +
        UI.ring(stats.progress, { label: 'Progression', color: project.color || '#0ea5e9' }) +
        '<div class="project-hero-stats">' +
          '<div><strong>' + open.length + '</strong><span>ouvertes</span></div>' +
          '<div><strong>' + done.length + '</strong><span>terminées</span></div>' +
          '<div><strong>' + stats.overdue + '</strong><span>en retard</span></div>' +
        '</div>' +
      '</div>' +
    '</section>';

    const content = '<div class="split-grid split-wide">' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>Tâches du projet</h2><p>Les étapes concrètes pour faire avancer le projet.</p></div>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="task:new" data-cat="work" data-project="' + esc(project.id) + '">' + UI.icon('plus', 15) + ' Tâche</button></div>' +
        (tasks.length ? '<div class="task-list">' +
          U.sortBy(tasks, (t) => (t.status === 'done' ? 1 : 0)).map((t) => UI.taskRow(t)).join('') + '</div>' :
          UI.empty('tasks', 'Aucune tâche dans ce projet', 'Décomposez le projet en tâches pour suivre sa progression.', '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="work" data-project="' + esc(project.id) + '">Créer une tâche</button>')) +
      '</section>' +
      '<aside class="split-side">' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Prochaines rencontres</h2><p>Réunions et rendez-vous liés au projet.</p></div></div>' +
          (meetings.length ? '<div class="agenda-list">' + meetings.slice(0, 5).map((o) => S.agendaRow(o)).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Aucune rencontre planifiée.</span></div>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Ressources</h2><p>Liens et notes techniques.</p></div></div>' +
          ((project.links && project.links.length) ? '<div class="resource-list">' + project.links.map((l) =>
            '<a class="resource-row" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + UI.icon('link', 16) + '<span>' + esc(l.label) + '</span>' + UI.icon('external', 14) + '</a>').join('') + '</div>' : '') +
          (project.notes ? '<div class="note-body">' + esc(project.notes).replace(/\n/g, '<br>') + '</div>' : '') +
          (!(project.links && project.links.length) && !project.notes ? '<div class="quiet-empty">' + UI.icon('link', 18) + '<span>Ajoutez des liens ou des notes au projet.</span></div>' : '') +
        '</section>' +
      '</aside>' +
    '</div>';

    return {
      title: project.name,
      html: '<div class="view-inner project-page">' + hero + content + '</div>'
    };
  }

  Views.work = function (route) {
    if (route && route[0] === 'project') return projectPage(route[1]);
    const state = workState();
    const tasks = workTasks();
    const projects = Store.get().projects;
    const open = tasks.filter((t) => t.status !== 'done');
    const late = open.filter((t) => t.due && U.parseDate(t.due) < new Date());
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const doneMonth = tasks.filter((t) => t.status === 'done' && t.completedAt && U.parseDate(t.completedAt) >= monthStart);
    const now = new Date();
    const meetings = Select.eventsInRange(now, U.addDays(now, 30), { categories: { work: true }, includeSchedules: false });
    const activeProjects = projects.filter((p) => p.status === 'active');

    const tabs = '<div class="tabs">' +
      [['projects', 'Projets', 'folder'], ['tasks', 'Tâches', 'tasks'], ['meetings', 'Réunions', 'calendar']].map((t) =>
        '<button type="button" class="tab' + (state.tab === t[0] ? ' is-active' : '') + '" data-action="work:tab" data-tab="' + t[0] + '">' +
          UI.icon(t[2], 15) + t[1] + '<span class="tab-count">' + (t[0] === 'projects' ? activeProjects.length : t[0] === 'tasks' ? open.length : meetings.length) + '</span>' +
        '</button>').join('') + '</div>';

    let content = '';
    if (state.tab === 'projects') {
      content = '<div class="project-grid">' + projects.map(projectCard).join('') +
        '<button type="button" class="project-card project-add" data-action="project:new">' +
          '<span class="project-add-icon">' + UI.icon('plus', 22) + '</span><strong>Nouveau projet</strong><span>Regroupez tâches, échéances et rencontres.</span>' +
        '</button>' +
      '</div>';
      if (!projects.length) {
        content = '<section class="card">' + UI.empty('folder', 'Aucun projet', 'Créez un projet pour organiser vos tâches professionnelles et suivre leur progression.', '<button type="button" class="btn btn-primary" data-action="project:new">Créer un projet</button>') + '</section>';
      }
    } else if (state.tab === 'tasks') {
      let list = tasks;
      if (state.status === 'open') list = list.filter((t) => t.status !== 'done');
      else if (state.status === 'done') list = list.filter((t) => t.status === 'done');
      if (state.project !== 'all') list = list.filter((t) => t.projectId === state.project);
      list = U.sortBy(list, (t) => (t.due ? U.parseDate(t.due) : null));
      content = '<section class="card">' +
        '<div class="card-head"><div><h2>Tâches professionnelles</h2><p>Un flux unique, organisé par projet et par échéance.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="task:new" data-cat="work">' + UI.icon('plus', 15) + ' Nouvelle tâche</button></div>' +
        '<div class="filter-row inline-filters">' +
          '<label class="filter-select"><span>Projet</span><select id="work-project-filter"><option value="all">Tous</option>' +
            projects.map((p) => '<option value="' + esc(p.id) + '"' + (state.project === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
          '</select></label>' +
          '<label class="filter-select"><span>Statut</span><select id="work-status-filter">' +
            [['open', 'Ouvertes'], ['done', 'Terminées'], ['all', 'Toutes']].map((s) => '<option value="' + s[0] + '"' + (state.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
          '</select></label>' +
          '<span class="result-count">' + list.length + ' tâche' + (list.length > 1 ? 's' : '') + '</span>' +
        '</div>' +
        (list.length ? '<div class="task-list">' + list.map((t) => UI.taskRow(t)).join('') + '</div>' :
          UI.empty('tasks', 'Aucune tâche dans ce filtre', 'Modifiez les filtres ou créez une nouvelle tâche professionnelle.', '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="work">Nouvelle tâche</button>')) +
      '</section>';
    } else {
      content = '<section class="card">' +
        '<div class="card-head"><div><h2>Réunions et rendez-vous</h2><p>Les 30 prochains jours de votre agenda professionnel.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="event:new" data-cat="work">' + UI.icon('plus', 15) + ' Nouvel événement</button></div>' +
        (meetings.length ? '<div class="agenda-list">' + meetings.map((o) => S.agendaRow(o, { showCat: false })).join('') + '</div>' :
          '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Aucune réunion planifiée dans les 30 prochains jours.</span></div>') +
      '</section>';
    }

    return {
      title: 'Travail',
      html: '<div class="view-inner work-view">' +
        '<div class="page-head">' +
          '<div><p class="eyebrow">Professionnel</p><h1>Travail</h1><p class="page-sub">Projets, tâches et réunions au même endroit.</p></div>' +
          '<div class="page-actions"><button type="button" class="btn btn-soft" data-action="project:new">' + UI.icon('folder', 16) + ' Nouveau projet</button>' +
          '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="work">' + UI.icon('plus', 16) + ' Nouvelle tâche</button></div>' +
        '</div>' +
        '<div class="stat-grid">' +
          UI.statCard({ icon: 'folder', color: Store.catColor('work'), label: 'Projets actifs', value: activeProjects.length, sub: projects.length + ' projet' + (projects.length > 1 ? 's' : '') + ' au total' }) +
          UI.statCard({ icon: 'tasks', color: 'var(--accent)', label: 'Tâches ouvertes', value: open.length, sub: tasks.filter((t) => t.priority === 'urgent').length + ' urgente' + (tasks.filter((t) => t.priority === 'urgent').length > 1 ? 's' : '') }) +
          UI.statCard({ icon: 'alert', color: late.length ? 'var(--danger)' : 'var(--success)', label: 'En retard', value: late.length, sub: late.length ? 'À traiter en priorité' : 'Aucun retard' }) +
          UI.statCard({ icon: 'award', color: 'var(--success)', label: 'Terminées ce mois', value: doneMonth.length, sub: 'Tâches professionnelles' }) +
        '</div>' +
        tabs + content +
      '</div>',
      mount: function () {
        const p = document.getElementById('work-project-filter');
        if (p) p.addEventListener('change', () => { state.project = p.value; EP.App.render(); });
        const s = document.getElementById('work-status-filter');
        if (s) s.addEventListener('change', () => { state.status = s.value; EP.App.render(); });
      }
    };
  };
})();

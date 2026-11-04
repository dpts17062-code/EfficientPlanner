/* Efficient Planner — vie personnelle, habitudes, objectifs et listes */
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

  function personalState() {
    if (!EP.ui.personal) EP.ui.personal = { tab: 'overview' };
    return EP.ui.personal;
  }

  function habitRow(habit, compact) {
    const stats = Select.habitStats(habit);
    return '<div class="habit-row' + (compact ? ' is-compact' : '') + '">' +
      '<div class="habit-name"><span class="color-dot" style="--c:' + esc(habit.color) + '"></span>' +
        '<div><strong>' + esc(habit.name) + '</strong><span class="muted">' +
          (habit.cadence && habit.cadence.type === 'custom' ? (habit.cadence.days || []).map((d) => U.weekdayName(d, true)).join(' · ') : 'Tous les jours') +
        '</span></div>' +
      '</div>' +
      '<div class="habit-week">' + stats.last7.map((d) => S.habitMark(habit, d.date, { letter: false })).join('') + '</div>' +
      '<div class="habit-stat"><span class="habit-streak">' + UI.icon('flame', 14) + stats.streak + '</span><span class="muted">jours</span></div>' +
      '<div class="habit-rate"><strong>' + stats.rate + ' %</strong><span class="muted">30 jours</span></div>' +
      (compact ? '' : '<div class="row-actions"><button type="button" class="icon-btn icon-btn-sm" data-action="habit:edit" data-id="' + esc(habit.id) + '" aria-label="Modifier">' + UI.icon('pencil', 15) + '</button></div>') +
    '</div>';
  }

  function habitsTab() {
    const habits = Store.get().habits;
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('repeat', 17) + ' Habitudes</h2><p>Cochez chaque jour pour visualiser votre régularité.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="habit:new">' + UI.icon('plus', 15) + ' Nouvelle habitude</button></div>' +
      (habits.length ? '<div class="habit-table">' +
        '<div class="habit-table-head"><span>Habitude</span><span class="habit-week-label">7 derniers jours</span><span>Série</span><span>Taux</span><span></span></div>' +
        habits.map((h) => habitRow(h)).join('') + '</div>' :
        UI.empty('repeat', 'Aucune habitude', 'Créez une routine simple : lecture, entraînement, révision ou méditation.', '<button type="button" class="btn btn-primary" data-action="habit:new">Créer une habitude</button>')) +
      '<p class="habit-footnote">' + UI.icon('info', 14) + ' Le taux est calculé sur les 30 derniers jours selon les jours prévus. Une journée manquée ne remet pas tout à zéro.</p>' +
    '</section>';
  }

  function goalsTab() {
    const goals = Store.get().goals;
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('target', 17) + ' Objectifs personnels</h2><p>Des repères concrets, sans pression inutile.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="goal:new">' + UI.icon('plus', 15) + ' Nouvel objectif</button></div>' +
      (goals.length ? '<div class="goal-grid">' + goals.map((g) => {
        const p = Select.goalProgress(g);
        return '<div class="goal-card">' +
          '<div class="goal-head"><span class="goal-icon">' + UI.icon('target', 18) + '</span>' +
            '<div class="row-actions"><button type="button" class="icon-btn icon-btn-sm" data-action="goal:edit" data-id="' + esc(g.id) + '" aria-label="Modifier">' + UI.icon('pencil', 15) + '</button></div></div>' +
          '<h3>' + esc(g.title) + '</h3>' +
          (g.notes ? '<p class="muted">' + esc(g.notes) + '</p>' : '') +
          '<div class="goal-values"><strong>' + U.num(p.current, 0) + '</strong><span> / ' + U.num(p.target, 0) + ' ' + esc(g.unit || '') + '</span><span class="goal-pct">' + p.percent + ' %</span></div>' +
          UI.progressBar(p.percent, { color: 'var(--personal)' }) +
          '<div class="goal-foot">' +
            '<span>' + (g.due ? UI.icon('calendar', 13) + ' ' + esc(U.fmtDate(g.due, { day: 'numeric', month: 'short' })) : 'Sans échéance') + '</span>' +
            '<div class="goal-actions">' +
              '<button type="button" class="btn btn-soft btn-xs" data-action="goal:inc" data-id="' + esc(g.id) + '">+1</button>' +
              '<button type="button" class="btn btn-ghost btn-xs" data-action="goal:edit" data-id="' + esc(g.id) + '">Mettre à jour</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>' :
        UI.empty('target', 'Aucun objectif', 'Fixez un objectif mesurable et suivez votre progression au fil des semaines.', '<button type="button" class="btn btn-primary" data-action="goal:new">Créer un objectif</button>')) +
    '</section>';
  }

  function listsTab() {
    const lists = Store.get().lists;
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('list', 17) + ' Listes personnelles</h2><p>Épicerie, idées, préparatifs — tout ce qui ne mérite pas une tâche.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="list:new">' + UI.icon('plus', 15) + ' Nouvelle liste</button></div>' +
      (lists.length ? '<div class="list-grid">' + lists.map((l) => {
        const items = l.items || [];
        const done = items.filter((i) => i.done).length;
        return '<div class="list-card">' +
          '<div class="list-card-head"><h3>' + esc(l.title) + '</h3>' +
            '<div class="row-actions"><button type="button" class="icon-btn icon-btn-sm" data-action="list:edit" data-id="' + esc(l.id) + '" aria-label="Modifier">' + UI.icon('pencil', 15) + '</button></div></div>' +
          '<p class="muted">' + done + ' / ' + items.length + ' éléments cochés</p>' +
          '<div class="list-items">' + (items.length ? items.map((item) =>
            '<div class="list-item' + (item.done ? ' is-done' : '') + '">' +
              '<button type="button" class="check-btn' + (item.done ? ' checked' : '') + '" data-action="list:toggle" data-id="' + esc(l.id) + '" data-item="' + esc(item.id) + '" aria-label="' + (item.done ? 'Décocher' : 'Cocher') + '">' + (item.done ? UI.icon('check', 13) : '') + '</button>' +
              '<span>' + esc(item.text) + '</span>' +
              '<button type="button" class="icon-btn icon-btn-sm list-item-del" data-action="list:delete-item" data-id="' + esc(l.id) + '" data-item="' + esc(item.id) + '" aria-label="Retirer">' + UI.icon('x', 13) + '</button>' +
            '</div>').join('') : '<p class="muted small">Liste vide.</p>') + '</div>' +
          '<form class="list-add" data-list-form data-id="' + esc(l.id) + '">' +
            '<input type="text" class="input" placeholder="Ajouter un élément…" aria-label="Ajouter un élément" maxlength="160">' +
            '<button type="submit" class="icon-btn" aria-label="Ajouter">' + UI.icon('plus', 16) + '</button>' +
          '</form>' +
        '</div>';
      }).join('') + '</div>' :
        UI.empty('list', 'Aucune liste', 'Créez une liste pour vos courses, vos idées ou vos préparatifs.', '<button type="button" class="btn btn-primary" data-action="list:new">Créer une liste</button>')) +
    '</section>';
  }

  function overview() {
    const state = Store.get();
    const personalTasks = state.tasks.filter((t) => t.category === 'personal' && !t.archived);
    const open = personalTasks.filter((t) => t.status !== 'done');
    const today = open.filter((t) => t.due && U.sameDay(t.due, new Date()));
    const late = open.filter((t) => t.due && U.parseDate(t.due) < U.startOfDay(new Date()));
    const week = open.filter((t) => t.due && U.parseDate(t.due) > U.endOfDay(new Date()) && U.parseDate(t.due) <= U.endOfDay(U.addDays(new Date(), 7)));
    const now = new Date();
    const events = Select.eventsInRange(now, U.endOfDay(now), { categories: { personal: true }, includeSchedules: false });
    const habits = state.habits.filter((h) => !h.archived);
    const applicable = habits.filter((h) => Select.habitApplicable(h, new Date()));
    const habitsDone = applicable.filter((h) => Select.habitDone(h, U.todayKey())).length;
    const goals = state.goals;
    const goalAvg = goals.length ? Math.round(U.avg(goals.map((g) => Select.goalProgress(g).percent)) || 0) : 0;
    const lists = state.lists;
    const allToday = today.length + late.length;

    return '<div class="stat-grid">' +
        UI.statCard({ icon: 'heart', color: Store.catColor('personal'), label: 'À faire aujourd\'hui', value: allToday, sub: late.length ? late.length + ' en retard' : 'Journée sous contrôle' }) +
        UI.statCard({ icon: 'repeat', color: '#10b981', label: 'Habitudes du jour', value: habitsDone + ' / ' + applicable.length, sub: habits.length + ' habitude' + (habits.length > 1 ? 's' : '') + ' suivie' + (habits.length > 1 ? 's' : '') }) +
        UI.statCard({ icon: 'target', color: '#8b5cf6', label: 'Objectifs', value: goalAvg + ' %', sub: goals.length + ' objectif' + (goals.length > 1 ? 's' : '') + ' en cours' }) +
        UI.statCard({ icon: 'calendar', color: Store.catColor('work'), label: 'Événements du jour', value: events.length, sub: week.length + ' tâche' + (week.length > 1 ? 's' : '') + ' à venir' }) +
      '</div>' +
      '<div class="split-grid split-wide">' +
        '<div class="split-main">' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('sun', 17) + ' Aujourd\'hui</h2><p>Vos tâches et rendez-vous personnels.</p></div>' +
            '<button type="button" class="btn btn-soft btn-sm" data-action="task:new" data-cat="personal">' + UI.icon('plus', 15) + ' Tâche</button></div>' +
            '<div class="today-grid">' +
              '<div><h3 class="mini-head">Tâches <span>' + (today.length + late.length) + '</span></h3>' +
                ((today.length + late.length) ? '<div class="task-list compact-list">' + U.sortBy(today.concat(late.filter((x) => !today.some((y) => y.id === x.id))), (t) => (t.due ? U.parseDate(t.due) : null)).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Rien de prévu aujourd\'hui.</span></div>') +
              '</div>' +
              '<div><h3 class="mini-head">Événements <span>' + events.length + '</span></h3>' +
                (events.length ? '<div class="agenda-list">' + events.map((e) => S.agendaRow(e, { showCat: false })).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Agenda personnel libre.</span></div>') +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('calendar', 17) + ' Les 7 prochains jours</h2><p>Tâches personnelles à venir.</p></div>' +
            '<a class="card-link" href="#/calendar">Agenda ' + UI.icon('arrow-right', 14) + '</a></div>' +
            (week.length ? '<div class="task-list compact-list">' + U.sortBy(week, (t) => U.parseDate(t.due)).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('sparkles', 18) + '<span>Une semaine dégagée.</span></div>') +
          '</section>' +
          listsTab() +
        '</div>' +
        '<aside class="split-side">' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('repeat', 17) + ' Habitudes</h2><p>La régularité, pas la perfection.</p></div>' +
            '<a class="card-link" href="#/personal">Gérer ' + UI.icon('arrow-right', 14) + '</a></div>' +
            (habits.length ? '<div class="habit-mini-stack">' + habits.slice(0, 4).map((h) => {
              const st = Select.habitStats(h);
              return '<div class="habit-mini">' +
                '<div class="habit-mini-name"><span class="color-dot" style="--c:' + esc(h.color) + '"></span><span>' + esc(h.name) + '</span></div>' +
                '<span class="habit-streak">' + UI.icon('flame', 13) + st.streak + '</span>' +
                S.habitMark(h, U.todayKey()) +
              '</div>';
            }).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('repeat', 18) + '<span>Aucune habitude suivie.</span></div>') +
          '</section>' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('target', 17) + ' Objectifs</h2><p>Vos repères personnels.</p></div>' +
            '<a class="card-link" href="#/personal">Gérer ' + UI.icon('arrow-right', 14) + '</a></div>' +
            (goals.length ? '<div class="goal-mini-list">' + goals.slice(0, 4).map((g) => {
              const p = Select.goalProgress(g);
              return '<div class="goal-mini"><div class="goal-mini-head"><span>' + esc(g.title) + '</span><strong>' + p.percent + ' %</strong></div>' + UI.progressBar(p.percent, { color: '#8b5cf6' }) + '</div>';
            }).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('target', 18) + '<span>Fixez un premier objectif.</span></div>') +
          '</section>' +
          '<section class="card">' +
            '<div class="card-head"><div><h2>' + UI.icon('list', 17) + ' Listes</h2><p>Les petites choses du quotidien.</p></div>' +
            '<a class="card-link" href="#/personal">Tout voir ' + UI.icon('arrow-right', 14) + '</a></div>' +
            (lists.length ? '<div class="list-mini-stack">' + lists.slice(0, 3).map((l) => {
              const items = l.items || [];
              const done = items.filter((i) => i.done).length;
              return '<a class="list-mini" href="#/personal"><span>' + esc(l.title) + '</span><span class="muted">' + done + '/' + items.length + '</span></a>';
            }).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('list', 18) + '<span>Aucune liste personnelle.</span></div>') +
          '</section>' +
        '</aside>' +
      '</div>';
  }

  Views.personal = function () {
    const state = personalState();
    if (!['overview', 'habits', 'goals', 'lists'].includes(state.tab)) state.tab = 'overview';
    const tabs = '<div class="tabs">' +
      [['overview', 'Aperçu', 'heart'], ['habits', 'Habitudes', 'repeat'], ['goals', 'Objectifs', 'target'], ['lists', 'Listes', 'list']].map((t) =>
        '<button type="button" class="tab' + (state.tab === t[0] ? ' is-active' : '') + '" data-action="personal:tab" data-tab="' + t[0] + '">' +
          UI.icon(t[2], 15) + t[1] + '</button>').join('') + '</div>';

    let content = '';
    if (state.tab === 'overview') content = overview();
    else if (state.tab === 'habits') content = habitsTab();
    else if (state.tab === 'goals') content = goalsTab();
    else content = listsTab();

    return {
      title: 'Personnel',
      html: '<div class="view-inner personal-view">' +
        '<div class="page-head">' +
          '<div><p class="eyebrow">Vie personnelle</p><h1>Personnel</h1><p class="page-sub">Rendez-vous, habitudes et objectifs — sans surcharge.</p></div>' +
          '<div class="page-actions">' +
            '<button type="button" class="btn btn-soft" data-action="event:new" data-cat="personal">' + UI.icon('calendar', 16) + ' Événement</button>' +
            '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="personal">' + UI.icon('plus', 16) + ' Nouvelle tâche</button>' +
          '</div>' +
        '</div>' +
        tabs + content +
      '</div>',
      mount: function () {
        U.qsa('[data-list-form]').forEach((form) => {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('input');
            const text = input.value.trim();
            if (!text) return;
            const list = Store.find('lists', form.dataset.id);
            if (!list) return;
            const items = (list.items || []).slice();
            items.push({ id: U.uid('li'), text: text, done: false });
            Store.put('lists', list.id, { items: items });
          });
        });
      }
    };
  };
})();

/* Efficient Planner — tableau de bord */
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

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  Views.dashboard = function () {
    const state = Store.get();
    const today = Select.todayTasks();
    const openToday = today.filter((t) => t.status !== 'done');
    const doneToday = today.filter((t) => t.status === 'done');
    const todayEvents = Select.todayEvents();
    const priorities = Select.priorityTasks(5);
    const upcoming = Select.upcomingTasks(7).filter((t) => !U.sameDay(t.due, new Date()) && t.status !== 'done');
    const late = Select.overdueTasks();
    const recent = Select.recentlyCompleted(7).slice(0, 5);
    const deadlines = Select.deadlines(14);
    const soonDeadlines = deadlines.slice(0, 5);
    const day = Select.dayProgress();
    const week = Select.weekProgress();
    const session = Select.sessionSummary();
    const name = state.settings.userName ? state.settings.userName.trim() : '';
    const isEmpty = !state.tasks.length && !state.courses.length && !state.events.length && !state.projects.length && !state.habits.length;

    const dateStr = U.fmtDateLong(new Date());
    const summaryParts = [];
    if (openToday.length) summaryParts.push(openToday.length + ' tâche' + (openToday.length > 1 ? 's' : '') + ' aujourd\'hui');
    if (todayEvents.length) summaryParts.push(todayEvents.length + ' événement' + (todayEvents.length > 1 ? 's' : ''));
    if (deadlines.length) summaryParts.push(deadlines.length + ' échéance' + (deadlines.length > 1 ? 's' : '') + ' à venir');
    if (!summaryParts.length) summaryParts.push('Rien d\'urgent — profitez de la journée');

    const hero =
      '<section class="hero">' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">' + esc(dateStr) + '</p>' +
          '<h2>' + greeting() + (name ? ', ' + esc(name) : '') + '.</h2>' +
          '<p class="hero-summary">' + esc(summaryParts.join(' · ')) + '</p>' +
          '<div class="hero-actions">' +
            '<button type="button" class="btn btn-primary" data-action="task:new">' + UI.icon('plus', 16) + ' Nouvelle tâche</button>' +
            '<button type="button" class="btn btn-soft" data-action="event:new">' + UI.icon('calendar', 16) + ' Ajouter un événement</button>' +
          '</div>' +
        '</div>' +
        '<div class="hero-rings">' +
          '<div class="hero-ring">' + UI.ring(day.percent, { label: 'Aujourd\'hui', color: 'var(--accent)', title: day.done + ' sur ' + day.total + ' tâches' }) +
            '<span class="ring-caption">' + day.done + ' / ' + day.total + ' tâche' + (day.total > 1 ? 's' : '') + '</span></div>' +
          '<div class="hero-ring">' + UI.ring(week.percent, { label: 'Cette semaine', color: Store.catColor('school'), title: week.done + ' sur ' + week.total + ' tâches' }) +
            '<span class="ring-caption">' + week.done + ' / ' + week.total + ' tâche' + (week.total > 1 ? 's' : '') + '</span></div>' +
        '</div>' +
      '</section>';

    const stats =
      '<div class="stat-grid">' +
        UI.statCard({ icon: 'tasks', color: 'var(--accent)', label: 'À faire aujourd\'hui', value: openToday.length, sub: doneToday.length + ' terminée' + (doneToday.length > 1 ? 's' : '') + ' · ' + day.percent + ' % de la journée' }) +
        UI.statCard({ icon: 'alert', color: late.length ? 'var(--danger)' : 'var(--success)', label: 'En retard', value: late.length, sub: late.length ? 'À replanifier ou terminer' : 'Aucun retard — bravo', cls: late.length ? 'stat-danger' : '' }) +
        UI.statCard({ icon: 'calendar', color: Store.catColor('work'), label: '7 prochains jours', value: upcoming.length, sub: deadlines.length + ' échéance' + (deadlines.length > 1 ? 's' : '') + ' dans 14 jours' }) +
        UI.statCard({ icon: 'school', color: Store.catColor('school'), label: 'Moyenne de session', value: session.average != null ? U.percent(session.average, 1) : '—', sub: session.courses.length + ' cours suivi' + (session.courses.length > 1 ? 's' : '') + (session.session ? ' · ' + session.session.name : '') }) +
      '</div>';

    const welcome = isEmpty ? '<section class="card welcome-card">' +
      '<div class="welcome-icon">' + UI.icon('sparkles', 26) + '</div>' +
      '<div><h2>Votre espace est prêt.</h2><p>Commencez par créer une tâche ou un cours. Tout le reste s\'organise autour : tableau de bord, calendrier et suivi des notes.</p>' +
      '<div class="welcome-actions"><button type="button" class="btn btn-primary" data-action="task:new">Créer une première tâche</button>' +
      '<button type="button" class="btn btn-soft" data-action="course:new">Ajouter un cours</button>' +
      '<button type="button" class="btn btn-ghost" data-action="demo:load">Voir un exemple</button></div></div>' +
    '</section>' : '';

    const prioritiesHtml = priorities.length ?
      '<div class="task-list compact-list">' + priorities.map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' :
      '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Rien d\'urgent pour le moment.</span></div>';

    const todayTasksHtml = today.length ?
      '<div class="task-list compact-list">' + U.sortBy(today, (t) => (t.status === 'done' ? 1 : 0)).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' :
      '<div class="quiet-empty">' + UI.icon('tasks', 18) + '<span>Aucune tâche prévue aujourd\'hui.</span></div>';

    const agendaHtml = todayEvents.length ?
      '<div class="agenda-list">' + todayEvents.map((e) => S.agendaRow(e)).join('') + '</div>' :
      '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Agenda libre aujourd\'hui.</span></div>';

    const upcomingGroups = U.groupBy(upcoming, (t) => U.dateKey(t.due));
    const upcomingDates = Object.keys(upcomingGroups).sort();
    const upcomingHtml = upcomingDates.length ? upcomingDates.map((key) => {
      const list = U.sortBy(upcomingGroups[key], (t) => U.parseDate(t.due));
      return '<div class="day-group">' +
        '<div class="day-group-head"><span class="day-pill">' + esc(U.relative(key)) + '</span><span class="day-date">' + esc(U.fmtDate(key, { weekday: 'long', day: 'numeric', month: 'long' })) + '</span></div>' +
        '<div class="task-list compact-list">' + list.map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' +
      '</div>';
    }).join('') : '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Les sept prochains jours sont dégagés.</span></div>';

    const deadlinesHtml = soonDeadlines.length ?
      '<div class="deadline-list">' + soonDeadlines.map(S.deadlineRow).join('') + '</div>' :
      '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Aucune échéance dans les deux prochaines semaines.</span></div>';

    const lateHtml = late.length ?
      '<div class="task-list compact-list">' + U.sortBy(late, (t) => t.due).slice(0, 5).map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' +
      (late.length > 5 ? '<a class="card-more" href="#/tasks">Voir les ' + late.length + ' tâches en retard ' + UI.icon('arrow-right', 14) + '</a>' : '') :
      '<div class="quiet-empty quiet-ok">' + UI.icon('check', 18) + '<span>Tout est à jour.</span></div>';

    const recentHtml = recent.length ? recent.map((t) =>
      '<button type="button" class="recent-row" data-action="task:edit" data-id="' + esc(t.id) + '">' +
        '<span class="recent-check">' + UI.icon('check', 12) + '</span>' +
        '<span class="recent-main"><span>' + esc(t.title) + '</span><span class="muted">' + esc(t.completedAt ? U.fmtDate(t.completedAt, { day: 'numeric', month: 'short' }) + ' · ' + U.fmtTime(t.completedAt) : '') + '</span></span>' +
      '</button>').join('') :
      '<div class="quiet-empty">' + UI.icon('award', 18) + '<span>Les tâches terminées apparaîtront ici.</span></div>';

    const todayHabits = state.habits.filter((h) => !h.archived && Select.habitApplicable(h, new Date()));
    const habitsHtml = state.habits.length ?
      '<div class="habit-mini-list">' + todayHabits.slice(0, 4).map((h) => {
        const st = Select.habitStats(h);
        return '<div class="habit-mini">' +
          '<div class="habit-mini-name"><span class="color-dot" style="--c:' + esc(h.color) + '"></span><span>' + esc(h.name) + '</span></div>' +
          '<span class="habit-streak">' + UI.icon('flame', 13) + st.streak + '</span>' +
          S.habitMark(h, U.todayKey()) +
        '</div>';
      }).join('') + '</div>' :
      '<div class="quiet-empty">' + UI.icon('repeat', 18) + '<span>Ajoutez une habitude pour suivre votre régularité.</span></div>';

    const sessionHtml = session.courses.length ?
      '<div class="session-mini">' +
        '<div class="session-mini-head"><span>Moyenne de session</span><strong>' + (session.average != null ? U.percent(session.average, 1) : '—') + '</strong></div>' +
        '<div class="session-mini-list">' + session.courses.slice(0, 4).map((row) =>
          '<a href="#/school/course/' + esc(row.course.id) + '" class="session-mini-row"><span class="color-dot" style="--c:' + esc(row.course.color) + '"></span><span>' + esc(row.course.code || row.course.name) + '</span><span>' + (row.stats.average != null ? U.percent(row.stats.average, 1) : '—') + '</span></a>').join('') +
        '</div>' +
        '<a class="card-more" href="#/school">Vue scolaire ' + UI.icon('arrow-right', 14) + '</a>' +
      '</div>' :
      '<div class="quiet-empty">' + UI.icon('school', 18) + '<span>Aucun cours enregistré.</span></div>';

    return {
      title: 'Tableau de bord',
      subtitle: '',
      html:
        '<div class="view-inner dashboard">' +
          welcome +
          hero +
          stats +
          '<div class="dash-layout">' +
            '<div class="dash-main">' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('sparkles', 17) + ' Mes priorités</h2><p>Les tâches à traiter en premier, selon l\'urgence et la priorité.</p></div>' +
                '<a class="card-link" href="#/tasks">Toutes les tâches ' + UI.icon('arrow-right', 14) + '</a></div>' +
                prioritiesHtml +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('sun', 17) + ' Aujourd\'hui</h2><p>' + esc(U.fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</p></div>' +
                '<a class="card-link" href="#/calendar">Agenda ' + UI.icon('arrow-right', 14) + '</a></div>' +
                '<div class="today-grid">' +
                  '<div><h3 class="mini-head">Tâches <span>' + openToday.length + '</span></h3>' + todayTasksHtml + '</div>' +
                  '<div><h3 class="mini-head">Événements <span>' + todayEvents.length + '</span></h3>' + agendaHtml + '</div>' +
                '</div>' +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('calendar', 17) + ' Les 7 prochains jours</h2><p>Un aperçu des tâches à venir, sans surcharge.</p></div>' +
                '<a class="card-link" href="#/calendar">Calendrier ' + UI.icon('arrow-right', 14) + '</a></div>' +
                upcomingHtml +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('flag', 17) + ' Échéances importantes</h2><p>Évaluations, remises et projets des deux prochaines semaines.</p></div>' +
                '<a class="card-link" href="#/school">École ' + UI.icon('arrow-right', 14) + '</a></div>' +
                deadlinesHtml +
              '</section>' +
            '</div>' +
            '<aside class="dash-side">' +
              '<section class="card' + (late.length ? ' card-danger-soft' : '') + '">' +
                '<div class="card-head"><div><h2>' + UI.icon('alert', 17) + ' En retard</h2><p>' + (late.length ? 'Ces tâches ne sont plus dans les temps.' : 'Aucune tâche en retard.') + '</p></div></div>' +
                lateHtml +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('school', 17) + ' Scolaire</h2><p>Votre progression dans la session.</p></div></div>' +
                sessionHtml +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('repeat', 17) + ' Habitudes du jour</h2><p>Un suivi discret, sans encombrer la journée.</p></div>' +
                '<a class="card-link" href="#/personal">Gérer ' + UI.icon('arrow-right', 14) + '</a></div>' +
                habitsHtml +
              '</section>' +
              '<section class="card">' +
                '<div class="card-head"><div><h2>' + UI.icon('check', 17) + ' Récemment terminées</h2><p>Les derniers gains de la semaine.</p></div></div>' +
                recentHtml +
              '</section>' +
            '</aside>' +
          '</div>' +
        '</div>'
    };
  };
})();

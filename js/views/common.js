/* Efficient Planner — fragments partagés entre les vues */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const esc = U.esc;
  EP.Views = EP.Views || {};

  function deadlineRow(d) {
    const isAssessment = d.kind === 'assessment';
    const isProject = d.kind === 'project';
    const color = isAssessment
      ? (() => { const c = Store.find('courses', d.courseId); return c ? c.color : Store.catColor('school'); })()
      : isProject ? (() => { const p = Store.find('projects', d.id); return p ? p.color : Store.catColor('work'); })() : Store.catColor('school');
    const action = isAssessment ? 'assessment:edit' : isProject ? 'project:open' : 'task:edit';
    const date = U.parseDate(d.date) || new Date();
    return '<button type="button" class="deadline-row" data-action="' + action + '" data-id="' + esc(d.id) + '" style="--c:' + esc(color) + '">' +
      '<span class="date-badge"><strong>' + date.getDate() + '</strong><span>' + U.fmtDate(date, { month: 'short' }).replace('.', '') + '</span></span>' +
      '<span class="deadline-main"><span class="deadline-title">' + esc(d.title) + '</span><span class="deadline-meta">' + esc(d.meta || '') + '</span></span>' +
      '<span class="deadline-when">' + esc(U.dueText(d.date)) + '</span>' +
      (isAssessment ? '<span class="chip plain-chip">' + (Number(d.weight) || 0) + ' %</span>' : '') +
      '<span class="row-chevron">' + UI.icon('chevron-right', 15) + '</span>' +
    '</button>';
  }

  function agendaRow(occ, opts) {
    const o = opts || {};
    const time = occ.allDay ? 'Jour' : U.fmtTime(occ.start);
    const end = occ.allDay ? 'complet' : U.fmtTime(occ.end);
    const color = occ.color || (occ.courseId && Store.find('courses', occ.courseId) ? Store.find('courses', occ.courseId).color : Store.catColor(occ.category));
    const isCourse = occ.source === 'course';
    const action = isCourse ? 'course:open' : 'event:edit';
    const id = isCourse ? occ.courseId : occ.id;
    return '<button type="button" class="agenda-row" data-action="' + action + '" data-id="' + esc(id) + '" style="--c:' + esc(color) + '">' +
      '<span class="agenda-time"><strong>' + esc(time) + '</strong><span>' + esc(end) + '</span></span>' +
      '<span class="agenda-bar"></span>' +
      '<span class="agenda-main"><span class="agenda-title">' + esc(occ.title) + '</span>' +
        '<span class="agenda-meta">' +
          (occ.location ? UI.icon('folder', 12) + esc(occ.location) + ' ' : '') +
          (o.showCat ? UI.catChip(occ.category) : '') +
          (occ.isRecurring && !isCourse ? '<span class="chip plain-chip">' + UI.icon('repeat', 11) + 'Série</span>' : '') +
        '</span></span>' +
    '</button>';
  }

  function courseCard(row) {
    const c = row.course;
    const stats = row.stats;
    const next = row.next;
    return '<a class="course-card" href="#/school/course/' + esc(c.id) + '" style="--c:' + esc(c.color) + '">' +
      '<div class="course-card-head">' +
        '<span class="course-code">' + esc(c.code || 'Cours') + '</span>' +
        '<span class="course-avg">' + (stats.average != null ? U.percent(stats.average, 1) : '—') + '</span>' +
      '</div>' +
      '<h3>' + esc(c.name) + '</h3>' +
      '<p class="course-teacher">' + esc(c.teacher || 'Enseignant à préciser') + '</p>' +
      '<div class="course-progress-label"><span>Note évaluée</span><span>' + U.num(stats.gradedWeight, 1) + ' %</span></div>' +
      UI.progressBar(stats.gradedWeight, { color: c.color }) +
      '<div class="course-card-foot">' +
        '<span>' + UI.icon('calendar', 13) + (next ? esc(U.fmtDate(next.date, { day: 'numeric', month: 'short' })) : 'Aucune échéance') + '</span>' +
        '<span>' + UI.icon('tasks', 13) + row.tasks.length + ' tâche' + (row.tasks.length > 1 ? 's' : '') + '</span>' +
      '</div>' +
      (!stats.weightValid ? '<span class="course-warning">' + UI.icon('alert', 13) + 'Pondérations : ' + U.num(stats.totalWeight, 1) + ' %</span>' : '') +
    '</a>';
  }

  function habitMark(habit, dateKey, opts) {
    const o = opts || {};
    const applicable = Select.habitApplicable(habit, dateKey);
    const done = Select.habitDone(habit, dateKey);
    const d = U.parseDate(dateKey);
    if (!applicable) {
      return '<span class="habit-cell is-na" title="Non prévu ce jour">' + (o.letter ? U.weekdayShort(d).charAt(0) : '') + '</span>';
    }
    return '<button type="button" class="habit-cell' + (done ? ' is-done' : '') + '" data-action="habit:toggle" data-id="' + esc(habit.id) + '" data-date="' + esc(dateKey) + '" style="--c:' + esc(habit.color || '#10b981') + '" aria-label="' + esc((done ? 'Décocher ' : 'Cocher ') + habit.name + ' le ' + U.fmtDate(d)) + '" aria-pressed="' + done + '">' +
      (done ? UI.icon('check', 14) : '<span></span>') + '</button>';
  }

  function emptyTasks(message, action) {
    return UI.empty('tasks', 'Aucune tâche ici', message || 'Créez une tâche pour commencer.', action || '');
  }

  function pageActions(buttons) {
    return '<div class="page-actions">' + buttons + '</div>';
  }

  EP.Views.shared = { deadlineRow, agendaRow, courseCard, habitMark, emptyTasks, pageActions };
})();

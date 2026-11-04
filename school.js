/* Efficient Planner — espace scolaire, cours et notes */
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

  function schoolState() {
    if (!EP.ui.school) {
      EP.ui.school = {
        tab: 'overview', sessionId: null, courseTab: 'tasks',
        workKind: 'all', workCourse: 'all', workStatus: 'open',
        assessmentCourse: 'all', assessmentStatus: 'all',
        hypo: {}, target: {}
      };
    }
    return EP.ui.school;
  }

  function currentSession(state) {
    const sessions = Store.get().sessions;
    if (state.sessionId) {
      const found = sessions.find((s) => s.id === state.sessionId);
      if (found) return found;
    }
    return sessions.find((s) => s.active) || sessions[0] || null;
  }

  const TABS = [
    { key: 'overview', label: 'Aperçu', icon: 'dashboard' },
    { key: 'courses', label: 'Cours', icon: 'book' },
    { key: 'work', label: 'Travaux', icon: 'tasks' },
    { key: 'assessments', label: 'Évaluations', icon: 'award' },
    { key: 'sessions', label: 'Sessions', icon: 'layers' }
  ];

  function tabsHtml(state, summary) {
    const counts = {
      courses: summary.courses.length,
      work: Store.get().tasks.filter((t) => t.category === 'school' && t.status !== 'done' && !t.archived).length,
      assessments: summary.assessments.filter((a) => Store.assessmentStatus(a) !== 'graded').length,
      sessions: Store.get().sessions.length
    };
    return '<div class="tabs">' + TABS.map((t) =>
      '<button type="button" class="tab' + (state.tab === t.key ? ' is-active' : '') + '" data-action="school:tab" data-tab="' + t.key + '">' +
        UI.icon(t.icon, 15) + esc(t.label) +
        (counts[t.key] != null ? '<span class="tab-count">' + counts[t.key] + '</span>' : '') +
      '</button>').join('') + '</div>';
  }

  function sessionSelect(state) {
    const sessions = Store.get().sessions;
    if (!sessions.length) return '';
    const current = currentSession(state);
    return '<label class="inline-select">' + UI.icon('layers', 15) + '<select id="school-session">' +
      sessions.map((s) => '<option value="' + esc(s.id) + '"' + (current && current.id === s.id ? ' selected' : '') + '>' + esc(s.name) + (s.active ? ' · active' : '') + '</option>').join('') +
    '</select></label>';
  }

  function pageHead(state, summary, actions) {
    return '<div class="page-head">' +
      '<div><p class="eyebrow">École</p><h1>École</h1><p class="page-sub">Cours, travaux, évaluations et moyennes calculées automatiquement.</p></div>' +
      '<div class="page-actions">' + sessionSelect(state) + actions + '</div>' +
    '</div>';
  }

  /* ---------------- Tableau des évaluations ---------------- */
  function gradeDisplay(a) {
    if (Store.assessmentStatus(a) !== 'graded' || a.grade == null) return '<span class="muted">—</span>';
    const pct = (Number(a.grade) / (Number(a.max) || 100)) * 100;
    return '<strong>' + U.num(a.grade, 2) + '</strong><span class="muted"> / ' + U.num(a.max || 100, 0) + ' · ' + U.percent(pct, 1) + '</span>';
  }
  function assessmentStatusChip(a) {
    const s = Store.assessmentStatus(a);
    const labels = { upcoming: 'À venir', pending: 'En attente', graded: 'Corrigée' };
    return '<span class="chip assess-chip assess-' + s + '">' + labels[s] + '</span>';
  }

  function assessmentsTable(list, opts) {
    const o = opts || {};
    if (!list.length) return UI.empty('award', 'Aucune évaluation', 'Ajoutez une évaluation pour suivre vos notes et vos moyennes.', o.emptyAction || '');
    return '<div class="table-wrap"><table class="table assessments-table">' +
      '<thead><tr>' +
        '<th>Date</th>' + (o.hideCourse ? '' : '<th>Cours</th>') +
        '<th>Évaluation</th><th>Poids</th><th>Note</th><th>Statut</th><th class="th-actions"></th>' +
      '</tr></thead><tbody>' +
      list.map((a) => {
        const course = Store.find('courses', a.courseId);
        return '<tr>' +
          '<td class="nowrap">' + esc(U.fmtDate(a.date, { day: 'numeric', month: 'short' })) + '</td>' +
          (o.hideCourse ? '' : '<td>' + (course ? '<span class="course-tag" style="--c:' + esc(course.color) + '">' + esc(course.code || course.name) + '</span>' : '—') + '</td>') +
          '<td><strong>' + esc(a.name) + '</strong><span class="cell-sub">' + esc(Store.assessmentType(a.type)) + '</span></td>' +
          '<td class="nowrap">' + U.num(a.weight, 1) + ' %</td>' +
          '<td class="nowrap">' + gradeDisplay(a) + '</td>' +
          '<td>' + assessmentStatusChip(a) + '</td>' +
          '<td class="row-actions-cell"><div class="row-actions">' +
            '<button type="button" class="icon-btn icon-btn-sm" data-action="assessment:grade" data-id="' + esc(a.id) + '" aria-label="Enregistrer une note" title="Enregistrer une note">' + UI.icon('pencil', 15) + '</button>' +
            '<button type="button" class="icon-btn icon-btn-sm" data-action="assessment:edit" data-id="' + esc(a.id) + '" aria-label="Modifier" title="Modifier">' + UI.icon('settings', 15) + '</button>' +
          '</div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ---------------- Vue d'ensemble ---------------- */
  function overview(state, summary) {
    const today = U.startOfDay(new Date());
    const limit = U.addDays(today, 14);
    const upcoming = summary.assessments
      .filter((a) => Store.assessmentStatus(a) !== 'graded' && a.date && U.parseDate(a.date) >= today && U.parseDate(a.date) <= limit)
      .slice(0, 6);
    const exams = summary.assessments.filter((a) => a.type === 'examen' && a.date && U.parseDate(a.date) >= today).slice(0, 4);
    const courseIds = summary.courses.map((r) => r.course.id);
    const work = Store.get().tasks
      .filter((t) => t.category === 'school' && !t.archived && t.status !== 'done' && t.due && courseIds.includes(t.courseId) && U.parseDate(t.due) >= today && U.parseDate(t.due) <= U.endOfDay(limit))
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))
      .slice(0, 6);
    const invalid = summary.courses.filter((r) => !r.stats.weightValid);

    if (!summary.courses.length) {
      return '<section class="card">' + UI.empty('school', 'Aucun cours dans cette session',
        'Créez une session et ajoutez vos cours pour suivre vos travaux, vos notes et vos moyennes.',
        '<button type="button" class="btn btn-primary" data-action="course:new">' + UI.icon('plus', 16) + ' Ajouter un cours</button>' +
        '<button type="button" class="btn btn-soft" data-action="session:new">Créer une session</button>') + '</section>';
    }

    return '<div class="school-summary">' +
        UI.statCard({ icon: 'award', color: Store.catColor('school'), label: 'Moyenne de session', value: summary.average != null ? U.percent(summary.average, 1) : '—', sub: summary.session ? summary.session.name : '' }) +
        UI.statCard({ icon: 'book', color: Store.catColor('school'), label: 'Cours suivis', value: summary.courses.length, sub: 'dans la session' }) +
        UI.statCard({ icon: 'calendar', color: Store.catColor('work'), label: 'Évaluations à venir', value: upcoming.length, sub: 'dans les 14 prochains jours' }) +
        UI.statCard({ icon: 'tasks', color: Store.catColor('personal'), label: 'Travaux à remettre', value: work.length, sub: 'dans les 14 prochains jours' }) +
      '</div>' +
      (invalid.length ? '<div class="callout callout-warn">' + UI.icon('alert', 18) + '<div><strong>Pondérations à vérifier</strong><p>' +
        invalid.map((r) => esc(r.course.code || r.course.name) + ' (' + U.num(r.stats.totalWeight, 1) + ' %)').join(', ') +
        ' — la somme devrait atteindre 100 % pour chaque cours.</p></div></div>' : '') +
      '<section class="section-block">' +
        '<div class="section-head"><div><h2>Mes cours</h2><p class="section-sub">Moyenne actuelle et prochaine échéance, en un regard.</p></div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="course:new">' + UI.icon('plus', 15) + ' Cours</button></div>' +
        '<div class="course-grid">' + summary.courses.map(S.courseCard).join('') + '</div>' +
      '</section>' +
      '<div class="split-grid">' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>' + UI.icon('award', 17) + ' Prochaines évaluations</h2><p>Devoirs, laboratoires, examens et quiz.</p></div></div>' +
          (upcoming.length ? '<div class="deadline-list">' + upcoming.map((a) => {
            const course = Store.find('courses', a.courseId);
            return '<button type="button" class="deadline-row" data-action="assessment:edit" data-id="' + esc(a.id) + '" style="--c:' + esc(course ? course.color : Store.catColor('school')) + '">' +
              '<span class="date-badge"><strong>' + (U.parseDate(a.date) || new Date()).getDate() + '</strong><span>' + U.fmtDate(a.date, { month: 'short' }).replace('.', '') + '</span></span>' +
              '<span class="deadline-main"><span class="deadline-title">' + esc(a.name) + '</span><span class="deadline-meta">' + esc((course ? course.code + ' · ' : '') + Store.assessmentType(a.type) + ' · ' + (a.weight || 0) + ' %') + '</span></span>' +
              '<span class="deadline-when">' + esc(U.relative(a.date)) + '</span><span class="row-chevron">' + UI.icon('chevron-right', 15) + '</span>' +
            '</button>';
          }).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Aucune évaluation dans les deux prochaines semaines.</span></div>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>' + UI.icon('tasks', 17) + ' Travaux à remettre</h2><p>Les prochaines remises de la session.</p></div></div>' +
          (work.length ? '<div class="task-list compact-list">' + work.map((t) => UI.taskRow(t, { compact: true })).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Aucun travail à remettre dans les deux prochaines semaines.</span></div>') +
        '</section>' +
      '</div>' +
      (exams.length ? '<section class="card">' +
        '<div class="card-head"><div><h2>' + UI.icon('flag', 17) + ' Examens à venir</h2><p>Les dates à bloquer dès maintenant.</p></div></div>' +
        '<div class="exam-strip">' + exams.map((a) => {
          const course = Store.find('courses', a.courseId);
          return '<button type="button" class="exam-card" data-action="assessment:edit" data-id="' + esc(a.id) + '" style="--c:' + esc(course ? course.color : Store.catColor('school')) + '">' +
            '<span class="exam-date">' + U.fmtDate(a.date, { day: 'numeric', month: 'short' }) + '</span>' +
            '<strong>' + esc(a.name) + '</strong><span class="muted">' + esc(course ? (course.code || course.name) : '') + ' · ' + (a.weight || 0) + ' %</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</section>' : '');
  }

  /* ---------------- Travaux ---------------- */
  function workTab(state, summary) {
    const courseIds = summary.courses.map((r) => r.course.id);
    let list = Store.get().tasks.filter((t) => t.category === 'school' && !t.archived && courseIds.includes(t.courseId));
    if (state.workKind !== 'all') list = list.filter((t) => t.kind === state.workKind);
    if (state.workCourse !== 'all') list = list.filter((t) => t.courseId === state.workCourse);
    if (state.workStatus === 'open') list = list.filter((t) => t.status !== 'done');
    else if (state.workStatus === 'done') list = list.filter((t) => t.status === 'done');
    list = U.sortBy(list, (t) => (t.due ? U.parseDate(t.due) : null));
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('tasks', 17) + ' Travaux et projets scolaires</h2><p>Devoirs, laboratoires, présentations, examens et révisions.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="task:new" data-cat="school">' + UI.icon('plus', 15) + ' Nouveau travail</button></div>' +
      '<div class="filter-row inline-filters">' +
        '<label class="filter-select"><span>Nature</span><select id="school-work-kind"><option value="all">Toutes</option>' +
          Object.keys(Store.KINDS).map((k) => '<option value="' + k + '"' + (state.workKind === k ? ' selected' : '') + '>' + esc(Store.KINDS[k]) + '</option>').join('') +
        '</select></label>' +
        '<label class="filter-select"><span>Cours</span><select id="school-work-course"><option value="all">Tous</option>' +
          summary.courses.map((r) => '<option value="' + esc(r.course.id) + '"' + (state.workCourse === r.course.id ? ' selected' : '') + '>' + esc(r.course.code || r.course.name) + '</option>').join('') +
        '</select></label>' +
        '<label class="filter-select"><span>Statut</span><select id="school-work-status">' +
          [['open', 'Ouverts'], ['done', 'Terminés'], ['all', 'Tous']].map((s) => '<option value="' + s[0] + '"' + (state.workStatus === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
        '</select></label>' +
      '</div>' +
      (list.length ? '<div class="task-list">' + list.map((t) => UI.taskRow(t)).join('') + '</div>' :
        UI.empty('tasks', 'Aucun travail dans ce filtre', 'Ajoutez un travail scolaire ou modifiez les filtres.', '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="school">Nouveau travail</button>')) +
    '</section>';
  }

  /* ---------------- Évaluations ---------------- */
  function assessmentsTab(state, summary) {
    const courseIds = summary.courses.map((r) => r.course.id);
    let list = summary.assessments;
    if (state.assessmentCourse !== 'all') list = list.filter((a) => a.courseId === state.assessmentCourse);
    if (state.assessmentStatus !== 'all') list = list.filter((a) => Store.assessmentStatus(a) === state.assessmentStatus);
    list = U.sortBy(list, (a) => (a.date ? U.parseDate(a.date) : null), state.assessmentStatus === 'graded');
    const invalid = summary.courses.filter((r) => !r.stats.weightValid);
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('award', 17) + ' Toutes les évaluations</h2><p>Notes, pondérations et statuts de correction.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="assessment:new">' + UI.icon('plus', 15) + ' Nouvelle évaluation</button></div>' +
      (invalid.length ? '<div class="callout callout-warn">' + UI.icon('alert', 18) + '<div><strong>Pondérations incohérentes</strong><p>' +
        invalid.map((r) => esc(r.course.code || r.course.name) + ' : ' + U.num(r.stats.totalWeight, 1) + ' %').join(' · ') + '</p></div></div>' : '') +
      '<div class="filter-row inline-filters">' +
        '<label class="filter-select"><span>Cours</span><select id="school-assessment-course"><option value="all">Tous</option>' +
          summary.courses.map((r) => '<option value="' + esc(r.course.id) + '"' + (state.assessmentCourse === r.course.id ? ' selected' : '') + '>' + esc(r.course.code || r.course.name) + '</option>').join('') +
        '</select></label>' +
        '<label class="filter-select"><span>Statut</span><select id="school-assessment-status">' +
          [['all', 'Tous'], ['upcoming', 'À venir'], ['pending', 'En attente'], ['graded', 'Corrigées']].map((s) => '<option value="' + s[0] + '"' + (state.assessmentStatus === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
        '</select></label>' +
        '<span class="result-count">' + list.length + ' évaluation' + (list.length > 1 ? 's' : '') + '</span>' +
      '</div>' +
      assessmentsTable(list, { emptyAction: '<button type="button" class="btn btn-primary" data-action="assessment:new">Nouvelle évaluation</button>' }) +
      (courseIds.length ? '' : '') +
    '</section>';
  }

  /* ---------------- Sessions ---------------- */
  function sessionsTab() {
    const sessions = Store.get().sessions;
    return '<section class="card">' +
      '<div class="card-head"><div><h2>' + UI.icon('layers', 17) + ' Sessions scolaires</h2><p>Une session regroupe vos cours, travaux et évaluations.</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="session:new">' + UI.icon('plus', 15) + ' Nouvelle session</button></div>' +
      (sessions.length ? '<div class="session-grid">' + sessions.map((s) => {
        const courses = Store.get().courses.filter((c) => c.sessionId === s.id);
        return '<div class="session-card' + (s.active ? ' is-active' : '') + '">' +
          '<div class="session-card-head"><span class="session-badge">' + (s.active ? 'Active' : 'Session') + '</span>' +
          '<div class="row-actions"><button type="button" class="icon-btn icon-btn-sm" data-action="session:edit" data-id="' + esc(s.id) + '" aria-label="Modifier">' + UI.icon('pencil', 15) + '</button></div></div>' +
          '<h3>' + esc(s.name) + '</h3>' +
          '<p class="muted">' + esc(U.fmtDate(s.start, { day: 'numeric', month: 'short', year: 'numeric' })) + ' → ' + esc(U.fmtDate(s.end, { day: 'numeric', month: 'short', year: 'numeric' })) + '</p>' +
          '<div class="session-card-foot"><span>' + courses.length + ' cours</span>' +
          '<span>' + Store.get().assessments.filter((a) => courses.some((c) => c.id === a.courseId)).length + ' évaluations</span></div>' +
          (!s.active ? '<button type="button" class="btn btn-soft btn-sm" data-action="session:activate" data-id="' + esc(s.id) + '">Rendre active</button>' : '') +
        '</div>';
      }).join('') + '</div>' : UI.empty('layers', 'Aucune session', 'Créez une session pour organiser vos cours par trimestre.', '<button type="button" class="btn btn-primary" data-action="session:new">Créer une session</button>')) +
    '</section>';
  }

  /* ---------------- Page cours ---------------- */
  function courseScheduleText(course) {
    if (!course.schedule || !course.schedule.length) return 'Horaire à préciser';
    return course.schedule.map((s) => U.weekdayName(s.weekday, true) + ' ' + s.start + '–' + s.end).join(' · ');
  }

  function gradeResultsHtml(course, stats, opts) {
    const o = opts || {};
    const graded = stats.graded;
    const hasAssessments = stats.list.length > 0;
    let neededText = '';
    let neededTone = 'neutral';
    if (!stats.remainingWeight) {
      neededText = hasAssessments ? 'Toutes les évaluations sont corrigées.' : 'Aucune évaluation enregistrée.';
    } else if (stats.needed > 100.01) {
      neededText = 'Objectif hors d\'atteinte avec les pondérations restantes (il faudrait plus de 100 %).';
      neededTone = 'danger';
    } else if (stats.needed <= 0) {
      neededText = 'Objectif déjà atteint, même avec 0 % sur le reste.';
      neededTone = 'success';
    } else {
      neededText = 'Il faut environ ' + U.percent(stats.needed, 1) + ' sur les évaluations restantes.';
    }

    const breakdown = stats.list.map((a) => {
      const st = Store.assessmentStatus(a);
      const pct = st === 'graded' && a.grade != null ? (Number(a.grade) / (Number(a.max) || 100)) * 100 : null;
      return '<tr>' +
        '<td><strong>' + esc(a.name) + '</strong><span class="cell-sub">' + esc(Store.assessmentType(a.type)) + '</span></td>' +
        '<td class="nowrap">' + esc(U.fmtDate(a.date, { day: 'numeric', month: 'short' })) + '</td>' +
        '<td class="nowrap">' + U.num(a.weight, 1) + ' %</td>' +
        '<td class="nowrap">' + (pct != null ? U.num(a.grade, 2) + ' / ' + U.num(a.max || 100, 0) : '<span class="muted">—</span>') + '</td>' +
        '<td class="nowrap">' + (pct != null ? U.percent(pct, 1) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + assessmentStatusChip(a) + '</td>' +
        '<td class="row-actions-cell"><div class="row-actions">' +
          '<button type="button" class="icon-btn icon-btn-sm" data-action="assessment:grade" data-id="' + esc(a.id) + '" title="Enregistrer une note" aria-label="Enregistrer une note">' + UI.icon('pencil', 15) + '</button>' +
          '<button type="button" class="icon-btn icon-btn-sm" data-action="assessment:edit" data-id="' + esc(a.id) + '" title="Modifier" aria-label="Modifier">' + UI.icon('settings', 15) + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    return '<div class="grade-overview card">' +
        '<div class="grade-hero">' +
          '<div class="grade-hero-label">Moyenne actuelle</div>' +
          '<div class="grade-big' + (stats.average == null ? ' is-empty' : '') + '">' + (stats.average != null ? U.percent(stats.average, 1) : '—') + '</div>' +
          '<p class="muted">' + (graded.length ? 'Calculée sur ' + graded.length + ' évaluation' + (graded.length > 1 ? 's' : '') + ' corrigée' + (graded.length > 1 ? 's' : '') : 'Aucune évaluation corrigée pour l\'instant') + '</p>' +
          '<div class="grade-progress-labels"><span>Note évaluée</span><strong>' + U.num(stats.gradedWeight, 1) + ' %</strong></div>' +
          UI.progressBar(stats.gradedWeight, { color: course.color, cls: 'progress-lg' }) +
          '<div class="grade-progress-labels"><span>Restant à évaluer</span><strong>' + U.num(stats.remainingWeight, 1) + ' %</strong></div>' +
          UI.progressBar(stats.remainingWeight, { color: 'var(--border-strong)', cls: 'progress-lg progress-muted' }) +
        '</div>' +
        '<div class="grade-metrics">' +
          '<div class="grade-metric"><span>Projection finale</span><strong>' + (stats.projected != null ? U.percent(stats.projected, 1) : '—') + '</strong><small>si ' + U.percent(stats.hypothesis, 0) + ' sur le reste</small></div>' +
          '<div class="grade-metric"><span>Objectif visé</span><strong>' + U.percent(stats.target, 0) + '</strong><small>note finale souhaitée</small></div>' +
          '<div class="grade-metric grade-metric-wide ' + (neededTone === 'danger' ? 'metric-danger' : neededTone === 'success' ? 'metric-success' : '') + '">' +
            '<span>Note nécessaire sur le restant</span>' +
            '<strong>' + (stats.remainingWeight && stats.needed > 0 && stats.needed <= 100.01 ? U.percent(stats.needed, 1) : stats.remainingWeight ? (stats.needed <= 0 ? 'Atteint' : '> 100 %') : '—') + '</strong>' +
            '<small>' + esc(neededText) + '</small>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (!stats.weightValid ? '<div class="callout callout-warn">' + UI.icon('alert', 18) + '<div><strong>Pondérations : ' + U.num(stats.totalWeight, 1) + ' % au total</strong><p>La somme des pondérations devrait être de 100 %. Les calculs utilisent les poids saisis et restent fiables, mais vérifiez les évaluations ci-dessous.</p></div></div>' : '') +
      '<section class="card grade-breakdown">' +
        '<div class="card-head"><div><h2>Détail des évaluations</h2><p>Chaque note est pondérée selon son importance dans le cours.</p></div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="assessment:new" data-course="' + esc(course.id) + '">' + UI.icon('plus', 15) + ' Évaluation</button></div>' +
        (stats.list.length ? '<div class="table-wrap"><table class="table">' +
          '<thead><tr><th>Évaluation</th><th>Date</th><th>Poids</th><th>Note</th><th>%</th><th>Statut</th><th></th></tr></thead>' +
          '<tbody>' + breakdown + '</tbody></table></div>' :
          UI.empty('award', 'Aucune évaluation', 'Ajoutez vos examens, devoirs et laboratoires pour calculer votre moyenne.', '<button type="button" class="btn btn-primary" data-action="assessment:new" data-course="' + esc(course.id) + '">Ajouter une évaluation</button>')) +
      '</section>';
  }

  function coursePage(id) {
    const state = schoolState();
    const course = Store.find('courses', id);
    if (!course) {
      return {
        title: 'Cours introuvable',
        html: '<div class="view-inner"><section class="card">' + UI.empty('book', 'Cours introuvable', 'Ce cours a peut-être été supprimé.', '<a class="btn btn-primary" href="#/school">Retour à l\'école</a>') + '</section></div>'
      };
    }
    const stats = Select.courseStats(course.id);
    const next = Select.nextAssessment(course.id);
    const tasks = Store.get().tasks.filter((t) => t.courseId === course.id && !t.archived);
    const openTasks = tasks.filter((t) => t.status !== 'done');
    const assessments = Select.courseAssessments(course.id);
    const session = Store.get().sessions.find((s) => s.id === course.sessionId);
    const courseTab = state.courseTab || 'tasks';
    const tabList = [
      { key: 'tasks', label: 'Tâches', count: openTasks.length },
      { key: 'assessments', label: 'Évaluations', count: assessments.length },
      { key: 'notes', label: 'Notes', count: null },
      { key: 'events', label: 'Événements', count: null },
      { key: 'resources', label: 'Ressources', count: (course.links || []).length }
    ];

    const tabs = '<div class="tabs tabs-course">' + tabList.map((t) =>
      '<button type="button" class="tab' + (courseTab === t.key ? ' is-active' : '') + '" data-action="course:tab" data-tab="' + t.key + '">' +
        esc(t.label) + (t.count != null ? '<span class="tab-count">' + t.count + '</span>' : '') +
      '</button>').join('') + '</div>';

    const hero = '<section class="course-hero" style="--c:' + esc(course.color) + '">' +
      '<div class="course-hero-main">' +
        '<a class="back-link" href="#/school">' + UI.icon('arrow-left', 15) + ' École</a>' +
        '<div class="course-hero-title"><span class="course-code">' + esc(course.code || 'Cours') + '</span>' +
        '<h1>' + esc(course.name) + '</h1></div>' +
        '<p class="course-hero-sub">' + esc(course.teacher || 'Enseignant à préciser') + (session ? ' · ' + esc(session.name) : '') + '</p>' +
        '<div class="course-hero-meta">' +
          '<span>' + UI.icon('clock', 14) + esc(courseScheduleText(course)) + '</span>' +
          (course.location ? '<span>' + UI.icon('folder', 14) + esc(course.location) + '</span>' : '') +
          (course.onlineUrl ? '<a href="' + esc(course.onlineUrl) + '" target="_blank" rel="noopener">' + UI.icon('external', 14) + 'Lien du cours</a>' : '') +
        '</div>' +
      '</div>' +
      '<div class="course-hero-side">' +
        UI.ring(stats.average != null ? stats.average : 0, { label: 'Moyenne', color: course.color }) +
        '<div class="course-hero-small"><span>Évalué</span><strong>' + U.num(stats.gradedWeight, 1) + ' %</strong></div>' +
        '<div class="course-hero-small"><span>Prochaine évaluation</span><strong>' + (next ? esc(next.name) : '—') + '</strong>' + (next ? '<small>' + esc(U.fmtDate(next.date, { day: 'numeric', month: 'short' })) + '</small>' : '') + '</div>' +
      '</div>' +
      '<div class="course-hero-actions">' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="course:edit" data-id="' + esc(course.id) + '">' + UI.icon('pencil', 15) + ' Modifier</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="task:new" data-cat="school" data-course="' + esc(course.id) + '">' + UI.icon('plus', 15) + ' Tâche</button>' +
      '</div>' +
    '</section>';

    let content = '';
    if (courseTab === 'tasks') {
      content = '<section class="card">' +
        '<div class="card-head"><div><h2>Travaux du cours</h2><p>Devoirs, projets, laboratoires et révisions.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="task:new" data-cat="school" data-course="' + esc(course.id) + '">' + UI.icon('plus', 15) + ' Nouvelle tâche</button></div>' +
        (tasks.length ? '<div class="task-list">' + U.sortBy(tasks, (t) => (t.status === 'done' ? 1 : 0)).map((t) => UI.taskRow(t)).join('') + '</div>' :
          UI.empty('tasks', 'Aucune tâche pour ce cours', 'Ajoutez un travail ou une révision pour suivre votre progression.', '<button type="button" class="btn btn-primary" data-action="task:new" data-cat="school" data-course="' + esc(course.id) + '">Créer une tâche</button>')) +
      '</section>';
    } else if (courseTab === 'assessments') {
      content = '<section class="card">' +
        '<div class="card-head"><div><h2>Évaluations</h2><p>Pondérations et notes de ' + esc(course.code || course.name) + '.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="assessment:new" data-course="' + esc(course.id) + '">' + UI.icon('plus', 15) + ' Nouvelle évaluation</button></div>' +
        (Math.abs(stats.totalWeight - 100) > 0.01 ? '<div class="callout callout-warn">' + UI.icon('alert', 18) + '<div>Somme des pondérations : <strong>' + U.num(stats.totalWeight, 1) + ' %</strong>. Elle devrait être de 100 %.</div></div>' : '') +
        assessmentsTable(assessments, { hideCourse: true, emptyAction: '<button type="button" class="btn btn-primary" data-action="assessment:new" data-course="' + esc(course.id) + '">Ajouter une évaluation</button>' }) +
      '</section>';
    } else if (courseTab === 'notes') {
      const hypo = state.hypo[course.id] != null ? state.hypo[course.id] : (stats.average != null ? Math.round(stats.average * 10) / 10 : 75);
      const target = state.target[course.id] != null ? state.target[course.id] : 80;
      content = '<section class="card grade-tools">' +
          '<div class="card-head"><div><h2>Simulateur de note</h2><p>Ajustez une hypothèse pour visualiser votre note finale.</p></div></div>' +
          '<div class="grade-tool-row">' +
            '<label class="field"><span class="field-label">Résultat hypothétique sur le restant</span><div class="range-wrap"><input type="range" id="grade-hypo" min="0" max="100" step="1" value="' + U.clamp(Number(hypo) || 0, 0, 100) + '"><output>' + U.num(hypo, 0) + ' %</output></div></label>' +
            '<label class="field"><span class="field-label">Objectif de note finale</span><div class="input-suffix"><input type="number" class="input" id="grade-target" min="0" max="100" step="1" value="' + U.num(target, 0) + '"><span>%</span></div></label>' +
          '</div>' +
        '</section>' +
        '<div id="grade-results">' + gradeResultsHtml(course, Select.courseStats(course.id, { hypo: hypo, target: target })) + '</div>';
    } else if (courseTab === 'events') {
      const now = new Date();
      const occurrences = Select.eventsInRange(now, U.addDays(now, 60), { courseId: course.id, includeSchedules: false });
      const schedule = course.schedule || [];
      content = '<div class="split-grid">' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Prochains événements</h2><p>Examen, atelier, rencontre ou remise planifiée.</p></div>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="event:new" data-cat="school" data-course="' + esc(course.id) + '">' + UI.icon('plus', 15) + ' Événement</button></div>' +
          (occurrences.length ? '<div class="agenda-list">' + occurrences.map((o) => S.agendaRow(o)).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('calendar', 18) + '<span>Aucun événement à venir pour ce cours.</span></div>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Horaire hebdomadaire</h2><p>Les plages de cours se retrouvent automatiquement au calendrier.</p></div></div>' +
          (schedule.length ? '<div class="schedule-list">' + schedule.map((s) =>
            '<div class="schedule-item"><span class="schedule-day">' + esc(U.weekdayName(s.weekday)) + '</span><span class="schedule-time">' + esc(s.start) + ' – ' + esc(s.end) + '</span><span class="schedule-room">' + esc(s.room || course.location || '') + '</span></div>').join('') + '</div>' :
            '<div class="quiet-empty">' + UI.icon('clock', 18) + '<span>Horaire à préciser dans les informations du cours.</span></div>') +
        '</section>' +
      '</div>';
    } else {
      content = '<div class="split-grid">' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Ressources</h2><p>Documents, dépôts et liens utiles.</p></div>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="course:edit" data-id="' + esc(course.id) + '">' + UI.icon('pencil', 15) + ' Modifier</button></div>' +
          ((course.links && course.links.length) ? '<div class="resource-list">' + course.links.map((l) =>
            '<a class="resource-row" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + UI.icon('link', 16) + '<span>' + esc(l.label) + '</span>' + UI.icon('external', 14) + '</a>').join('') + '</div>' :
            '<div class="quiet-empty">' + UI.icon('link', 18) + '<span>Aucun lien enregistré.</span></div>') +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>Notes du cours</h2><p>Informations utiles, consignes et rappels.</p></div></div>' +
          (course.notes ? '<div class="note-body">' + esc(course.notes).replace(/\n/g, '<br>') + '</div>' : '<div class="quiet-empty">' + UI.icon('book', 18) + '<span>Aucune note pour ce cours.</span></div>') +
        '</section>' +
      '</div>';
    }

    return {
      title: course.code ? course.code + ' — ' + course.name : course.name,
      html: '<div class="view-inner course-page">' + hero + tabs + content + '</div>',
      mount: function () {
        if (courseTab === 'notes') {
          const hypo = document.getElementById('grade-hypo');
          const target = document.getElementById('grade-target');
          const results = document.getElementById('grade-results');
          function refresh() {
            state.hypo[course.id] = Number(hypo.value);
            state.target[course.id] = Number(target.value);
            const out = hypo.parentElement.querySelector('output');
            if (out) out.textContent = hypo.value + ' %';
            results.innerHTML = gradeResultsHtml(course, Select.courseStats(course.id, { hypo: Number(hypo.value), target: Number(target.value) }));
          }
          if (hypo) hypo.addEventListener('input', refresh);
          if (target) target.addEventListener('input', refresh);
        }
      }
    };
  }

  /* ---------------- Entrée principale ---------------- */
  Views.school = function (route) {
    if (route && route[0] === 'course') return coursePage(route[1]);
    const state = schoolState();
    if (!['overview', 'courses', 'work', 'assessments', 'sessions'].includes(state.tab)) state.tab = 'overview';
    const session = currentSession(state);
    const summary = Select.sessionSummary(session ? session.id : null);

    let content = '';
    if (state.tab === 'overview') content = overview(state, summary);
    else if (state.tab === 'courses') {
      content = '<section class="card">' +
        '<div class="card-head"><div><h2>Mes cours</h2><p>' + (session ? esc(session.name) : 'Toutes sessions') + ' · ' + summary.courses.length + ' cours</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="course:new">' + UI.icon('plus', 15) + ' Nouveau cours</button></div>' +
        (summary.courses.length ? '<div class="course-grid">' + summary.courses.map(S.courseCard).join('') + '</div>' :
          UI.empty('book', 'Aucun cours', 'Ajoutez un cours pour commencer le suivi académique.', '<button type="button" class="btn btn-primary" data-action="course:new">Ajouter un cours</button>')) +
      '</section>';
    } else if (state.tab === 'work') content = workTab(state, summary);
    else if (state.tab === 'assessments') content = assessmentsTab(state, summary);
    else content = sessionsTab();

    return {
      title: 'École',
      html: '<div class="view-inner school-view">' +
        pageHead(state, summary, '<button type="button" class="btn btn-primary" data-action="course:new">' + UI.icon('plus', 16) + ' Nouveau cours</button>') +
        tabsHtml(state, summary) +
        content +
      '</div>',
      mount: function () {
        const sessionSelectEl = document.getElementById('school-session');
        if (sessionSelectEl) {
          sessionSelectEl.addEventListener('change', () => {
            state.sessionId = sessionSelectEl.value;
            state.workCourse = 'all';
            state.assessmentCourse = 'all';
            EP.App.render();
          });
        }
        const bind = (id, key) => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('change', () => { state[key] = el.value; EP.App.render(); });
        };
        bind('school-work-kind', 'workKind');
        bind('school-work-course', 'workCourse');
        bind('school-work-status', 'workStatus');
        bind('school-assessment-course', 'assessmentCourse');
        bind('school-assessment-status', 'assessmentStatus');
      }
    };
  };
})();

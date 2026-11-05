/* Efficient Planner — formulaires et éditeurs */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const UI = EP.UI;
  const esc = U.esc;
  const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#14b8a6', '#f97316'];

  // Erreur de saisie attendue : affichée en toast, pas journalisée comme un bug.
  function invalid(message) {
    const err = new Error(message);
    err.name = 'ValidationError';
    return err;
  }

  function val(form, name) {
    const el = form.elements[name];
    if (!el) return '';
    return String(el.value == null ? '' : el.value).trim();
  }
  function rawVal(form, name) {
    const el = form.elements[name];
    return el ? String(el.value == null ? '' : el.value) : '';
  }
  function numVal(form, name, fallback) {
    const v = parseFloat(String(val(form, name)).replace(',', '.'));
    return isNaN(v) ? fallback : v;
  }
  function checked(form, name) {
    const el = form.elements[name];
    if (!el) return false;
    if (typeof el.length === 'number' && !el.tagName) return Array.from(el).some((x) => x.checked);
    return !!el.checked;
  }
  function radioVal(form, name, fallback) {
    const el = form.elements[name];
    if (!el) return fallback;
    if (typeof el.value === 'string') return el.value;
    const found = Array.from(el).find((x) => x.checked);
    return found ? found.value : fallback;
  }
  function splitTags(text) {
    return String(text || '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 12);
  }

  function bindRows(form, addSel, containerSel, rowHtml) {
    const add = form.querySelector(addSel);
    const box = form.querySelector(containerSel);
    if (add && box) {
      add.addEventListener('click', () => {
        box.insertAdjacentHTML('beforeend', rowHtml(null));
        const last = box.lastElementChild;
        const focusable = last ? last.querySelector('input, select') : null;
        if (focusable) focusable.focus();
      });
    }
    if (box) {
      box.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-remove-row]');
        if (rm) {
          const row = rm.closest('.dyn-row');
          if (row) row.remove();
        }
      });
    }
  }

  function deleteButton(id) {
    return '<button type="button" class="btn btn-ghost danger-text btn-delete" id="' + id + '">' + UI.icon('trash', 15) + ' Supprimer</button>';
  }

  function bindDelete(btn, onConfirm) {
    if (!btn) return;
    const original = btn.innerHTML;
    let armed = false, timer = null;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.classList.add('is-armed');
        btn.innerHTML = UI.icon('alert', 15) + ' Confirmer la suppression';
        clearTimeout(timer);
        timer = setTimeout(() => {
          armed = false;
          btn.classList.remove('is-armed');
          btn.innerHTML = original;
        }, 4000);
        return;
      }
      clearTimeout(timer);
      onConfirm();
    });
  }

  function courseOptions(selected, placeholder) {
    const courses = Store.get().courses.slice().sort((a, b) => String(a.code || a.name).localeCompare(String(b.code || b.name)));
    return '<option value="">' + esc(placeholder || 'Aucun cours') + '</option>' + courses.map((c) =>
      '<option value="' + esc(c.id) + '"' + (selected === c.id ? ' selected' : '') + '>' +
      esc((c.code ? c.code + ' — ' : '') + c.name) + '</option>').join('');
  }
  function projectOptions(selected) {
    const projects = Store.get().projects.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return '<option value="">Aucun projet</option>' + projects.map((p) =>
      '<option value="' + esc(p.id) + '"' + (selected === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');
  }
  function sessionOptions(selected) {
    const sessions = Store.get().sessions;
    return '<option value="">Aucune session</option>' + sessions.map((s) =>
      '<option value="' + esc(s.id) + '"' + (selected === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('');
  }
  function assessmentOptions(courseId, selected) {
    const list = courseId ? EP.Select.courseAssessments(courseId) : [];
    return '<option value="">Aucune évaluation liée</option>' + list.map((a) =>
      '<option value="' + esc(a.id) + '"' + (selected === a.id ? ' selected' : '') + '>' +
      esc(a.name) + ' · ' + esc(Store.assessmentType(a.type)) + ' · ' + (a.weight || 0) + ' %</option>').join('');
  }

  function subtaskRow(s) {
    const item = s || {};
    return '<div class="dyn-row subtask-row" data-id="' + esc(item.id || '') + '">' +
      '<label class="mini-check"><input type="checkbox" class="sub-done"' + (item.done ? ' checked' : '') + '><span></span></label>' +
      '<input type="text" class="input sub-title" placeholder="Décrire une sous-tâche" value="' + esc(item.title || '') + '">' +
      '<button type="button" class="icon-btn icon-btn-sm" data-remove-row aria-label="Retirer">' + UI.icon('x', 14) + '</button>' +
    '</div>';
  }
  function linkRow(l) {
    const item = l || {};
    return '<div class="dyn-row link-row" data-id="' + esc(item.id || '') + '">' +
      '<input type="text" class="input link-label" placeholder="Libellé" value="' + esc(item.label || '') + '">' +
      '<input type="url" class="input link-url" placeholder="https://" value="' + esc(item.url || '') + '">' +
      '<button type="button" class="icon-btn icon-btn-sm" data-remove-row aria-label="Retirer">' + UI.icon('x', 14) + '</button>' +
    '</div>';
  }
  function teamRow(m) {
    const item = m || {};
    return '<div class="dyn-row team-row" data-id="' + esc(item.id || '') + '">' +
      '<input type="text" class="input team-name" placeholder="Nom" value="' + esc(item.name || '') + '">' +
      '<input type="text" class="input team-role" placeholder="Responsabilité" value="' + esc(item.role || '') + '">' +
      '<button type="button" class="icon-btn icon-btn-sm" data-remove-row aria-label="Retirer">' + UI.icon('x', 14) + '</button>' +
    '</div>';
  }
  function scheduleRow(slot) {
    const item = slot || { weekday: 1, start: '09:00', end: '10:30', room: '' };
    const days = U.WEEKDAYS.map((d) => '<option value="' + d.value + '"' + (Number(item.weekday) === d.value ? ' selected' : '') + '>' + d.long + '</option>').join('');
    return '<div class="dyn-row schedule-row" data-id="' + esc(item.id || '') + '">' +
      '<select class="input schedule-day">' + days + '</select>' +
      '<input type="time" class="input schedule-start" value="' + esc(item.start || '09:00') + '">' +
      '<input type="time" class="input schedule-end" value="' + esc(item.end || '10:30') + '">' +
      '<input type="text" class="input schedule-room" placeholder="Local" value="' + esc(item.room || '') + '">' +
      '<button type="button" class="icon-btn icon-btn-sm" data-remove-row aria-label="Retirer">' + UI.icon('x', 14) + '</button>' +
    '</div>';
  }

  function readSubtasks(form) {
    return U.qsa('.subtask-row', form).map((row) => {
      const title = row.querySelector('.sub-title').value.trim();
      if (!title) return null;
      return {
        id: row.dataset.id || U.uid('st'),
        title: title,
        done: row.querySelector('.sub-done').checked
      };
    }).filter(Boolean);
  }
  function readLinks(form) {
    return U.qsa('.link-row', form).map((row) => {
      const label = row.querySelector('.link-label').value.trim();
      let url = row.querySelector('.link-url').value.trim();
      if (!url && !label) return null;
      if (url && !/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = 'https://' + url;
      return { id: row.dataset.id || U.uid('ln'), label: label || url, url: url };
    }).filter((x) => x && x.url);
  }
  function readTeam(form) {
    return U.qsa('.team-row', form).map((row) => {
      const name = row.querySelector('.team-name').value.trim();
      const role = row.querySelector('.team-role').value.trim();
      if (!name) return null;
      return { id: row.dataset.id || U.uid('tm'), name: name, role: role };
    }).filter(Boolean);
  }
  function readSchedule(form) {
    return U.qsa('.schedule-row', form).map((row) => {
      const start = row.querySelector('.schedule-start').value;
      const end = row.querySelector('.schedule-end').value;
      if (!start || !end) return null;
      return {
        id: row.dataset.id || U.uid('sl'),
        weekday: Number(row.querySelector('.schedule-day').value),
        start: start,
        end: end,
        room: row.querySelector('.schedule-room').value.trim()
      };
    }).filter(Boolean);
  }

  /* ================= Tâche ================= */
  function taskForm(id, defaults) {
    const existing = id ? Store.find('tasks', id) : null;
    const t = existing || Object.assign({
      title: '', description: '', category: (Store.get().settings.defaultCategory || 'personal'),
      status: 'todo', priority: 'normal', due: '', estimate: '', courseId: '', projectId: '',
      kind: 'autre', progress: 0, subtasks: [], tags: [], links: [], team: [], notes: '', assessmentId: ''
    }, defaults || {});
    const isNew = !existing;
    if (defaults && defaults.courseId && !t.category) t.category = 'school';
    const schoolVisible = t.category === 'school';
    const workVisible = t.category === 'work';
    const teamVisible = t.category === 'school' && t.kind === 'equipe';
    const finishLabel = isNew ? 'Créer la tâche' : 'Enregistrer';
    const series = Store.taskSeries(t);
    const recurrence = series ? series.recurrence : { freq: 'none', interval: 1 };
    const selectedDays = recurrence.weekdays || [U.parseDate(t.due || U.todayKey()).getDay()];
    const endMode = recurrence.count ? 'count' : recurrence.until ? 'until' : 'never';

    const body =
      '<div class="form-grid">' +
        UI.field('Titre de la tâche', '<input type="text" class="input" name="title" value="' + esc(t.title) + '" placeholder="Ex. : Réviser le chapitre 4" required maxlength="160" autofocus>', { cls: 'span-2' }) +
        '<div class="field span-2"><span class="field-label">Catégorie</span>' + UI.catSeg('category', t.category) + '</div>' +
        UI.field('Échéance', '<input type="datetime-local" class="input" name="due" value="' + esc(t.due || '') + '">', { hint: 'Laisser vide si aucune date fixe.' }) +
        UI.field('Priorité', '<select class="input" name="priority">' + UI.options(Store.PRIORITIES, t.priority || 'normal') + '</select>') +
        UI.field('Statut', '<select class="input" name="status">' + UI.options(Store.STATUSES, t.status || 'todo') + '</select>') +
        UI.field('Durée estimée', '<div class="input-suffix"><input type="number" class="input" name="estimate" min="0" step="5" value="' + esc(t.estimate || '') + '" placeholder="45"><span>min</span></div>') +
        '<div class="field span-2"><label class="switch-field switch-inline"><input type="checkbox" name="showInCalendar"' + (t.showInCalendar ? ' checked' : '') + '><span class="switch"></span><span>Afficher l’échéance dans le calendrier</span></label><small class="field-hint">Petite bannière à la date d’échéance, sans réserver de plage horaire.</small></div>' +
        (series ? UI.field('Appliquer les changements à', '<select class="input" name="taskScope"><option value="occurrence">Cette occurrence seulement</option><option value="following">Cette occurrence et les suivantes</option></select>', { cls: 'span-2', hint: 'Les occurrences déjà terminées sont conservées.' }) : '') +
        (series ? '<p class="hint span-2">' + UI.icon('repeat', 12) + ' Tous les ' + esc((recurrence.weekdays || []).map((day) => U.weekdayName(day, true)).join(', ')) + ' · toutes les ' + (Number(recurrence.interval) || 1) + ' semaine(s) · ' + (recurrence.count ? recurrence.count + ' occurrences au total' : recurrence.until ? 'jusqu’au ' + esc(U.fmtDate(recurrence.until)) : 'toujours') + '</p>' : '') +
        '<div class="field span-2 task-recurrence-editor" data-task-recurrence-editor' + (series ? ' hidden' : '') + '>' +
          '<div class="form-grid form-grid-tight">' +
            UI.field('Répétition', '<select class="input" name="taskRepeat"><option value="none"' + (recurrence.freq !== 'weekly' ? ' selected' : '') + '>Ne pas répéter</option><option value="weekly"' + (recurrence.freq === 'weekly' ? ' selected' : '') + '>Chaque semaine</option></select>') +
            '<div class="field" data-task-repeat-extra><label class="field-label" for="task-repeat-interval">Toutes les</label><div class="input-suffix"><input type="number" class="input" id="task-repeat-interval" name="taskInterval" min="1" max="52" step="1" value="' + (Number(recurrence.interval) || 1) + '"><span>semaine(s)</span></div></div>' +
            '<div class="field span-2" data-task-repeat-extra><span class="field-label" id="task-weekdays-label">Les jours suivants</span><div class="weekday-picker" role="group" aria-labelledby="task-weekdays-label">' +
              U.WEEKDAYS.map((d) => '<label class="weekday-toggle" title="' + esc(d.long) + '"><input type="checkbox" name="taskWeekdays" value="' + d.value + '" aria-label="' + esc(d.long) + '"' + (selectedDays.includes(d.value) ? ' checked' : '') + '><span>' + d.short.charAt(0) + '</span></label>').join('') +
            '</div></div>' +
            '<div class="field" data-task-repeat-extra>' + UI.field('Fin de la répétition', '<select class="input" name="taskEnd"><option value="never"' + (endMode === 'never' ? ' selected' : '') + '>Toujours</option><option value="count"' + (endMode === 'count' ? ' selected' : '') + '>Après un nombre d’occurrences</option><option value="until"' + (endMode === 'until' ? ' selected' : '') + '>À une date</option></select>') + '</div>' +
            '<div class="field" data-task-count>' + UI.field('Nombre d’occurrences', '<input type="number" class="input" name="taskCount" min="1" step="1" value="' + (Number(recurrence.count) || 4) + '">', { hint: 'Inclut la première tâche : 4 = quatre tâches au total.' }) + '</div>' +
            '<div class="field" data-task-until>' + UI.field('Dernier jour inclus', '<input type="date" class="input" name="taskUntil" value="' + esc(recurrence.until || '') + '">') + '</div>' +
          '</div><p class="field-hint">La première occurrence est le premier jour choisi à partir de l’échéance. Chaque occurrence peut être terminée séparément.</p>' +
        '</div>' +
        '<div class="field span-2" data-panel="school"' + (schoolVisible ? '' : ' hidden') + '>' +
          '<div class="form-grid form-grid-tight">' +
            UI.field('Cours associé', '<select class="input" name="courseId">' + courseOptions(t.courseId) + '</select>') +
            UI.field('Nature du travail', '<select class="input" name="kind">' + UI.options(Store.KINDS, t.kind || 'autre') + '</select>') +
          '</div>' +
          '<div class="form-grid form-grid-tight">' +
            UI.field('Évaluation liée', '<select class="input" name="assessmentId">' + assessmentOptions(t.courseId, t.assessmentId) + '</select>', { hint: 'Permet d\'enregistrer la note sans créer une seconde entrée.' }) +
            UI.field('Progression', '<div class="range-wrap"><input type="range" name="progress" min="0" max="100" step="5" value="' + (Number(t.progress) || 0) + '"><output>' + (Number(t.progress) || 0) + ' %</output></div>') +
          '</div>' +
          '<div class="field" data-panel="team"' + (teamVisible ? '' : ' hidden') + '>' +
            '<span class="field-label">Membres de l\'équipe</span>' +
            '<div class="dyn-rows team-rows">' + (t.team || []).map(teamRow).join('') + '</div>' +
            '<button type="button" class="link-btn" data-add-team>' + UI.icon('plus', 14) + ' Ajouter un membre</button>' +
          '</div>' +
        '</div>' +
        '<div class="field span-2" data-panel="work"' + (workVisible ? '' : ' hidden') + '>' +
          '<div class="form-grid form-grid-tight">' +
            UI.field('Projet associé', '<select class="input" name="projectId">' + projectOptions(t.projectId) + '</select>') +
            UI.field('Progression', '<div class="range-wrap"><input type="range" name="progressWork" min="0" max="100" step="5" value="' + (Number(t.progress) || 0) + '"><output>' + (Number(t.progress) || 0) + ' %</output></div>') +
          '</div>' +
        '</div>' +
        UI.field('Description', '<textarea class="input" name="description" rows="2" placeholder="Quelques précisions utiles…">' + esc(t.description || '') + '</textarea>', { cls: 'span-2' }) +
      '</div>' +
      '<details class="form-details"' + ((t.subtasks && t.subtasks.length) || (t.links && t.links.length) || (t.tags && t.tags.length) || t.notes ? ' open' : '') + '>' +
        '<summary>' + UI.icon('list', 16) + ' Organisation et détails</summary>' +
        '<div class="form-grid">' +
          '<div class="field span-2"><span class="field-label">Sous-tâches</span>' +
            '<div class="dyn-rows subtask-rows">' + (t.subtasks || []).map(subtaskRow).join('') + '</div>' +
            '<button type="button" class="link-btn" data-add-subtask>' + UI.icon('plus', 14) + ' Ajouter une sous-tâche</button>' +
          '</div>' +
          UI.field('Étiquettes', '<input type="text" class="input" name="tags" value="' + esc((t.tags || []).join(', ')) + '" placeholder="école, révision, client">', { cls: 'span-2', hint: 'Séparez les étiquettes par des virgules.' }) +
          '<div class="field span-2"><span class="field-label">Liens utiles</span>' +
            '<div class="dyn-rows link-rows">' + (t.links || []).map(linkRow).join('') + '</div>' +
            '<button type="button" class="link-btn" data-add-link>' + UI.icon('plus', 14) + ' Ajouter un lien</button>' +
          '</div>' +
          UI.field('Notes supplémentaires', '<textarea class="input" name="notes" rows="3">' + esc(t.notes || '') + '</textarea>', { cls: 'span-2' }) +
        '</div>' +
      '</details>';

    UI.modal({
      title: isNew ? 'Nouvelle tâche' : 'Modifier la tâche',
      subtitle: isNew ? 'Quelques secondes suffisent — les options avancées sont facultatives.' : '',
      size: 'lg',
      body: body,
      submitLabel: finishLabel,
      footerLeft: isNew ? '' : deleteButton('task-delete'),
      onMount: function (form) {
        bindRows(form, '[data-add-subtask]', '.subtask-rows', subtaskRow);
        bindRows(form, '[data-add-link]', '.link-rows', linkRow);
        bindRows(form, '[data-add-team]', '.team-rows', teamRow);
        function refreshTaskRecurrence() {
          const editingSeries = !series || val(form, 'taskScope') === 'following';
          form.querySelector('[data-task-recurrence-editor]').hidden = !editingSeries;
          const repeating = editingSeries && val(form, 'taskRepeat') === 'weekly';
          U.qsa('[data-task-repeat-extra]', form).forEach((el) => { el.hidden = !repeating; });
          form.querySelector('[data-task-count]').hidden = !repeating || val(form, 'taskEnd') !== 'count';
          form.querySelector('[data-task-until]').hidden = !repeating || val(form, 'taskEnd') !== 'until';
          const del = form.querySelector('#task-delete');
          if (del) del.innerHTML = UI.icon('trash', 15) + (series && editingSeries ? ' Supprimer cette occurrence et les suivantes' : series ? ' Supprimer cette occurrence' : ' Supprimer');
        }
        ['taskScope', 'taskRepeat', 'taskEnd'].forEach((name) => {
          if (form.elements[name]) form.elements[name].addEventListener('change', refreshTaskRecurrence);
        });
        refreshTaskRecurrence();
        let weekdaysTouched = !!series;
        U.qsa('input[name=taskWeekdays]', form).forEach((el) => el.addEventListener('change', () => { weekdaysTouched = true; }));
        form.elements.due.addEventListener('change', () => {
          const due = U.parseDate(val(form, 'due'));
          if (due && !weekdaysTouched) U.qsa('input[name=taskWeekdays]', form).forEach((el) => { el.checked = Number(el.value) === due.getDay(); });
        });

        const catRadios = U.qsa('input[name=category]', form);
        const schoolPanel = form.querySelector('[data-panel=school]');
        const workPanel = form.querySelector('[data-panel=work]');
        const teamPanel = form.querySelector('[data-panel=team]');
        const kindSelect = form.elements.kind;
        const courseSelect = form.elements.courseId;
        const assessmentSelect = form.elements.assessmentId;

        function refreshPanels() {
          const cat = radioVal(form, 'category', 'personal');
          if (schoolPanel) schoolPanel.hidden = cat !== 'school';
          if (workPanel) workPanel.hidden = cat !== 'work';
          if (teamPanel) teamPanel.hidden = cat !== 'school' || kindSelect.value !== 'equipe';
        }
        catRadios.forEach((r) => r.addEventListener('change', refreshPanels));
        if (kindSelect) kindSelect.addEventListener('change', refreshPanels);

        if (courseSelect) {
          courseSelect.addEventListener('change', function () {
            if (assessmentSelect) {
              const current = assessmentSelect.value;
              assessmentSelect.innerHTML = assessmentOptions(courseSelect.value, '');
              if (Array.from(assessmentSelect.options).some((o) => o.value === current)) assessmentSelect.value = current;
            }
          });
        }
        U.qsa('.range-wrap input[type=range]', form).forEach((input) => {
          const out = input.parentElement.querySelector('output');
          input.addEventListener('input', () => { out.textContent = input.value + ' %'; });
        });
        U.qsa('.range-wrap', form).forEach((wrap) => {
          const input = wrap.querySelector('input[type=range]');
          const out = wrap.querySelector('output');
          if (input && out) out.textContent = input.value + ' %';
        });

        const del = form.querySelector('#task-delete');
        bindDelete(del, function () {
          if (series && val(form, 'taskScope') === 'following') Store.stopTaskSeries(t);
          Store.remove('tasks', id);
          UI.closeModal();
          UI.toast('Tâche supprimée.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        const title = val(form, 'title');
        if (!title) { form.elements.title.focus(); throw invalid('Le titre est obligatoire.'); }
        const category = radioVal(form, 'category', 'personal');
        const status = val(form, 'status') || 'todo';
        const courseId = category === 'school' ? (val(form, 'courseId') || null) : null;
        let assessmentId = category === 'school' ? (val(form, 'assessmentId') || null) : null;
        if (assessmentId) {
          const a = Store.find('assessments', assessmentId);
          if (!a || a.courseId !== courseId) assessmentId = null;
        }
        const progress = category === 'work' ? numVal(form, 'progressWork', 0) : numVal(form, 'progress', 0);
        const due = val(form, 'due') || null;
        const scope = val(form, 'taskScope') || 'following';
        const changeSeries = !series || scope === 'following';
        const repeating = changeSeries && val(form, 'taskRepeat') === 'weekly';
        if ((repeating || checked(form, 'showInCalendar')) && !U.parseDate(due)) {
          form.elements.due.focus();
          throw invalid('Choisissez une échéance pour la répétition ou l’affichage au calendrier.');
        }
        let rule = { freq: 'none' };
        if (repeating) {
          if (status === 'done') throw invalid('Choisissez une tâche à faire pour créer ou modifier une série.');
          const interval = numVal(form, 'taskInterval', 0);
          const weekdays = U.qsa('input[name=taskWeekdays]:checked', form).map((el) => Number(el.value));
          if (!Number.isInteger(interval) || interval < 1 || interval > 52) throw invalid('L’intervalle doit être un nombre entier entre 1 et 52 semaines.');
          if (!weekdays.length) throw invalid('Choisissez au moins un jour de répétition.');
          rule = { freq: 'weekly', interval: interval, weekdays: weekdays };
          if (val(form, 'taskEnd') === 'count') {
            rule.count = numVal(form, 'taskCount', 0);
            if (!Number.isSafeInteger(rule.count) || rule.count < 1) throw invalid('Indiquez un nombre entier d’occurrences supérieur ou égal à 1.');
          } else if (val(form, 'taskEnd') === 'until') {
            rule.until = val(form, 'taskUntil');
            if (!rule.until || rule.until < U.dateKey(due)) throw invalid('La date de fin doit être égale ou postérieure à la première échéance.');
            const first = U.startOfDay(due);
            const firstWeek = U.startOfWeek(first, 1);
            while (!weekdays.includes(first.getDay()) || (U.diffDays(U.startOfWeek(first, 1), firstWeek) / 7) % interval !== 0) first.setDate(first.getDate() + 1);
            if (U.dateKey(first) > rule.until) throw invalid('Aucun jour choisi ne se trouve avant la fin de la répétition.');
          }
        }
        const patch = {
          title: title,
          description: val(form, 'description'),
          category: category,
          status: status,
          priority: val(form, 'priority') || 'normal',
          due: due,
          showInCalendar: checked(form, 'showInCalendar'),
          estimate: numVal(form, 'estimate', null),
          courseId: courseId,
          projectId: category === 'work' ? (val(form, 'projectId') || null) : null,
          assessmentId: assessmentId,
          kind: category === 'school' ? (val(form, 'kind') || 'autre') : 'autre',
          progress: U.clamp(progress || 0, 0, 100),
          subtasks: readSubtasks(form),
          tags: splitTags(val(form, 'tags')),
          links: readLinks(form),
          team: category === 'school' ? readTeam(form) : [],
          notes: val(form, 'notes')
        };
        if (status === 'done') {
          if (isNew || !existing || existing.status !== 'done') patch.completedAt = U.toISOdt(new Date());
          else patch.completedAt = existing.completedAt || U.toISOdt(new Date());
        }

        const saved = Store.saveTask(id, patch, rule, scope);
        UI.toast(isNew ? 'Tâche créée.' : 'Tâche mise à jour.', { type: 'success' });

        if (saved && saved.status === 'done' && saved.assessmentId) {
          const assessment = Store.find('assessments', saved.assessmentId);
          if (assessment && Store.assessmentStatus(assessment) !== 'graded') {
            setTimeout(() => gradeAssessment(assessment.id, { fromTask: true }), 220);
          }
        }
        return true;
      }
    });
  }

  /* ================= Saisie rapide ================= */
  function quickTask() {
    const ctx = Store.get();
    const defaultCat = ctx.settings.defaultCategory || 'personal';
    UI.modal({
      title: 'Nouvelle tâche',
      subtitle: 'Écrivez naturellement : « Réviser demain 18h #école !haute ».',
      size: 'sm',
      body:
        '<div class="quick-form">' +
          '<label class="field"><span class="field-label">Que devez-vous faire ?</span>' +
            '<input type="text" class="input input-lg" name="quick" placeholder="Ex. : Appeler le dentiste demain 9h" autofocus maxlength="180">' +
          '</label>' +
          '<div class="chips-row">' +
            ['school', 'work', 'personal'].map((k) => {
              const c = Store.cat(k);
              return '<label class="choice-chip" style="--c:' + Store.catColor(k) + '"><input type="radio" name="quickcat" value="' + k + '"' + (k === defaultCat ? ' checked' : '') + '><span>' + UI.icon(c.icon, 14) + ' ' + esc(c.label) + '</span></label>';
            }).join('') +
          '</div>' +
          '<div class="quick-hints">' +
            '<span><kbd>demain</kbd> date</span><span><kbd>14h30</kbd> heure</span><span><kbd>#école</kbd> catégorie</span><span><kbd>!urgent</kbd> priorité</span>' +
          '</div>' +
        '</div>',
      submitLabel: 'Ajouter',
      footerLeft: '<button type="button" class="btn btn-ghost" id="quick-more">Plus d\'options</button>',
      onMount: function (form) {
        const input = form.elements.quick;
        U.on(input, 'keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
          }
        });
        const more = form.querySelector('#quick-more');
        more.addEventListener('click', function () {
          const parsed = U.parseQuickAdd(input.value, {
            defaultCategory: radioVal(form, 'quickcat', defaultCat),
            courses: ctx.courses,
            projects: ctx.projects
          });
          UI.closeModal();
          setTimeout(() => taskForm(null, parsed), 40);
        });
      },
      onSubmit: function (form) {
        const text = val(form, 'quick');
        if (!text) { form.elements.quick.focus(); throw invalid('Écrivez une tâche avant de l\'ajouter.'); }
        const parsed = U.parseQuickAdd(text, {
          defaultCategory: radioVal(form, 'quickcat', defaultCat),
          courses: ctx.courses,
          projects: ctx.projects
        });
        if (!parsed.title) parsed.title = text;
        const created = Store.add('tasks', Object.assign({
          description: '', category: 'personal', status: 'todo', priority: 'normal',
          courseId: null, projectId: null, assessmentId: null, kind: 'autre', progress: 0,
          subtasks: [], tags: [], links: [], team: [], notes: ''
        }, parsed));
        UI.toast('Tâche ajoutée : ' + created.title, {
          type: 'success',
          action: { label: 'Modifier', onClick: () => taskForm(created.id) }
        });
        return true;
      }
    });
  }

  /* ================= Événement ================= */
  function defaultEventSlot(dateStr, timeStr) {
    const base = dateStr ? U.parseDate(dateStr) : new Date();
    let h = 9, m = 0;
    if (timeStr) {
      const parts = String(timeStr).split(':').map(Number);
      h = parts[0] || 0; m = parts[1] || 0;
    } else if (!dateStr) {
      const now = new Date();
      h = Math.min(21, now.getHours() + 1);
      m = now.getMinutes() >= 30 ? 30 : 0;
    }
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);
    return { start: U.toISOdt(start), end: U.toISOdt(U.addMinutes(start, 60)) };
  }

  function eventForm(id, defaults) {
    const existing = id ? Store.find('events', id) : null;
    const ev = existing || Object.assign({
      title: '', category: 'personal', start: '', end: '', allDay: false, location: '',
      notes: '', courseId: '', projectId: '', color: '', recurrence: { freq: 'none', interval: 1, until: '', weekdays: [] }, reminders: [Store.get().settings.defaultReminder || 10]
    }, defaults || {});
    if (!ev.start || !ev.end) {
      const slot = defaultEventSlot((defaults && defaults.date) || null, (defaults && defaults.time) || null);
      ev.start = ev.start || slot.start;
      ev.end = ev.end || slot.end;
    }
    const rec = ev.recurrence || { freq: 'none', interval: 1, until: '', weekdays: [] };
    const reminder = Array.isArray(ev.reminders) && ev.reminders.length ? ev.reminders[0] : 0;
    const isRecurring = rec.freq && rec.freq !== 'none';
    const startDay = U.parseDate(ev.start) ? U.parseDate(ev.start).getDay() : 1;
    const selectedDays = Array.isArray(rec.weekdays) && rec.weekdays.length ? rec.weekdays.map(Number) : [startDay];

    const body =
      '<div class="form-grid">' +
        UI.field('Titre', '<input type="text" class="input" name="title" value="' + esc(ev.title) + '" placeholder="Ex. : Réunion d\'équipe" required maxlength="160" autofocus>', { cls: 'span-2' }) +
        '<div class="field span-2"><span class="field-label">Catégorie</span>' + UI.catSeg('category', ev.category) + '</div>' +
        '<div class="field span-2" data-panel="school"' + (ev.category === 'school' ? '' : ' hidden') + '>' +
          UI.field('Cours associé', '<select class="input" name="courseId">' + courseOptions(ev.courseId, 'Aucun cours') + '</select>') +
        '</div>' +
        '<div class="field span-2" data-panel="work"' + (ev.category === 'work' ? '' : ' hidden') + '>' +
          UI.field('Projet associé', '<select class="input" name="projectId">' + projectOptions(ev.projectId) + '</select>') +
        '</div>' +
        UI.field('Début', '<input type="datetime-local" class="input" name="start" value="' + esc(ev.start) + '" required>') +
        UI.field('Fin', '<input type="datetime-local" class="input" name="end" value="' + esc(ev.end) + '" required>') +
        '<label class="switch-field span-2"><input type="checkbox" name="allDay"' + (ev.allDay ? ' checked' : '') + '><span class="switch"></span><span>Événement toute la journée</span></label>' +
        UI.field('Lieu', '<input type="text" class="input" name="location" value="' + esc(ev.location || '') + '" placeholder="Local, adresse ou visioconférence">') +
        UI.field('Rappel', '<select class="input" name="reminder">' + Store.REMINDER_OPTIONS.map((r) => '<option value="' + r.value + '"' + (Number(reminder) === r.value ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select>') +
        UI.field('Récurrence', '<select class="input" name="freq">' + UI.options(Store.RECURRENCES, rec.freq || 'none') + '</select>') +
        '<div class="field rec-extra" data-rec-extra' + (isRecurring ? '' : ' hidden') + '>' +
          '<span class="field-label">Jusqu\'au</span>' +
          '<input type="date" class="input" name="until" value="' + esc(rec.until || '') + '">' +
          '<span class="hint">Laisser vide pour une série sans fin.</span>' +
        '</div>' +
        '<div class="field rec-extra" data-rec-weekdays' + (rec.freq === 'weekly' ? '' : ' hidden') + '>' +
          '<span class="field-label">Jours de la semaine</span>' +
          '<div class="weekday-picker">' + U.WEEKDAYS.map((d) =>
            '<label class="weekday-toggle"><input type="checkbox" name="weekdays" value="' + d.value + '"' + (selectedDays.includes(d.value) ? ' checked' : '') + '><span>' + d.short.charAt(0) + '</span></label>').join('') + '</div>' +
        '</div>' +
        '<div class="field rec-extra" data-rec-interval' + (isRecurring ? '' : ' hidden') + '>' +
          '<span class="field-label">Intervalle</span>' +
          '<div class="input-suffix"><input type="number" class="input" name="interval" min="1" max="12" value="' + (Number(rec.interval) || 1) + '"><span>semaine(s) / occurrence(s)</span></div>' +
        '</div>' +
        UI.field('Notes', '<textarea class="input" name="notes" rows="2">' + esc(ev.notes || '') + '</textarea>', { cls: 'span-2' }) +
        '<div class="span-2" id="conflict-slot"></div>' +
      '</div>';

    UI.modal({
      title: existing ? 'Modifier l\'événement' : 'Nouvel événement',
      subtitle: isRecurring ? 'Cette modification s\'appliquera à toute la série récurrente.' : '',
      size: 'lg',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer l\'événement',
      footerLeft: existing ? deleteButton('event-delete') : '',
      onMount: function (form) {
        const catRadios = U.qsa('input[name=category]', form);
        const schoolPanel = form.querySelector('[data-panel=school]');
        const workPanel = form.querySelector('[data-panel=work]');
        const freq = form.elements.freq;
        function refresh() {
          const cat = radioVal(form, 'category', 'personal');
          if (schoolPanel) schoolPanel.hidden = cat !== 'school';
          if (workPanel) workPanel.hidden = cat !== 'work';
          const r = freq.value;
          U.qsa('[data-rec-extra]', form).forEach((el) => { el.hidden = r === 'none'; });
          const weekdays = form.querySelector('[data-rec-weekdays]');
          if (weekdays) weekdays.hidden = r !== 'weekly';
          const interval = form.querySelector('[data-rec-interval]');
          if (interval) interval.hidden = r === 'none';
        }
        catRadios.forEach((r) => r.addEventListener('change', refresh));
        freq.addEventListener('change', refresh);
        refresh();

        const allDay = form.elements.allDay;
        allDay.addEventListener('change', function () {
          if (allDay.checked) {
            if (val(form, 'start')) form.elements.start.value = val(form, 'start').slice(0, 10) + 'T00:00';
            if (val(form, 'end')) form.elements.end.value = val(form, 'end').slice(0, 10) + 'T23:59';
          }
        });
        U.qsa('input,select,textarea', form).forEach((el) => {
          el.addEventListener('input', () => {
            form.dataset.force = '0';
            const slot = form.querySelector('#conflict-slot');
            if (slot) slot.innerHTML = '';
          });
        });

        bindDelete(form.querySelector('#event-delete'), function () {
          Store.remove('events', id);
          UI.closeModal();
          UI.toast('Événement supprimé.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        const title = val(form, 'title');
        if (!title) { form.elements.title.focus(); throw invalid('Le titre est obligatoire.'); }
        let start = val(form, 'start');
        let end = val(form, 'end');
        if (!start || !end) throw invalid('Les dates de début et de fin sont obligatoires.');
        if (checked(form, 'allDay')) {
          start = start.slice(0, 10) + 'T00:00';
          end = end.slice(0, 10) + 'T23:59';
        }
        if (U.parseDate(end) <= U.parseDate(start)) throw invalid('La fin doit être après le début.');

        const category = radioVal(form, 'category', 'personal');
        const courseId = category === 'school' ? (val(form, 'courseId') || null) : null;
        const projectId = category === 'work' ? (val(form, 'projectId') || null) : null;
        const course = courseId ? Store.find('courses', courseId) : null;
        const freqValue = val(form, 'freq') || 'none';
        const weekdays = U.qsa('input[name=weekdays]:checked', form).map((x) => Number(x.value));
        const startDate = U.parseDate(start);
        const rec = freqValue === 'none' ? { freq: 'none' } : {
          freq: freqValue,
          interval: Math.max(1, numVal(form, 'interval', 1)),
          until: val(form, 'until') || '',
          weekdays: freqValue === 'weekly' ? (weekdays.length ? weekdays : [startDate.getDay()]) : []
        };
        const reminderValue = Number(val(form, 'reminder')) || 0;
        const patch = {
          title: title,
          category: category,
          courseId: courseId,
          projectId: projectId,
          start: start,
          end: end,
          allDay: checked(form, 'allDay'),
          location: val(form, 'location'),
          notes: val(form, 'notes'),
          color: course ? course.color : Store.catColor(category),
          recurrence: rec,
          reminders: reminderValue ? [reminderValue] : []
        };
        if (existing) patch.id = id;

        const conflicts = EP.Select.conflicts(patch);
        if (conflicts.length && form.dataset.force !== '1') {
          form.dataset.force = '1';
          const slot = form.querySelector('#conflict-slot');
          if (slot) {
            slot.innerHTML = '<div class="callout callout-warn">' + UI.icon('alert', 18) +
              '<div><strong>Conflit d\'horaire détecté</strong><ul>' +
              conflicts.slice(0, 4).map((c) => '<li>' + esc(c.title) + ' · ' + esc(U.fmtRange(c.start, c.end)) + '</li>').join('') +
              '</ul><p>Cliquez de nouveau sur « ' + (existing ? 'Enregistrer' : 'Créer l\'événement') + ' » pour confirmer malgré le conflit.</p></div></div>';
          }
          return false;
        }

        if (existing) {
          Store.put('events', id, patch);
          UI.toast('Événement mis à jour.', { type: 'success' });
        } else {
          Store.add('events', patch);
          UI.toast('Événement créé.', { type: 'success' });
        }
        return true;
      }
    });
  }

  /* ================= Cours ================= */
  function courseForm(id, defaults) {
    const existing = id ? Store.find('courses', id) : null;
    const active = EP.Select.activeSession();
    const c = existing || Object.assign({
      code: '', name: '', teacher: '', sessionId: active ? active.id : '', color: PALETTE[Store.get().courses.length % PALETTE.length],
      location: '', onlineUrl: '', notes: '', links: [], schedule: [{ weekday: 1, start: '09:00', end: '10:30', room: '' }]
    }, defaults || {});

    const body =
      '<div class="form-grid">' +
        UI.field('Code du cours', '<input type="text" class="input" name="code" value="' + esc(c.code) + '" placeholder="CR300" maxlength="20">') +
        UI.field('Nom du cours', '<input type="text" class="input" name="name" value="' + esc(c.name) + '" placeholder="Communication et rédaction" required maxlength="140">') +
        UI.field('Enseignant', '<input type="text" class="input" name="teacher" value="' + esc(c.teacher) + '" placeholder="Nom de l\'enseignant">') +
        UI.field('Session', '<select class="input" name="sessionId">' + sessionOptions(c.sessionId) + '</select>') +
        UI.field('Local', '<input type="text" class="input" name="location" value="' + esc(c.location) + '" placeholder="Local C-245">') +
        UI.field('Lien du cours', '<input type="url" class="input" name="onlineUrl" value="' + esc(c.onlineUrl) + '" placeholder="https://…">', { optional: true }) +
        '<div class="field"><span class="field-label">Couleur</span><div class="color-row"><input type="color" class="color-input" name="color" value="' + esc(c.color || '#6366f1') + '"><span class="color-preview-text">Couleur du cours</span></div></div>' +
        '<div class="field span-2"><span class="field-label">Horaire hebdomadaire</span>' +
          '<div class="dyn-rows schedule-rows">' + (c.schedule || []).map(scheduleRow).join('') + '</div>' +
          '<button type="button" class="link-btn" data-add-schedule>' + UI.icon('plus', 14) + ' Ajouter une plage horaire</button>' +
        '</div>' +
        '<div class="field span-2"><span class="field-label">Documents et ressources</span>' +
          '<div class="dyn-rows link-rows">' + (c.links || []).map(linkRow).join('') + '</div>' +
          '<button type="button" class="link-btn" data-add-link>' + UI.icon('plus', 14) + ' Ajouter un lien</button>' +
        '</div>' +
        UI.field('Notes', '<textarea class="input" name="notes" rows="3" placeholder="Informations utiles sur le cours…">' + esc(c.notes || '') + '</textarea>', { cls: 'span-2' }) +
      '</div>';

    UI.modal({
      title: existing ? 'Modifier le cours' : 'Nouveau cours',
      size: 'lg',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer le cours',
      footerLeft: existing ? deleteButton('course-delete') : '',
      onMount: function (form) {
        bindRows(form, '[data-add-link]', '.link-rows', linkRow);
        bindRows(form, '[data-add-schedule]', '.schedule-rows', scheduleRow);
        bindDelete(form.querySelector('#course-delete'), function () {
          Store.remove('courses', id);
          UI.closeModal();
          UI.toast('Cours supprimé. Les tâches liées ont été conservées.', { type: 'info' });
          if (location.hash.indexOf('/course/') >= 0) location.hash = '#/school';
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'name')) throw invalid('Le nom du cours est obligatoire.');
        const patch = {
          code: val(form, 'code'),
          name: val(form, 'name'),
          teacher: val(form, 'teacher'),
          sessionId: val(form, 'sessionId') || null,
          color: val(form, 'color') || '#6366f1',
          location: val(form, 'location'),
          onlineUrl: val(form, 'onlineUrl'),
          notes: val(form, 'notes'),
          links: readLinks(form),
          schedule: readSchedule(form)
        };
        if (existing) Store.put('courses', id, patch);
        else Store.add('courses', patch);
        UI.toast(existing ? 'Cours mis à jour.' : 'Cours créé.', { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Évaluation ================= */
  function assessmentForm(courseId, id, defaults) {
    const existing = id ? Store.find('assessments', id) : null;
    const a = existing || Object.assign({
      courseId: courseId || (Store.get().courses[0] ? Store.get().courses[0].id : ''),
      name: '', type: 'examen', date: U.todayKey(), weight: 20, max: 100, grade: '', status: '', notes: ''
    }, defaults || {});
    const initialStatus = a.status || Store.assessmentStatus(a);
    const body =
      '<div class="form-grid">' +
        UI.field('Cours', '<select class="input" name="courseId" required>' + courseOptions(a.courseId) + '</select>') +
        UI.field('Nom de l\'évaluation', '<input type="text" class="input" name="name" value="' + esc(a.name) + '" placeholder="Examen final" required maxlength="140" autofocus>') +
        UI.field('Type', '<select class="input" name="type">' + UI.options(Store.ASSESSMENT_TYPES, a.type || 'examen') + '</select>') +
        UI.field('Date', '<input type="date" class="input" name="date" value="' + esc(a.date || '') + '" required>') +
        UI.field('Pondération', '<div class="input-suffix"><input type="number" class="input" name="weight" min="0" max="100" step="0.5" value="' + esc(a.weight == null ? 20 : a.weight) + '"><span>%</span></div>', { hint: 'Poids dans la note finale du cours.' }) +
        UI.field('Note maximale', '<input type="number" class="input" name="max" min="1" step="1" value="' + esc(a.max || 100) + '">') +
        UI.field('Note obtenue', '<input type="number" class="input" name="grade" min="0" step="0.5" value="' + esc(a.grade == null ? '' : a.grade) + '" placeholder="Laisser vide si non corrigée">', { hint: 'Une évaluation non corrigée n\'est jamais comptée comme zéro.' }) +
        UI.field('Statut', '<select class="input" name="status">' + UI.options(Store.ASSESSMENT_STATUSES, initialStatus) + '</select>') +
        UI.field('Notes', '<textarea class="input" name="notes" rows="2">' + esc(a.notes || '') + '</textarea>', { cls: 'span-2' }) +
        '<div class="span-2" id="weight-info"></div>' +
      '</div>';

    UI.modal({
      title: existing ? 'Modifier l\'évaluation' : 'Nouvelle évaluation',
      subtitle: 'Les calculs ignorent les évaluations non corrigées.',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer l\'évaluation',
      footerLeft: existing ? deleteButton('assessment-delete') : '',
      onMount: function (form) {
        const info = form.querySelector('#weight-info');
        function refreshWeight() {
          const cid = val(form, 'courseId');
          const others = EP.Select.courseAssessments(cid).filter((x) => x.id !== id);
          const othersTotal = U.sum(others, (x) => Number(x.weight) || 0);
          const thisWeight = numVal(form, 'weight', 0);
          const total = othersTotal + thisWeight;
          const cls = Math.abs(total - 100) < 0.01 ? 'callout-ok' : 'callout-warn';
          info.innerHTML = '<div class="callout ' + cls + '">' + UI.icon(Math.abs(total - 100) < 0.01 ? 'check' : 'alert', 16) +
            '<div>Total des pondérations du cours : <strong>' + U.num(total, 1) + ' %</strong>' +
            (Math.abs(total - 100) < 0.01 ? ' — cohérent.' : ' — il devrait atteindre 100 %.') + '</div></div>';
        }
        form.elements.courseId.addEventListener('change', refreshWeight);
        form.elements.weight.addEventListener('input', refreshWeight);
        refreshWeight();
        bindDelete(form.querySelector('#assessment-delete'), function () {
          Store.remove('assessments', id);
          UI.closeModal();
          UI.toast('Évaluation supprimée.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        const cid = val(form, 'courseId');
        if (!cid) throw invalid('Choisissez un cours.');
        if (!val(form, 'name')) throw invalid('Le nom de l\'évaluation est obligatoire.');
        const max = numVal(form, 'max', 100);
        const gradeText = val(form, 'grade');
        const grade = gradeText === '' ? null : numVal(form, 'grade', null);
        if (max <= 0) throw invalid('La note maximale doit être supérieure à zéro.');
        if (grade != null && (grade < 0 || grade > max)) throw invalid('La note doit être comprise entre 0 et ' + max + '.');
        let status = val(form, 'status') || 'upcoming';
        if (grade != null) status = 'graded';
        else if (status === 'graded') status = (val(form, 'date') && U.parseDate(val(form, 'date')) < U.startOfDay(new Date())) ? 'pending' : 'upcoming';
        const patch = {
          courseId: cid,
          name: val(form, 'name'),
          type: val(form, 'type'),
          date: val(form, 'date'),
          weight: U.clamp(numVal(form, 'weight', 0), 0, 100),
          max: max,
          grade: grade,
          status: status,
          notes: val(form, 'notes')
        };
        let saved;
        if (existing) saved = Store.put('assessments', id, patch);
        else saved = Store.add('assessments', patch);
        UI.toast(existing ? 'Évaluation mise à jour.' : 'Évaluation créée.', { type: 'success' });

        if (saved && saved.status === 'graded') {
          const linked = Store.get().tasks.filter((t) => t.assessmentId === saved.id && t.status !== 'done');
          if (linked.length) {
            UI.toast('Note enregistrée. Une tâche liée est encore ouverte.', {
              type: 'info',
              action: {
                label: 'Terminer la tâche',
                onClick: () => {
                  Store.put('tasks', linked[0].id, { status: 'done' });
                  UI.toast('Tâche terminée.', { type: 'success' });
                }
              }
            });
          }
        }
        return true;
      }
    });
  }

  function gradeAssessment(assessmentId) {
    const a = Store.find('assessments', assessmentId);
    if (!a) return;
    const course = Store.find('courses', a.courseId);
    UI.modal({
      title: 'Enregistrer la note',
      subtitle: (course ? course.code + ' · ' : '') + a.name,
      size: 'sm',
      body:
        '<div class="form-grid">' +
          UI.field('Note obtenue', '<input type="number" class="input input-lg" name="grade" min="0" step="0.5" value="' + esc(a.grade == null ? '' : a.grade) + '" autofocus>') +
          UI.field('Note maximale', '<input type="number" class="input" name="max" min="1" step="1" value="' + esc(a.max || 100) + '">') +
          '<p class="muted span-2">Laisser la note vide remet l\'évaluation en attente.</p>' +
        '</div>',
      submitLabel: 'Enregistrer la note',
      onSubmit: function (form) {
        const max = numVal(form, 'max', 100);
        const gradeText = val(form, 'grade');
        if (max <= 0) throw invalid('La note maximale doit être supérieure à zéro.');
        if (gradeText !== '' && (numVal(form, 'grade', 0) < 0 || numVal(form, 'grade', 0) > max)) throw invalid('La note doit être comprise entre 0 et ' + max + '.');
        const grade = gradeText === '' ? null : numVal(form, 'grade', null);
        let status = 'upcoming';
        if (grade != null) status = 'graded';
        else status = a.date && U.parseDate(a.date) < U.startOfDay(new Date()) ? 'pending' : 'upcoming';
        Store.put('assessments', a.id, { grade: grade, max: max, status: status });
        UI.toast(grade == null ? 'Évaluation remise en attente.' : 'Note enregistrée : ' + U.num(grade, 2) + ' / ' + U.num(max, 2), { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Projet ================= */
  function projectForm(id) {
    const existing = id ? Store.find('projects', id) : null;
    const p = existing || {
      name: '', description: '', status: 'active', due: '', color: '#0ea5e9', notes: '', links: []
    };
    const body =
      '<div class="form-grid">' +
        UI.field('Nom du projet', '<input type="text" class="input" name="name" value="' + esc(p.name) + '" placeholder="Refonte du site vitrine" required autofocus maxlength="140">', { cls: 'span-2' }) +
        UI.field('Statut', '<select class="input" name="status">' + UI.options(Store.PROJECT_STATUSES, p.status) + '</select>') +
        UI.field('Échéance', '<input type="date" class="input" name="due" value="' + esc(p.due || '') + '">') +
        UI.field('Couleur', '<div class="color-row"><input type="color" class="color-input" name="color" value="' + esc(p.color) + '"><span class="color-preview-text">Couleur du projet</span></div>') +
        '<div></div>' +
        UI.field('Description', '<textarea class="input" name="description" rows="3">' + esc(p.description || '') + '</textarea>', { cls: 'span-2' }) +
        '<div class="field span-2"><span class="field-label">Liens et ressources</span>' +
          '<div class="dyn-rows link-rows">' + (p.links || []).map(linkRow).join('') + '</div>' +
          '<button type="button" class="link-btn" data-add-link>' + UI.icon('plus', 14) + ' Ajouter un lien</button>' +
        '</div>' +
        UI.field('Notes', '<textarea class="input" name="notes" rows="2">' + esc(p.notes || '') + '</textarea>', { cls: 'span-2' }) +
      '</div>';
    UI.modal({
      title: existing ? 'Modifier le projet' : 'Nouveau projet',
      size: 'lg',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer le projet',
      footerLeft: existing ? deleteButton('project-delete') : '',
      onMount: function (form) {
        bindRows(form, '[data-add-link]', '.link-rows', linkRow);
        bindDelete(form.querySelector('#project-delete'), function () {
          Store.remove('projects', id);
          UI.closeModal();
          UI.toast('Projet supprimé. Les tâches ont été conservées.', { type: 'info' });
          if (location.hash.indexOf('/project/') >= 0) location.hash = '#/work';
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'name')) throw invalid('Le nom du projet est obligatoire.');
        const patch = {
          name: val(form, 'name'), description: val(form, 'description'), status: val(form, 'status'),
          due: val(form, 'due') || null, color: val(form, 'color') || '#0ea5e9',
          notes: val(form, 'notes'), links: readLinks(form)
        };
        if (existing) Store.put('projects', id, patch);
        else Store.add('projects', patch);
        UI.toast(existing ? 'Projet mis à jour.' : 'Projet créé.', { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Habitude ================= */
  function habitForm(id) {
    const existing = id ? Store.find('habits', id) : null;
    const h = existing || { name: '', color: '#10b981', cadence: { type: 'daily', days: [1, 2, 3, 4, 5, 6, 0] }, log: {} };
    const cadence = h.cadence || { type: 'daily', days: [] };
    const days = Array.isArray(cadence.days) && cadence.days.length ? cadence.days.map(Number) : [1, 2, 3, 4, 5];
    const body =
      '<div class="form-grid">' +
        UI.field('Nom de l\'habitude', '<input type="text" class="input" name="name" value="' + esc(h.name) + '" placeholder="Lecture 20 minutes" required autofocus maxlength="120">', { cls: 'span-2' }) +
        UI.field('Fréquence', '<select class="input" name="cadence"><option value="daily"' + (cadence.type !== 'custom' ? ' selected' : '') + '>Tous les jours</option><option value="custom"' + (cadence.type === 'custom' ? ' selected' : '') + '>Jours précis</option></select>') +
        UI.field('Couleur', '<div class="color-row"><input type="color" class="color-input" name="color" value="' + esc(h.color || '#10b981') + '"><span class="color-preview-text">Couleur</span></div>') +
        '<div class="field span-2" id="habit-days"><span class="field-label">Jours</span><div class="weekday-picker">' +
          U.WEEKDAYS.map((d) => '<label class="weekday-toggle"><input type="checkbox" name="days" value="' + d.value + '"' + (days.includes(d.value) ? ' checked' : '') + '><span>' + d.short.charAt(0) + '</span></label>').join('') +
        '</div></div>' +
      '</div>';
    UI.modal({
      title: existing ? 'Modifier l\'habitude' : 'Nouvelle habitude',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer l\'habitude',
      footerLeft: existing ? deleteButton('habit-delete') : '',
      onMount: function (form) {
        const cadenceSelect = form.elements.cadence;
        const daysBox = form.querySelector('#habit-days');
        function refresh() { daysBox.hidden = cadenceSelect.value !== 'custom'; }
        cadenceSelect.addEventListener('change', refresh);
        refresh();
        bindDelete(form.querySelector('#habit-delete'), function () {
          Store.remove('habits', id);
          UI.closeModal();
          UI.toast('Habitude supprimée.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'name')) throw invalid('Le nom de l\'habitude est obligatoire.');
        const type = val(form, 'cadence');
        const selected = U.qsa('input[name=days]:checked', form).map((x) => Number(x.value));
        if (type === 'custom' && !selected.length) throw invalid('Choisissez au moins un jour.');
        const patch = {
          name: val(form, 'name'),
          color: val(form, 'color') || '#10b981',
          cadence: { type: type, days: type === 'custom' ? selected : [0, 1, 2, 3, 4, 5, 6] }
        };
        if (existing) Store.put('habits', id, patch);
        else Store.add('habits', Object.assign({ log: {}, archived: false }, patch));
        UI.toast(existing ? 'Habitude mise à jour.' : 'Habitude créée.', { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Objectif ================= */
  function goalForm(id) {
    const existing = id ? Store.find('goals', id) : null;
    const g = existing || { title: '', target: 10, current: 0, unit: '', due: '', notes: '' };
    const body =
      '<div class="form-grid">' +
        UI.field('Objectif', '<input type="text" class="input" name="title" value="' + esc(g.title) + '" placeholder="Courir 10 km" required autofocus maxlength="140">', { cls: 'span-2' }) +
        UI.field('Cible', '<input type="number" class="input" name="target" min="0" step="1" value="' + esc(g.target) + '">') +
        UI.field('Valeur actuelle', '<input type="number" class="input" name="current" min="0" step="1" value="' + esc(g.current) + '">') +
        UI.field('Unité', '<input type="text" class="input" name="unit" value="' + esc(g.unit || '') + '" placeholder="km, livres, $…">') +
        UI.field('Échéance', '<input type="date" class="input" name="due" value="' + esc(g.due || '') + '">') +
        UI.field('Notes', '<textarea class="input" name="notes" rows="2">' + esc(g.notes || '') + '</textarea>', { cls: 'span-2' }) +
      '</div>';
    UI.modal({
      title: existing ? 'Modifier l\'objectif' : 'Nouvel objectif',
      body: body,
      submitLabel: existing ? 'Enregistrer' : 'Créer l\'objectif',
      footerLeft: existing ? deleteButton('goal-delete') : '',
      onMount: function (form) {
        bindDelete(form.querySelector('#goal-delete'), function () {
          Store.remove('goals', id);
          UI.closeModal();
          UI.toast('Objectif supprimé.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'title')) throw invalid('Le titre de l\'objectif est obligatoire.');
        const target = numVal(form, 'target', 0);
        if (target <= 0) throw invalid('La cible doit être supérieure à zéro.');
        const patch = {
          title: val(form, 'title'), target: target, current: Math.max(0, numVal(form, 'current', 0)),
          unit: val(form, 'unit'), due: val(form, 'due') || null, notes: val(form, 'notes'), category: 'personal'
        };
        if (existing) Store.put('goals', id, patch);
        else Store.add('goals', patch);
        UI.toast(existing ? 'Objectif mis à jour.' : 'Objectif créé.', { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Liste ================= */
  function listForm(id) {
    const existing = id ? Store.find('lists', id) : null;
    const l = existing || { title: '' };
    UI.modal({
      title: existing ? 'Modifier la liste' : 'Nouvelle liste',
      size: 'sm',
      body: '<div class="form-grid">' +
        UI.field('Nom de la liste', '<input type="text" class="input" name="title" value="' + esc(l.title) + '" placeholder="Épicerie, idées cadeaux…" required autofocus maxlength="100">', { cls: 'span-2' }) +
      '</div>',
      submitLabel: existing ? 'Enregistrer' : 'Créer la liste',
      footerLeft: existing ? deleteButton('list-delete') : '',
      onMount: function (form) {
        bindDelete(form.querySelector('#list-delete'), function () {
          Store.remove('lists', id);
          UI.closeModal();
          UI.toast('Liste supprimée.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'title')) throw invalid('Le nom de la liste est obligatoire.');
        if (existing) Store.put('lists', id, { title: val(form, 'title') });
        else Store.add('lists', { title: val(form, 'title'), items: [] });
        UI.toast(existing ? 'Liste mise à jour.' : 'Liste créée.', { type: 'success' });
        return true;
      }
    });
  }

  /* ================= Session ================= */
  function sessionForm(id) {
    const existing = id ? Store.find('sessions', id) : null;
    const s = existing || { name: '', start: U.todayKey(), end: U.toISO(U.addMonths(new Date(), 4)), active: Store.get().sessions.length === 0 };
    UI.modal({
      title: existing ? 'Modifier la session' : 'Nouvelle session',
      size: 'sm',
      body: '<div class="form-grid">' +
        UI.field('Nom de la session', '<input type="text" class="input" name="name" value="' + esc(s.name) + '" placeholder="Automne 2026" required autofocus maxlength="80">', { cls: 'span-2' }) +
        UI.field('Début', '<input type="date" class="input" name="start" value="' + esc(s.start) + '">') +
        UI.field('Fin', '<input type="date" class="input" name="end" value="' + esc(s.end) + '">') +
        '<label class="switch-field span-2"><input type="checkbox" name="active"' + (s.active ? ' checked' : '') + '><span class="switch"></span><span>Session active</span></label>' +
      '</div>',
      submitLabel: existing ? 'Enregistrer' : 'Créer la session',
      footerLeft: existing ? deleteButton('session-delete') : '',
      onMount: function (form) {
        bindDelete(form.querySelector('#session-delete'), function () {
          Store.remove('sessions', id);
          UI.closeModal();
          UI.toast('Session supprimée.', { type: 'info' });
        });
      },
      onSubmit: function (form) {
        if (!val(form, 'name')) throw invalid('Le nom de la session est obligatoire.');
        const active = checked(form, 'active');
        if (active) {
          Store.get().sessions.forEach((sess) => { if (sess.id !== id && sess.active) Store.put('sessions', sess.id, { active: false }); });
        }
        const patch = { name: val(form, 'name'), start: val(form, 'start') || null, end: val(form, 'end') || null, active: active };
        if (existing) Store.put('sessions', id, patch);
        else Store.add('sessions', patch);
        UI.toast(existing ? 'Session mise à jour.' : 'Session créée.', { type: 'success' });
        return true;
      }
    });
  }

  EP.Forms = {
    task: taskForm,
    quickTask,
    quickAdd: quickTask,
    event: eventForm,
    course: courseForm,
    assessment: assessmentForm,
    gradeAssessment,
    project: projectForm,
    habit: habitForm,
    goal: goalForm,
    list: listForm,
    session: sessionForm
  };
})();

/* Efficient Planner — composants d'interface */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const esc = U.esc;

  /* ---------------- Icônes ---------------- */
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    tasks: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 10v6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
    alert: '<path d="m10.3 3.9-8.6 15A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.7-3.1l-8.6-15a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/>',
    sparkles: '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
    filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m8.2 13.4-1.4 8L12 19l5.2 2.4-1.4-8"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.5 0-3-1.8-5.2-4-7.5-.6 2-1.5 3-2.5 3.5C12 8 11 5 8.5 2 8 5 5 7.5 5 15.5 5 19.3 8 22 12 22Z"/>',
    'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    circle: '<circle cx="12" cy="12" r="9"/>'
  };

  function icon(name, size, cls) {
    const s = size || 18;
    return '<svg class="icon ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || PATHS.circle) + '</svg>';
  }

  /* ---------------- Toasts ---------------- */
  let toastTimer = 0;
  function toast(message, opts) {
    const o = opts || {};
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast' + (o.type ? ' toast-' + o.type : '');
    el.innerHTML =
      '<span class="toast-icon">' + icon(o.type === 'error' ? 'alert' : o.type === 'info' ? 'info' : 'check', 16) + '</span>' +
      '<span class="toast-text">' + esc(message) + '</span>' +
      (o.action ? '<button type="button" class="toast-action">' + esc(o.action.label) + '</button>' : '');
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 180);
    };
    const timer = setTimeout(remove, o.duration || 4200);
    const actionBtn = el.querySelector('.toast-action');
    if (actionBtn && o.action) {
      actionBtn.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
        o.action.onClick();
      });
    }
    el.addEventListener('click', (e) => {
      if (!e.target.closest('.toast-action')) { clearTimeout(timer); remove(); }
    });
    if (root.children.length > 4) root.firstElementChild.remove();
  }

  /* ---------------- Modale ---------------- */
  let activeModal = null;
  let previousFocus = null;

  function closeModal() {
    if (!activeModal) return;
    const wrap = activeModal;
    const opts = wrap._opts || {};
    activeModal = null;
    document.body.classList.remove('modal-open');
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 180);
    if (previousFocus && document.contains(previousFocus)) {
      try { previousFocus.focus(); } catch (e) { /* ignore */ }
    }
    previousFocus = null;
    if (typeof opts.onClose === 'function') opts.onClose();
  }

  function modal(opts) {
    const o = opts || {};
    closeModal();
    previousFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap._opts = o;
    const sizeClass = o.size === 'lg' ? 'modal-lg' : o.size === 'xl' ? 'modal-xl' : o.size === 'sm' ? 'modal-sm' : '';
    wrap.innerHTML =
      '<div class="modal ' + sizeClass + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<form class="modal-form" novalidate>' +
          '<header class="modal-head">' +
            '<div class="modal-title-wrap"><h2 id="modal-title">' + esc(o.title || '') + '</h2>' +
            (o.subtitle ? '<p>' + esc(o.subtitle) + '</p>' : '') + '</div>' +
            '<button type="button" class="icon-btn" data-modal-close aria-label="Fermer">' + icon('x', 18) + '</button>' +
          '</header>' +
          '<div class="modal-body">' + (o.body || '') + '</div>' +
          '<footer class="modal-foot">' +
            (o.footerLeft || '') +
            '<div class="foot-spacer"></div>' +
            (o.cancel === false ? '' : '<button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>') +
            (o.submitLabel === null ? '' : '<button type="submit" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '">' + esc(o.submitLabel || 'Enregistrer') + '</button>') +
          '</footer>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add('modal-open');
    activeModal = wrap;
    requestAnimationFrame(() => wrap.classList.add('open'));

    const form = wrap.querySelector('form');
    wrap.addEventListener('mousedown', (e) => {
      if (e.target === wrap) closeModal();
    });
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-modal-close]')) closeModal();
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      if (e.key === 'Tab') {
        const focusables = U.qsa('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', form)
          .filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
      try {
        const result = o.onSubmit ? await o.onSubmit(form, wrap) : true;
        if (result !== false) closeModal();
      } catch (err) {
        if (!err || err.name !== 'ValidationError') console.error(err);
        toast(err && err.message ? err.message : 'Une erreur est survenue.', { type: 'error' });
      } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      }
    });
    if (typeof o.onMount === 'function') {
      try { o.onMount(form, wrap); } catch (err) { console.error(err); }
    }
    setTimeout(() => {
      const target = form.querySelector('[autofocus]') || form.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea');
      if (target && wrap.classList.contains('open')) {
        try { target.focus(); } catch (e) { /* ignore */ }
      }
    }, 60);
    return wrap;
  }

  function confirm(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      modal({
        title: o.title || 'Confirmer',
        size: 'sm',
        body: '<p class="confirm-text">' + esc(o.message || 'Cette action est irréversible.') + '</p>' +
          (o.detail ? '<div class="callout callout-warn">' + icon('alert', 16) + '<div>' + esc(o.detail) + '</div></div>' : ''),
        submitLabel: o.confirmLabel || 'Confirmer',
        danger: o.danger !== false,
        onClose: () => done(false),
        onSubmit: () => { done(true); return true; }
      });
    });
  }

  /* ---------------- Petits composants ---------------- */
  function chip(text, opts) {
    const o = opts || {};
    return '<span class="chip ' + (o.cls || '') + '"' + (o.color ? ' style="--c:' + o.color + '"' : '') + '>' +
      (o.iconName ? icon(o.iconName, 13) : '') + (o.dot ? '<span class="chip-dot"></span>' : '') + esc(text) + '</span>';
  }

  function catChip(key, label) {
    const c = Store.cat(key);
    const color = Store.catColor(key);
    return '<span class="chip cat-chip" style="--c:' + color + '">' + icon(c.icon, 13) + esc(label || c.label) + '</span>';
  }

  function priorityChip(key) {
    const p = Store.priority(key);
    return '<span class="chip priority-chip" style="--c:' + p.color + '">' +
      (key === 'urgent' ? icon('alert', 12) : icon('flag', 12)) + esc(p.label) + '</span>';
  }

  function statusChip(key) {
    const s = Store.status(key);
    return '<span class="chip status-chip status-' + esc(key) + '"><span class="chip-dot"></span>' + esc(s.label) + '</span>';
  }

  function courseChip(course) {
    if (!course) return '';
    return '<span class="chip course-chip" style="--c:' + esc(course.color || '#6366f1') + '"><span class="chip-dot"></span>' + esc(course.code || course.name) + '</span>';
  }

  function progressBar(value, opts) {
    const o = opts || {};
    const v = U.clamp(Number(value) || 0, 0, 100);
    return '<div class="progress ' + (o.cls || '') + '"' + (o.color ? ' style="--c:' + o.color + '"' : '') + ' role="progressbar" aria-valuenow="' + Math.round(v) + '" aria-valuemin="0" aria-valuemax="100">' +
      '<span class="progress-fill" style="width:' + v + '%"></span></div>';
  }

  function ring(value, opts) {
    const o = opts || {};
    const p = U.clamp(Number(value) || 0, 0, 100);
    const r = 31;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    const color = o.color || 'var(--accent)';
    return '<div class="ring ' + (o.cls || '') + '"' +
      (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' +
      '<svg viewBox="0 0 76 76" width="76" height="76">' +
        '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="var(--ring-track)" stroke-width="7"/>' +
        '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 38 38)" class="ring-fill"/>' +
      '</svg>' +
      '<div class="ring-text"><strong>' + p + '%</strong>' + (o.label ? '<span>' + esc(o.label) + '</span>' : '') + '</div>' +
    '</div>';
  }

  function statCard(opts) {
    const o = opts || {};
    return '<div class="stat-card ' + (o.cls || '') + '"' + (o.action ? ' data-action="' + esc(o.action) + '" role="button" tabindex="0"' : '') + '>' +
      '<div class="stat-icon" style="--c:' + (o.color || 'var(--accent)') + '">' + icon(o.icon || 'circle', 18) + '</div>' +
      '<div class="stat-body"><span class="stat-label">' + esc(o.label || '') + '</span>' +
      '<strong class="stat-value">' + (o.value == null ? '0' : esc(o.value)) + '</strong>' +
      (o.sub ? '<span class="stat-sub">' + (o.subIsHtml ? o.sub : esc(o.sub)) + '</span>' : '') + '</div>' +
    '</div>';
  }

  function empty(iconName, title, text, actionHtml) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + icon(iconName || 'sparkles', 22) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      (text ? '<p>' + esc(text) + '</p>' : '') +
      (actionHtml ? '<div class="empty-actions">' + actionHtml + '</div>' : '') +
    '</div>';
  }

  function sectionHead(title, opts) {
    const o = opts || {};
    return '<div class="section-head"><div><h2>' + esc(title) + '</h2>' +
      (o.subtitle ? '<p class="section-sub">' + esc(o.subtitle) + '</p>' : '') + '</div>' +
      (o.action || '') + '</div>';
  }

  function field(label, control, opts) {
    const o = opts || {};
    return '<label class="field ' + (o.cls || '') + '">' +
      '<span class="field-label">' + esc(label) + (o.optional ? ' <span class="optional">facultatif</span>' : '') + '</span>' +
      control +
      (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') +
    '</label>';
  }

  function options(map, value, opts) {
    const o = opts || {};
    return Object.keys(map).map((key) => {
      const item = map[key];
      const label = typeof item === 'string' ? item : item.label;
      return '<option value="' + esc(item.key || key) + '"' + (String(value) === String(item.key || key) ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }

  function catSeg(name, value) {
    return '<div class="seg seg-cats">' + Object.values(Store.CATEGORIES).map((c) => {
      const color = Store.catColor(c.key);
      return '<label class="seg-item" style="--c:' + color + '">' +
        '<input type="radio" name="' + esc(name) + '" value="' + c.key + '"' + (value === c.key ? ' checked' : '') + '>' +
        '<span>' + icon(c.icon, 15) + ' ' + esc(c.label) + '</span></label>';
    }).join('') + '</div>';
  }

  function taskRow(task, opts) {
    const o = opts || {};
    const done = task.status === 'done';
    const course = task.courseId ? Store.find('courses', task.courseId) : null;
    const project = task.projectId ? Store.find('projects', task.projectId) : null;
    const overdue = !done && task.due && U.parseDate(task.due) < new Date();
    const subs = task.subtasks || [];
    const subsDone = subs.filter((s) => s.done).length;
    const showCat = o.showCategory !== false;
    const showMeta = o.compact !== true;
    let meta = '';
    if (showCat) meta += catChip(task.category);
    if (course) meta += courseChip(course);
    else if (project) meta += '<span class="chip plain-chip">' + icon('folder', 12) + esc(project.name) + '</span>';
    if (task.priority === 'urgent' || task.priority === 'high') meta += priorityChip(task.priority);
    if (task.due) meta += '<span class="chip due-chip' + (overdue ? ' is-overdue' : '') + '">' + icon('clock', 12) + esc(U.dueText(task.due)) + '</span>';
    if (task.seriesId) meta += '<span class="chip plain-chip" title="Occurrence indépendante d’une tâche récurrente">' + icon('repeat', 12) + 'Récurrente</span>';
    if (showMeta && subs.length) meta += '<span class="chip plain-chip">' + icon('check', 12) + subsDone + '/' + subs.length + '</span>';
    if (showMeta && task.estimate) meta += '<span class="chip plain-chip">' + icon('clock', 12) + esc(U.humanDuration(task.estimate)) + '</span>';
    if (showMeta && task.tags && task.tags.length) {
      task.tags.slice(0, 2).forEach((tag) => { meta += '<span class="tag">#' + esc(tag) + '</span>'; });
    }
    const progress = Number(task.progress) || 0;
    const showProgress = showMeta && !done && progress > 0 && progress < 100;
    return '<div class="task-row' + (done ? ' is-done' : '') + (overdue ? ' is-overdue' : '') + '" data-task-id="' + esc(task.id) + '">' +
      '<button type="button" class="check-btn' + (done ? ' checked' : '') + '" data-action="task:toggle" data-id="' + esc(task.id) + '" aria-label="' + (done ? 'Rouvrir la tâche' : 'Terminer la tâche') + '" aria-pressed="' + done + '">' + (done ? icon('check', 13) : '') + '</button>' +
      '<div class="task-main">' +
        '<button type="button" class="task-title" data-action="task:edit" data-id="' + esc(task.id) + '">' + esc(task.title) + '</button>' +
        (meta ? '<div class="task-meta">' + meta + '</div>' : '') +
        (showProgress ? progressBar(progress, { cls: 'progress-xs', color: Store.catColor(task.category) }) : '') +
      '</div>' +
      (o.showActions === false ? '' :
        '<div class="row-actions">' +
          '<button type="button" class="icon-btn icon-btn-sm" data-action="task:edit" data-id="' + esc(task.id) + '" aria-label="Modifier" title="Modifier">' + icon('pencil', 15) + '</button>' +
          '<button type="button" class="icon-btn icon-btn-sm danger-hover" data-action="task:delete" data-id="' + esc(task.id) + '" aria-label="Supprimer" title="Supprimer">' + icon('trash', 15) + '</button>' +
        '</div>') +
    '</div>';
  }

  function eventChip(occ, opts) {
    const o = opts || {};
    const color = occ.color || (occ.courseId && Store.find('courses', occ.courseId) ? Store.find('courses', occ.courseId).color : Store.catColor(occ.category));
    const draggable = o.draggable !== false && occ.source === 'event' && !occ.isRecurring;
    const isTask = occ.source === 'task';
    const action = isTask ? 'task:edit' : occ.source === 'course' ? 'course:open' : 'event:edit';
    const id = occ.source === 'course' ? occ.courseId : occ.id;
    return '<button type="button" class="event-chip' + (occ.source === 'course' ? ' is-course' : '') + (isTask ? ' task-banner' + (occ.status === 'done' ? ' is-done' : '') : '') + '" style="--c:' + esc(color) + '"' +
      ' data-action="' + action + '" data-id="' + esc(id) + '"' +
      (draggable ? ' draggable="true" data-drag-id="' + esc(occ.id) + '" data-drag-start="' + esc(occ.start) + '"' : '') +
      ' title="' + esc(occ.title + ' · ' + (isTask ? 'Échéance : ' + U.fmtDateTime(occ.start) : U.fmtRange(occ.start, occ.end)) + (occ.isRecurring ? ' · série récurrente' : '') + (isTask && occ.status === 'done' ? ' · Terminée' : '')) + '">' +
      (isTask ? icon(occ.status === 'done' ? 'check' : 'tasks', 12) : '') +
      (o.showTime !== false || isTask ? '<span class="event-time">' + esc(U.fmtTime(occ.start)) + '</span>' : '') +
      '<span class="event-title">' + esc(occ.title) + '</span></button>';
  }

  EP.UI = {
    icon, toast, modal, closeModal, confirm,
    chip, catChip, priorityChip, statusChip, courseChip,
    progressBar, ring, statCard, empty, sectionHead, field, options, catSeg,
    taskRow, eventChip,
    isModalOpen: () => !!activeModal
  };
})();

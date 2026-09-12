/* charlaywood.com — shared behaviour.
   Click- and keyboard-driven throughout; hover is only ever a convenience. */
(function () {
  'use strict';

  /* ── Legacy anchors from the old single-page site ──────────────── */
  if (document.body.getAttribute('data-page') === 'home' && window.location.hash) {
    var LEGACY = {
      '#about': '/about', '#connect': '/connect', '#science-teaser': '/research',
      '#content': '/content-creation', '#travel-teaser': '/travel', '#life': '/life',
      '#rambling': 'https://blog.charlaywood.com/'
    };
    var moved = LEGACY[window.location.hash];
    if (moved) { window.location.replace(moved); return; }
  }

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  var wide = function () { return window.matchMedia('(min-width: 1201px)').matches; };
  var canHover = function () { return window.matchMedia('(hover: hover)').matches; };

  /* ── Submenus ──────────────────────────────────────────────────── */
  /* A submenu can be open because the pointer is over it, or pinned open by a
     click or a keypress. Pinned menus ignore the pointer leaving, so clicking
     while hovering keeps the menu open instead of immediately closing it. */
  function setGroup(group, open, pin) {
    group.setAttribute('data-open', open ? 'true' : 'false');
    if (pin === true) { group.setAttribute('data-pinned', 'true'); }
    if (pin === false || !open) { group.removeAttribute('data-pinned'); }
    var b = group.querySelector('.nav__sub-toggle');
    if (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  }
  function isPinned(group) { return group.getAttribute('data-pinned') === 'true'; }
  function closeSubmenus(except) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav__group'), function (g) {
      if (g !== except) { setGroup(g, false, false); }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.nav__group'), function (group) {
    var btn = group.querySelector('.nav__sub-toggle');
    var closeTimer = null;
    var cancel = function () { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      cancel();
      closeSubmenus(group);
      /* Pinned means the user deliberately opened it, so a click closes it.
         Otherwise (closed, or merely hovered open) a click pins it open. */
      if (isPinned(group)) { setGroup(group, false, false); } else { setGroup(group, true, true); }
    });

    /* Hover on wide screens. The panel is flush against the trigger and the whole
       group is the hover target, so moving the pointer down into it never crosses a
       gap. A short delay also forgives a pointer that strays outside for a moment. */
    group.addEventListener('mouseenter', function () {
      if (!wide() || !canHover()) { return; }
      cancel();
      closeSubmenus(group);
      if (!isPinned(group)) { setGroup(group, true); }
    });
    group.addEventListener('mouseleave', function () {
      if (!wide() || !canHover() || isPinned(group)) { return; }
      cancel();
      closeTimer = setTimeout(function () { setGroup(group, false, false); }, 260);
    });

    /* Keyboard: Escape closes and returns focus; leaving the group closes it. */
    group.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); setGroup(group, false, false); btn.focus(); }
      if (e.key === 'ArrowDown' && document.activeElement === btn) {
        e.preventDefault();
        setGroup(group, true, true);
        var first = group.querySelector('.nav__sub a');
        if (first) { first.focus(); }
      }
    });
    group.addEventListener('focusout', function (e) {
      if (group.contains(e.relatedTarget)) { return; }
      /* keep a pinned menu open for a pointer user who has clicked it open */
      if (isPinned(group) && canHover() && group.matches(':hover')) { return; }
      setGroup(group, false, false);
    });
  });

  /* ── Mobile navigation ─────────────────────────────────────────── */
  if (toggle && nav) {
    var openNav = function () {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    };
    var closeNav = function (returnFocus) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      closeSubmenus();
      if (returnFocus) { toggle.focus(); }
    };

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { closeNav(false); } else { openNav(); }
    });

    document.addEventListener('click', function (e) {
      if (nav.contains(e.target) || toggle.contains(e.target)) { return; }
      closeSubmenus();
      if (toggle.getAttribute('aria-expanded') === 'true') { closeNav(false); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      if (document.querySelector('.nav__group[data-open="true"]')) { closeSubmenus(); return; }
      if (toggle.getAttribute('aria-expanded') === 'true') { closeNav(true); }
    });

    var mq = window.matchMedia('(min-width: 1201px)');
    var sync = function () { if (mq.matches) { closeNav(false); } };
    if (mq.addEventListener) { mq.addEventListener('change', sync); }
    else if (mq.addListener) { mq.addListener(sync); }
  }

  /* ── Current page ──────────────────────────────────────────────── */
  var here = document.body.getAttribute('data-page');
  if (here) {
    Array.prototype.forEach.call(document.querySelectorAll('#primary-nav a[data-nav]'), function (a) {
      if (a.getAttribute('data-nav') === here) { a.setAttribute('aria-current', 'page'); }
    });
  }

  /* ── Filters ───────────────────────────────────────────────────────
     One delegated handler for the whole document, so a group keeps working
     however many times its list is re-rendered (the ORCID feed replaces the
     publication list after load). Items may carry several categories, space
     separated, e.g. data-type="talk award". */
  function applyFilter(group, value) {
    var list = document.getElementById(group.getAttribute('data-filter-group'));
    if (!list) { return; }
    /* No value means this is the group settling itself rather than a click, so it uses
       whatever is already active or the group's declared default. The publications list
       opens on Primary research, which is the short, useful view. */
    var chosen = !!value;
    if (!value) { value = group.getAttribute('data-filter-active') || group.getAttribute('data-filter-default') || 'all'; }

    var items = list.querySelectorAll('[data-type]');
    var shown = 0;
    Array.prototype.forEach.call(items, function (item) {
      var types = (item.getAttribute('data-type') || '').split(/\s+/);
      var show = (value === 'all' || types.indexOf(value) !== -1);
      item.hidden = !show;
      if (show) { shown++; }
    });

    Array.prototype.forEach.call(group.querySelectorAll('button[data-filter]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === value));
    });
    group.setAttribute('data-filter-active', value);

    /* A default that lands on an empty category would show a blank list for no reason —
       that happens if the ORCID feed is unreachable and only the local items render.
       An explicit click is left alone, because the user asked for that category. */
    if (!chosen && shown === 0 && items.length > 0 && value !== 'all') {
      applyFilter(group, 'all');
      return;
    }

    var empty = document.getElementById(group.getAttribute('data-filter-group') + '-empty');
    if (empty) { empty.hidden = shown !== 0 || items.length === 0; }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter-group] button[data-filter]');
    if (!btn) { return; }
    applyFilter(btn.closest('[data-filter-group]'), btn.getAttribute('data-filter'));
  });

  window.refreshFilters = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter-group]'), function (g) {
      applyFilter(g);
    });
  };
  window.refreshFilters();

  /* ── Counts that should never need editing by hand ─────────────────
     Anything with data-count-of is filled from how many elements match that
     selector, so the travel page's country total follows the grid. The number
     already in the markup stands if this never runs. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-count-of]'), function (el) {
    var n = document.querySelectorAll(el.getAttribute('data-count-of')).length;
    if (n > 0) { el.textContent = String(n); }
  });

  /* ── Email links ───────────────────────────────────────────────────
     The address is assembled here rather than printed in the HTML, so it is
     not sitting in the static source for an address harvester to lift. Every
     link has a working href in the markup first, so if this never runs the
     link still goes somewhere useful: the contact form. */
  var mailLinks = document.querySelectorAll('.js-email[data-u][data-d]');
  if (mailLinks.length) {
    Array.prototype.forEach.call(mailLinks, function (a) {
      var address = a.getAttribute('data-u') + String.fromCharCode(64) + a.getAttribute('data-d');
      a.href = 'mailto:' + address;
      a.removeAttribute('data-u');
      a.removeAttribute('data-d');
      var shown = a.parentNode && a.parentNode.querySelector('.js-email-shown');
      if (shown) { shown.textContent = ' · ' + address; }
    });
  }

  /* ── Modals ────────────────────────────────────────────────────── */
  var lastTrigger = null;
  function openModal(id, trigger) {
    var m = document.getElementById(id);
    if (!m) { return; }
    lastTrigger = trigger || null;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var close = m.querySelector('.modal__close');
    if (close) { close.focus(); }
  }
  function closeModal(m) {
    m.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }
  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-modal]');
    if (open) { openModal(open.getAttribute('data-modal'), open); return; }
    var closer = e.target.closest('.modal__close');
    if (closer) { closeModal(closer.closest('.modal-backdrop')); return; }
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(e.target); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    var open = document.querySelector('.modal-backdrop.is-open');
    if (open) { closeModal(open); }
  });

  /* ── Lightbox ──────────────────────────────────────────────────── */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lightbox__cap');
    var lbLast = null;
    var openLb = function (btn) {
      var img = btn.querySelector('img');
      if (!img) { return; }
      lbLast = btn;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      var cap = btn.closest('figure') && btn.closest('figure').querySelector('figcaption');
      lbCap.textContent = cap ? cap.textContent : (img.alt || '');
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox__close').focus();
    };
    var closeLb = function () {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lbLast) { lbLast.focus(); lbLast = null; }
    };
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.gallery button');
      if (btn) { openLb(btn); return; }
      if (e.target.closest('.lightbox__close') || e.target === lb) { closeLb(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) { closeLb(); }
    });
  }

  /* ── Latest from the blog ──────────────────────────────────────────
     Three real posts already sit in the markup, so the section is never empty
     and works without JavaScript. This replaces them with whatever is current. */
  var feed = document.getElementById('blog-feed');
  if (feed) {
    var strip = function (s) {
      var d = document.createElement('div');
      d.innerHTML = s || '';
      return (d.textContent || '').trim();
    };
    fetch('https://blog.charlaywood.com/wp-json/wp/v2/posts?per_page=3&_fields=title,link,date')
      .then(function (r) { if (!r.ok) { throw new Error('feed'); } return r.json(); })
      .then(function (posts) {
        if (!posts || !posts.length) { return; }
        feed.innerHTML = posts.map(function (p) {
          var when = new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          return '<a class="post" href="' + p.link + '">' +
                 '<span class="post__when">' + when + '</span>' +
                 '<h3>' + strip(p.title && p.title.rendered) + '</h3>' +
                 '<span class="post__more">Read the post</span></a>';
        }).join('');
      })
      .catch(function () { /* the posts already in the markup stay put */ });
  }
})();

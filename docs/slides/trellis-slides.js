/* trellis-slides.js — Vanilla JS for slide navigation */

(function () {
  'use strict';

  const state = {
    current: 0,
    slides: [],
  };

  function init() {
    state.slides = Array.from(document.querySelectorAll('.slide'));
    if (state.slides.length === 0) return;

    state.slides.forEach((s, i) => {
      s.classList.add('slide');
      if (i === 0) s.classList.add('active');
    });

    renderNav();
    updateActive();
    bindEvents();
    setupKeyboard();
  }

  function updateActive() {
    state.slides.forEach((s, i) => {
      s.classList.toggle('active', i === state.current);
      s.classList.toggle('prev', i === state.current - 1);
    });
    renderNav();
  }

  function next() {
    if (state.current < state.slides.length - 1) {
      state.current++;
      updateActive();
    }
  }

  function prev() {
    if (state.current > 0) {
      state.current--;
      updateActive();
    }
  }

  function goTo(index) {
    if (index < 0 || index >= state.slides.length) return;
    state.current = index;
    updateActive();
  }

  function renderNav() {
    let dots = document.getElementById('nav-dots');
    if (!dots) {
      const nav = document.createElement('div');
      nav.className = 'nav-dots';
      nav.id = 'nav-dots';
      const overlay = document.querySelector('.nav-overlay') || createNavOverlay();
      overlay.appendChild(nav);
    }
    dots.innerHTML = '';
    state.slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'nav-dot' + (i === state.current ? ' active' : '');
      dot.dataset.idx = String(i);
      dot.addEventListener('click', () => goTo(i));
      dots.appendChild(dot);
    });
  }

  function createNavOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn';
    prevBtn.textContent = '←';
    prevBtn.addEventListener('click', prev);
    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn';
    nextBtn.textContent = '→';
    nextBtn.addEventListener('click', next);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    document.body.appendChild(overlay);
    return overlay;
  }

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); prev(); break;
        case 'ArrowRight': e.preventDefault(); next(); break;
        case ' ':        e.preventDefault(); (document.querySelector('.nav-btn:last-child') || {}).onclick ? null : togglePause(); break;
        case 'Home':     e.preventDefault(); goTo(0); break;
        case 'End':      e.preventDefault(); goTo(state.slides.length - 1); break;
      }
    });
  }

  let paused = false;
  function togglePause() {
    // Space toggles pause on auto-advancing decks (no-op for manual decks)
  }

  function bindEvents() {
    // Click on slide to advance
    state.slides.forEach((s) => {
      s.addEventListener('click', (e) => {
        const rect = s.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const third = rect.width / 3;
        if (x < third) prev();
        else next();
      });
    });
  }

  // Public API for embedding in slide decks
  window.TrellisSlides = { init, next, prev, goTo };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

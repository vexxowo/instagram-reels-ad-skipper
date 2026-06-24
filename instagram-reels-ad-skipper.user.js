// ==UserScript==
// @name         Instagram Reels Ad Skipper
// @namespace    https://github.com/vexxowo
// @version      1.0.0
// @description  Detects sponsored/ad reels (video or image) in the Instagram Reels feed and instantly skips past them
// @author       vexxowo
// @icon         https://static.cdninstagram.com/rsrc.php/y4/r/QaBlI0OZiks.ico
// @match        https://www.instagram.com/reels/*
// @license		 MIT
// @updateURL    https://raw.githubusercontent.com/vexxowo/instagram-reels-ad-skipper/main/instagram-reels-ad-skipper.user.js
// @downloadURL  https://raw.githubusercontent.com/vexxowo/instagram-reels-ad-skipper/main/instagram-reels-ad-skipper.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ---- config ----
  const DEBUG = false;
  const POLL_INTERVAL_MS = 250; // safety-net poll for transitions that don't fire scroll/wheel/key
  const SKIP_COOLDOWN_MS = 1000;

  // Short labels (e.g. "Ad") need an EXACT match — substring matching on
  // these is too prone to false positives ("Add", "Adam", "Address", etc).
  const EXACT_LABELS = [
    'ad', 'anuncio', 'anzeige', 'annonce', 'reklam', 'reklama', 'iklan',
    '广告', '광고', 'pub',
  ];

  // Longer labels are safe to match as a substring.
  const CONTAINS_LABELS = [
    'sponsored', 'gesponsert', 'patrocinado', 'sponsorisé', 'sponsorizzato',
    'gesponsord', 'sponsoreret', 'sponsrat', 'sponsoroitu', 'sponsorowane',
    'sponzorováno', 'sponsorlu', 'sponsorise', '赞助内容', '贊助', '스폰서',
    'مُموَّل',
  ];

  let lastSkipTime = 0;
  let scheduled = false;

  function log(...args) {
    if (DEBUG) console.log('[IG Reels Ad Skipper]', ...args);
  }

  function textLooksLikeAd(text) {
    if (!text) return false;
    const lower = text.trim().toLowerCase();
    if (!lower) return false;
    if (EXACT_LABELS.includes(lower)) return true;
    return CONTAINS_LABELS.some((label) => lower.includes(label));
  }

  // Scan short leaf text elements for a currently-visible ad/sponsored badge.
  // Scoped to <main> rather than the whole document — cuts out nav/sidebar/
  // suggestions-panel nodes that can never contain a reel's ad badge anyway.
  function findVisibleAdLabel() {
    const root = document.querySelector('main') || document.body;
    const candidates = root.querySelectorAll('span, a');
    for (const el of candidates) {
      if (el.children.length > 0) continue;
      const text = el.textContent;
      if (!text || text.length > 40) continue;
      if (!textLooksLikeAd(text)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue; // off-screen

      return el;
    }
    return null;
  }

  function getScrollableAncestor(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function skipPastAd(label) {
    const now = Date.now();
    if (now - lastSkipTime < SKIP_COOLDOWN_MS) return;
    lastSkipTime = now;
    log('Ad detected, skipping immediately:', label.textContent);

    // Every skip strategy fires in the same tick — no serial delays, no mute
    // step (mute can't close the autoplay-to-detection gap, so it's dead
    // weight — see changelog note below).

    // 1. Keyboard advance (Reels UI listens for ArrowDown).
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true,
    }));

    // 2. Explicit "Next" control, if rendered.
    const nextBtn = document.querySelector('[aria-label="Next" i], button[aria-label*="Next" i]');
    if (nextBtn) nextBtn.click();

    // 3. Instant scroll jump (no smooth animation).
    const scrollContainer = getScrollableAncestor(label);
    if (scrollContainer) {
      scrollContainer.scrollTop += scrollContainer.clientHeight;
    }
  }

  function checkForAd() {
    try {
      const label = findVisibleAdLabel();
      if (label) skipPastAd(label);
    } catch (e) {
      // Instagram's DOM changes without warning — fail quietly rather than spam errors.
      log('check failed:', e);
    }
  }

  // Coalesce bursts of scroll/wheel events (momentum scrolling can fire dozens
  // per second) into a single check per animation frame.
  function scheduleCheck() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      checkForAd();
    });
  }

  // Reel transitions are scroll/swipe/keyboard driven — check right as that
  // happens. No MutationObserver: Instagram mutates the DOM continuously
  // during normal playback (progress bars, counters, timestamps), so a
  // subtree observer was firing far more often than transitions actually
  // occur. Scroll/wheel/key + a modest poll covers it for a fraction of the cost.
  window.addEventListener('scroll', scheduleCheck, { passive: true, capture: true });
  document.addEventListener('wheel', scheduleCheck, { passive: true });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') scheduleCheck();
  });

  setInterval(checkForAd, POLL_INTERVAL_MS);

  log('loaded, watching for sponsored/ad reels');
})();

/* ============ Waybot Agent FX ============
   Cursor spotlight, 3D card tilt, magnetic buttons, count-up stats,
   scroll progress, and the waybot that builds itself as you scroll.
   All effects no-op under prefers-reduced-motion. */
'use strict';

(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;

  /* ---------- 1. scroll progress rail ---------- */
  (() => {
    const bar = document.createElement('div');
    bar.className = 'fx-progress';
    document.body.appendChild(bar);
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.transform = `scaleX(${p})`;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();


  /* ---------- 3. 3D tilt on cards ---------- */
  if (!REDUCED && !isTouch) {
    const TILT = '.f-card, .ag-card, .t-card, .pf-card, .w-item, .a-box, .bkt-card';
    document.querySelectorAll(TILT).forEach((el) => {
      el.classList.add('fx-tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg) translateY(-6px)`;
        el.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        el.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 4. magnetic buttons ---------- */
  if (!REDUCED && !isTouch) {
    document.querySelectorAll('.btn-signal, .btn-lg').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 5. count-up numbers ---------- */
  const countUp = (el, to, dur = 1100) => {
    const start = performance.now();
    const from = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const numObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const raw = (el.textContent || '').replace(/[^0-9]/g, '');
      if (raw && !REDUCED) countUp(el, parseInt(raw, 10));
      numObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.p-clock.mono, .hstat-v.mono').forEach((el) => {
    if (/^[\d,\s]+$/.test(el.textContent.trim())) numObserver.observe(el);
  });

  /* ---------- 6. the progress ring: one notch per executed buy ----------
     The mark tiles around a ring. The ratchet only ever advances — it never
     reverses and never spins. Each increment is one waybot. */
  (() => {
    const host = document.getElementById('markerBuild');
    const ring = document.getElementById('progressRing');
    if (!host || !ring) return;

    const N = 24;              // notches in a full ring
    const CUT = 17;            // how many this demo ratchets to
    const C = 120, R = 95, S = 0.375;   /* arc per notch ~24.9px vs 24px tile: no overlap */
    const readout = document.getElementById('ringN');
    const NS = 'http://www.w3.org/2000/svg';

    /* Same geometry as assets/logo.png: solid form minus notch wedge. */
    const D = 'M14 4h36a10 10 0 0 1 10 10v36a10 10 0 0 1-10 10H14A10 10 0 0 1 4 50V14A10 10 0 0 1 14 4Z'
            + 'M60 23L41 32L60 41Z';

    for (let i = 0; i < N; i++) {
      const deg = (360 / N) * i - 90;
      const rad = (deg * Math.PI) / 180;
      const px = C + R * Math.cos(rad);
      const py = C + R * Math.sin(rad);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', D);
      p.setAttribute('fill-rule', 'evenodd');
      p.setAttribute('class', 'notch');
      /* Notches point along the direction of travel, so the ring reads as advancing. */
      p.setAttribute('transform',
        `translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${(deg + 90).toFixed(2)}) `
        + `scale(${S}) translate(-32 -32)`);
      ring.appendChild(p);
    }

    const notches = [...ring.querySelectorAll('.notch')];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        notches.forEach((n, i) => {
          if (i >= CUT) return;
          setTimeout(() => {
            n.classList.add('cut');
            notches.forEach((o) => o.classList.remove('head'));
            n.classList.add('head');
            if (readout) readout.textContent = String(i + 1);
          }, 160 + i * 130);
        });
        io.disconnect();
      });
    }, { threshold: 0.45 });
    io.observe(host);
  })();

  /* ---------- 7. section headings: letters rise in ---------- */
  if (!REDUCED) {
    document.querySelectorAll('h2').forEach((h) => {
      if (h.dataset.fxDone) return;
      h.dataset.fxDone = '1';
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3 && n.textContent.trim()) {
            const frag = document.createDocumentFragment();
            [...n.textContent].forEach((ch) => {
              if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
              const s = document.createElement('span');
              s.className = 'fx-ch';
              s.textContent = ch;
              frag.appendChild(s);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') {
            walk(n);
          }
        });
      };
      walk(h);
      const chars = h.querySelectorAll('.fx-ch');
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          chars.forEach((c, i) => { c.style.transitionDelay = `${Math.min(i * 9, 280)}ms`; c.classList.add('in'); });
          io.disconnect();
        });
      }, { threshold: 0.3 });
      io.observe(h);
    });
  }
})();

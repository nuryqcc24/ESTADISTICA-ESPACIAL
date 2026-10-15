// ===================== Red de partículas (fondo del inicio) =====================
(function () {
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, points;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(110, Math.floor((w * h) / 14000));
    points = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const maxDist = 150;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < maxDist) {
          ctx.strokeStyle = `rgba(160, 175, 210, ${0.28 * (1 - d / maxDist)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(245, 176, 20, .85)';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function step() {
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    draw();
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  resize();
  reduce ? draw() : step();
})();

// ===================== Navbar =====================
const nav = document.getElementById('mainNav');
const links = document.querySelectorAll('.nav-link');
const sections = [...links].map(l => document.querySelector(l.getAttribute('href')));

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
  let current = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top < 120) current = s;
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current.id));
});

// Cierra el menú móvil al elegir una opción
links.forEach(l => l.addEventListener('click', () => {
  const menu = document.getElementById('navMenu');
  if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
}));

// ===================== Aparición al hacer scroll + contadores =====================
document.querySelectorAll('.stat-card, .topic-card, .portfolio-card, .contact-box').forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    const num = entry.target.querySelector('[data-count]');
    if (num) {
      const target = +num.dataset.count;
      let n = 0;
      const timer = setInterval(() => {
        num.textContent = ++n;
        if (n >= target) clearInterval(timer);
      }, 120);
    }
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===================== Filtros del portafolio =====================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.card-item').forEach(card => {
      const types = card.dataset.type.split(' ');
      card.classList.toggle('hide', f !== 'all' && !types.includes(f));
    });
  });
});

// ===================== Visores (código e imagen) =====================
function openViewer(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeViewers() {
  document.querySelectorAll('.viewer').forEach(v => v.classList.remove('open'));
  document.body.style.overflow = '';
}

const codeBlock = document.getElementById('codeBlock');
document.querySelectorAll('[data-code]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const path = btn.dataset.code;
    document.getElementById('codeTitle').innerHTML = `<i class="bi bi-filetype-py"></i> ${path.split('/').pop()}`;
    codeBlock.textContent = 'Cargando…';
    codeBlock.removeAttribute('data-highlighted');
    openViewer('codeViewer');
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.status);
      codeBlock.textContent = await res.text();
      if (window.hljs) hljs.highlightElement(codeBlock);
    } catch (e) {
      codeBlock.textContent = 'No se pudo cargar el archivo. Si abriste la página con doble clic, súbela a GitHub Pages o usa un servidor local.';
    }
  });
});

document.getElementById('copyCode').addEventListener('click', e => {
  navigator.clipboard.writeText(codeBlock.textContent);
  const icon = e.currentTarget.querySelector('i');
  icon.className = 'bi bi-check2';
  setTimeout(() => (icon.className = 'bi bi-clipboard'), 1500);
});

document.querySelectorAll('[data-img]').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('imgFull').src = el.dataset.img;
    document.getElementById('imgFull').alt = el.dataset.caption;
    document.getElementById('imgCaption').textContent = el.dataset.caption;
    openViewer('imgViewer');
  });
});

document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeViewers));
document.querySelectorAll('.viewer').forEach(v => v.addEventListener('click', e => { if (e.target === v) closeViewers(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewers(); });

document.getElementById('year').textContent = new Date().getFullYear();

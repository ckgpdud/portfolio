/* ── Nav scroll effect ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ── Mobile nav toggle ── */
const toggle = document.querySelector('.nav-toggle');
const drawer = document.querySelector('.nav-drawer');
if (toggle && drawer) {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    drawer.classList.toggle('open');
    document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
  });
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle.classList.remove('open');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Projects carousel (infinite loop + autoplay) ── */
const projectsGrid = document.querySelector('.projects-grid');
const carouselBtns = document.querySelectorAll('.carousel-btn[data-dir]');
const expandBtn = document.getElementById('projects-expand');
const projectsSection = document.getElementById('projects');
if (projectsGrid && carouselBtns.length) {
  const AUTOPLAY_MS = 2800;
  const RESUME_AFTER_INTERACT_MS = 5000;
  const SMOOTH_WAIT_MS = 700;
  let autoplayTimer = null;
  let paused = false;
  let inView = false;
  let isWrapping = false;

  // Clone all cards once for infinite looping
  const originals = Array.from(projectsGrid.children);
  originals.forEach(card => {
    const clone = card.cloneNode(true);
    clone.dataset.clone = '1';
    clone.classList.add('in'); // skip reveal opacity
    clone.addEventListener('click', e => {
      e.preventDefault();
      const href = clone.getAttribute('href');
      if (href) openModal(href);
    });
    projectsGrid.appendChild(clone);
  });

  const gridGap = () =>
    parseFloat(getComputedStyle(projectsGrid).columnGap || getComputedStyle(projectsGrid).gap) || 20;
  const stepSize = () => {
    const card = projectsGrid.querySelector('.card');
    if (!card) return 320;
    return card.getBoundingClientRect().width + gridGap();
  };
  const groupWidth = () => stepSize() * originals.length;

  const wrapIfNeeded = () => {
    const w = groupWidth();
    if (w <= 0) return;
    const prevBehavior = projectsGrid.style.scrollBehavior;
    if (projectsGrid.scrollLeft >= w) {
      isWrapping = true;
      projectsGrid.style.scrollBehavior = 'auto';
      projectsGrid.scrollLeft = projectsGrid.scrollLeft - w;
      projectsGrid.style.scrollBehavior = prevBehavior;
      requestAnimationFrame(() => { isWrapping = false; });
    } else if (projectsGrid.scrollLeft < 0) {
      isWrapping = true;
      projectsGrid.style.scrollBehavior = 'auto';
      projectsGrid.scrollLeft = projectsGrid.scrollLeft + w;
      projectsGrid.style.scrollBehavior = prevBehavior;
      requestAnimationFrame(() => { isWrapping = false; });
    }
  };

  const advance = (dir = 1) => {
    wrapIfNeeded();
    projectsGrid.scrollBy({ left: dir * stepSize(), behavior: 'smooth' });
    setTimeout(wrapIfNeeded, SMOOTH_WAIT_MS);
  };

  const startAutoplay = () => {
    if (autoplayTimer || paused || !inView || document.hidden) return;
    autoplayTimer = setInterval(() => advance(1), AUTOPLAY_MS);
  };
  const stopAutoplay = () => {
    if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
  };
  let resumeTimer = null;
  const pauseTemporarily = () => {
    paused = true;
    stopAutoplay();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; startAutoplay(); }, RESUME_AFTER_INTERACT_MS);
  };

  carouselBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (projectsGrid.classList.contains('is-expanded')) return;
      advance(parseInt(btn.dataset.dir, 10));
      pauseTemporarily();
    });
  });

  /* + 버튼: 캐러셀 ↔ 6개 grid view 토글 */
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      const expanded = projectsGrid.classList.toggle('is-expanded');
      expandBtn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      expandBtn.classList.toggle('is-active', expanded);
      expandBtn.setAttribute('aria-label', expanded ? '캐러셀로 돌아가기' : '전체 프로젝트 펼쳐보기');
      carouselBtns.forEach(b => { b.disabled = expanded; });
      if (expanded) {
        paused = true;
        stopAutoplay();
      } else {
        paused = false;
        const prevBehavior = projectsGrid.style.scrollBehavior;
        projectsGrid.style.scrollBehavior = 'auto';
        projectsGrid.scrollLeft = 0;
        projectsGrid.style.scrollBehavior = prevBehavior;
        startAutoplay();
      }
    });
  }

  projectsGrid.addEventListener('scroll', () => {
    if (isWrapping) return;
    wrapIfNeeded();
  }, { passive: true });

  projectsGrid.addEventListener('mouseenter', () => { paused = true; stopAutoplay(); });
  projectsGrid.addEventListener('mouseleave', () => { paused = false; startAutoplay(); });
  projectsGrid.addEventListener('touchstart', pauseTemporarily, { passive: true });
  projectsGrid.addEventListener('wheel', pauseTemporarily, { passive: true });
  projectsGrid.addEventListener('focusin', () => { paused = true; stopAutoplay(); });
  projectsGrid.addEventListener('focusout', () => { paused = false; startAutoplay(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay(); else startAutoplay();
  });

  if (projectsSection) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        inView = e.isIntersecting;
        if (inView) startAutoplay(); else stopAutoplay();
      });
    }, { threshold: 0.2 }).observe(projectsSection);
  } else {
    inView = true;
    startAutoplay();
  }
}

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
if (sections.length && navLinks.length) {
  const linkMap = {};
  navLinks.forEach(a => { linkMap[a.getAttribute('href')] = a; });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const id = '#' + e.target.id;
      if (e.isIntersecting && linkMap[id]) {
        navLinks.forEach(a => a.classList.remove('active'));
        linkMap[id].classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => sectionObserver.observe(s));
}

/* ── Project Modal ── */
const modal     = document.getElementById('project-modal');
const modalBody = document.getElementById('project-modal-body');

function openModal(url) {
  if (!modal || !modalBody) return;
  modal.classList.add('open');
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';

  modalBody.innerHTML = '<div id="project-modal-loading">불러오는 중…</div>';

  fetch(url, { cache: 'no-store' })
    .then(r => r.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const hero       = doc.querySelector('.project-hero');
      const gallery    = doc.querySelector('.project-gallery');
      const navSection = doc.querySelector('.project-nav-section');

      // 갤러리 헤더를 프로젝트 이름으로 교체 (어떤 프로젝트인지 식별)
      if (gallery && hero) {
        const galleryHeader = gallery.querySelector('.gallery-header');
        const eyebrow = hero.querySelector('.eyebrow')?.textContent.trim() || '';
        const title   = hero.querySelector('.project-title')?.textContent.trim() || '';
        const tagline = hero.querySelector('.project-tagline')?.innerHTML.trim() || '';
        if (galleryHeader && title) {
          galleryHeader.innerHTML = `
            ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
            <h2>${title}</h2>
            ${tagline ? `<p class="modal-tagline">${tagline}</p>` : ''}
          `;
        }
      }

      // 갤러리가 있으면 갤러리 + nav, 없으면 hero/mockup/body fallback
      const parts = gallery
        ? [gallery, navSection].filter(Boolean)
        : [hero, doc.querySelector('.project-mockup'), doc.querySelector('.project-body'), navSection].filter(Boolean);

      modalBody.innerHTML = parts.map(p => p.outerHTML).join('');

      // make reveal elements visible immediately inside modal
      modalBody.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));

      // close modal when back-button is clicked
      modalBody.querySelectorAll('.project-back').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          closeModal();
        });
      });

      // navigate within modal for project-nav links
      modalBody.querySelectorAll('.project-nav-card').forEach(card => {
        card.addEventListener('click', e => {
          e.preventDefault();
          const target = new URL(card.href, location.href);
          // hash 링크(e.g. index.html#projects)면 모달 닫고 메인 섹션으로 스크롤
          if (target.hash) {
            closeModal();
            const section = document.querySelector(target.hash);
            if (section) {
              setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420);
            }
            return;
          }
          modal.scrollTo({ top: 0, behavior: 'smooth' });
          openModal(card.href);
        });
      });

      // init lightbox for gallery images inside modal
      initLightbox(modalBody.querySelectorAll('.gallery-img'));
    })
    .catch(() => {
      modalBody.innerHTML = '<div id="project-modal-loading">페이지를 불러올 수 없습니다.</div>';
    });
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  const bar = document.getElementById('project-modal-progress-bar');
  if (bar) bar.style.width = '0';
  document.getElementById('modal-back-to-top')?.classList.remove('visible');
  setTimeout(() => { modalBody.innerHTML = ''; }, 400);
}

// intercept all project card clicks
document.querySelectorAll('.card[href]').forEach(card => {
  card.addEventListener('click', e => {
    e.preventDefault();
    openModal(card.href);
  });
});

// close on backdrop click (outside panel)
modal?.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

// close on close button
document.getElementById('project-modal-close')?.addEventListener('click', closeModal);

// close on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (lbOverlay.classList.contains('open')) closeLightbox();
    else if (modal?.classList.contains('open')) closeModal();
  }
});

/* ── Lightbox ── */
const lbOverlay = (() => {
  const el = document.createElement('div');
  el.className = 'lightbox-overlay';
  el.innerHTML = `
    <button class="lightbox-close" aria-label="닫기">✕</button>
    <div class="lightbox-inner">
      <button class="lightbox-btn" id="lb-prev">‹</button>
      <img class="lightbox-img" id="lb-img" src="" alt="" />
      <button class="lightbox-btn" id="lb-next">›</button>
    </div>
    <div class="lightbox-counter" id="lb-counter"></div>
  `;
  document.body.appendChild(el);
  return el;
})();

const lbImg     = document.getElementById('lb-img');
const lbCounter = document.getElementById('lb-counter');
let lbImages = [];
let lbIndex  = 0;

function openLightbox(imgs, idx) {
  lbImages = Array.from(imgs);
  lbIndex  = idx;
  lbImg.src = lbImages[lbIndex].src;
  lbCounter.textContent = `${lbIndex + 1} / ${lbImages.length}`;
  lbOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lbOverlay.classList.remove('open');
  document.body.style.overflow = modal?.classList.contains('open') ? 'hidden' : '';
}

function lbMove(dir) {
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  lbImg.src = lbImages[lbIndex].src;
  lbCounter.textContent = `${lbIndex + 1} / ${lbImages.length}`;
}

document.getElementById('lb-prev').addEventListener('click', () => lbMove(-1));
document.getElementById('lb-next').addEventListener('click', () => lbMove(1));
lbOverlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
lbOverlay.addEventListener('click', e => { if (e.target === lbOverlay) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (!lbOverlay.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  lbMove(-1);
  if (e.key === 'ArrowRight') lbMove(1);
});

function initLightbox(imgs) {
  imgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(imgs, i));
  });
}

// lightbox swipe (mobile)
let lbTouchStartX = 0;
let lbTouchStartY = 0;
lbOverlay.addEventListener('touchstart', e => {
  lbTouchStartX = e.touches[0].clientX;
  lbTouchStartY = e.touches[0].clientY;
}, { passive: true });
lbOverlay.addEventListener('touchend', e => {
  if (!lbOverlay.classList.contains('open') || lbImages.length < 2) return;
  const dx = e.changedTouches[0].clientX - lbTouchStartX;
  const dy = e.changedTouches[0].clientY - lbTouchStartY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    lbMove(dx < 0 ? 1 : -1);
  }
}, { passive: true });

// init on direct page load
initLightbox(document.querySelectorAll('.gallery-img'));

/* ── Back to top (main page) ── */
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Modal scroll progress + back-to-top ── */
const modalProgressBar = document.getElementById('project-modal-progress-bar');
const modalBackToTopBtn = document.getElementById('modal-back-to-top');
if (modal) {
  modal.addEventListener('scroll', () => {
    if (modalProgressBar) {
      const max = modal.scrollHeight - modal.clientHeight;
      modalProgressBar.style.width = max > 0 ? ((modal.scrollTop / max) * 100) + '%' : '0';
    }
    if (modalBackToTopBtn) {
      modalBackToTopBtn.classList.toggle('visible', modal.scrollTop > 400);
    }
  }, { passive: true });
}
if (modalBackToTopBtn) {
  modalBackToTopBtn.addEventListener('click', () => {
    modal?.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements = document.querySelectorAll("[data-reveal]");
const statNumbers = document.querySelectorAll(".stat-number");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.2 }
);

revealElements.forEach((el) => revealObserver.observe(el));

const formatNumber = (value) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const animateNumber = (element) => {
  const target = Number(element.dataset.target);
  if (!Number.isFinite(target)) {
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = formatNumber(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.dataset.animated = "true";
    }
  };
  requestAnimationFrame(tick);
};

if (statNumbers.length > 0) {
  if (reduceMotion) {
    statNumbers.forEach((el) => {
      const target = Number(el.dataset.target);
      if (Number.isFinite(target)) {
        el.textContent = formatNumber(target);
        el.dataset.animated = "true";
      }
    });
  } else {
    const statsObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const el = entry.target;
          if (el.dataset.animated === "true") {
            observer.unobserve(el);
            return;
          }
          animateNumber(el);
          observer.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );

    statNumbers.forEach((el) => statsObserver.observe(el));
  }
}

const slider = document.querySelector(".slider");
const track = document.querySelector(".slider-track");

if (slider && track) {
  const originalSlides = Array.from(track.children);
  const shouldAnimate = !reduceMotion && originalSlides.length > 1;
  let totalWidth = 0;
  let offset = 0;
  let lastTime = null;
  let rafId;
  let resumeId;
  let paused = false;
  const speed = 20; // px per second

  if (originalSlides.length > 0) {
    originalSlides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
  }

  const getGap = () => {
    const styles = getComputedStyle(track);
    return parseFloat(styles.gap) || 0;
  };

  const updateWidth = () => {
    const gap = getGap();
    totalWidth =
      originalSlides.reduce((sum, slide) => sum + slide.getBoundingClientRect().width, 0) +
      gap * Math.max(0, originalSlides.length - 1);
    if (totalWidth > 0) {
      offset = offset % totalWidth;
      track.style.transform = `translateX(${-offset}px)`;
    }
  };

  const tick = (time) => {
    if (!lastTime) {
      lastTime = time;
    }
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (shouldAnimate && !paused && totalWidth > 0) {
      offset += speed * delta;
      if (offset >= totalWidth) {
        offset -= totalWidth;
      }
      track.style.transform = `translateX(${-offset}px)`;
    }
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!shouldAnimate) {
      return;
    }
    track.style.transition = "none";
    lastTime = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
  };

  const normalize = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .trim();

  const findBySurname = (query) => {
    const needle = normalize(query);
    if (!needle) {
      return null;
    }
    return originalSlides.find((slide) => {
      const nameEl = slide.querySelector(".memorial-name");
      if (!nameEl) {
        return false;
      }
      const surname = normalize(nameEl.textContent || "").split(/\s+/)[0] || "";
      return surname.startsWith(needle);
    });
  };

  const jumpToSlide = (slide) => {
    if (!slide || totalWidth <= 0) {
      return;
    }
    offset = slide.offsetLeft % totalWidth;
    track.style.transform = `translateX(${-offset}px)`;
  };

  updateWidth();
  start();

  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", resume);
  slider.addEventListener("touchstart", stop, { passive: true });
  slider.addEventListener("touchend", resume, { passive: true });
  window.addEventListener("resize", updateWidth);
  window.addEventListener("load", updateWidth);

  const searchInput = document.getElementById("memorial-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const match = findBySurname(event.target.value);
      if (!match) {
        return;
      }
      updateWidth();
      paused = true;
      jumpToSlide(match);
      if (resumeId) {
        clearTimeout(resumeId);
      }
      resumeId = setTimeout(() => {
        paused = false;
      }, 1200);
    });
  }
}

const timeline = document.querySelector(".chronology-timeline");

if (timeline) {
  let paused = false;
  let timerId;
  const speed = 0.6; // px per tick
  const interval = 30; // ms

  const maxScroll = () => timeline.scrollWidth - timeline.clientWidth;

  const step = () => {
    if (paused) {
      return;
    }
    const max = maxScroll();
    if (max <= 0) {
      return;
    }
    timeline.scrollLeft += speed;
    if (timeline.scrollLeft >= max) {
      timeline.scrollLeft = 0;
    }
  };

  const start = () => {
    if (!timerId) {
      timerId = setInterval(step, interval);
    }
  };

  const stop = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
  };

  timeline.addEventListener("mouseenter", stop);
  timeline.addEventListener("mouseleave", resume);
  timeline.addEventListener("touchstart", stop, { passive: true });
  timeline.addEventListener("touchend", resume, { passive: true });

  start();
}

const modelTriggers = document.querySelectorAll("[data-model-open]");
const modelModals = document.querySelectorAll(".model-modal");
let activeModal = null;
let lastFocused = null;

const openModal = (modal, trigger) => {
  if (!modal) {
    return;
  }
  if (activeModal && activeModal !== modal) {
    activeModal.classList.remove("is-open");
    activeModal.setAttribute("aria-hidden", "true");
  }
  lastFocused = trigger || document.activeElement;
  activeModal = modal;
  activeModal.classList.add("is-open");
  activeModal.removeAttribute("aria-hidden");
  document.body.classList.add("model-open");
  const closeButton = activeModal.querySelector(".model-close");
  if (closeButton) {
    closeButton.focus();
  }
};

const closeModal = () => {
  if (!activeModal) {
    return;
  }
  activeModal.classList.remove("is-open");
  activeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("model-open");
  const toFocus = lastFocused;
  activeModal = null;
  lastFocused = null;
  if (toFocus && typeof toFocus.focus === "function") {
    toFocus.focus();
  }
};

if (modelTriggers.length > 0) {
  modelTriggers.forEach((trigger) => {
    const modalId = trigger.getAttribute("data-model-open");
    const modal = modalId ? document.getElementById(modalId) : null;
    if (!modal) {
      return;
    }
    trigger.addEventListener("click", () => openModal(modal, trigger));
  });
}

modelModals.forEach((modal) => {
  const closeTargets = modal.querySelectorAll("[data-model-close]");
  closeTargets.forEach((target) => {
    target.addEventListener("click", closeModal);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeModal) {
    closeModal();
  }
});

const videoCards = document.querySelectorAll(".video-card[data-video-url]");

videoCards.forEach((card) => {
  const url = card.getAttribute("data-video-url");
  if (!url) {
    return;
  }
  const titleEl = card.querySelector(".video-title");
  const authorEl = card.querySelector(".video-author");
  const thumbEl = card.querySelector(".video-thumb img");

  fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data) {
        return;
      }
      if (titleEl && data.title) {
        titleEl.textContent = data.title;
      }
      if (authorEl && data.author_name) {
        authorEl.textContent = `Автор: ${data.author_name}`;
      }
      if (thumbEl && data.thumbnail_url) {
        thumbEl.src = data.thumbnail_url;
        if (data.title) {
          thumbEl.alt = `Превью: ${data.title}`;
        }
      }
    })
    .catch(() => {});
});

(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ---------- Sticky nav ---------- */
  const nav = document.querySelector(".nav");
  const onScrollNav = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* ---------- Walk sequence (original logic) ---------- */
  const SCROLL_SENSITIVITY = 6;
  const FRAME_COUNT = 121;
  const SCROLL_DISTANCE = 1104; // 720 + 96*3 + 96
  const WORD_START = 720;
  const WORD_STEP = 96;

  const walkSection = document.getElementById("walk-sequence");
  const canvas = document.getElementById("sequence-canvas");
  const scrollPrompt = document.getElementById("scroll-prompt");
  const words = Array.from(document.querySelectorAll("[data-word]"));

  if (walkSection && canvas) {
    const ctx = canvas.getContext("2d", { alpha: false });
    const frames = new Array(FRAME_COUNT);
    let currentFrame = 0;
    let rafId = null;
    let disposed = false;

    const drawFrame = (index) => {
      const img = frames[index];
      if (img?.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, 0, 0, 2206, 946);
        canvas.dataset.ready = "true";
      }
    };

    const updateWalk = () => {
      const scrolled = Math.min(
        SCROLL_DISTANCE,
        Math.max(0, -walkSection.getBoundingClientRect().top)
      );
      const frameScroll = Math.min(720, scrolled);

      if (scrollPrompt) {
        const atTop = scrolled <= 1;
        scrollPrompt.dataset.visible = String(atTop);
        scrollPrompt.setAttribute("aria-hidden", String(!atTop));
      }

      words.forEach((el, i) => {
        const opacity = clamp((scrolled - (WORD_START + WORD_STEP * i)) / WORD_STEP);
        el.style.opacity = String(opacity);
      });

      if (prefersReduced) {
        drawFrame(0);
        return;
      }

      const next = Math.min(FRAME_COUNT - 1, Math.round(frameScroll / SCROLL_SENSITIVITY));
      if (next !== currentFrame || canvas.dataset.ready !== "true") {
        currentFrame = next;
        drawFrame(currentFrame);
      }
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateWalk();
      });
    };

    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const img = new Image();
      frames[i] = img;
      img.decoding = "async";
      img.onload = () => {
        if (!disposed && i === currentFrame) drawFrame(i);
      };
      const n = String(i + 1).padStart(3, "0");
      img.src = `assets/walk-frames/ezgif-frame-${n}.png`;
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    updateWalk();
  }

  /* ---------- Falling feather zigzag (original logic) ---------- */
  const feather = document.getElementById("falling-feather");
  const featherSection = document.querySelector("[data-feather-section]");

  if (feather && featherSection) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let featherRaf = null;

    const updateFeather = () => {
      if (reduced.matches) {
        feather.style.opacity = "0";
        return;
      }

      const rect = featherSection.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const trigger = 0.35 * vh;
      const travel = Math.max(1, trigger - (vh - rect.height));
      const progress = clamp((trigger - rect.top) / travel);
      const inView = rect.top <= trigger && rect.bottom > vh;

      const fw = feather.offsetWidth;
      const fh = feather.offsetHeight;
      const pad = clamp(0.04 * vw, 16, 64);
      const maxX = vw - fw - pad;
      const minX = Math.max(pad, maxX - clamp(0.28 * vw, 90, 360));
      const zigzag = Math.cos(6 * progress * Math.PI);
      const startY = trigger - 0.35 * fh;
      const fadeIn = clamp(progress / 0.04);
      const fadeOut = clamp((1 - progress) / 0.08);
      const opacity = inView ? Math.min(fadeIn, fadeOut) : 0;

      const x = (minX + maxX) / 2 + ((maxX - minX) / 2) * zigzag;
      const y = startY + progress * progress * (vh + fh + 32 - startY);
      const rot = -30 * zigzag;

      feather.style.opacity = String(opacity);
      feather.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
    };

    const scheduleFeather = () => {
      if (featherRaf !== null) return;
      featherRaf = window.requestAnimationFrame(() => {
        featherRaf = null;
        updateFeather();
      });
    };

    window.addEventListener("scroll", scheduleFeather, { passive: true });
    window.addEventListener("resize", scheduleFeather, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(scheduleFeather).observe(featherSection);
    }
    reduced.addEventListener("change", updateFeather);
    updateFeather();
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Tokenomics chart + counters ---------- */
  const tokVisual = document.querySelector(".tok-visual");
  const counters = document.querySelectorAll("[data-count]");

  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    if (!target || prefersReduced) {
      el.textContent = target.toLocaleString("en-US");
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (tokVisual && "IntersectionObserver" in window) {
    const tokIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tokVisual.classList.add("inview");
          counters.forEach(animateCount);
          tokIO.disconnect();
        });
      },
      { threshold: 0.35 }
    );
    tokIO.observe(tokVisual);
  } else {
    tokVisual?.classList.add("inview");
    counters.forEach(animateCount);
  }

  /* ---------- Copy contract ---------- */
  const copyBtn = document.getElementById("copy-btn");
  const contract = document.getElementById("contract");
  copyBtn?.addEventListener("click", async () => {
    const text = contract?.getAttribute("title") || contract?.textContent || "";
    try {
      await navigator.clipboard.writeText(text.trim());
      copyBtn.classList.add("copied");
      setTimeout(() => copyBtn.classList.remove("copied"), 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(contract);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  /* ---------- Particle canvas (ambient, after hero) ---------- */
  const fx = document.getElementById("fx-canvas");
  if (!fx || prefersReduced) return;

  const fxCtx = fx.getContext("2d");
  let w = 0;
  let h = 0;
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let raf = 0;

  const resize = () => {
    w = fx.width = window.innerWidth;
    h = fx.height = window.innerHeight;
    const count = Math.min(50, Math.floor((w * h) / 32000));
    particles = Array.from({ length: count }, () => spawn());
  };

  const spawn = (fromBottom = false) => ({
    x: Math.random() * w,
    y: fromBottom ? h + 10 : Math.random() * h,
    r: Math.random() * 1.6 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.4 - 0.1,
    a: Math.random() * 0.35 + 0.08,
    pulse: Math.random() * Math.PI * 2,
  });

  const draw = () => {
    fxCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.pulse += 0.02;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -20 || p.x < -20 || p.x > w + 20) {
        particles[i] = spawn(true);
        continue;
      }
      const alpha = p.a * (0.65 + Math.sin(p.pulse) * 0.35);
      fxCtx.beginPath();
      fxCtx.fillStyle = `rgba(204, 255, 0, ${alpha})`;
      fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fxCtx.fill();
    }
    raf = requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );
  resize();
  draw();
})();

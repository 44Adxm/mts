const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const WELCOME_AUTO_DISMISS_MS = prefersReducedMotion ? 0 : 2800;

const SPLASH_FAILSAFE_MS = prefersReducedMotion ? 1200 : 5200;

function getHeroVideo() {
  return document.getElementById("hero-video");
}

function getWelcomeVideo() {
  return document.getElementById("welcome-video");
}

function getWelcomeScreen() {
  return document.getElementById("welcome-screen");
}

function setVideoFallback(mode, enabled) {
  document.body.classList.toggle(`${mode}-video-fallback`, enabled);
}

function enableVideoFallback(mode, video) {
  setVideoFallback(mode, true);

  if (!video) {
    return;
  }

  video.pause();
  video.controls = false;
  video.classList.add("video-fallback-hidden");
}

function primeInlineVideo(video, { loop = false } = {}) {
  if (!video) {
    return;
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = loop;
  video.autoplay = true;
  video.preload = "auto";
  video.removeAttribute("controls");
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  if (loop) {
    video.setAttribute("loop", "");
  } else {
    video.removeAttribute("loop");
  }
}

function heroPlaybackOptions(video) {
  return {
    loop: true,
    onPlaying: () => {
      if (!video) {
        return;
      }
      video.classList.remove("video-fallback-hidden");
      setVideoFallback("hero", false);
    },
    onBlocked: () => {
      if (!video) {
        return;
      }
      enableVideoFallback("hero", video);
    },
  };
}

function attemptVideoPlayback(video, { loop = false, onBlocked, onPlaying } = {}) {
  if (!video) {
    return Promise.resolve(false);
  }

  const handleSuccess = () => {
    if (typeof onPlaying === "function") {
      onPlaying();
    }
    return true;
  };

  const handleFailure = (error) => {
    if (typeof onBlocked === "function") {
      onBlocked(error);
    }
    return false;
  };

  const tryPlay = () => {
    primeInlineVideo(video, { loop });
    return video.play();
  };

  let playAttempt = tryPlay();

  if (!playAttempt || typeof playAttempt.then !== "function") {
    return Promise.resolve(handleSuccess());
  }

  return playAttempt
    .then(() => handleSuccess())
    .catch(() =>
      new Promise((resolve) => {
        window.setTimeout(resolve, 180);
      })
        .then(() => tryPlay())
        .then(() => handleSuccess())
        .catch((error) => handleFailure(error))
    );
}

function retryVideoPlaybackOnInteraction(video, options = {}) {
  if (!video) {
    return;
  }

  let retried = false;
  const retry = () => {
    if (retried) {
      return;
    }

    retried = true;
    attemptVideoPlayback(video, options);
    const passiveOpts = { passive: true };
    window.removeEventListener("touchstart", retry, passiveOpts);
    window.removeEventListener("touchend", retry, passiveOpts);
    window.removeEventListener("pointerdown", retry, passiveOpts);
  };

  window.addEventListener("touchstart", retry, { once: true, passive: true });
  window.addEventListener("touchend", retry, { once: true, passive: true });
  window.addEventListener("pointerdown", retry, { once: true, passive: true });
}

function revealChromeAfterSplash() {
  const mainNav = document.getElementById("main-nav");
  const mobileNav = document.getElementById("main-nav-mobile");
  const isNarrow = window.matchMedia("(max-width: 768px)").matches;

  window.setTimeout(() => {
    if (isNarrow && mobileNav) {
      mobileNav.style.opacity = "1";
    }

    if (!isNarrow && mainNav) {
      mainNav.style.opacity = "1";
    }
  }, prefersReducedMotion ? 0 : 80);
}

function forceHideWelcomeDom(splashEl) {
  if (!splashEl) {
    return;
  }

  splashEl.classList.remove("is-hiding");
  splashEl.style.display = "none";
  splashEl.style.visibility = "hidden";
  splashEl.style.opacity = "0";
  splashEl.style.pointerEvents = "none";
}

function reconcileSplashAgainstBodyState() {
  const splashEl = getWelcomeScreen();
  const dismissed = document.body.classList.contains("welcome-dismissed");

  if (dismissed) {
    document.body.classList.remove("welcome-active");
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    forceHideWelcomeDom(splashEl);
    revealChromeAfterSplash();
    kickHeroVideoAfterWelcome();
  }
}

function kickHeroVideoAfterWelcome() {
  const delayMs = prefersReducedMotion ? 0 : 48;
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      startHeroVideoPlayback();
    });
  }, delayMs);
}

function finalizeWelcomeOverlayHidden() {
  const splashEl = getWelcomeScreen();
  forceHideWelcomeDom(splashEl);
  kickHeroVideoAfterWelcome();
}

function dismissWelcomeSplash({ immediate = false } = {}) {
  document.body.classList.remove("welcome-active");
  document.body.classList.add("welcome-dismissed");
  document.body.style.overflow = "auto";
  document.body.style.height = "auto";

  const splashEl = getWelcomeScreen();

  if (!splashEl) {
    revealChromeAfterSplash();
    kickHeroVideoAfterWelcome();
    return;
  }

  if (splashEl.dataset.dismissed === "1") {
    finalizeWelcomeOverlayHidden();
    revealChromeAfterSplash();
    return;
  }

  splashEl.dataset.dismissed = "1";

  const wVideo = getWelcomeVideo();
  if (wVideo) {
    wVideo.pause();
    wVideo.removeAttribute("autoplay");
  }

  revealChromeAfterSplash();

  if (immediate || prefersReducedMotion) {
    finalizeWelcomeOverlayHidden();
    return;
  }

  splashEl.classList.add("is-hiding");

  const finishHidden = () => {
    finalizeWelcomeOverlayHidden();
  };
  const hideTimeoutId = window.setTimeout(() => {
    splashEl.removeEventListener("transitionend", onTransitionEnd);
    finishHidden();
  }, 1400);

  const onTransitionEnd = (event) => {
    if (event.target !== splashEl || event.propertyName !== "opacity") {
      return;
    }

    window.clearTimeout(hideTimeoutId);
    splashEl.removeEventListener("transitionend", onTransitionEnd);
    finishHidden();
  };

  splashEl.addEventListener("transitionend", onTransitionEnd);
}

function scheduleWelcomeAutoDismiss() {
  if (prefersReducedMotion || WELCOME_AUTO_DISMISS_MS <= 0) {
    dismissWelcomeSplash({ immediate: true });
    return;
  }

  window.setTimeout(() => dismissWelcomeSplash({ immediate: false }), WELCOME_AUTO_DISMISS_MS);
}

function failsafeSplashUnlock() {
  if (document.body.classList.contains("welcome-dismissed")) {
    reconcileSplashAgainstBodyState();
    return;
  }

  const splashEl = getWelcomeScreen();
  if (!splashEl) {
    dismissWelcomeSplash({ immediate: true });
    return;
  }

  const style = window.getComputedStyle(splashEl);
  const visiblyBlocking =
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    parseFloat(style.opacity) > 0.02 &&
    splashEl.dataset.dismissed !== "1";

  if (visiblyBlocking) {
    dismissWelcomeSplash({ immediate: true });
  }
}

function setupWelcomeSplash() {
  const splashEl = getWelcomeScreen();
  if (!splashEl) {
    dismissWelcomeSplash({ immediate: true });
    return;
  }

  if (prefersReducedMotion) {
    dismissWelcomeSplash({ immediate: true });
    return;
  }

  const wVideo = getWelcomeVideo();
  if (!wVideo) {
    dismissWelcomeSplash({ immediate: true });
    return;
  }

  splashEl.removeAttribute("data-dismissed");

  scheduleWelcomeAutoDismiss();

  wVideo.addEventListener(
    "error",
    () => {
      dismissWelcomeSplash({ immediate: true });
    },
    { once: true }
  );

  retryVideoPlaybackOnInteraction(wVideo, {
    loop: false,
    onPlaying: () => {
      setVideoFallback("welcome", false);
      wVideo.classList.remove("video-fallback-hidden");
    },
    onBlocked: () => {
      enableVideoFallback("welcome", wVideo);
    },
  });

  attemptVideoPlayback(wVideo, {
    loop: false,
    onPlaying: () => {
      wVideo.classList.remove("video-fallback-hidden");
      setVideoFallback("welcome", false);
    },
    onBlocked: () => {
      enableVideoFallback("welcome", wVideo);
    },
  });
}

function prepareHeroVideo() {
  const hv = getHeroVideo();
  if (!hv) {
    return;
  }

  hv.pause();
  hv.removeAttribute("autoplay");
  hv.preload = "none";
  hv.classList.remove("video-fallback-hidden");
}

function startHeroVideoPlayback() {
  const hv = getHeroVideo();
  if (!hv || !document.body.classList.contains("welcome-dismissed")) {
    return;
  }

  if (hv.dataset.heroStarted === "1") {
    if (hv.paused) {
      attemptVideoPlayback(hv, heroPlaybackOptions(hv));
    }
    return;
  }

  hv.dataset.heroStarted = "1";

  hv.preload = "auto";

  hv.addEventListener(
    "playing",
    () => {
      hv.classList.remove("video-fallback-hidden");
      setVideoFallback("hero", false);
    },
    { once: true }
  );

  retryVideoPlaybackOnInteraction(hv, heroPlaybackOptions(hv));

  attemptVideoPlayback(hv, heroPlaybackOptions(hv));
}

function ensureRevealSectionsVisibleFallback() {
  document.querySelectorAll(".reveal").forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

function setupLuxuryMotion() {
  try {
    if (!window.gsap) {
      ensureRevealSectionsVisibleFallback();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const navShell = document.querySelector(".nav-logo-shell");
    const navLinks = document.querySelector(".nav-links");
    const heroCopy = document.querySelector(".hero-copy-block");
    const heroActions = document.querySelector(".hero-actions");
    const heroGlow = document.querySelector(".hero-smoke-glow");
    const heroGradient = document.querySelector(".hero-video-gradient");

    const heroEl = getHeroVideo();

    if (
      !navLinks ||
      !heroCopy ||
      !heroActions ||
      !heroGlow ||
      !heroGradient ||
      typeof ScrollTrigger === "undefined"
    ) {
      ensureRevealSectionsVisibleFallback();
      return;
    }

    if (prefersReducedMotion) {
      gsap.set([navLinks, heroCopy, heroActions, ".glass-card"], { opacity: 1, y: 0 });
      if (heroEl) {
        gsap.set(heroEl, { opacity: 1, scale: 1.08 });
      }
      if (navShell) {
        gsap.set(navShell, { autoAlpha: 0 });
      }
      return;
    }

    if (navShell) {
      gsap.set(navShell, { autoAlpha: 0 });
    }
    gsap.set(navLinks, { opacity: 1, y: 0 });
    gsap.set([heroCopy, heroActions, ".glass-card"], { opacity: 1, y: 0 });
    gsap.set(heroGlow, { opacity: 0.18, scale: 1, transformOrigin: "center center" });
    gsap.set(heroGradient, { opacity: 0.35 });
    if (heroEl) {
      gsap.set(heroEl, { opacity: 1, scale: 1.08 });
    }

    if (heroEl) {
      gsap.to(heroEl, {
        yPercent: 6,
        scale: 1.12,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    gsap.to(heroGlow, {
      yPercent: -12,
      opacity: 0.32,
      ease: "none",
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    gsap.utils.toArray(".reveal").forEach((element) => {
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 84%",
        },
      });
    });

    gsap.to(".watermark", {
      x: -16,
      opacity: 0.18,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
  } catch (_) {
    ensureRevealSectionsVisibleFallback();
  }
}

function bootstrap() {
  reconcileSplashAgainstBodyState();
  prepareHeroVideo();
  setupWelcomeSplash();
  setupLuxuryMotion();

  window.setTimeout(failsafeSplashUnlock, SPLASH_FAILSAFE_MS);
}

window.addEventListener(
  "pageshow",
  (event) => {
    const hv = getHeroVideo();

    if (event.persisted) {
      if (hv && hv.dataset) {
        delete hv.dataset.heroStarted;
      }
      dismissWelcomeSplash({ immediate: true });
    }

    window.requestAnimationFrame(() => {
      reconcileSplashAgainstBodyState();
    });

    if (!event.persisted) {
      if (document.body.classList.contains("welcome-dismissed") && hv && hv.paused && hv.dataset.heroStarted === "1") {
        attemptVideoPlayback(hv, heroPlaybackOptions(hv));
      }
    }
  },
  { passive: true }
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    reconcileSplashAgainstBodyState();

    if (!document.body.classList.contains("welcome-dismissed")) {
      return;
    }

    const hv = getHeroVideo();
    if (!hv || !hv.paused) {
      return;
    }

    attemptVideoPlayback(hv, heroPlaybackOptions(hv));
  },
  { passive: true }
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

const heroVideo = document.getElementById("hero-video");
const welcomeScreen = document.getElementById("welcome-screen");
const welcomeVideo = document.getElementById("welcome-video");
const welcomeLogo = document.getElementById("intro-logo");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let heroPlaybackStarted = false;

function getVideoMode(video) {
  if (video === welcomeVideo) {
    return "welcome";
  }

  if (video === heroVideo) {
    return "hero";
  }

  return "video";
}

function setVideoFallback(mode, enabled) {
  if (!document.body) {
    return;
  }

  document.body.classList.toggle(`${mode}-video-fallback`, enabled);
}

function markVideoPending(video) {
  if (!video) {
    return;
  }

  video.classList.add("video-pending");
  video.classList.remove("video-ready");
  setVideoFallback(getVideoMode(video), true);
}

function markVideoReady(video) {
  if (!video) {
    return;
  }

  video.classList.remove("video-pending");
  video.classList.add("video-ready");
  setVideoFallback(getVideoMode(video), false);
}

function hydrateVideoSources(video) {
  if (!video) {
    return false;
  }

  let changed = false;
  const sources = video.querySelectorAll("source[data-src]");

  sources.forEach((source) => {
    const dataSrc = source.getAttribute("data-src");
    if (dataSrc && source.getAttribute("src") !== dataSrc) {
      source.setAttribute("src", dataSrc);
      changed = true;
    }
  });

  if (changed) {
    video.load();
  }

  return changed;
}

function bindVideoState(video) {
  if (!video || video.dataset.mtsBound === "true") {
    return;
  }

  video.dataset.mtsBound = "true";

  video.addEventListener("playing", () => {
    markVideoReady(video);
  });

  video.addEventListener("canplay", () => {
    if (!video.paused) {
      markVideoReady(video);
    }
  });
}

function enableVideoFallback(mode, video) {
  setVideoFallback(mode, true);

  if (!video) {
    return;
  }

  video.pause();
  video.removeAttribute("autoplay");
  video.controls = false;
  video.classList.add("video-fallback-hidden");
}

function primeInlineVideo(video, { loop = false } = {}) {
  if (!video) {
    return;
  }

  hydrateVideoSources(video);
  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = loop;
  video.autoplay = true;
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");
}

function attemptVideoPlayback(video, { loop = false, onBlocked } = {}) {
  if (!video) {
    return Promise.resolve(false);
  }

  bindVideoState(video);
  markVideoPending(video);
  primeInlineVideo(video, { loop });

  const playAttempt = video.play();
  if (!playAttempt || typeof playAttempt.then !== "function") {
    markVideoReady(video);
    return Promise.resolve(true);
  }

  return playAttempt
    .then(() => {
      markVideoReady(video);
      return true;
    })
    .catch((error) => {
      if (typeof onBlocked === "function") {
        onBlocked(error);
      }
      return false;
    });
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
    window.removeEventListener("touchstart", retry);
    window.removeEventListener("pointerdown", retry);
  };

  window.addEventListener("touchstart", retry, { once: true, passive: true });
  window.addEventListener("pointerdown", retry, { once: true, passive: true });
}

function startHeroVideoPlayback() {
  if (!heroVideo || heroPlaybackStarted) {
    return;
  }

  heroPlaybackStarted = true;

  attemptVideoPlayback(heroVideo, {
    loop: true,
    onBlocked: () => {
      enableVideoFallback("hero", heroVideo);
    },
  });
}

function setupWelcomeScreen() {
  if (!welcomeScreen || !welcomeLogo) {
    startHeroVideoPlayback();
    return;
  }

  if (window.__mtsWelcomeStarted) {
    return;
  }

  window.__mtsWelcomeStarted = true;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const navLogoShell = document.querySelector(".nav-logo-shell");
  const mainNav = document.getElementById("main-nav");
  const mobileNav = document.getElementById("main-nav-mobile");
  const desktopNavSides = document.querySelectorAll(".nav-side");

  function finishWelcomeScreen() {
    if (welcomeScreen.classList.contains("is-hiding")) {
      return;
    }

    welcomeScreen.classList.add("is-hiding");
    startHeroVideoPlayback();

    window.setTimeout(() => {
      welcomeScreen.style.display = "none";
      document.body.classList.remove("welcome-active");
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      welcomeLogo.classList.add("is-final");

      if (navLogoShell) {
        navLogoShell.style.display = "none";
      }
    }, 1000);
  }

  if (prefersReducedMotion) {
    welcomeLogo.style.left = "50%";
    welcomeLogo.style.top = isMobile ? "20px" : "18px";
    welcomeLogo.style.width = isMobile ? "110px" : "138px";
    welcomeLogo.style.opacity = "1";
    welcomeLogo.style.filter = "blur(0px)";
    welcomeLogo.style.transform = isMobile ? "translateX(-50%) scale(0.5)" : "translateX(-50%) scale(1.02)";
    welcomeLogo.classList.add("is-final");
    if (isMobile && mobileNav) {
      mobileNav.style.opacity = "1";
    }
    if (!isMobile && mainNav) {
      mainNav.style.opacity = "1";
    }
    finishWelcomeScreen();
    return;
  }

  if (!window.gsap) {
    window.setTimeout(finishWelcomeScreen, 2600);
    return;
  }

  if (welcomeVideo) {
    attemptVideoPlayback(welcomeVideo, {
      loop: false,
      onBlocked: () => {
        enableVideoFallback("welcome", welcomeVideo);
        window.setTimeout(runWelcomeTimeline, 150);
      },
    });
  }

  if (navLogoShell) {
    gsap.set(navLogoShell, { autoAlpha: 0 });
  }
  if (mainNav) {
    gsap.set(mainNav, { autoAlpha: 0 });
  }
  if (mobileNav) {
    gsap.set(mobileNav, { autoAlpha: 0 });
  }
  if (!isMobile && desktopNavSides.length) {
    gsap.set(desktopNavSides, { autoAlpha: 0, y: 6 });
  }

  gsap.set(welcomeLogo, {
    opacity: 0,
    filter: "blur(15px)",
    left: "50%",
    top: "50%",
    xPercent: -50,
    yPercent: -50,
    width: isMobile ? "min(82vw, 13rem)" : "min(24vw, 11rem)",
    transformOrigin: "center top",
    scale: 1,
  });

  let timelineStarted = false;

  function runWelcomeTimeline() {
    if (timelineStarted) {
      return;
    }

    timelineStarted = true;

    const timeline = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        gsap.set(welcomeLogo, { opacity: 1, filter: "blur(0px)" });
        finishWelcomeScreen();
      },
    });

    timeline
      .to(
        welcomeLogo,
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 1,
        },
        1
      )
      .to(
        welcomeVideo,
        {
          opacity: 0,
          duration: 1.5,
        },
        ">1"
      )
      .to(
        welcomeLogo,
        isMobile
          ? {
              top: "20px",
              left: "50%",
              xPercent: -50,
              yPercent: 0,
              scale: 0.5,
              duration: 1.8,
              ease: "expo.inOut",
            }
          : {
              top: "18px",
              left: "50%",
              xPercent: -50,
              yPercent: 0,
              scale: 1.02,
              duration: 1.8,
              ease: "expo.inOut",
            },
        ">0.05"
      )
      .set(
        welcomeLogo,
        {
          opacity: 1,
          filter: "blur(0px)",
        },
        ">"
      );

    if (isMobile) {
      timeline.to(
        mobileNav,
        {
          autoAlpha: 1,
          duration: 0.9,
          ease: "power2.out",
        },
        "<0.05"
      );
    } else {
      timeline
        .to(
          mainNav,
          {
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
          },
          "<0.05"
        )
        .to(
          desktopNavSides,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.04,
            ease: "power2.out",
          },
          "<"
        );
    }

    timeline.to(
      welcomeScreen,
      {
        opacity: 0,
        duration: 0.9,
      },
      "<0.1"
    );
  }

  if (welcomeVideo) {
    let timelineFallbackTimer = window.setTimeout(runWelcomeTimeline, 2200);
    const clearTimelineFallback = () => {
      if (timelineFallbackTimer) {
        window.clearTimeout(timelineFallbackTimer);
        timelineFallbackTimer = null;
      }
    };

    welcomeVideo.addEventListener("loadeddata", runWelcomeTimeline, { once: true });
    welcomeVideo.addEventListener(
      "playing",
      () => {
        clearTimelineFallback();
        runWelcomeTimeline();
      },
      { once: true }
    );
    welcomeVideo.addEventListener(
      "error",
      () => {
        clearTimelineFallback();
        window.setTimeout(runWelcomeTimeline, 150);
      },
      { once: true }
    );

    if (welcomeVideo.readyState >= 2) {
      clearTimelineFallback();
      runWelcomeTimeline();
    }
  } else {
    runWelcomeTimeline();
  }
}

function setupLuxuryMotion() {
  bindVideoState(heroVideo);
  markVideoPending(heroVideo);

  if (!window.gsap) {
    startHeroVideoPlayback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const navShell = document.querySelector(".nav-logo-shell");
  const navLinks = document.querySelector(".nav-links");
  const heroCopy = document.querySelector(".hero-copy-block");
  const heroActions = document.querySelector(".hero-actions");
  const heroGlow = document.querySelector(".hero-smoke-glow");
  const heroGradient = document.querySelector(".hero-video-gradient");

  if (prefersReducedMotion) {
    gsap.set([navLinks, heroCopy, heroActions, ".glass-card"], { opacity: 1, y: 0 });
    if (heroVideo) {
      gsap.set(heroVideo, { opacity: 1, scale: 1.08 });
    }
    if (navShell) {
      gsap.set(navShell, { autoAlpha: 0 });
    }
    startHeroVideoPlayback();
    return;
  }

  if (navShell) {
    gsap.set(navShell, { autoAlpha: 0 });
  }
  gsap.set(navLinks, { opacity: 1, y: 0 });
  gsap.set([heroCopy, heroActions, ".glass-card"], { opacity: 1, y: 0 });
  gsap.set(heroGlow, { opacity: 0.18, scale: 1, transformOrigin: "center center" });
  gsap.set(heroGradient, { opacity: 0.35 });
  if (heroVideo) {
    gsap.set(heroVideo, { opacity: 1, scale: 1.08 });
  }

  if (heroVideo) {
    gsap.to(heroVideo, {
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
}

window.addEventListener("load", () => {
  bindVideoState(welcomeVideo);
  bindVideoState(heroVideo);
  markVideoPending(welcomeVideo);
  setupWelcomeScreen();
  setupLuxuryMotion();
});

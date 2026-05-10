const heroVideo = document.getElementById("hero-video");
const welcomeScreen = document.getElementById("welcome-screen");
const welcomeVideo = document.getElementById("welcome-video");
const welcomeLogo = document.getElementById("intro-logo");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const prefersTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

let heroPlaybackStarted = false;

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
  video.removeAttribute("autoplay");
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
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");
}

function attemptVideoPlayback(video, { loop = false, onBlocked, onPlaying } = {}) {
  if (!video) {
    return Promise.resolve(false);
  }

  primeInlineVideo(video, { loop });

  const playAttempt = video.play();
  if (!playAttempt || typeof playAttempt.then !== "function") {
    if (typeof onPlaying === "function") {
      onPlaying();
    }
    return Promise.resolve(true);
  }

  return playAttempt
    .then(() => {
      if (typeof onPlaying === "function") {
        onPlaying();
      }
      return true;
    })
    .catch((error) => {
      if (typeof onBlocked === "function") {
        onBlocked(error);
      }
      return false;
    });
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
  const navLogoShell = document.querySelector(".nav-logo-shell");
  const mainNav = document.getElementById("main-nav");
  const mobileNav = document.getElementById("main-nav-mobile");
  const desktopNavSides = document.querySelectorAll(".nav-side");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  function revealNavigation() {
    if (welcomeLogo) {
      welcomeLogo.classList.add("is-final");
    }

    if (navLogoShell) {
      navLogoShell.style.display = "none";
    }

    if (isMobile && mobileNav) {
      mobileNav.style.opacity = "1";
    }

    if (!isMobile && mainNav) {
      mainNav.style.opacity = "1";
    }
  }

  if (!welcomeScreen || !welcomeLogo) {
    revealNavigation();
    startHeroVideoPlayback();
    return;
  }

  if (window.__mtsWelcomeStarted) {
    return;
  }

  window.__mtsWelcomeStarted = true;

  function finishWelcomeScreen() {
    if (welcomeScreen.dataset.finished === "true") {
      return;
    }

    welcomeScreen.dataset.finished = "true";
    welcomeScreen.classList.add("is-hiding");
    startHeroVideoPlayback();

    window.setTimeout(() => {
      welcomeScreen.style.display = "none";
      document.body.classList.remove("welcome-active");
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      revealNavigation();
    }, 800);
  }

  if (prefersTouchDevice || prefersReducedMotion) {
    finishWelcomeScreen();
    return;
  }

  if (!window.gsap) {
    attemptVideoPlayback(welcomeVideo, {
      loop: false,
      onBlocked: () => {
        enableVideoFallback("welcome", welcomeVideo);
      },
      onPlaying: () => {
        window.setTimeout(finishWelcomeScreen, 1800);
      },
    });

    window.setTimeout(finishWelcomeScreen, 2500);
    return;
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
      onComplete: finishWelcomeScreen,
    });

    timeline
      .to(
        welcomeLogo,
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.9,
        },
        0.5
      )
      .to(
        welcomeVideo,
        {
          opacity: 0,
          duration: 1.2,
        },
        ">0.9"
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
              duration: 1.5,
              ease: "expo.inOut",
            }
          : {
              top: "18px",
              left: "50%",
              xPercent: -50,
              yPercent: 0,
              scale: 1.02,
              duration: 1.5,
              ease: "expo.inOut",
            },
        ">0.05"
      );

    if (isMobile) {
      timeline.to(
        mobileNav,
        {
          autoAlpha: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "<0.1"
      );
    } else {
      timeline
        .to(
          mainNav,
          {
            autoAlpha: 1,
            duration: 0.6,
            ease: "power2.out",
          },
          "<0.1"
        )
        .to(
          desktopNavSides,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
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
        duration: 0.8,
      },
      "<0.05"
    );
  }

  attemptVideoPlayback(welcomeVideo, {
    loop: false,
    onBlocked: () => {
      enableVideoFallback("welcome", welcomeVideo);
      window.setTimeout(finishWelcomeScreen, 120);
    },
    onPlaying: () => {
      runWelcomeTimeline();
    },
  });

  welcomeVideo.addEventListener("loadeddata", runWelcomeTimeline, { once: true });
  welcomeVideo.addEventListener(
    "error",
    () => {
      enableVideoFallback("welcome", welcomeVideo);
      window.setTimeout(finishWelcomeScreen, 120);
    },
    { once: true }
  );

  if (welcomeVideo.readyState >= 2) {
    runWelcomeTimeline();
  }

  window.setTimeout(runWelcomeTimeline, 1800);
}

function setupLuxuryMotion() {
  if (!window.gsap) {
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
  setupWelcomeScreen();
  setupLuxuryMotion();
});

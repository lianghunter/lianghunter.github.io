// Small helpers for the portfolio. No libraries needed.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ---- Media frames ----
  // If a clip or image file doesn't exist yet, show where it should go
  // instead of a broken player.
  document.querySelectorAll(".frame").forEach((frame) => {
    const media = frame.querySelector("video, img");
    if (!media) return;

    const isVideo = media.tagName === "VIDEO";
    const markEmpty = () => {
      const kind = isVideo ? "Clip" : "Image";
      frame.dataset.placeholder = `${kind} goes here: ${media.getAttribute("src")}`;
      frame.classList.add("is-empty");
    };

    media.addEventListener("error", markEmpty);
    if (!isVideo && media.complete && media.naturalWidth === 0) markEmpty();
    if (isVideo && (media.error || media.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) markEmpty();

    if (!isVideo) return;

    // Pause / play button for each clip (keyboard and screen-reader friendly)
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "clip-toggle";
    frame.appendChild(btn);

    const sync = () => { btn.textContent = media.paused ? "Play clip" : "Pause clip"; };
    media.addEventListener("play", sync);
    media.addEventListener("pause", sync);
    sync();

    const toggle = () => {
      if (media.paused) {
        delete media.dataset.userPaused;
        media.play().catch(() => {});
      } else {
        media.dataset.userPaused = "1";
        media.pause();
      }
    };
    btn.addEventListener("click", toggle);
    media.addEventListener("click", toggle);
  });

  // ---- Autoplay clips only while they're on screen ----
  // Saves bandwidth and battery when you have several clips.
  const clips = document.querySelectorAll("video[data-autoplay]");
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting && !v.dataset.userPaused) v.play().catch(() => {});
      else if (!isIntersecting) v.pause();
    });
  }, { threshold: 0.35 });

  clips.forEach((v) => io.observe(v));
})();

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js-ready");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) root.classList.add("reduced-motion");

  document.querySelectorAll("[data-letters]").forEach(function (target) {
    var text = target.textContent;
    target.setAttribute("aria-label", text);
    target.setAttribute("aria-hidden", "true");
    target.textContent = "";
    Array.from(text).forEach(function (character, index) {
      var letter = document.createElement("span");
      letter.textContent = character === " " ? "\u00a0" : character;
      letter.style.setProperty("--letter-index", index);
      letter.setAttribute("aria-hidden", "true");
      target.appendChild(letter);
    });
  });

  var revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -45px 0px" });
    revealTargets.forEach(function (element) { revealObserver.observe(element); });
  } else {
    revealTargets.forEach(function (element) { element.classList.add("is-visible"); });
  }

  var canvas = document.querySelector(".js-scrub");
  var stage = document.querySelector(".sequence-stage");
  var track = document.querySelector(".sequence-track");
  var counter = document.querySelector(".sequence-counter b");
  var title = document.querySelector("[data-sequence-title]");
  var description = document.querySelector("[data-sequence-description]");
  var markers = document.querySelectorAll(".sequence-marker span");
  var hero = document.querySelector(".hero");
  var heroPhoto = document.querySelector(".hero-photo");
  var heroWash = document.querySelector(".hero-wash");
  var pageProgress = document.querySelector(".page-progress span");
  var context = canvas ? canvas.getContext("2d") : null;
  var FRAME_COUNT = 36;
  var frames = [];
  var frameNow = -1;
  var scheduled = false;
  var pixelRatio = Math.min(2, window.devicePixelRatio || 1);

  var chapters = [
    ["Um novo tom<br>em movimento.", "Role a página para percorrer os 36 quadros da rotação do batom."],
    ["Cor é um jeito<br>de sentir.", "A sequência avança foto a foto, revelando outros ângulos do batom."],
    ["Seu brilho<br>não tem molde.", "Continue rolando para percorrer a sequência completa, do primeiro ao último quadro."]
  ];

  function setChapter(progress) {
    var chapter = progress < 0.34 ? 0 : (progress < 0.68 ? 1 : 2);
    if (stage.dataset.chapter === String(chapter)) return;
    stage.dataset.chapter = String(chapter);
    title.innerHTML = chapters[chapter][0];
    description.textContent = chapters[chapter][1];
    markers.forEach(function (marker, index) {
      marker.classList.toggle("is-active", index === chapter);
    });
  }

  function sizeCanvas() {
    if (!canvas || !context) return;
    var rect = canvas.getBoundingClientRect();
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (frameNow >= 0) drawFrame(frameNow);
  }

  function drawFrame(index) {
    if (!context || !canvas) return;
    var image = frames[index];
    if (!image || !image.complete || !image.naturalWidth) return;

    var width = canvas.width / pixelRatio;
    var height = canvas.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    var scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    var drawWidth = image.naturalWidth * scale;
    var drawHeight = image.naturalHeight * scale;
    var x = (width - drawWidth) / 2;
    var y = (height - drawHeight) / 2;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    stage.classList.add("sequence-ready");
  }

  for (var i = 0; i < FRAME_COUNT; i++) {
    (function (index) {
      var image = new Image();
      image.onload = function () {
        if (index === frameNow) drawFrame(index);
      };
      image.src = "assets/frames/" + String(index + 1).padStart(3, "0") + ".jpg";
      frames.push(image);
    })(i);
  }

  function sequenceProgress() {
    var rect = track.getBoundingClientRect();
    var travel = Math.max(1, track.offsetHeight - window.innerHeight);
    return Math.max(0, Math.min(1, -rect.top / travel));
  }

  function updateSequence() {
    if (!canvas || !context) return;
    var progress = sequenceProgress();
    var frame = reducedMotion ? 17 : Math.round(progress * (FRAME_COUNT - 1));
    if (frame !== frameNow) {
      frameNow = frame;
      drawFrame(frame);
      counter.textContent = String(frame + 1).padStart(2, "0");
      setChapter(progress);
    }
  }

  function updatePageMotion() {
    var scroll = window.scrollY || window.pageYOffset;
    var heroProgress = Math.max(0, Math.min(1, scroll / Math.max(1, hero.offsetHeight * 0.72)));
    heroPhoto.style.transform = "translate3d(0," + (scroll * 0.22).toFixed(1) + "px,0) scale(" + (1.04 + heroProgress * 0.06).toFixed(3) + ")";
    heroPhoto.style.filter = "blur(" + (heroProgress * 5).toFixed(2) + "px)";
    heroWash.style.opacity = heroProgress.toFixed(3);
    var maximum = document.documentElement.scrollHeight - window.innerHeight;
    pageProgress.style.transform = "scaleX(" + (maximum > 0 ? scroll / maximum : 0) + ")";
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      updateSequence();
      updatePageMotion();
    });
  }

  sizeCanvas();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", function () {
    sizeCanvas();
    scheduleUpdate();
  });
  scheduleUpdate();
})();

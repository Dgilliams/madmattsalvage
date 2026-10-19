(() => {
  "use strict";

  const splash = document.querySelector(".pirate-screen");
  const pirateR = document.querySelector(".pirate-r");
  const stage = document.querySelector(".mad-matt-water-stage");
  const underwaterCanvas = document.getElementById("mad-matt-water");

  if (!splash || !pirateR || !stage || !underwaterCanvas) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let skyCanvas = splash.querySelector(".pirate-sky-canvas");
  if (!skyCanvas) {
    skyCanvas = document.createElement("canvas");
    skyCanvas.className = "pirate-sky-canvas";
    splash.prepend(skyCanvas);
  }

  let compass = splash.querySelector(".pirate-compass");
  if (!compass) {
    compass = document.createElement("div");
    compass.className = "pirate-compass";
    compass.setAttribute("aria-hidden", "true");
    splash.insertBefore(compass, pirateR);
  }

  let seaSurface = stage.querySelector(".mad-matt-sea-surface");
  if (!seaSurface) {
    seaSurface = document.createElement("div");
    seaSurface.className = "mad-matt-sea-surface";
    seaSurface.setAttribute("aria-hidden", "true");
    seaSurface.innerHTML = `
      <div class="mad-matt-surface-wave"></div>
      <div class="mad-matt-surface-wave-two"></div>
      <div class="mad-matt-surface-foam"></div>
    `;
    stage.insertBefore(seaSurface, stage.firstChild);
  }

  const sky = skyCanvas.getContext("2d", { alpha: false });
  const water = underwaterCanvas.getContext("2d", { alpha: true });
  if (!sky || !water) return;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let dpr = 1;

  let time = 0;
  let lastTimestamp = 0;
  let animationFrame = null;

  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;

  let scrollY = window.scrollY;
  let splashVisible = true;
  let stageVisible = false;
  let resizeTimer = null;

  let boatCrashTimer = 0;

  const clouds = [];
  const stars = [];
  const glints = [];
  const particles = [];
  const bubbles = [];
  const boats = [];
  const wrecks = [];
  const splashes = [];
  const seaweed = [];
  const jellies = [];
  const reefFish = [];
  const bigFish = [];
  const bottomCritters = [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function mixColor(a, b, amount) {
    return {
      r: Math.round(lerp(a.r, b.r, amount)),
      g: Math.round(lerp(a.g, b.g, amount)),
      b: Math.round(lerp(a.b, b.b, amount))
    };
  }

  function rgba(color, alpha = 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }

  function rgb(color) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function chance(probability) {
    return Math.random() < probability;
  }

  function interpolatePalette(progress, frames) {
    if (progress <= frames[0].t) return frames[0];
    if (progress >= frames[frames.length - 1].t) return frames[frames.length - 1];

    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i];
      const b = frames[i + 1];

      if (progress >= a.t && progress <= b.t) {
        const local = (progress - a.t) / (b.t - a.t);

        return {
          t: progress,
          topSky: mixColor(a.topSky, b.topSky, local),
          midSky: mixColor(a.midSky, b.midSky, local),
          horizonSky: mixColor(a.horizonSky, b.horizonSky, local),
          hazeWarm: mixColor(a.hazeWarm, b.hazeWarm, local),
          hazeCool: mixColor(a.hazeCool, b.hazeCool, local),
          cloudDark: mixColor(a.cloudDark, b.cloudDark, local),
          cloudLight: mixColor(a.cloudLight, b.cloudLight, local),
          sunCore: mixColor(a.sunCore, b.sunCore, local),
          sunEdge: mixColor(a.sunEdge, b.sunEdge, local),
          oceanTop: mixColor(a.oceanTop, b.oceanTop, local),
          oceanMid: mixColor(a.oceanMid, b.oceanMid, local),
          oceanDeep: mixColor(a.oceanDeep, b.oceanDeep, local),
          reflection: mixColor(a.reflection, b.reflection, local),
          stageGlow: mixColor(a.stageGlow, b.stageGlow, local),
          stageTop: mixColor(a.stageTop, b.stageTop, local),
          stageMid: mixColor(a.stageMid, b.stageMid, local),
          stageMid2: mixColor(a.stageMid2, b.stageMid2, local),
          stageDeep: mixColor(a.stageDeep, b.stageDeep, local),
          stageDeeper: mixColor(a.stageDeeper, b.stageDeeper, local),
          stageBottom: mixColor(a.stageBottom, b.stageBottom, local),
          stars: lerp(a.stars, b.stars, local),
          surfaceHighlight: lerp(a.surfaceHighlight, b.surfaceHighlight, local),
          waterBrightness: lerp(a.waterBrightness, b.waterBrightness, local)
        };
      }
    }

    return frames[0];
  }

  const DAYLIGHT_FRAMES = [
    {
      t: 0,
      topSky: { r: 8, g: 18, b: 33 },
      midSky: { r: 28, g: 55, b: 75 },
      horizonSky: { r: 151, g: 116, b: 92 },
      hazeWarm: { r: 238, g: 172, b: 101 },
      hazeCool: { r: 122, g: 176, b: 188 },
      cloudDark: { r: 74, g: 83, b: 91 },
      cloudLight: { r: 160, g: 132, b: 104 },
      sunCore: { r: 255, g: 241, b: 203 },
      sunEdge: { r: 225, g: 165, b: 91 },
      oceanTop: { r: 49, g: 103, b: 116 },
      oceanMid: { r: 17, g: 67, b: 82 },
      oceanDeep: { r: 7, g: 34, b: 46 },
      reflection: { r: 242, g: 194, b: 113 },
      stageGlow: { r: 119, g: 189, b: 199 },
      stageTop: { r: 20, g: 88, b: 110 },
      stageMid: { r: 10, g: 62, b: 82 },
      stageMid2: { r: 8, g: 46, b: 62 },
      stageDeep: { r: 5, g: 31, b: 44 },
      stageDeeper: { r: 4, g: 22, b: 31 },
      stageBottom: { r: 2, g: 11, b: 17 },
      stars: 0.22,
      surfaceHighlight: 0.09,
      waterBrightness: 0.78
    },
    {
      t: 0.23,
      topSky: { r: 12, g: 35, b: 58 },
      midSky: { r: 35, g: 89, b: 118 },
      horizonSky: { r: 115, g: 171, b: 188 },
      hazeWarm: { r: 241, g: 189, b: 121 },
      hazeCool: { r: 123, g: 198, b: 205 },
      cloudDark: { r: 84, g: 108, b: 120 },
      cloudLight: { r: 201, g: 193, b: 174 },
      sunCore: { r: 255, g: 246, b: 221 },
      sunEdge: { r: 239, g: 203, b: 122 },
      oceanTop: { r: 58, g: 133, b: 149 },
      oceanMid: { r: 18, g: 82, b: 100 },
      oceanDeep: { r: 7, g: 39, b: 53 },
      reflection: { r: 246, g: 219, b: 143 },
      stageGlow: { r: 128, g: 206, b: 215 },
      stageTop: { r: 19, g: 102, b: 126 },
      stageMid: { r: 10, g: 75, b: 97 },
      stageMid2: { r: 7, g: 54, b: 73 },
      stageDeep: { r: 5, g: 36, b: 51 },
      stageDeeper: { r: 4, g: 25, b: 36 },
      stageBottom: { r: 2, g: 13, b: 19 },
      stars: 0.05,
      surfaceHighlight: 0.11,
      waterBrightness: 0.9
    },
    {
      t: 0.5,
      topSky: { r: 29, g: 89, b: 136 },
      midSky: { r: 76, g: 166, b: 201 },
      horizonSky: { r: 170, g: 224, b: 233 },
      hazeWarm: { r: 239, g: 220, b: 159 },
      hazeCool: { r: 137, g: 211, b: 219 },
      cloudDark: { r: 120, g: 149, b: 161 },
      cloudLight: { r: 228, g: 235, b: 238 },
      sunCore: { r: 255, g: 250, b: 232 },
      sunEdge: { r: 250, g: 225, b: 160 },
      oceanTop: { r: 67, g: 148, b: 166 },
      oceanMid: { r: 22, g: 97, b: 118 },
      oceanDeep: { r: 9, g: 46, b: 60 },
      reflection: { r: 249, g: 234, b: 181 },
      stageGlow: { r: 138, g: 221, b: 226 },
      stageTop: { r: 24, g: 114, b: 139 },
      stageMid: { r: 12, g: 84, b: 107 },
      stageMid2: { r: 8, g: 61, b: 80 },
      stageDeep: { r: 5, g: 41, b: 56 },
      stageDeeper: { r: 4, g: 28, b: 38 },
      stageBottom: { r: 3, g: 15, b: 22 },
      stars: 0,
      surfaceHighlight: 0.13,
      waterBrightness: 1
    },
    {
      t: 0.77,
      topSky: { r: 24, g: 73, b: 117 },
      midSky: { r: 70, g: 147, b: 184 },
      horizonSky: { r: 162, g: 205, b: 214 },
      hazeWarm: { r: 243, g: 197, b: 130 },
      hazeCool: { r: 128, g: 190, b: 204 },
      cloudDark: { r: 109, g: 133, b: 145 },
      cloudLight: { r: 220, g: 217, b: 202 },
      sunCore: { r: 255, g: 246, b: 214 },
      sunEdge: { r: 243, g: 201, b: 124 },
      oceanTop: { r: 63, g: 136, b: 153 },
      oceanMid: { r: 19, g: 87, b: 104 },
      oceanDeep: { r: 8, g: 42, b: 56 },
      reflection: { r: 245, g: 211, b: 139 },
      stageGlow: { r: 126, g: 206, b: 217 },
      stageTop: { r: 22, g: 104, b: 129 },
      stageMid: { r: 11, g: 78, b: 99 },
      stageMid2: { r: 8, g: 57, b: 76 },
      stageDeep: { r: 5, g: 39, b: 54 },
      stageDeeper: { r: 4, g: 26, b: 37 },
      stageBottom: { r: 2, g: 14, b: 20 },
      stars: 0,
      surfaceHighlight: 0.11,
      waterBrightness: 0.95
    },
    {
      t: 1,
      topSky: { r: 17, g: 23, b: 52 },
      midSky: { r: 58, g: 72, b: 108 },
      horizonSky: { r: 185, g: 111, b: 84 },
      hazeWarm: { r: 243, g: 154, b: 94 },
      hazeCool: { r: 108, g: 155, b: 176 },
      cloudDark: { r: 78, g: 79, b: 99 },
      cloudLight: { r: 183, g: 125, b: 108 },
      sunCore: { r: 255, g: 230, b: 180 },
      sunEdge: { r: 232, g: 142, b: 79 },
      oceanTop: { r: 43, g: 91, b: 108 },
      oceanMid: { r: 15, g: 58, b: 74 },
      oceanDeep: { r: 6, g: 28, b: 38 },
      reflection: { r: 243, g: 174, b: 101 },
      stageGlow: { r: 102, g: 170, b: 191 },
      stageTop: { r: 16, g: 80, b: 101 },
      stageMid: { r: 9, g: 58, b: 77 },
      stageMid2: { r: 7, g: 43, b: 58 },
      stageDeep: { r: 5, g: 29, b: 41 },
      stageDeeper: { r: 4, g: 20, b: 29 },
      stageBottom: { r: 2, g: 10, b: 16 },
      stars: 0.12,
      surfaceHighlight: 0.08,
      waterBrightness: 0.76
    }
  ];

  function getDayState() {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    const sunriseHour = 6;
    const sunsetHour = 19;

    const dayProgress = clamp((hour - sunriseHour) / (sunsetHour - sunriseHour), 0, 1);
    const elevation = Math.sin(dayProgress * Math.PI);
    const warmth = 1 - elevation;
    const palette = interpolatePalette(dayProgress, DAYLIGHT_FRAMES);

    const splashHeight = splash.clientHeight;
    const horizon = splashHeight * 0.705;

    const sunX = splash.clientWidth * (0.16 + dayProgress * 0.68) + pointerX * 12;
    const sunY = horizon - elevation * splashHeight * 0.43 - warmth * 6 + pointerY * 4;
    const sunRadius = clamp(splash.clientWidth * (0.018 + elevation * 0.008), 16, 34);

    return {
      hour,
      dayProgress,
      elevation,
      warmth,
      palette,
      horizon,
      sun: { x: sunX, y: sunY, radius: sunRadius }
    };
  }

  function applyDayCSS(day) {
    splash.style.setProperty("--sun-strength", day.elevation.toFixed(4));
    splash.style.setProperty("--sky-bg-top", rgb(day.palette.topSky));
    splash.style.setProperty("--sky-bg-bottom", rgb(day.palette.midSky));

    splash.style.setProperty("--horizon-glow-warm", rgba(day.palette.hazeWarm, 0.14 + day.elevation * 0.08));
    splash.style.setProperty("--horizon-glow-cool", rgba(day.palette.hazeCool, 0.08 + day.elevation * 0.05));
    splash.style.setProperty("--r-glow-color", rgba(day.palette.reflection, 0.7));

    stage.style.setProperty("--stage-surface-glow", rgba(day.palette.stageGlow, 0.32));
    stage.style.setProperty("--stage-top", rgb(day.palette.stageTop));
    stage.style.setProperty("--stage-mid", rgb(day.palette.stageMid));
    stage.style.setProperty("--stage-mid-2", rgb(day.palette.stageMid2));
    stage.style.setProperty("--stage-deep", rgb(day.palette.stageDeep));
    stage.style.setProperty("--stage-deeper", rgb(day.palette.stageDeeper));
    stage.style.setProperty("--stage-bottom", rgb(day.palette.stageBottom));
  }

  function createClouds() {
    clouds.length = 0;
    const count = viewportWidth < 650 ? 8 : 15;

    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      clouds.push({
        x: Math.random() * viewportWidth,
        y: viewportHeight * (0.07 + Math.random() * 0.44),
        size: 80 + Math.random() * 240,
        stretch: 1.7 + Math.random() * 2.8,
        opacity: 0.018 + Math.random() * 0.07,
        speed: 0.8 + Math.random() * 3.4,
        depth,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function createStars() {
    stars.length = 0;
    const count = viewportWidth < 650 ? 26 : 72;

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight * 0.42,
        size: 0.35 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 + Math.random() * 0.22
      });
    }
  }

  function createGlints() {
    glints.length = 0;
    const count = viewportWidth < 650 ? 48 : 110;

    for (let i = 0; i < count; i++) {
      glints.push({
        x: Math.random() * viewportWidth,
        depth: Math.random(),
        phase: Math.random() * Math.PI * 2,
        size: 0.4 + Math.random() * 1.8,
        brightness: 0.03 + Math.random() * 0.12
      });
    }
  }

  function createParticles() {
    particles.length = 0;
    const count = viewportWidth < 650 ? 42 : 80;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        radius: 0.25 + Math.random() * 1.8,
        rise: 0.018 + Math.random() * 0.08,
        drift: 0.15 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.03 + Math.random() * 0.12
      });
    }
  }

  function createBubbles() {
    bubbles.length = 0;
    const count = viewportWidth < 650 ? 8 : 16;

    for (let i = 0; i < count; i++) {
      bubbles.push(makeBubble(true));
    }
  }

  function makeBubble(randomY = false, sourceX = null, sourceY = null) {
    return {
      x: sourceX !== null ? sourceX : Math.random() * viewportWidth,
      y: randomY ? (sourceY !== null ? sourceY : Math.random() * viewportHeight) : viewportHeight + 20,
      radius: 1 + Math.random() * 4.5,
      speed: 0.1 + Math.random() * 0.28,
      wobble: 0.25 + Math.random(),
      phase: Math.random() * Math.PI * 2,
      opacity: 0.05 + Math.random() * 0.14
    };
  }

  function createBoat(direction = null) {
    const width = splash.clientWidth || viewportWidth;
    const dir = direction || (Math.random() > 0.5 ? 1 : -1);
    const horizonY = (splash.clientHeight || viewportHeight) * 0.72;
    const scale = randomBetween(0.8, 1.25);

    return {
      direction: dir,
      state: "sailing",
      x: dir === 1 ? -140 : width + 140,
      y: horizonY - randomBetween(2, 18),
      vx: dir * randomBetween(14, 22),
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: randomBetween(1.1, 1.8),
      bobAmount: randomBetween(2.5, 5.5),
      hullLength: randomBetween(46, 72) * scale,
      hullHeight: randomBetween(10, 16) * scale,
      cabin: chance(0.55),
      mast: chance(0.3),
      rotation: 0,
      crashTime: 0,
      splashSpawned: false
    };
  }

  function makeWreck(source = {}) {
    return {
      x: source.x ?? randomBetween(80, viewportWidth - 80),
      y: source.y ?? -randomBetween(50, 120),
      hullLength: source.hullLength ?? randomBetween(48, 70),
      hullHeight: source.hullHeight ?? randomBetween(11, 16),
      cabin: source.cabin ?? chance(0.55),
      mast: source.mast ?? chance(0.25),
      direction: source.direction ?? (Math.random() > 0.5 ? 1 : -1),
      sinkRotation: source.sinkRotation ?? randomBetween(-0.12, 0.12),
      sinkSpeed: source.sinkSpeed ?? randomBetween(8, 14),
      sinkXDrift: source.sinkXDrift ?? randomBetween(-3, 3),
      bottomY: source.bottomY ?? viewportHeight * randomBetween(0.74, 0.88),
      state: source.state ?? "sinking",
      settleTilt: source.settleTilt ?? randomBetween(-0.65, 0.65)
    };
  }

  function spawnWreckFromBoat(boat) {
    if (wrecks.length > 4) {
      const settledIndex = wrecks.findIndex(item => item.state === "settled");
      if (settledIndex !== -1) wrecks.splice(settledIndex, 1);
    }

    wrecks.push(
      makeWreck({
        x: clamp(boat.x, 70, viewportWidth - 70),
        y: -randomBetween(30, 90),
        hullLength: boat.hullLength,
        hullHeight: boat.hullHeight,
        cabin: boat.cabin,
        mast: boat.mast,
        direction: boat.direction,
        sinkRotation: boat.rotation,
        sinkSpeed: randomBetween(8, 13),
        sinkXDrift: randomBetween(-2.2, 2.2),
        bottomY: viewportHeight * randomBetween(0.75, 0.88)
      })
    );
  }

  function createInitialBoats() {
    boats.length = 0;
    wrecks.length = 0;

    boats.push(createBoat(1));
    boats.push(createBoat(-1));

    boats[0].x = viewportWidth * 0.18;
    boats[1].x = viewportWidth * 0.76;

    wrecks.push(
      makeWreck({
        x: viewportWidth * 0.28,
        y: -60,
        hullLength: 58,
        hullHeight: 14,
        cabin: true,
        mast: false,
        direction: 1,
        sinkRotation: -0.08,
        sinkSpeed: 10,
        sinkXDrift: 0.6,
        bottomY: viewportHeight * 0.82
      })
    );

    wrecks.push(
      makeWreck({
        x: viewportWidth * 0.73,
        y: viewportHeight * 0.84,
        hullLength: 62,
        hullHeight: 15,
        cabin: true,
        mast: true,
        direction: -1,
        sinkRotation: 0.52,
        sinkSpeed: 0,
        sinkXDrift: 0,
        bottomY: viewportHeight * 0.84,
        state: "settled",
        settleTilt: 0.62
      })
    );
  }

  function spawnSplash(x, y, scale = 1) {
    splashes.push({
      x,
      y,
      age: 0,
      duration: randomBetween(0.9, 1.35),
      scale
    });
  }

  function spawnBottomSilt(x, y) {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: x + randomBetween(-14, 14),
        y: y + randomBetween(-4, 4),
        radius: randomBetween(0.5, 2.1),
        rise: randomBetween(-0.005, 0.02),
        drift: randomBetween(0.2, 1),
        phase: Math.random() * Math.PI * 2,
        opacity: randomBetween(0.04, 0.1)
      });
    }
  }

  function updateSurfaceBoats(delta, day) {
    const width = splash.clientWidth || viewportWidth;

    if (boats.length < 3 && chance(0.0025)) boats.push(createBoat());

    boatCrashTimer += delta;

    if (boatCrashTimer > 7 && !boats.some(boat => boat.state === "crashing")) {
      const candidates = boats.filter(boat => boat.state === "sailing");
      if (candidates.length && chance(0.025)) {
        const boat = candidates[Math.floor(Math.random() * candidates.length)];
        boat.state = "crashing";
        boat.crashTime = 0;
        boatCrashTimer = 0;
      }
    }

    for (let i = boats.length - 1; i >= 0; i--) {
      const boat = boats[i];

      if (boat.state === "sailing") {
        boat.x += boat.vx * delta;
        boat.rotation = Math.sin(time * boat.bobSpeed + boat.bobPhase) * 0.03;

        if ((boat.direction === 1 && boat.x > width + 180) || (boat.direction === -1 && boat.x < -180)) {
          boats.splice(i, 1);
          continue;
        }
      } else if (boat.state === "crashing") {
        boat.crashTime += delta;
        boat.x += boat.vx * delta * 0.55;
        boat.rotation += boat.direction * 0.65 * delta;
        boat.y += Math.sin(boat.crashTime * 22) * 0.5;

        if (!boat.splashSpawned && boat.crashTime > 0.34) {
          spawnSplash(boat.x, day.horizon + 4, 1.1);
          boat.splashSpawned = true;
        }

        if (boat.crashTime > 1.15) {
          spawnWreckFromBoat(boat);
          boats.splice(i, 1);
        }
      }
    }
  }

  function updateWrecks(delta) {
    for (const wreck of wrecks) {
      if (wreck.state === "sinking") {
        wreck.y += wreck.sinkSpeed * delta;
        wreck.x += wreck.sinkXDrift * delta;
        wreck.sinkRotation += wreck.direction * 0.12 * delta;

        if (chance(0.16 * delta * 60)) {
          bubbles.push(makeBubble(true, wreck.x + randomBetween(-8, 8), wreck.y + randomBetween(-2, 8)));
        }

        if (wreck.y >= wreck.bottomY) {
          wreck.y = wreck.bottomY;
          wreck.state = "settled";
          spawnBottomSilt(wreck.x, wreck.y);
        }
      } else if (wreck.state === "settled") {
        wreck.sinkRotation = lerp(wreck.sinkRotation, wreck.settleTilt, 0.01);
      }
    }
  }

  function updateSplashes(delta) {
    for (let i = splashes.length - 1; i >= 0; i--) {
      splashes[i].age += delta;
      if (splashes[i].age >= splashes[i].duration) splashes.splice(i, 1);
    }
  }

  function createSeaweed() {
    seaweed.length = 0;
    const count = viewportWidth < 650 ? 18 : 30;

    for (let i = 0; i < count; i++) {
      seaweed.push({
        x: (i / count) * viewportWidth + randomBetween(-18, 18),
        baseY: viewportHeight * randomBetween(0.84, 0.95),
        height: randomBetween(28, 90),
        width: randomBetween(6, 11),
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: randomBetween(0.6, 1.3)
      });
    }
  }

  function createJellies() {
    jellies.length = 0;
    const count = viewportWidth < 650 ? 2 : 3;

    for (let i = 0; i < count; i++) {
      jellies.push({
        x: randomBetween(60, viewportWidth - 60),
        y: randomBetween(viewportHeight * 0.2, viewportHeight * 0.58),
        size: randomBetween(12, 24),
        phase: Math.random() * Math.PI * 2,
        speed: randomBetween(0.5, 1.0),
        drift: randomBetween(5, 14)
      });
    }
  }

  function createReefFish() {
    reefFish.length = 0;
    const count = viewportWidth < 650 ? 5 : 8;

    for (let i = 0; i < count; i++) {
      reefFish.push({
        x: randomBetween(0, viewportWidth),
        y: randomBetween(viewportHeight * 0.34, viewportHeight * 0.82),
        scale: randomBetween(0.6, 1.25),
        speed: randomBetween(5, 12),
        direction: Math.random() > 0.5 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        alpha: randomBetween(0.18, 0.32)
      });
    }
  }

  function createBigFish() {
    bigFish.length = 0;
    const count = viewportWidth < 650 ? 2 : 3;

    for (let i = 0; i < count; i++) {
      bigFish.push({
        x: randomBetween(0, viewportWidth),
        y: randomBetween(viewportHeight * 0.24, viewportHeight * 0.74),
        scale: randomBetween(0.95, 1.55),
        speed: randomBetween(4, 8),
        direction: Math.random() > 0.5 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        type: i % 2 === 0 ? "fish" : "ray",
        alpha: randomBetween(0.14, 0.24)
      });
    }
  }

  function createBottomCritters() {
    bottomCritters.length = 0;
    const count = viewportWidth < 650 ? 3 : 4;

    for (let i = 0; i < count; i++) {
      bottomCritters.push({
        x: randomBetween(40, viewportWidth - 40),
        y: viewportHeight * randomBetween(0.86, 0.94),
        type: ["crab", "turtle", "star", "crab"][i % 4],
        phase: Math.random() * Math.PI * 2,
        speed: randomBetween(0.25, 0.55),
        dir: Math.random() > 0.5 ? 1 : -1,
        alpha: randomBetween(0.14, 0.24)
      });
    }
  }

  function updateSeaLife(delta) {
    for (const fish of reefFish) {
      fish.x += fish.direction * fish.speed * delta;
      fish.y += Math.sin(time * 0.8 + fish.phase) * 0.12;

      if (fish.direction === 1 && fish.x > viewportWidth + 40) fish.x = -40;
      if (fish.direction === -1 && fish.x < -40) fish.x = viewportWidth + 40;
    }

    for (const fish of bigFish) {
      fish.x += fish.direction * fish.speed * delta;
      fish.y += Math.sin(time * 0.45 + fish.phase) * 0.1;

      if (fish.direction === 1 && fish.x > viewportWidth + 80) fish.x = -80;
      if (fish.direction === -1 && fish.x < -80) fish.x = viewportWidth + 80;
    }

    for (const jelly of jellies) {
      jelly.y += Math.sin(time * jelly.speed + jelly.phase) * 0.16;
      jelly.x += Math.sin(time * 0.5 + jelly.phase) * 0.05;
    }

    for (const critter of bottomCritters) {
      if (critter.type === "crab" || critter.type === "turtle") {
        critter.x += critter.dir * critter.speed * delta * 10;

        if (critter.x < 25) {
          critter.x = 25;
          critter.dir = 1;
        }

        if (critter.x > viewportWidth - 25) {
          critter.x = viewportWidth - 25;
          critter.dir = -1;
        }
      }
    }
  }

  function sizeCanvas(canvas, context, width, height) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    sizeCanvas(skyCanvas, sky, splash.clientWidth, splash.clientHeight);
    sizeCanvas(underwaterCanvas, water, stage.clientWidth, viewportHeight);

    createClouds();
    createStars();
    createGlints();
    createParticles();
    createBubbles();
    createSeaweed();
    createJellies();
    createReefFish();
    createBigFish();
    createBottomCritters();
    createInitialBoats();
  }

  function drawSky(day) {
    const width = splash.clientWidth;
    const height = splash.clientHeight;
    const horizon = day.horizon;
    const palette = day.palette;

    const skyGradient = sky.createLinearGradient(0, 0, 0, horizon);
    skyGradient.addColorStop(0, rgb(palette.topSky));
    skyGradient.addColorStop(0.45, rgb(palette.midSky));
    skyGradient.addColorStop(1, rgb(palette.horizonSky));

    sky.fillStyle = skyGradient;
    sky.fillRect(0, 0, width, horizon);

    drawStars(day);
    drawAtmosphericBands(day);
    drawSun(day);
    drawClouds(day);
    drawBirds(width, height);
    drawOcean(day);
    drawBoatsAboveWater(day);
    drawSplashes(day);
  }

  function drawStars(day) {
    const starVisibility = day.palette.stars * (1 - day.elevation * 0.35);
    if (starVisibility <= 0.001) return;

    for (const star of stars) {
      const twinkle = 0.5 + Math.sin(time * 1.1 + star.phase) * 0.5;
      sky.fillStyle = rgba({ r: 208, g: 220, b: 226 }, star.opacity * twinkle * starVisibility);
      sky.beginPath();
      sky.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      sky.fill();
    }
  }

  function drawAtmosphericBands(day) {
    const width = splash.clientWidth;
    const horizon = day.horizon;
    const sun = day.sun;
    const palette = day.palette;

    sky.save();

    const haze = sky.createRadialGradient(sun.x, horizon, 0, sun.x, horizon, width * 0.46);
    haze.addColorStop(0, rgba(palette.hazeWarm, 0.15 + day.warmth * 0.08));
    haze.addColorStop(0.35, rgba(palette.hazeWarm, 0.06 + day.warmth * 0.04));
    haze.addColorStop(1, "rgba(0,0,0,0)");

    sky.fillStyle = haze;
    sky.fillRect(0, horizon - 220, width, 310);

    for (let i = 0; i < 6; i++) {
      const y = horizon - 18 - i * 13;
      const band = sky.createLinearGradient(0, y, width, y);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.45, rgba(palette.hazeWarm, 0.02 + day.warmth * 0.025));
      band.addColorStop(0.68, rgba(palette.hazeCool, 0.015 + day.elevation * 0.018));
      band.addColorStop(1, "rgba(0,0,0,0)");

      sky.fillStyle = band;
      sky.fillRect(0, y, width, 3);
    }

    sky.restore();
  }

  function drawSun(day) {
    const sun = day.sun;
    const palette = day.palette;

    sky.save();

    const bloom = sky.createRadialGradient(
      sun.x, sun.y, 0,
      sun.x, sun.y, sun.radius * (10 + day.elevation * 4)
    );

    bloom.addColorStop(0, rgba(palette.sunCore, 0.22 + day.elevation * 0.06));
    bloom.addColorStop(0.28, rgba(palette.sunEdge, 0.09 + day.warmth * 0.05));
    bloom.addColorStop(1, "rgba(0,0,0,0)");

    sky.fillStyle = bloom;
    sky.beginPath();
    sky.arc(sun.x, sun.y, sun.radius * (10 + day.elevation * 4), 0, Math.PI * 2);
    sky.fill();

    const sunGradient = sky.createRadialGradient(
      sun.x - sun.radius * 0.28,
      sun.y - sun.radius * 0.28,
      0,
      sun.x,
      sun.y,
      sun.radius
    );

    sunGradient.addColorStop(0, rgb(palette.sunCore));
    sunGradient.addColorStop(0.55, rgb(palette.sunEdge));
    sunGradient.addColorStop(1, rgba(palette.sunEdge, 0.88));

    sky.fillStyle = sunGradient;
    sky.beginPath();
    sky.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
    sky.fill();

    sky.restore();
  }

  function drawClouds(day) {
    const width = splash.clientWidth;
    const horizon = day.horizon;
    const palette = day.palette;
    const sunX = day.sun.x;

    for (const cloud of clouds) {
      cloud.x += cloud.speed * 0.007;

      if (cloud.x - cloud.size > width) cloud.x = -cloud.size * 2;

      const movement = Math.sin(time * 0.04 + cloud.phase) * 3;
      const cloudX = cloud.x + pointerX * 7 * cloud.depth;
      const cloudY = Math.min(cloud.y + movement, horizon - 26);
      const glowSide = cloudX < sunX ? 1 : -1;

      const gradient = sky.createRadialGradient(
        cloudX + glowSide * cloud.size * 0.09,
        cloudY,
        0,
        cloudX,
        cloudY,
        cloud.size
      );

      gradient.addColorStop(0, rgba(mixColor(palette.cloudLight, palette.cloudDark, 0.15), cloud.opacity * 1.05));
      gradient.addColorStop(0.48, rgba(palette.cloudDark, cloud.opacity));
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      sky.save();
      sky.scale(cloud.stretch, 1);
      sky.fillStyle = gradient;
      sky.beginPath();
      sky.ellipse(cloudX / cloud.stretch, cloudY, cloud.size, cloud.size * 0.18, 0, 0, Math.PI * 2);
      sky.fill();
      sky.restore();
    }
  }

  function drawBirds(width, height) {
    const groupX = width * 0.18 + Math.sin(time * 0.05) * 45;
    const groupY = height * 0.31;

    drawBird(groupX, groupY, 7);
    drawBird(groupX + 42, groupY + 15, 5);
    drawBird(groupX + 78, groupY - 7, 4);
  }

  function drawBird(x, y, size) {
    const flap = Math.sin(time * 1.4 + x * 0.01) * 1.7;

    sky.strokeStyle = "rgba(3,12,16,0.44)";
    sky.lineWidth = 1.1;

    sky.beginPath();
    sky.moveTo(x - size, y + flap);
    sky.quadraticCurveTo(x - size * 0.4, y - size * 0.45, x, y);
    sky.quadraticCurveTo(x + size * 0.4, y - size * 0.45, x + size, y + flap);
    sky.stroke();
  }

  function drawOcean(day) {
    const width = splash.clientWidth;
    const height = splash.clientHeight;
    const horizon = day.horizon;
    const palette = day.palette;

    const oceanGradient = sky.createLinearGradient(0, horizon, 0, height);
    oceanGradient.addColorStop(0, rgb(palette.oceanTop));
    oceanGradient.addColorStop(0.38, rgb(palette.oceanMid));
    oceanGradient.addColorStop(1, rgb(palette.oceanDeep));

    sky.fillStyle = oceanGradient;
    sky.fillRect(0, horizon, width, height - horizon);

    const bandCount = 14;

    for (let band = 0; band < bandCount; band++) {
      const depth = band / (bandCount - 1);
      const baseY = horizon + Math.pow(depth, 1.65) * (height - horizon);
      const amplitude = 1.4 + depth * 13;
      const frequency = 0.018 - depth * 0.008;
      const speed = 0.5 + depth * 0.45;
      drawOceanBand(width, height, baseY, amplitude, frequency, speed, depth, palette);
    }

    drawSunReflection(day);
    drawWaveHighlights(day);
    drawSurfaceGlints(day);
    drawSurfaceSeam(day);
  }

  function drawOceanBand(width, height, baseY, amplitude, frequency, speed, depth, palette) {
    sky.beginPath();
    sky.moveTo(0, baseY);

    for (let x = 0; x <= width; x += 6) {
      const wave =
        Math.sin(x * frequency + time * speed) * amplitude +
        Math.sin(x * frequency * 2.14 - time * speed * 0.72) * amplitude * 0.37 +
        Math.sin(x * frequency * 4.7 + time * 1.1) * amplitude * 0.1;

      sky.lineTo(x, baseY + wave);
    }

    sky.lineTo(width, height);
    sky.lineTo(0, height);
    sky.closePath();

    const bandColor = mixColor(palette.oceanTop, palette.oceanDeep, depth * 0.9);
    sky.fillStyle = rgba(bandColor, 0.07 + depth * 0.07);
    sky.fill();
  }

  function drawSunReflection(day) {
    const width = splash.clientWidth;
    const height = splash.clientHeight;
    const horizon = day.horizon;
    const sun = day.sun;
    const palette = day.palette;

    sky.save();
    sky.globalCompositeOperation = "screen";

    const lines = 46;

    for (let i = 0; i < lines; i++) {
      const depth = i / (lines - 1);
      const y = horizon + 4 + Math.pow(depth, 1.48) * (height - horizon);
      const spread = 8 + depth * 145;

      const distortion = Math.sin(time * (0.7 + depth * 0.8) + i * 1.83) * (4 + depth * 17);
      const localWave = Math.sin(sun.x * 0.018 + time * 0.54 + i) * 7 * depth;
      const center = sun.x + distortion + localWave;

      const breakFactor = 0.35 + Math.abs(Math.sin(time * 1.2 + i * 2.1)) * 0.65;
      const segmentWidth = spread * breakFactor;
      const alpha = (0.16 - depth * 0.095) * (0.55 + day.elevation * 0.55);

      sky.strokeStyle = rgba(palette.reflection, alpha);
      sky.lineWidth = 0.7 + depth * 1.3;

      sky.beginPath();
      sky.moveTo(center - segmentWidth, y);
      sky.lineTo(center + segmentWidth * 0.75, y);
      sky.stroke();
    }

    sky.restore();
  }

  function drawWaveHighlights(day) {
    const width = splash.clientWidth;
    const height = splash.clientHeight;
    const horizon = day.horizon;
    const palette = day.palette;

    sky.save();
    sky.globalCompositeOperation = "screen";

    for (let band = 0; band < 15; band++) {
      const depth = band / 14;
      const y = horizon + Math.pow(depth, 1.55) * (height - horizon);
      const amplitude = 1 + depth * 7;

      sky.beginPath();

      for (let x = 0; x <= width; x += 9) {
        const wave = Math.sin(x * (0.018 - depth * 0.008) + time * (0.6 + depth * 0.5)) * amplitude;
        if (x === 0) sky.moveTo(x, y + wave);
        else sky.lineTo(x, y + wave);
      }

      const highlightColor = mixColor(palette.hazeCool, { r: 210, g: 234, b: 236 }, 0.25);
      sky.strokeStyle = rgba(highlightColor, (0.05 - depth * 0.022) * (0.8 + palette.surfaceHighlight));
      sky.lineWidth = 0.65;
      sky.stroke();
    }

    sky.restore();
  }

  function drawSurfaceGlints(day) {
    const height = splash.clientHeight;
    const horizon = day.horizon;
    const palette = day.palette;

    sky.save();
    sky.globalCompositeOperation = "screen";

    for (const glint of glints) {
      const y = horizon + Math.pow(glint.depth, 1.5) * (height - horizon);
      const pulse = Math.max(0, Math.sin(time * 1.6 + glint.phase));
      if (pulse < 0.68) continue;

      const glintColor = mixColor(palette.reflection, { r: 222, g: 240, b: 240 }, 0.45);
      sky.fillStyle = rgba(glintColor, glint.brightness * pulse);
      sky.fillRect(glint.x, y, glint.size * (2 + glint.depth * 6), 0.7);
    }

    sky.restore();
  }

  function drawSurfaceSeam(day) {
    const width = splash.clientWidth;
    const horizon = day.horizon;
    const palette = day.palette;

    sky.save();

    const seamY = horizon + 2;

    for (let layer = 0; layer < 3; layer++) {
      const amp = 2.2 + layer * 1.8;
      const alpha = 0.45 - layer * 0.12;

      sky.beginPath();

      for (let x = -10; x <= width + 10; x += 5) {
        const y =
          seamY +
          Math.sin(x * 0.028 + time * (1 + layer * 0.3)) * amp +
          Math.sin(x * 0.08 - time * 1.7) * (0.7 + layer * 0.15);

        if (x === -10) sky.moveTo(x, y);
        else sky.lineTo(x, y);
      }

      sky.strokeStyle = rgba(mixColor(palette.reflection, { r: 235, g: 248, b: 248 }, 0.45), alpha);
      sky.lineWidth = 1.2 - layer * 0.2;
      sky.stroke();
    }

    const underGlow = sky.createLinearGradient(0, horizon - 4, 0, horizon + 30);
    underGlow.addColorStop(0, "rgba(255,255,255,0)");
    underGlow.addColorStop(0.25, rgba(palette.hazeCool, 0.08));
    underGlow.addColorStop(1, "rgba(0,0,0,0)");

    sky.fillStyle = underGlow;
    sky.fillRect(0, horizon - 4, width, 34);

    sky.restore();
  }

  function drawBoatSilhouette(ctx, x, y, hullLength, hullHeight, rotation, boat, underwater) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const hullColor = underwater ? "rgba(12, 25, 32, 0.72)" : "rgba(25, 40, 48, 0.78)";
    const trimColor = underwater ? "rgba(20, 40, 52, 0.44)" : "rgba(214, 232, 232, 0.18)";

    ctx.fillStyle = hullColor;
    ctx.beginPath();
    ctx.moveTo(-hullLength * 0.5, 0);
    ctx.lineTo(hullLength * 0.34, 0);
    ctx.lineTo(hullLength * 0.47, -hullHeight * 0.3);
    ctx.lineTo(hullLength * 0.26, -hullHeight);
    ctx.lineTo(-hullLength * 0.38, -hullHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = trimColor;
    ctx.fillRect(-hullLength * 0.18, -hullHeight * 0.9, hullLength * 0.3, hullHeight * 0.08);

    if (boat.cabin) {
      ctx.fillStyle = underwater ? "rgba(16, 32, 41, 0.55)" : "rgba(223, 233, 235, 0.78)";
      ctx.beginPath();
      ctx.rect(-hullLength * 0.16, -hullHeight * 1.55, hullLength * 0.28, hullHeight * 0.65);
      ctx.fill();
    }

    if (boat.mast) {
      ctx.strokeStyle = underwater ? "rgba(18, 34, 44, 0.45)" : "rgba(216, 226, 227, 0.58)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hullLength * 0.02, -hullHeight * 0.96);
      ctx.lineTo(hullLength * 0.02, -hullHeight * 2.2);
      ctx.stroke();

      if (!underwater) {
        ctx.fillStyle = "rgba(237, 241, 239, 0.42)";
        ctx.beginPath();
        ctx.moveTo(hullLength * 0.02, -hullHeight * 2.1);
        ctx.lineTo(hullLength * 0.34, -hullHeight * 1.55);
        ctx.lineTo(hullLength * 0.02, -hullHeight * 1.45);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawBoatsAboveWater() {
    for (const boat of boats) {
      drawBoatSilhouette(sky, boat.x, boat.y, boat.hullLength, boat.hullHeight, boat.rotation, boat, false);
    }
  }

  function drawSplashes(day) {
    for (const splashDrop of splashes) {
      const progress = splashDrop.age / splashDrop.duration;
      const inv = 1 - progress;

      sky.save();
      sky.translate(splashDrop.x, splashDrop.y);

      sky.strokeStyle = rgba(mixColor(day.palette.hazeCool, { r: 250, g: 250, b: 250 }, 0.45), 0.8 * inv);
      sky.lineWidth = 1.4 * inv + 0.4;

      for (let i = 0; i < 10; i++) {
        const spread = (-0.5 + i / 9) * 24 * splashDrop.scale;
        const height = (10 + Math.sin(i) * 5) * splashDrop.scale * inv;

        sky.beginPath();
        sky.moveTo(0, 0);
        sky.lineTo(spread, -height);
        sky.stroke();
      }

      sky.fillStyle = rgba({ r: 233, g: 248, b: 249 }, 0.75 * inv);
      sky.beginPath();
      sky.ellipse(0, 0, 22 * splashDrop.scale * inv, 4 * splashDrop.scale * inv, 0, 0, Math.PI * 2);
      sky.fill();

      sky.restore();
    }
  }

  function drawUnderwater(day) {
    const width = stage.clientWidth;
    const height = viewportHeight;

    water.clearRect(0, 0, width, height);

    drawUnderwaterSurface(day, width, height);
    drawUnderwaterShafts(day, width, height);
    drawCaustics(day, width, height);
    drawUnderwaterWrecks();
    drawSeaLife();
    drawParticles(width, height);
    drawBubbles(width, height);
    drawSeafloor(width, height);
  }

  function drawUnderwaterSurface(day, width) {
    const palette = day.palette;

    const glow = water.createLinearGradient(0, 0, 0, 220);
    glow.addColorStop(0, rgba(palette.stageGlow, 0.2 + day.elevation * 0.03));
    glow.addColorStop(0.28, rgba(palette.stageGlow, 0.09));
    glow.addColorStop(0.65, rgba(palette.stageGlow, 0.02));
    glow.addColorStop(1, "rgba(0,0,0,0)");

    water.fillStyle = glow;
    water.fillRect(0, 0, width, 240);

    water.save();
    water.globalCompositeOperation = "screen";

    for (let row = 0; row < 8; row++) {
      const y = 12 + row * 16;

      water.beginPath();

      for (let x = -20; x <= width + 20; x += 8) {
        const yy =
          y +
          Math.sin(x * 0.018 + time * 0.5 + row) * 4 +
          Math.sin(x * 0.046 - time * 0.73) * 1.5;

        if (x === -20) water.moveTo(x, yy);
        else water.lineTo(x, yy);
      }

      water.strokeStyle = rgba(mixColor(palette.stageGlow, { r: 225, g: 246, b: 246 }, 0.35), 0.06 - row * 0.005);
      water.lineWidth = 0.8;
      water.stroke();
    }

    water.restore();
    drawWaterlineUnderside(day, width);
  }

  function drawWaterlineUnderside(day, width) {
    const palette = day.palette;

    water.save();

    for (let layer = 0; layer < 4; layer++) {
      const yBase = 18 + layer * 7;
      const alpha = 0.14 - layer * 0.025;

      water.beginPath();

      for (let x = -10; x <= width + 10; x += 5) {
        const y =
          yBase +
          Math.sin(x * 0.03 + time * (1.4 + layer * 0.22)) * (2.4 + layer * 0.6) +
          Math.sin(x * 0.09 - time * 2.1) * 0.9;

        if (x === -10) water.moveTo(x, y);
        else water.lineTo(x, y);
      }

      water.strokeStyle = rgba(mixColor(palette.hazeCool, { r: 243, g: 250, b: 250 }, 0.35), alpha);
      water.lineWidth = 1.1 - layer * 0.15;
      water.stroke();
    }

    water.restore();
  }

  function drawUnderwaterShafts(day, width, height) {
    const palette = day.palette;

    water.save();
    water.globalCompositeOperation = "screen";

    const count = width < 650 ? 4 : 7;

    for (let i = 0; i < count; i++) {
      const x = width * (0.09 + (i / Math.max(count - 1, 1)) * 0.82) + Math.sin(time * 0.12 + i * 1.35) * 35;
      const endX = x + Math.sin(time * 0.085 + i * 2) * 115;

      const beam = water.createLinearGradient(x, 0, endX, height);
      beam.addColorStop(0, rgba(palette.stageGlow, 0.07));
      beam.addColorStop(0.45, rgba(palette.stageGlow, 0.026));
      beam.addColorStop(1, "rgba(0,0,0,0)");

      water.fillStyle = beam;
      water.beginPath();
      water.moveTo(x - 5, 0);
      water.lineTo(x + 7, 0);
      water.lineTo(endX + 180, height);
      water.lineTo(endX - 190, height);
      water.closePath();
      water.fill();
    }

    water.restore();
  }

  function drawCaustics(day, width, height) {
    const palette = day.palette;

    water.save();
    water.globalCompositeOperation = "screen";

    const rows = Math.ceil(height / 45);

    for (let row = 0; row < rows; row++) {
      const y = 20 + row * 45;
      const depth = y / height;
      const opacity = 0.036 * (1 - depth * 0.72);

      water.beginPath();

      for (let x = -70; x <= width + 70; x += 15) {
        const a = Math.sin(x * 0.019 + time * 0.38 + row * 1.21) * 7;
        const b = Math.sin(x * 0.043 - time * 0.24 + row * 0.7) * 3;
        const c = Math.sin(x * 0.083 + time * 0.18);
        const yy = y + a + b + c;

        if (x === -70) water.moveTo(x, yy);
        else water.lineTo(x, yy);
      }

      const causticColor = mixColor(palette.stageGlow, { r: 186, g: 236, b: 238 }, 0.42);
      water.strokeStyle = rgba(causticColor, opacity);
      water.lineWidth = 0.7;
      water.stroke();
    }

    water.restore();
  }

  function drawUnderwaterWrecks() {
    for (const wreck of wrecks) {
      if (wreck.y < -160 || wreck.y > viewportHeight + 120) continue;

      water.save();
      water.globalAlpha = wreck.state === "sinking" ? 0.78 : 0.9;
      drawBoatSilhouette(
        water,
        wreck.x,
        wreck.y,
        wreck.hullLength,
        wreck.hullHeight,
        wreck.sinkRotation,
        wreck,
        true
      );
      water.restore();
    }
  }

  function drawSeaLife() {
    drawLargeFish();
    drawJellies();
    drawReefFish();
    drawBottomCritters();
  }

  function drawFishSilhouette(ctx, x, y, scale, direction, alpha) {
    const bodyLength = 18 * scale;
    const bodyHeight = 7 * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    ctx.fillStyle = `rgba(8, 23, 31, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.8, 0);
    ctx.quadraticCurveTo(-bodyLength * 0.2, -bodyHeight, bodyLength * 0.45, -bodyHeight * 0.2);
    ctx.quadraticCurveTo(bodyLength * 0.95, 0, bodyLength * 0.45, bodyHeight * 0.25);
    ctx.quadraticCurveTo(-bodyLength * 0.2, bodyHeight, -bodyLength * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.78, 0);
    ctx.lineTo(-bodyLength * 1.15, -bodyHeight * 0.9);
    ctx.lineTo(-bodyLength * 1.05, 0);
    ctx.lineTo(-bodyLength * 1.15, bodyHeight * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawReefFish() {
    for (const fish of reefFish) {
      drawFishSilhouette(water, fish.x, fish.y, fish.scale, fish.direction, fish.alpha);
    }
  }

  function drawLargeFish() {
    for (const fish of bigFish) {
      if (fish.type === "ray") {
        drawRaySilhouette(water, fish.x, fish.y, fish.scale, fish.direction, fish.alpha);
      } else {
        drawFishSilhouette(water, fish.x, fish.y, fish.scale * 1.55, fish.direction, fish.alpha);
      }
    }
  }

  function drawRaySilhouette(ctx, x, y, scale, direction, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * direction, scale);
    ctx.fillStyle = `rgba(8, 23, 31, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-5, -10, 0, -5);
    ctx.quadraticCurveTo(8, -12, 18, 0);
    ctx.quadraticCurveTo(8, 12, 0, 5);
    ctx.quadraticCurveTo(-5, 10, -16, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(24, 1, 30, 4);
    ctx.quadraticCurveTo(24, 2, 16, 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawJellies() {
    for (const jelly of jellies) {
      const bob = Math.sin(time * jelly.speed + jelly.phase) * 4;
      const sway = Math.sin(time * 0.75 + jelly.phase) * jelly.drift;

      const x = jelly.x + sway;
      const y = jelly.y + bob;

      water.save();
      water.translate(x, y);

      water.fillStyle = "rgba(140, 198, 205, 0.12)";
      water.beginPath();
      water.arc(0, 0, jelly.size, Math.PI, 0, false);
      water.closePath();
      water.fill();

      for (let i = -2; i <= 2; i++) {
        water.beginPath();
        water.moveTo(i * (jelly.size * 0.24), 0);

        for (let step = 1; step <= 7; step++) {
          const ty = step * jelly.size * 0.58;
          const tx =
            i * (jelly.size * 0.24) +
            Math.sin(time * 1.4 + jelly.phase + step * 0.55 + i) * 2.6;

          water.lineTo(tx, ty);
        }

        water.strokeStyle = "rgba(170, 220, 225, 0.08)";
        water.lineWidth = 1;
        water.stroke();
      }

      water.restore();
    }
  }

  function drawBottomCritters() {
    for (const critter of bottomCritters) {
      if (critter.type === "crab") drawCrab(critter);
      else if (critter.type === "turtle") drawTurtle(critter);
      else drawStarfish(critter);
    }
  }

  function drawCrab(critter) {
    water.save();
    water.translate(critter.x, critter.y);
    water.fillStyle = `rgba(10, 25, 32, ${critter.alpha})`;

    water.beginPath();
    water.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
    water.fill();

    for (let i = -1; i <= 1; i += 2) {
      for (let l = 0; l < 3; l++) {
        const y = -1 + l * 4;
        water.beginPath();
        water.moveTo(i * 8, y);
        water.lineTo(i * (12 + l * 2), y + (l - 1) * 3);
        water.lineTo(i * 9, y + 1);
        water.closePath();
        water.fill();
      }

      water.beginPath();
      water.moveTo(i * 8, -6);
      water.lineTo(i * 16, -12 + Math.sin(time * 2 + critter.phase) * 2);
      water.lineTo(i * 11, -7);
      water.closePath();
      water.fill();
    }

    water.restore();
  }

  function drawTurtle(critter) {
    water.save();
    water.translate(critter.x, critter.y + Math.sin(time + critter.phase) * 1.5);
    water.fillStyle = `rgba(10, 25, 32, ${critter.alpha})`;

    water.beginPath();
    water.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    water.fill();

    water.beginPath();
    water.arc(13, 0, 4, 0, Math.PI * 2);
    water.fill();

    for (let i = -1; i <= 1; i += 2) {
      water.beginPath();
      water.ellipse(-4, i * 7, 5, 2.2, i * 0.5, 0, Math.PI * 2);
      water.fill();

      water.beginPath();
      water.ellipse(6, i * 7, 5, 2.2, -i * 0.5, 0, Math.PI * 2);
      water.fill();
    }

    water.restore();
  }

  function drawStarfish(critter) {
    water.save();
    water.translate(critter.x, critter.y);
    water.rotate(Math.sin(time * 0.4 + critter.phase) * 0.15);
    water.fillStyle = `rgba(10, 25, 32, ${critter.alpha * 0.9})`;

    water.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const outerX = Math.cos(a) * 10;
      const outerY = Math.sin(a) * 10;
      const innerA = a + Math.PI / 5;
      const innerX = Math.cos(innerA) * 4;
      const innerY = Math.sin(innerA) * 4;

      if (i === 0) water.moveTo(outerX, outerY);
      else water.lineTo(outerX, outerY);

      water.lineTo(innerX, innerY);
    }
    water.closePath();
    water.fill();

    water.restore();
  }

  function drawParticles(width, height) {
    for (const particle of particles) {
      particle.y -= particle.rise;
      particle.x += Math.sin(time * particle.drift + particle.phase) * 0.055;

      if (particle.y < -5) {
        particle.y = height + 5;
        particle.x = Math.random() * width;
      }

      const depth = particle.y / height;
      water.fillStyle = `rgba(193, 220, 221, ${particle.opacity * (1 - depth * 0.35)})`;
      water.beginPath();
      water.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      water.fill();
    }
  }

  function drawBubbles(width, height) {
    for (let i = 0; i < bubbles.length; i++) {
      const bubble = bubbles[i];

      bubble.y -= bubble.speed;
      bubble.x += Math.sin(time * bubble.wobble + bubble.phase) * 0.11;

      if (bubble.y < -bubble.radius * 3) {
        bubbles[i] = makeBubble();
        continue;
      }

      water.strokeStyle = `rgba(191, 229, 231, ${bubble.opacity})`;
      water.lineWidth = 0.7;
      water.beginPath();
      water.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      water.stroke();

      water.fillStyle = `rgba(235, 249, 248, ${bubble.opacity * 0.6})`;
      water.beginPath();
      water.arc(
        bubble.x - bubble.radius * 0.28,
        bubble.y - bubble.radius * 0.3,
        Math.max(0.3, bubble.radius * 0.16),
        0,
        Math.PI * 2
      );
      water.fill();
    }
  }

  function drawSeafloor(width, height) {
    const bottomY = height * 0.87;

    water.save();

    const floorGradient = water.createLinearGradient(0, bottomY - 20, 0, height);
    floorGradient.addColorStop(0, "rgba(44, 63, 66, 0.12)");
    floorGradient.addColorStop(0.5, "rgba(36, 52, 53, 0.22)");
    floorGradient.addColorStop(1, "rgba(24, 35, 36, 0.42)");

    water.fillStyle = floorGradient;
    water.beginPath();
    water.moveTo(0, bottomY);

    for (let x = 0; x <= width; x += 16) {
      const y = bottomY + Math.sin(x * 0.011 + time * 0.2) * 5 + Math.sin(x * 0.041 + 2.4) * 2;
      water.lineTo(x, y);
    }

    water.lineTo(width, height);
    water.lineTo(0, height);
    water.closePath();
    water.fill();

    drawRocks(width, height);
    drawSeaweed();
    water.restore();
  }

  function drawRocks(width, height) {
    const rocks = 8;

    for (let i = 0; i < rocks; i++) {
      const x = (i / rocks) * width + 30;
      const y = height * randomBetween(0.87, 0.93);
      const w = randomBetween(20, 52);
      const h = randomBetween(10, 24);

      water.fillStyle = "rgba(18, 29, 34, 0.48)";
      water.beginPath();
      water.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      water.fill();
    }
  }

  function drawSeaweed() {
    for (const blade of seaweed) {
      const sway = Math.sin(time * blade.swaySpeed + blade.swayPhase) * (blade.width * 1.1);

      water.save();
      water.translate(blade.x, blade.baseY);

      water.strokeStyle = "rgba(34, 74, 62, 0.34)";
      water.lineWidth = blade.width * 0.55;
      water.lineCap = "round";

      water.beginPath();
      water.moveTo(0, 0);

      for (let step = 1; step <= 6; step++) {
        const p = step / 6;
        const x = sway * p * Math.sin(p * Math.PI);
        const y = -blade.height * p;
        water.lineTo(x, y);
      }

      water.stroke();
      water.restore();
    }
  }

  function updateScroll() {
    scrollY = window.scrollY;

    const splashHeight = Math.max(splash.offsetHeight, 1);
    const splashProgress = clamp(scrollY / splashHeight, 0, 1);
    splash.style.setProperty("--splash-scroll", splashProgress);

    const stageRect = stage.getBoundingClientRect();
    const distance = clamp(-stageRect.top, 0, Math.max(0, stage.offsetHeight - viewportHeight));
    underwaterCanvas.style.transform = `translate3d(0, ${distance}px, 0)`;

    const hero = document.querySelector(".mad-matt-hero-image");
    if (hero) {
      const rect = hero.getBoundingClientRect();
      const delta = viewportHeight * 0.5 - (rect.top + rect.height * 0.5);
      const offset = clamp(delta * 0.035, -20, 20);
      hero.style.setProperty("--hero-parallax", `${offset}px`);
    }
  }

  function pointerMove(event) {
    pointerTargetX = ((event.clientX / viewportWidth) - 0.5) * 2;
    pointerTargetY = ((event.clientY / viewportHeight) - 0.5) * 2;
  }

  const revealElements = [
    ".mad-matt-intro",
    ".mad-matt-hero-image",
    ".mad-matt-services",
    ".mad-matt-videos",
    ".mad-matt-contact"
  ]
    .map(selector => document.querySelector(selector))
    .filter(Boolean);

  revealElements.forEach(element => {
    element.classList.add("mad-matt-reveal");
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add("is-visible"));
  }

  if ("IntersectionObserver" in window) {
    const splashObserver = new IntersectionObserver(
      entries => {
        splashVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    splashObserver.observe(splash);

    const stageObserver = new IntersectionObserver(
      entries => {
        stageVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    stageObserver.observe(stage);
  } else {
    splashVisible = true;
    stageVisible = true;
  }

  function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;

    const deltaMs = Math.min(timestamp - lastTimestamp, 50);
    const delta = deltaMs * 0.001;

    lastTimestamp = timestamp;
    time += delta;

    pointerX = lerp(pointerX, pointerTargetX, 0.035);
    pointerY = lerp(pointerY, pointerTargetY, 0.035);

    splash.style.setProperty("--pointer-x", pointerX);
    splash.style.setProperty("--pointer-y", pointerY);

    const day = getDayState();
    applyDayCSS(day);

    updateSurfaceBoats(delta, day);
    updateWrecks(delta);
    updateSplashes(delta);
    updateSeaLife(delta);

    if (splashVisible) drawSky(day);
    if (stageVisible) drawUnderwater(day);

    animationFrame = requestAnimationFrame(animate);
  }

  function handleResize() {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      resize();
      updateScroll();

      const day = getDayState();
      applyDayCSS(day);
      drawSky(day);
      drawUnderwater(day);
    }, 100);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      return;
    }

    if (!reducedMotion && !animationFrame) {
      lastTimestamp = 0;
      animationFrame = requestAnimationFrame(animate);
    }
  }

  resize();
  updateScroll();

  const initialDay = getDayState();
  applyDayCSS(initialDay);
  drawSky(initialDay);
  drawUnderwater(initialDay);

  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (reducedMotion) {
    revealElements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  animationFrame = requestAnimationFrame(animate);
})();
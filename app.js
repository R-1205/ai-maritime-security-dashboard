/* ═══════════════════════════════════════════════════════════════
   CRP-317 · Maritime Domain Awareness Console — runtime
   Live chart plot, AIS traffic simulation, model panels.
   No external dependencies.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── deterministic RNG ─────────────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(317);
  const rnd = (a, b) => a + rng() * (b - a);

  /* ── geography (schematic operational plot, WGS-84) ───────── */
  const LON_MIN = 78.6, LON_MAX = 80.6, LAT_C = 9.18;
  const NM_LAT = 60, NM_LON = 59.23;

  const LAND = [
    /* India — Tamil Nadu coast incl. Rameswaram */
    [[77.4, 10.7], [79.32, 10.6], [79.30, 10.24], [79.12, 9.96], [79.03, 9.74],
     [79.08, 9.55], [79.18, 9.40], [79.28, 9.30], [79.42, 9.245], [79.34, 9.18],
     [79.22, 9.12], [79.10, 9.02], [78.98, 8.85], [78.90, 8.62], [78.84, 8.38],
     [78.78, 7.9], [77.4, 7.9]],
    /* Sri Lanka — Jaffna peninsula & north-west coast */
    [[80.62, 7.9], [80.62, 9.95], [80.45, 9.93], [80.23, 9.88], [80.12, 9.86],
     [80.02, 9.80], [80.06, 9.72], [80.18, 9.62], [80.34, 9.52], [80.44, 9.40],
     [80.52, 9.26], [80.44, 9.14], [80.30, 9.06], [80.16, 8.98], [80.10, 8.82],
     [80.02, 8.62], [79.96, 8.40], [79.88, 8.15], [79.82, 7.9]],
    /* Mannar Island */
    [[79.63, 9.04], [79.66, 9.10], [79.80, 9.16], [79.94, 9.14], [80.02, 9.06],
     [79.96, 8.96], [79.82, 8.94], [79.70, 8.98]]
  ];
  const ISLETS = [
    { lon: 79.82, lat: 9.48, r: 3.2 }, { lon: 79.88, lat: 9.58, r: 2.4 },
    { lon: 79.78, lat: 9.36, r: 2.2 }, { lon: 79.95, lat: 9.66, r: 2.6 }
  ];
  const CONTOURS = [
    [[79.52, 9.42], [79.62, 9.30], [79.80, 9.22], [80.02, 9.14], [80.24, 9.02]],
    [[79.40, 9.12], [79.56, 9.00], [79.76, 8.90], [80.00, 8.78], [80.20, 8.62]],
    [[79.26, 8.94], [79.42, 8.80], [79.62, 8.66], [79.82, 8.50], [79.98, 8.32]]
  ];
  const ZONE = [[79.60, 9.48], [79.94, 9.44], [80.00, 9.68], [79.70, 9.76]];
  const CLUSTERS = [
    { lon: 79.52, lat: 9.66, rx: 42, ry: 30, id: "C1", n: 5, tag: "lane traffic" },
    { lon: 79.40, lat: 8.88, rx: 40, ry: 26, id: "C2", n: 4, tag: "fishing fleet" },
    { lon: 79.86, lat: 9.30, rx: 34, ry: 22, id: "C3", n: 3, tag: "loitering" },
    { lon: 80.06, lat: 9.52, rx: 30, ry: 22, id: "C4", n: 4, tag: "transit" }
  ];

  /* ── vessel register ───────────────────────────────────────── */
  const VESSELS = [
    { mmsi: "419203456", name: "MV Ocean Pioneer",   type: "Cargo",     flag: "IN", imo: "9482761", call: "9V2841", len: 182, dft: 9.4, lat: 9.585, lon: 79.640, sog: 13.2, cog: 74,  rf: 0.97, cnn: 0.93, anom: 0.14, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419118742", name: "MV Coral Star",      type: "Tanker",    flag: "IN", imo: "9356112", call: "VWMQ7",  len: 228, dft: 12.1, lat: 9.512, lon: 79.760, sog: 11.6, cog: 96,  rf: 0.96, cnn: 0.91, anom: 0.78, status: "anomaly", nav: "Under way using engine", atype: "Route deviation 14.2 nm from filed voyage plan" },
    { mmsi: "419054823", name: "FV Meenakshi",       type: "Fishing",   flag: "IN", imo: "—",       call: "8VKT3",  len: 21,  dft: 2.1, lat: 8.812, lon: 79.335, sog: 3.4,  cog: 168, rf: 0.94, cnn: 0.88, anom: 0.71, status: "anomaly", nav: "Restricted manoeuvrability", atype: "AIS signal gap — 47 min off-air" },
    { mmsi: "419276510", name: "MV Kaveri Express",  type: "Container", flag: "IN", imo: "9614428", call: "9V7712", len: 260, dft: 12.8, lat: 9.702, lon: 79.870, sog: 15.8, cog: 62,  rf: 0.98, cnn: 0.95, anom: 0.09, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419334872", name: "FV Bharani",         type: "Fishing",   flag: "IN", imo: "—",       call: "8VQT9",  len: 18,  dft: 1.8, lat: 9.288, lon: 79.852, sog: 1.2,  cog: 214, rf: 0.92, cnn: 0.86, anom: 0.66, status: "anomaly", nav: "Engaged in fishing", atype: "Loitering pattern — DBSCAN cluster C3" },
    { mmsi: "419442187", name: "MV Deep Carrier",    type: "Tanker",    flag: "IN", imo: "9298337", call: "VTLN4",  len: 243, dft: 11.6, lat: 8.704, lon: 79.610, sog: 6.9,  cog: 288, rf: 0.95, cnn: 0.90, anom: 0.61, status: "watch",   nav: "Under way using engine", atype: "Speed anomaly — 2.1 kn vs sea state" },
    { mmsi: "419221093", name: "ICGS Coastal Vigil", type: "Patrol",    flag: "IN", imo: "—",       call: "AWRA",   len: 98,  dft: 4.2, lat: 9.402, lon: 79.452, sog: 18.4, cog: 108, rf: 0.99, cnn: 0.96, anom: 0.05, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419187654", name: "MV Ramanathan",      type: "Cargo",     flag: "IN", imo: "9164207", call: "9V3382", len: 168, dft: 8.8, lat: 9.770, lon: 79.556, sog: 12.1, cog: 82,  rf: 0.96, cnn: 0.92, anom: 0.12, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419305512", name: "FV Sagayamary",      type: "Fishing",   flag: "IN", imo: "—",       call: "8VJH2",  len: 16,  dft: 1.6, lat: 8.932, lon: 79.462, sog: 4.2,  cog: 142, rf: 0.93, cnn: 0.87, anom: 0.22, status: "ok",      nav: "Engaged in fishing", atype: "" },
    { mmsi: "419098233", name: "MV Anjali Grace",    type: "Passenger", flag: "IN", imo: "9327734", call: "VWMS8",  len: 112, dft: 5.4, lat: 9.470, lon: 79.372, sog: 14.6, cog: 96,  rf: 0.97, cnn: 0.94, anom: 0.11, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419244871", name: "MV Tharangambadi",   type: "Cargo",     flag: "IN", imo: "9077415", call: "9V8120", len: 196, dft: 10.2, lat: 8.622, lon: 79.842, sog: 10.8, cog: 302, rf: 0.95, cnn: 0.91, anom: 0.19, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419377246", name: "FV Kalaivani",       type: "Fishing",   flag: "IN", imo: "—",       call: "8VMN5",  len: 14,  dft: 1.5, lat: 9.108, lon: 79.726, sog: 2.8,  cog: 48,  rf: 0.91, cnn: 0.85, anom: 0.34, status: "watch",   nav: "Engaged in fishing", atype: "Course irregularity — 6 shifts / 20 min" },
    { mmsi: "419411229", name: "MV Serendib Pearl",  type: "Cargo",     flag: "LK", imo: "9521184", call: "4RNP2",  len: 174, dft: 9.1, lat: 9.560, lon: 80.048, sog: 9.6,  cog: 256, rf: 0.96, cnn: 0.92, anom: 0.17, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419063214", name: "MV Mannar Trader",   type: "Cargo",     flag: "LK", imo: "9138202", call: "4RDG6",  len: 122, dft: 6.8, lat: 9.022, lon: 79.948, sog: 8.4,  cog: 238, rf: 0.94, cnn: 0.90, anom: 0.26, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419349528", name: "Tug Ocean Rescue",   type: "Tug",       flag: "IN", imo: "—",       call: "8VDL4",  len: 32,  dft: 3.6, lat: 9.336, lon: 79.562, sog: 6.2,  cog: 12,  rf: 0.98, cnn: 0.93, anom: 0.08, status: "ok",      nav: "Restricted manoeuvrability", atype: "" },
    { mmsi: "419255740", name: "RV Sagar Sampada",   type: "Research",  flag: "IN", imo: "8814108", call: "9VRX5",  len: 104, dft: 5.9, lat: 8.862, lon: 80.042, sog: 7.4,  cog: 210, rf: 0.97, cnn: 0.92, anom: 0.13, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419298614", name: "FV Divine Mercy",    type: "Fishing",   flag: "IN", imo: "—",       call: "8VPN6",  len: 15,  dft: 1.5, lat: 8.668, lon: 79.986, sog: 3.1,  cog: 118, rf: 0.92, cnn: 0.86, anom: 0.28, status: "ok",      nav: "Engaged in fishing", atype: "" },
    { mmsi: "419162347", name: "MV Pearl of Mannar", type: "Cargo",     flag: "LK", imo: "9244083", call: "4RJB8",  len: 138, dft: 7.2, lat: 8.914, lon: 80.168, sog: 9.2,  cog: 242, rf: 0.95, cnn: 0.91, anom: 0.16, status: "ok",      nav: "Under way using engine", atype: "" },
    { mmsi: "419387052", name: "FV Amutha Suraj",    type: "Fishing",   flag: "IN", imo: "—",       call: "8VBC1",  len: 17,  dft: 1.7, lat: 9.172, lon: 80.224, sog: 4.6,  cog: 306, rf: 0.93, cnn: 0.88, anom: 0.31, status: "watch",   nav: "Engaged in fishing", atype: "Proximity alert — 0.9 nm to restricted zone" },
    { mmsi: "419128476", name: "MV Indian Mariner",  type: "Tanker",    flag: "IN", imo: "9301174", call: "9VTR2",  len: 214, dft: 11.2, lat: 8.512, lon: 79.438, sog: 10.4, cog: 88,  rf: 0.96, cnn: 0.92, anom: 0.11, status: "ok",      nav: "Under way using engine", atype: "" }
  ];

  VESSELS.forEach((v, i) => {
    v.seed = i * 7.3 + 1;
    v.trail = [];
    v.baseCog = v.cog;
    v.wob = rnd(0, Math.PI * 2);
  });

  const ALERTS = [
    { sev: "crit", time: "17:42:06", mmsi: "419118742", vessel: "MV Coral Star",    desc: "Entered protected waters off Devipuram shoal — geofence breach, 2.4 nm inside limit.", score: 0.78, ack: false },
    { sev: "crit", time: "17:21:44", mmsi: "419054823", vessel: "FV Meenakshi",     desc: "AIS transponder silent 47 min while inside monitored corridor — possible dark activity.", score: 0.71, ack: false },
    { sev: "high", time: "17:04:19", mmsi: "419334872", vessel: "FV Bharani",       desc: "Station-keeping outside declared fishing grounds (DBSCAN cluster C3, 48 h persistent).", score: 0.66, ack: false },
    { sev: "med",  time: "16:58:02", mmsi: "419442187", vessel: "MV Deep Carrier",  desc: "Speed 2.1 kn below sea-state model — engine or loading anomaly suspected.", score: 0.61, ack: false },
    { sev: "med",  time: "16:31:37", mmsi: "419377246", vessel: "FV Kalaivani",     desc: "Course irregularity: 6 heading shifts in 20 min — net shooting pattern or distress.", score: 0.34, ack: true }
  ];

  /* ── helpers ───────────────────────────────────────────────── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const deg2rad = (d) => (d * Math.PI) / 180;
  const pad = (n) => String(n).padStart(2, "0");

  function fmtLat(lat) {
    const d = Math.floor(lat), m = ((lat - d) * 60).toFixed(1);
    return pad(d) + "°" + pad(m) + "′N";
  }
  function fmtLon(lon) {
    const d = Math.floor(lon), m = ((lon - d) * 60).toFixed(1);
    return pad(d) + "°" + pad(m) + "′E";
  }
  function fmtPos(v) { return fmtLat(v.lat) + " " + fmtLon(v.lon); }

  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const onLand = (lon, lat) => LAND.some((p) => pointInPoly(lon, lat, p));

  /* ── soundings (depth in metres) ───────────────────────────── */
  const SOUNDINGS = [];
  (function () {
    let guard = 0;
    while (SOUNDINGS.length < 68 && guard++ < 1200) {
      const lon = rng() < 0.35 ? rnd(79.75, 80.5) : rnd(78.75, 80.5);
      const lat = rng() < 0.35 ? rnd(8.4, 9.05) : rnd(8.4, 9.9);
      if (onLand(lon, lat)) continue;
      const dBridge = Math.hypot((lon - 79.56) * 1.0, (lat - 9.18) * 1.3);
      const depth = Math.max(2, Math.round(4 + dBridge * 26 + rnd(-2, 6)));
      SOUNDINGS.push({ lon, lat, depth });
    }
  })();

  /* ── chart canvas ──────────────────────────────────────────── */
  const canvas = $("#chartCanvas");
  const ctx = canvas.getContext("2d");
  const tip = $("#chartTip");
  let W = 0, H = 0, DPR = 1, proj = null;

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * DPR));
    canvas.height = Math.max(1, Math.round(r.height * DPR));
    W = r.width; H = r.height;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildProj();
  }

  function buildProj() {
    const spanXNm = (LON_MAX - LON_MIN) * NM_LON;
    const s = W / spanXNm;
    const latSpanNm = H / s;
    const latTop = LAT_C + latSpanNm / NM_LAT / 2;
    proj = {
      s,
      x: (lon) => (lon - LON_MIN) * NM_LON * s,
      y: (lat) => (latTop - lat) * NM_LAT * s,
      latTop,
      latSpan: latSpanNm / NM_LAT
    };
  }

  const layers = { trails: true, forecast: true, clusters: true, zone: true, soundings: true };
  let selected = "419203456";
  let hovered = null;
  const SIM = 240; // simulation rate: 240× real time

  function drawGraticule() {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.textBaseline = "top";

    const latStart = Math.floor((proj.latTop - proj.latSpan) * 4) / 4;
    for (let lat = latStart; lat <= proj.latTop; lat += 0.25) {
      const y = Math.round(proj.y(lat)) + 0.5;
      if (y < -20 || y > H + 20) continue;
      const major = Math.abs(lat % 0.5) < 1e-6;
      ctx.strokeStyle = major ? "rgba(28,43,68,0.16)" : "rgba(28,43,68,0.08)";
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillStyle = "rgba(28,43,68,0.42)";
      ctx.fillText(fmtLat(lat), 6, y + 3);
    }
    for (let lon = Math.ceil(LON_MIN * 4) / 4; lon <= LON_MAX; lon += 0.25) {
      const x = Math.round(proj.x(lon)) + 0.5;
      if (x < -20 || x > W + 20) continue;
      const major = Math.abs(lon % 0.5) < 1e-6;
      ctx.strokeStyle = major ? "rgba(28,43,68,0.16)" : "rgba(28,43,68,0.08)";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      if (major) {
        ctx.fillStyle = "rgba(28,43,68,0.42)";
        ctx.fillText(fmtLon(lon), x + 4, 6);
      }
    }
    ctx.restore();
  }

  function drawLand() {
    ctx.save();
    LAND.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const x = proj.x(lon), y = proj.y(lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "#E0CFA6";
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "rgba(28,43,68,0.75)";
      ctx.stroke();
      /* coastal hatching */
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(28,43,68,0.14)";
      ctx.lineWidth = 1;
      for (let i = -H; i < W + H; i += 7) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
      }
      ctx.restore();
    });
    ISLETS.forEach((it) => {
      ctx.beginPath();
      ctx.arc(proj.x(it.lon), proj.y(it.lat), it.r, 0, Math.PI * 2);
      ctx.fillStyle = "#E0CFA6";
      ctx.fill();
      ctx.strokeStyle = "rgba(28,43,68,0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    /* Adam's Bridge drying shoal */
    ctx.strokeStyle = "rgba(28,43,68,0.4)";
    ctx.setLineDash([2, 3]);
    for (let t = 0; t <= 1.001; t += 0.06) {
      const lon = 79.44 + t * 0.30, lat = 9.235 - t * 0.115 + Math.sin(t * 6) * 0.012;
      ctx.beginPath();
      ctx.arc(proj.x(lon), proj.y(lat), 3.4 - t * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawContour(pts, label, labelAt) {
    ctx.save();
    ctx.strokeStyle = "rgba(28,43,68,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => {
      const x = proj.x(lon), y = proj.y(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const lp = pts[labelAt];
    ctx.fillStyle = "rgba(28,43,68,0.4)";
    ctx.font = "italic 9px 'Fraunces', Georgia, serif";
    ctx.fillText(label, proj.x(lp[0]) + 3, proj.y(lp[1]) - 3);
    ctx.restore();
  }

  function drawSoundings() {
    ctx.save();
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(28,43,68,0.36)";
    ctx.textAlign = "center";
    SOUNDINGS.forEach((s) => {
      const x = proj.x(s.lon), y = proj.y(s.lat);
      if (x < 8 || x > W - 8 || y < 12 || y > H - 8) return;
      ctx.fillText(String(s.depth), x, y);
    });
    ctx.restore();
  }

  function drawZone() {
    ctx.save();
    ctx.beginPath();
    ZONE.forEach(([lon, lat], i) => {
      const x = proj.x(lon), y = proj.y(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(190,42,99,0.055)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(190,42,99,0.18)";
    ctx.lineWidth = 1;
    for (let i = -H; i < W + H; i += 9) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#BE2A63";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const lx = proj.x(79.62), ly = proj.y(9.505);
    ctx.font = "600 9px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#8E1E48";
    ctx.textAlign = "left";
    const zlw = ctx.measureText("RESTRICTED — NAVAL EXERCISE AREA").width;
    ctx.fillStyle = "rgba(247,242,230,0.88)";
    ctx.fillRect(lx - 4, ly - 11, zlw + 8, 28);
    ctx.fillStyle = "#8E1E48";
    ctx.fillText("RESTRICTED — NAVAL EXERCISE AREA", lx, ly);
    ctx.font = "8px 'IBM Plex Mono', monospace";
    ctx.fillText("ENTRY PROHIBITED · GEOFENCE G-02", lx, ly + 12);
    ctx.restore();
  }

  function drawClusters() {
    ctx.save();
    CLUSTERS.forEach((c) => {
      const x = proj.x(c.lon), y = proj.y(c.lat);
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(28,43,68,0.38)";
      ctx.lineWidth = 1;
      ctx.ellipse(x, y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "600 8.5px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(28,43,68,0.5)";
      ctx.textAlign = "center";
      ctx.fillText(c.id + " · " + c.n + " VSL · " + c.tag.toUpperCase(), x, y - c.ry - 5);
    });
    ctx.restore();
  }

  function drawTrail(v) {
    if (v.trail.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 1; i < v.trail.length; i++) {
      const a = v.trail[i - 1], b = v.trail[i];
      ctx.globalAlpha = 0.06 + (i / v.trail.length) * 0.3;
      ctx.strokeStyle = v.status === "anomaly" ? "#BE2A63" : "#1C2B44";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(proj.x(a.lon), proj.y(a.lat));
      ctx.lineTo(proj.x(b.lon), proj.y(b.lat));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawForecast(v) {
    const rad = deg2rad(v.cog);
    const distNm = (v.sog * 60) / 60; // 60 minutes ahead
    const pts = [];
    for (let t = 0; t <= 1.001; t += 0.125) {
      const d = distNm * t;
      const turn = Math.sin(v.wob) * 0.10 * t * t;
      const cr = rad + turn;
      const lat = v.lat + (d * Math.cos(cr)) / NM_LAT;
      const lon = v.lon + (d * Math.sin(cr)) / (NM_LON * Math.cos(deg2rad(v.lat)));
      pts.push([lon, lat]);
    }
    ctx.save();
    /* confidence envelope */
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => {
      const x = proj.x(lon), y = proj.y(lat);
      const spread = 3 + i * 2.6;
      const px = Math.cos(rad) * spread, py = Math.sin(rad) * spread;
      i === 0 ? ctx.moveTo(x + px, y - py) : ctx.lineTo(x + px, y - py);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const x = proj.x(pts[i][0]), y = proj.y(pts[i][1]);
      const spread = 3 + i * 2.6;
      const px = Math.cos(rad) * spread, py = Math.sin(rad) * spread;
      ctx.lineTo(x - px, y + py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(190,42,99,0.10)";
    ctx.fill();

    /* dashed forecast */
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => {
      const x = proj.x(lon), y = proj.y(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#8E1E48";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    /* nodes at t+15/30/45/60 */
    [2, 4, 6, 8].forEach((i) => {
      if (!pts[i]) return;
      const x = proj.x(pts[i][0]), y = proj.y(pts[i][1]);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "#F7F2E6";
      ctx.fill();
      ctx.strokeStyle = "#8E1E48";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawVesselGlyph(v, x, y) {
    const rad = deg2rad(v.cog);
    const scale = v.type === "Fishing" ? 0.72 : v.type === "Tanker" || v.type === "Container" ? 1.18
      : v.type === "Tug" ? 0.82 : 1;
    const col = v.status === "anomaly" ? "#BE2A63" : v.status === "watch" ? "#A66A11"
      : v.type === "Patrol" ? "#2E6B4F" : "#1C2B44";
    const size = (v.mmsi === selected ? 7.4 : 6.2) * scale;

    if (v.status === "anomaly") {
      const pulse = 10 + Math.sin(Date.now() / 380 + v.seed) * 3;
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(190,42,99,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad);
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.7);
    ctx.lineTo(size * 0.78, size * 0.72);
    ctx.lineTo(size * 0.5, size * 1.12);
    ctx.lineTo(-size * 0.5, size * 1.12);
    ctx.lineTo(-size * 0.78, size * 0.72);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();

    if (v.mmsi === selected) {
      ctx.save();
      ctx.strokeStyle = "#BE2A63";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      /* crosshair */
      ctx.beginPath();
      ctx.moveTo(x - 28, y); ctx.lineTo(x - 18, y);
      ctx.moveTo(x + 18, y); ctx.lineTo(x + 28, y);
      ctx.moveTo(x, y - 28); ctx.lineTo(x, y - 18);
      ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 28);
      ctx.stroke();
      /* label cartouche */
      const label = v.name + "  " + v.sog.toFixed(1) + " kn";
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      const tw = ctx.measureText(label).width;
      const bx = x + 34, by = y - 44;
      ctx.fillStyle = "rgba(247,242,230,0.92)";
      ctx.fillRect(bx, by, tw + 12, 34);
      ctx.strokeStyle = "rgba(28,43,68,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, tw + 11, 33);
      ctx.fillStyle = "#1C2B44";
      ctx.textAlign = "left";
      ctx.fillText(label, bx + 6, by + 14);
      ctx.font = "8px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#4B5A72";
      ctx.fillText(fmtPos(v), bx + 6, by + 27);
      ctx.restore();
    }
  }

  function drawScaleAndNorth() {
    ctx.save();
    /* north arrow */
    const nx = W - 34, ny = 42;
    ctx.strokeStyle = "#1C2B44";
    ctx.fillStyle = "#1C2B44";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(nx, ny + 18); ctx.lineTo(nx, ny - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(nx, ny - 20); ctx.lineTo(nx - 4.5, ny - 10); ctx.lineTo(nx + 4.5, ny - 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = "600 11px 'Fraunces', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("N", nx, ny + 32);

    /* scale bar */
    const segNm = 10, segPx = segNm * proj.s;
    const sx = 18, sy = H - 26;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1C2B44" : "#F7F2E6";
      ctx.fillRect(sx + i * segPx, sy, segPx, 5);
    }
    ctx.strokeStyle = "#1C2B44";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, segPx * 3 - 1, 4);
    ctx.fillStyle = "rgba(28,43,68,0.7)";
    ctx.font = "8px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ["0", "10", "20", "30 nm"].forEach((lb, i) => {
      ctx.fillText(lb, sx + i * segPx, sy - 5);
    });

    /* chart cartouche */
    ctx.textAlign = "right";
    ctx.font = "italic 10px 'Fraunces', Georgia, serif";
    ctx.fillStyle = "rgba(28,43,68,0.55)";
    ctx.fillText("Operational plot — schematic, not for navigation", W - 16, H - 16);
    ctx.fillText("Simulated AIS traffic · sector PALK-07", W - 16, H - 30);
    ctx.restore();
  }

  function drawChart() {
    if (!proj) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#E4EAE5";
    ctx.fillRect(0, 0, W, H);

    drawGraticule();
    drawLand();
    CONTOURS.forEach((c, i) => drawContour(c, [20, 35, 50][i] + " m", 3));
    if (layers.soundings) drawSoundings();
    if (layers.zone) drawZone();
    if (layers.clusters) drawClusters();
    if (layers.trails) VESSELS.forEach(drawTrail);
    if (layers.forecast) {
      const sel = VESSELS.find((v) => v.mmsi === selected);
      if (sel) drawForecast(sel);
    }
    VESSELS.forEach((v) => drawVesselGlyph(v, proj.x(v.lon), proj.y(v.lat)));
    drawScaleAndNorth();
  }

  /* ── simulation step ───────────────────────────────────────── */
  let lastT = performance.now();
  let trailClock = 0;

  function step(now) {
    const dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    trailClock += dt;

    VESSELS.forEach((v) => {
      v.wob += dt * 0.35;
      v.cog = v.baseCog + Math.sin(v.wob) * 4.5;
      const hrs = (dt * SIM) / 3600;
      const distNm = v.sog * hrs;
      const cr = deg2rad(v.cog);
      v.lat += (distNm * Math.cos(cr)) / NM_LAT;
      v.lon += (distNm * Math.sin(cr)) / (NM_LON * Math.cos(deg2rad(v.lat)));

      /* keep contacts inside the monitored sector */
      if (v.lat < 8.52) { v.lat = 8.52; v.baseCog = 360 - v.baseCog; }
      if (v.lat > 9.86) { v.lat = 9.86; v.baseCog = 360 - v.baseCog; }
      if (v.lon < 78.92) { v.lon = 78.92; v.baseCog = 180 - v.baseCog; }
      if (v.lon > 80.32) { v.lon = 80.32; v.baseCog = 180 - v.baseCog; }
      if (v.baseCog < 0) v.baseCog += 360;
      if (v.baseCog > 360) v.baseCog -= 360;
      if (onLand(v.lon, v.lat)) {
        v.baseCog = (v.baseCog + 180) % 360;
        v.lat += (distNm * Math.cos(deg2rad(v.baseCog))) / NM_LAT * 2;
        v.lon += (distNm * Math.sin(deg2rad(v.baseCog))) / (NM_LON * Math.cos(deg2rad(v.lat))) * 2;
      }
    });

    if (trailClock > 0.45) {
      trailClock = 0;
      VESSELS.forEach((v) => {
        v.trail.push({ lon: v.lon, lat: v.lat });
        if (v.trail.length > 70) v.trail.shift();
      });
    }

    drawChart();
    requestAnimationFrame(step);
  }

  /* ── alert queue ───────────────────────────────────────────── */
  function renderAlerts() {
    const ul = $("#alertList");
    ul.innerHTML = ALERTS.map((a, i) => `
      <li class="alert ${a.ack ? "alert--ack" : ""}" data-i="${i}">
        <div class="alert__top">
          <span class="sev sev--${a.sev}">${a.sev === "crit" ? "CRITICAL" : a.sev === "high" ? "HIGH" : "MEDIUM"}</span>
          <span class="alert__time mono">${a.time}z</span>
        </div>
        <div class="alert__vessel">${a.vessel} <span class="mono" style="color:var(--ink-3);font-size:10px">${a.mmsi}</span></div>
        <div class="alert__desc">${a.desc}</div>
        <div class="alert__foot">
          <span class="alert__score mono">IF score ${a.score.toFixed(2)}</span>
          <button class="alert__ack" data-i="${i}">${a.ack ? "ACKNOWLEDGED" : "ACK"}</button>
        </div>
      </li>`).join("");
    $("#alertCount").textContent = String(ALERTS.filter((a) => !a.ack).length);
  }

  $("#alertList").addEventListener("click", (e) => {
    const btn = e.target.closest(".alert__ack");
    if (!btn) return;
    const i = +btn.dataset.i;
    ALERTS[i].ack = true;
    renderAlerts();
  });

  /* ── vessel table ──────────────────────────────────────────── */
  function sortedVessels() {
    return VESSELS.slice().sort((a, b) => b.anom - a.anom);
  }

  function renderTable() {
    const rows = sortedVessels().map((v) => {
      const tagCls = v.status === "anomaly" ? "tag--anom" : v.status === "watch" ? "tag--watch" : "tag--ok";
      const tagTxt = v.status === "anomaly" ? "ANOMALY" : v.status === "watch" ? "WATCH" : "NORMAL";
      return `
      <tr data-mmsi="${v.mmsi}" class="${v.mmsi === selected ? "sel" : ""}">
        <td class="mmsi">${v.mmsi}</td>
        <td class="vname">${v.name}</td>
        <td><span class="tag">${v.type}</span></td>
        <td class="mono" style="font-size:10.5px">${v.flag}</td>
        <td class="mono" style="font-size:10.5px">${fmtPos(v)}</td>
        <td class="num">${v.sog.toFixed(1)}</td>
        <td class="num">${pad(Math.round(v.cog))}°</td>
        <td class="mono" style="font-size:10.5px">RF ${v.rf.toFixed(2)} / CNN ${v.cnn.toFixed(2)}</td>
        <td>
          <span class="ascore">
            <span class="ascore__track"><span class="ascore__fill ${v.anom >= 0.65 ? "hot" : ""}" style="width:${Math.round(v.anom * 100)}%"></span></span>
            <span class="ascore__v">${v.anom.toFixed(2)}</span>
          </span>
        </td>
        <td><span class="tag ${tagCls}">${tagTxt}</span></td>
      </tr>`;
    }).join("");
    $("#vesselRows").innerHTML = rows;
    $("#tblCount").textContent = String(VESSELS.length);
  }

  $("#vesselRows").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-mmsi]");
    if (tr) select(tr.dataset.mmsi);
  });

  /* ── dossier ───────────────────────────────────────────────── */
  function select(mmsi) {
    selected = mmsi;
    const v = VESSELS.find((x) => x.mmsi === mmsi);
    if (!v) return;
    $("#dName").textContent = v.name;
    $("#dType").textContent = v.type;
    $("#dFlag").textContent = v.flag;
    $("#dMmsi").textContent = "MMSI " + v.mmsi;
    $("#dImo").textContent = v.imo + " / " + v.call;
    $("#dDim").textContent = v.len + " m × " + v.dft.toFixed(1) + " m";
    $("#dPos").textContent = fmtPos(v);
    $("#dNav").textContent = v.sog.toFixed(1) + " kn / " + pad(Math.round(v.cog)) + "°";
    $("#dStatus").textContent = v.nav;
    $("#dRf").style.width = Math.round(v.rf * 100) + "%";
    $("#dRfV").textContent = v.rf.toFixed(2);
    $("#dCnn").style.width = Math.round(v.cnn * 100) + "%";
    $("#dCnnV").textContent = v.cnn.toFixed(2);
    const gauge = $("#dAnom");
    gauge.style.width = Math.round(v.anom * 100) + "%";
    gauge.style.background = v.anom >= 0.65 ? "var(--magenta)" : v.anom >= 0.4 ? "var(--amber)" : "var(--green)";

    /* last AIS fixes */
    const now = new Date();
    $("#dFixes").innerHTML = Array.from({ length: 5 }, (_, i) => {
      const t = new Date(now.getTime() - i * 3 * 60000);
      const miss = v.status === "anomaly" && v.atype.indexOf("AIS") === 0 && i < 3;
      return `<li class="fix">
        <span>${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}z</span>
        <span>${miss ? "—" : fmtPos(v)}</span>
        <span class="${miss ? "miss" : "ok"}">${miss ? "NO FIX" : "OK"}</span>
      </li>`;
    }).join("");

    renderTable();
    drawForecastSvg(v);
  }

  /* ── live tickers ──────────────────────────────────────────── */
  function tickClock() {
    const n = new Date();
    $("#clockUtc").textContent = pad(n.getUTCHours()) + ":" + pad(n.getUTCMinutes()) + ":" + pad(n.getUTCSeconds());
    const ist = new Date(n.getTime() + 330 * 60000);
    $("#clockIst").textContent = pad(ist.getUTCHours()) + ":" + pad(ist.getUTCMinutes()) + ":" + pad(ist.getUTCSeconds());
  }

  function tickLive() {
    VESSELS.forEach((v) => {
      v.sog = Math.max(0.4, v.sog + (Math.random() - 0.5) * 0.16);
    });
    const rate = 1180 + Math.round(Math.random() * 140);
    $("#rateTop").textContent = rate.toLocaleString("en-US");
    $("#latTop").textContent = String(190 + Math.round(Math.random() * 60));
    const sel = VESSELS.find((x) => x.mmsi === selected);
    if (sel) {
      $("#dPos").textContent = fmtPos(sel);
      $("#dNav").textContent = sel.sog.toFixed(1) + " kn / " + pad(Math.round(sel.cog)) + "°";
    }
    renderTable();
  }

  /* ── map interaction ───────────────────────────────────────── */
  function nearestVessel(mx, my) {
    let best = null, bestD = 16;
    VESSELS.forEach((v) => {
      const dx = proj.x(v.lon) - mx, dy = proj.y(v.lat) - my;
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = v; }
    });
    return best;
  }

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const v = nearestVessel(mx, my);
    hovered = v;
    if (v) {
      canvas.style.cursor = "pointer";
      tip.innerHTML = `<b>${v.name}</b><br>${v.type} · ${v.flag} · ${v.mmsi}<br>${fmtPos(v)} · ${v.sog.toFixed(1)} kn / ${pad(Math.round(v.cog))}°`;
      tip.style.left = mx + "px";
      tip.style.top = my + "px";
      tip.classList.add("show");
    } else {
      canvas.style.cursor = "crosshair";
      tip.classList.remove("show");
    }
  });
  canvas.addEventListener("mouseleave", () => tip.classList.remove("show"));
  canvas.addEventListener("click", () => { if (hovered) select(hovered.mmsi); });

  $$("#layers input").forEach((cb) => {
    cb.addEventListener("change", () => { layers[cb.dataset.layer] = cb.checked; });
  });

  /* ── SVG: AIS ingest area chart ────────────────────────────── */
  function drawIngestSvg() {
    const svg = $("#ingestSvg");
    const w = 300, h = 132, padL = 30, padB = 18, padT = 10, padR = 6;
    const data = Array.from({ length: 24 }, (_, i) =>
      Math.round(1020 + 320 * Math.sin((i / 24) * Math.PI * 2 - 1.2) + (rng() - 0.5) * 170));
    const max = 1650, min = 750;
    const x = (i) => padL + (i / 23) * (w - padL - padR);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);

    let g = "";
    [800, 1100, 1400].forEach((v) => {
      g += `<line x1="${padL}" y1="${y(v)}" x2="${w - padR}" y2="${y(v)}" stroke="rgba(28,43,68,0.14)" stroke-width="1" stroke-dasharray="2 3"/>
            <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-family="IBM Plex Mono" font-size="7.5" fill="#8B94A4">${v}</text>`;
    });
    const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const area = line + `L${x(23)},${h - padB}L${x(0)},${h - padB}Z`;
    const hours = ["00", "06", "12", "18"];
    hours.forEach((lb, i) => {
      g += `<text x="${x(i * 6)}" y="${h - 5}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#8B94A4">${lb}:00</text>`;
    });
    g += `<path d="${area}" fill="rgba(28,43,68,0.10)"/>
          <path d="${line}" fill="none" stroke="#1C2B44" stroke-width="1.5"/>
          <circle cx="${x(23)}" cy="${y(data[23])}" r="2.8" fill="#BE2A63"/>
          <text x="${x(23) - 6}" y="${y(data[23]) - 7}" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#8E1E48">now ${data[23]}</text>`;
    svg.innerHTML = g;
  }

  /* ── SVG: LSTM track forecast ──────────────────────────────── */
  function drawForecastSvg(v) {
    const svg = $("#forecastSvg");
    const w = 300, h = 178, padL = 30, padB = 24, padT = 12, padR = 10;
    const seedR = mulberry32(parseInt(v.mmsi.slice(-5), 10) || 7);
    const bias = (v.cog - 180) / 360;

    const hist = [], fc = [];
    let wob = 0;
    for (let i = 0; i <= 7; i++) {
      wob += (seedR() - 0.5) * 0.6;
      hist.push(Math.sin(i * 0.7 + v.seed) * 1.1 + wob * 0.4 + bias * i * 0.22);
    }
    let drift = hist[7];
    for (let i = 1; i <= 4; i++) {
      drift += bias * 0.5 + (seedR() - 0.5) * 0.35;
      fc.push(drift);
    }
    const all = hist.concat(fc);
    const lo = Math.min.apply(null, all) - 1.2, hi = Math.max.apply(null, all) + 1.2;
    const x = (i) => padL + (i / 11) * (w - padL - padR);
    const y = (val) => padT + (1 - (val - lo) / (hi - lo)) * (h - padT - padB);

    let g = "";
    /* grid + axes */
    for (let i = 0; i <= 2; i++) {
      const val = lo + ((hi - lo) * i) / 2;
      g += `<line x1="${padL}" y1="${y(val)}" x2="${w - padR}" y2="${y(val)}" stroke="rgba(28,43,68,0.12)" stroke-width="1"/>
            <text x="${padL - 5}" y="${y(val) + 3}" text-anchor="end" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">${val.toFixed(1)}</text>`;
    }
    const ticks = [["t−60", 0], ["t−30", 3], ["now", 7], ["+15", 8], ["+30", 9], ["+45", 10], ["+60", 11]];
    ticks.forEach(([lb, i]) => {
      g += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" font-family="IBM Plex Mono" font-size="6.8" fill="${lb === "now" ? "#BE2A63" : "#8B94A4"}">${lb}</text>`;
    });
    g += `<line x1="${x(7)}" y1="${padT}" x2="${x(7)}" y2="${h - padB}" stroke="#BE2A63" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>`;

    /* confidence envelope */
    const upper = [], lower = [];
    fc.forEach((val, i) => {
      const spread = 0.35 + i * 0.42;
      upper.push([x(8 + i), y(val + spread)]);
      lower.push([x(8 + i), y(val - spread)]);
    });
    const envPts = [[x(7), y(hist[7])]].concat(upper, lower.reverse())
      .map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    g += `<polygon points="${envPts}" fill="rgba(190,42,99,0.12)"/>`;

    /* observed */
    const histPath = hist.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join("");
    g += `<path d="${histPath}" fill="none" stroke="#1C2B44" stroke-width="1.8"/>`;
    /* forecast */
    const fcPath = `M${x(7).toFixed(1)},${y(hist[7]).toFixed(1)}` +
      fc.map((val, i) => `L${x(8 + i).toFixed(1)},${y(val).toFixed(1)}`).join("");
    g += `<path d="${fcPath}" fill="none" stroke="#8E1E48" stroke-width="1.8" stroke-dasharray="5 3"/>`;
    /* nodes */
    fc.forEach((val, i) => {
      g += `<circle cx="${x(8 + i)}" cy="${y(val)}" r="2.7" fill="#F7F2E6" stroke="#8E1E48" stroke-width="1.2"/>`;
    });
    g += `<circle cx="${x(7)}" cy="${y(hist[7])}" r="3.2" fill="#1C2B44"/>`;
    /* axis title */
    g += `<text x="${padL - 22}" y="${(h - padB + padT) / 2}" transform="rotate(-90 ${padL - 22} ${(h - padB + padT) / 2})" text-anchor="middle" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">cross-track offset (nm)</text>`;

    svg.innerHTML = g;
  }

  /* ── SVG: DBSCAN scatter ───────────────────────────────────── */
  function drawDbscanSvg() {
    const svg = $("#dbscanSvg");
    const w = 300, h = 178, padL = 30, padB = 24, padT = 12, padR = 12;
    const x = (v) => padL + (v / 360) * (w - padL - padR);
    const y = (v) => padT + (1 - v / 22) * (h - padT - padB);
    const cols = { C1: "#1C2B44", C2: "#2E6B4F", C3: "#A66A11", C4: "#3E6B8C" };
    const defs = [
      { id: "C1", cog: 75, dc: 22, sog: 13, ds: 2.4, n: 12 },
      { id: "C2", cog: 165, dc: 34, sog: 4, ds: 1.6, n: 10 },
      { id: "C3", cog: 205, dc: 88, sog: 1.6, ds: 0.8, n: 8 },
      { id: "C4", cog: 268, dc: 26, sog: 10, ds: 2.0, n: 9 }
    ];
    let g = "";
    [0, 90, 180, 270, 360].forEach((v) => {
      g += `<line x1="${x(v)}" y1="${padT}" x2="${x(v)}" y2="${h - padB}" stroke="rgba(28,43,68,0.10)"/>
            <text x="${x(v)}" y="${h - 8}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">${v}°</text>`;
    });
    [0, 11, 22].forEach((v) => {
      g += `<line x1="${padL}" y1="${y(v)}" x2="${w - padR}" y2="${y(v)}" stroke="rgba(28,43,68,0.10)"/>
            <text x="${padL - 5}" y="${y(v) + 3}" text-anchor="end" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">${v}</text>`;
    });
    defs.forEach((d) => {
      const cx = x(d.cog), cy = y(d.sog);
      g += `<ellipse cx="${cx}" cy="${cy}" rx="${(d.dc / 360) * (w - padL - padR) * 1.5}" ry="${(d.ds / 22) * (h - padT - padB) * 3.2}" fill="none" stroke="${cols[d.id]}" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
            <text x="${cx}" y="${cy - ((d.ds / 22) * (h - padT - padB) * 3.2) - 4}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7" fill="${cols[d.id]}">${d.id}</text>`;
      for (let i = 0; i < d.n; i++) {
        const px = x(Math.max(0, Math.min(360, d.cog + (rng() - 0.5) * d.dc * 2)));
        const py = y(Math.max(0, Math.min(22, d.sog + (rng() - 0.5) * d.ds * 2)));
        g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.1" fill="${cols[d.id]}" opacity="0.85"/>`;
      }
    });
    for (let i = 0; i < 11; i++) {
      g += `<circle cx="${x(rng() * 360).toFixed(1)}" cy="${y(rng() * 22).toFixed(1)}" r="1.8" fill="#8B94A4" opacity="0.6"/>`;
    }
    g += `<text x="${w - padR}" y="${padT + 2}" text-anchor="end" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">○ = noise (DBSCAN)</text>`;
    g += `<text x="${(padL + w - padR) / 2}" y="${h - 1}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">course over ground (deg) →</text>`;
    svg.innerHTML = g;
  }

  /* ── SVG: anomaly histogram ────────────────────────────────── */
  function drawAnomSvg() {
    const svg = $("#anomSvg");
    const w = 300, h = 128, padL = 28, padB = 20, padT = 10, padR = 8;
    const counts = [88, 76, 61, 47, 33, 22, 14, 9, 6, 4];
    const max = 95;
    const bw = (w - padL - padR) / counts.length;
    let g = "";
    [0, 45, 90].forEach((v) => {
      const yy = padT + (1 - v / max) * (h - padT - padB);
      g += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="rgba(28,43,68,0.12)" stroke-dasharray="2 3"/>
            <text x="${padL - 5}" y="${yy + 3}" text-anchor="end" font-family="IBM Plex Mono" font-size="7" fill="#8B94A4">${v}</text>`;
    });
    counts.forEach((c, i) => {
      const bx = padL + i * bw + 1.5;
      const bh = (c / max) * (h - padT - padB);
      const hot = (i + 1) / 10 >= 0.65;
      g += `<rect x="${bx}" y="${h - padB - bh}" width="${bw - 3}" height="${bh}" fill="${hot ? "#BE2A63" : "#1C2B44"}" opacity="${hot ? 0.9 : 0.8}"/>`;
      if (i % 2 === 0) g += `<text x="${bx + bw / 2 - 1.5}" y="${h - 7}" text-anchor="middle" font-family="IBM Plex Mono" font-size="6.5" fill="#8B94A4">0.${i}</text>`;
    });
    const tx = padL + 6.5 * bw;
    g += `<line x1="${tx}" y1="${padT - 2}" x2="${tx}" y2="${h - padB}" stroke="#1C2B44" stroke-width="1.2" stroke-dasharray="4 3"/>
          <text x="${tx + 4}" y="${padT + 7}" font-family="IBM Plex Mono" font-size="7" fill="#1C2B44">alert threshold 0.65</text>`;
    svg.innerHTML = g;
  }

  /* ── SVG: system architecture ──────────────────────────────── */
  function drawArchSvg() {
    const svg = $("#archSvg");
    const box = (x, y, w, h, title, sub, sub2, accent) => `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${accent ? "rgba(190,42,99,0.06)" : "#F7F2E6"}" stroke="${accent ? "#BE2A63" : "#1C2B44"}" stroke-width="1"/>
      <text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="11.5" font-weight="600" fill="#1C2B44">${title}</text>
      <text x="${x + w / 2}" y="${y + 35}" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#4B5A72">${sub}</text>
      ${sub2 ? `<text x="${x + w / 2}" y="${y + 49}" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#8B94A4">${sub2}</text>` : ""}`;
    const arrow = (x1, y1, x2, y2) => `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1C2B44" stroke-width="1" marker-end="url(#ah)"/>`;

    let g = `
      <defs>
        <marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#1C2B44"/>
        </marker>
      </defs>`;
    g += box(6, 30, 150, 78, "Data Sources", "AIS · Satellite AIS", "Radar · SAR imagery");
    g += box(186, 30, 158, 78, "Preprocessing", "clean · normalize · fuse", "27 engineered features");

    const models = [
      ["Random Forest", "vessel class", "acc 96.4%"],
      ["LSTM", "trajectory", "RMSE 0.063°"],
      ["DBSCAN", "behaviour clusters", "silhouette 0.71"],
      ["CNN", "image classification", "acc 93.7%"],
      ["Isolation Forest", "anomaly detection", "F1 92.7%"]
    ];
    const mx0 = 384, mw = 112, gap = 12;
    models.forEach((m, i) => {
      const x = mx0 + i * (mw + gap);
      g += box(x, 12, mw, 112, m[0], m[1], m[2]);
      g += arrow(364, 69, x - 2, 69);
      g += arrow(x + mw + 2, 69, 992, 69);
    });
    g += box(1000, 30, 174, 78, "Alert & Reporting", "threshold + rule engine", "notifications · reports", true);

    /* feedback loop */
    g += `<path d="M1087 112 L1087 152 L440 152 L440 130" fill="none" stroke="#8E1E48" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#ah)"/>
          <text x="760" y="166" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#8E1E48">feedback — hyperparameter tuning &amp; periodic retraining</text>`;
    g += `<text x="6" y="15" font-family="IBM Plex Mono" font-size="8" fill="#8B94A4">INGEST</text>
          <text x="384" y="15" font-family="IBM Plex Mono" font-size="8" fill="#8B94A4">MODEL LAYER — served in parallel</text>
          <text x="1000" y="15" font-family="IBM Plex Mono" font-size="8" fill="#8B94A4">OUTPUT</text>`;
    svg.innerHTML = g;
  }

  /* ── boot ──────────────────────────────────────────────────── */
  function boot() {
    resize();
    renderAlerts();
    renderTable();
    drawIngestSvg();
    drawDbscanSvg();
    drawAnomSvg();
    drawArchSvg();
    select(selected);
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(tickLive, 3200);
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    requestAnimationFrame((t) => { lastT = t; step(t); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

import { useState, useEffect, useRef, useCallback } from "react";
import "./css/photobooth.css";

import { frameStorage } from "./js/frameStorage"; // BARU: penyimpanan bingkai unggahan

/* ================= KONFIGURASI ================= */

const PHASES = {
  frame: { label: "1 · Pilih Bingkai", seconds: 60 },
  shoot: { label: "2 · Foto-foto", seconds: 180 },
  pick: { label: "3 · Pilih Foto", seconds: 60 },
};

// susunan / kolase
const LAYOUTS = {
  strip: { name: "Strip", kind: "3 foto tegak", cols: 1, rows: 3, w: 640, h: 480 },
  grid: { name: "Kolase", kind: "4 foto 2×2", cols: 2, rows: 2, w: 560, h: 420 },
  wide: { name: "Panorama", kind: "3 foto mendatar", cols: 3, rows: 1, w: 480, h: 360 },
};

// desain bingkai bawaan
const DESIGNS = {
  film: { name: "Film" },
  polaroid: { name: "Polaroid" },
  postcard: { name: "Kartu Pos" },
  garden: { name: "Taman" },
  kraft: { name: "Kraft" },
  midnight: { name: "Midnight" },
  pastel: { name: "Pastel" },
};

// filter kamera (dipakai di pratinjau CSS dan dibakar ke foto lewat ctx.filter)
const FILTERS = {
  none: { name: "Normal", css: "none" },
  bw: { name: "Hitam Putih", css: "grayscale(1) contrast(1.1)" },
  sepia: { name: "Sepia", css: "sepia(0.85) contrast(1.05)" },
  warm: { name: "Hangat", css: "sepia(0.25) saturate(1.3) hue-rotate(-10deg) brightness(1.05)" },
  cool: { name: "Dingin", css: "saturate(1.1) hue-rotate(15deg) brightness(1.03)" },
  vivid: { name: "Cerah", css: "saturate(1.6) contrast(1.1)" },
  fade: { name: "Pudar", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
  vintage: { name: "Vintage", css: "sepia(0.4) contrast(1.1) brightness(0.95) saturate(1.2)" },
};

const MAX_CUSTOM_SLOTS = 8;
const MAX_CUSTOM_SIDE = 2400;
const MAX_ZOOM = 4;

const slotCount = (l) => LAYOUTS[l].cols * LAYOUTS[l].rows;
const pad2 = (n) => String(n).padStart(2, "0");
const fmt = (s) => `${Math.floor(s / 60)}:${pad2(s % 60)}`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const findCustom = (design, customs) =>
  design.startsWith("custom:") ? customs.find((c) => "custom:" + c.id === design) : null;
const countFor = (design, layout, customs) => {
  const c = findCustom(design, customs);
  return c ? c.slots.length : slotCount(layout);
};
// rasio lebar/tinggi kotak foto ke-i
const aspectFor = (design, layout, customs, i) => {
  const c = findCustom(design, customs);
  if (c) {
    const s = c.slots[i] || c.slots[0];
    return s.w / s.h;
  }
  return LAYOUTS[layout].w / LAYOUTS[layout].h;
};

const newId = () =>
  window.crypto?.randomUUID?.() ?? "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);

/* ================= PENYESUAIAN POSISI FOTO ================= */

// zoom >= 1, ox/oy = pergeseran sebagai pecahan lebar/tinggi kotak
const DEF_ADJ = { zoom: 1, ox: 0, oy: 0 };

// ia = rasio foto, sa = rasio kotak. Batasi supaya kotak selalu terisi penuh.
function clampAdj(adj, ia, sa) {
  const z = clamp(adj.zoom, 1, MAX_ZOOM);
  const cw = Math.max(1, ia / sa); // lebar foto "cover" relatif lebar kotak
  const ch = Math.max(1, sa / ia);
  const mx = (cw * z - 1) / 2;
  const my = (ch * z - 1) / 2;
  return { zoom: z, ox: clamp(adj.ox, -mx, mx), oy: clamp(adj.oy, -my, my) };
}

/* ================= UTIL CANVAS ================= */

const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// gambar foto "cover" ke dalam kotak, dengan zoom & geser (adj)
function drawCover(ctx, img, x, y, w, h, adj = DEF_ADJ) {
  const ia = img.width / img.height;
  const sa = w / h;
  const { zoom, ox, oy } = clampAdj(adj, ia, sa);
  const dw = w * Math.max(1, ia / sa) * zoom;
  const dh = h * Math.max(1, sa / ia) * zoom;
  const cx = x + w / 2 + ox * w;
  const cy = y + h / 2 + oy * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/* ---------- gaya per desain bawaan ---------- */

const ROUND = { garden: 26, pastel: 22 };
const STROKE = {
  film: ["#c9b898", 3],
  garden: ["#fffdf7", 6],
  pastel: ["#ffffff", 8],
  midnight: ["#e0b84c", 4],
  kraft: ["#f5ead6", 5],
};
const CAPTION = {
  polaroid: ["#3d2f22", "600 54px 'Caveat', cursive"],
  film: ["#fdf8ee", "italic 600 40px 'Cormorant Garamond', serif"],
  garden: ["#4a5a3a", "italic 600 42px 'Cormorant Garamond', serif"],
  midnight: ["#e0b84c", "italic 600 42px 'Cormorant Garamond', serif"],
  kraft: ["#4a3520", "italic 600 42px 'Cormorant Garamond', serif"],
  pastel: ["#8a4b63", "600 54px 'Caveat', cursive"],
  postcard: ["#3d2f22", "italic 600 42px 'Cormorant Garamond', serif"],
};

async function renderFrame({ layout, design, images, caption, adjusts }) {
  try {
    await Promise.all([
      document.fonts.load("600 48px 'Cormorant Garamond'"),
      document.fonts.load("600 48px 'Caveat'"),
    ]);
  } catch {
    /* font gagal dimuat → pakai fallback */
  }

  const L = LAYOUTS[layout];
  const PAD = 44;
  const GAP = 30;
  const FOOT = 130;
  const W = PAD * 2 + L.cols * L.w + (L.cols - 1) * GAP;
  const H = PAD + L.rows * L.h + (L.rows - 1) * GAP + FOOT;

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  // ---- latar ----
  if (design === "film") {
    ctx.fillStyle = "#1f1710";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9b898";
    for (let x = 14; x < W - 20; x += 36) {
      roundRect(ctx, x, 12, 16, 12, 3);
      ctx.fill();
      roundRect(ctx, x, H - 24, 16, 12, 3);
      ctx.fill();
    }
  } else if (design === "polaroid") {
    ctx.fillStyle = "#e6d6b8";
    ctx.fillRect(0, 0, W, H);
  } else if (design === "postcard") {
    ctx.fillStyle = "#fdf8ee";
    ctx.fillRect(0, 0, W, H);
    const colors = ["#c0443a", "#fdf8ee", "#2f5b8f", "#fdf8ee"];
    const seg = 28;
    const B = 16;
    for (let x = 0, i = 0; x < W; x += seg, i++) {
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(x, 0, seg, B);
      ctx.fillRect(x, H - B, seg, B);
    }
    for (let y = 0, i = 0; y < H; y += seg, i++) {
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(0, y, B, seg);
      ctx.fillRect(W - B, y, B, seg);
    }
  } else if (design === "kraft") {
    ctx.fillStyle = "#c8a97e";
    ctx.fillRect(0, 0, W, H);
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f5ead6";
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.setLineDash([]);
  } else if (design === "midnight") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1b2a4e");
    g.addColorStop(1, "#0b1226");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    ctx.fillStyle = "rgba(224,184,76,0.85)";
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (design === "pastel") {
    ctx.fillStyle = "#f9d9e3";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let y = 20, r = 0; y < H; y += 46, r++) {
      for (let x = r % 2 ? 43 : 20; x < W; x += 46) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // garden
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e5ebd3");
    g.addColorStop(1, "#f6eedb");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- slot foto ----
  const n = slotCount(layout);
  for (let i = 0; i < n; i++) {
    const col = i % L.cols;
    const row = Math.floor(i / L.cols);
    const x = PAD + col * (L.w + GAP);
    const y = PAD + row * (L.h + GAP);
    const img = images[i];
    const radius = ROUND[design];

    if (design === "polaroid") {
      ctx.fillStyle = "#fffdf7";
      ctx.shadowColor = "rgba(40,28,15,0.25)";
      ctx.shadowBlur = 12;
      ctx.fillRect(x - 12, y - 12, L.w + 24, L.h + 24);
      ctx.shadowBlur = 0;
    }

    ctx.save();
    if (radius) {
      roundRect(ctx, x, y, L.w, L.h, radius);
      ctx.clip();
    }
    if (img) {
      drawCover(ctx, img, x, y, L.w, L.h, adjusts?.[i]);
    } else {
      ctx.fillStyle = design === "film" ? "#3a2c1e" : "rgba(138,115,85,0.2)";
      ctx.fillRect(x, y, L.w, L.h);
    }
    ctx.restore();

    const st = STROKE[design];
    if (st) {
      ctx.lineWidth = st[1];
      ctx.strokeStyle = st[0];
      if (radius) {
        roundRect(ctx, x, y, L.w, L.h, radius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, L.w, L.h);
      }
    }
  }

  // ---- keterangan ----
  const text = caption || "Photo Booth";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cy = H - FOOT / 2 + (design === "postcard" ? -6 : 4);
  const [capColor, capFont] = CAPTION[design] || CAPTION.postcard;
  ctx.fillStyle = capColor;
  ctx.font = capFont;
  ctx.fillText(text, W / 2, cy);

  const date = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  ctx.font = "20px 'Special Elite', monospace";
  ctx.globalAlpha = 0.7;
  ctx.fillText(date, W / 2, cy + 42);
  ctx.globalAlpha = 1;

  return new Promise((r) => c.toBlob(r, "image/png"));
}

/* ================= BINGKAI UNGGAHAN ================= */

/**
 * Ubah gambar unggahan jadi bingkai siap pakai:
 * - area transparan  → tempat foto
 * - area hijau #00FF00 (untuk JPG / editor tanpa transparansi) → dijadikan transparan
 */
function prepareCustomFrame(img) {
  const sc = Math.min(1, MAX_CUSTOM_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * sc));
  const h = Math.max(1, Math.round(img.naturalHeight * sc));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 1] > 200 && d[i] < 100 && d[i + 2] < 100) d[i + 3] = 0; // kunci hijau
  }
  ctx.putImageData(data, 0, 0);

  return { canvas, w, h, slots: detectSlots(canvas) };
}

function detectSlots(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const sc = Math.min(1, 500 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * sc));
  const h = Math.max(1, Math.round(H * sc));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(canvas, 0, 0, w, h);
  const d = sctx.getImageData(0, 0, w, h).data;

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = d[i * 4 + 3] < 40 ? 1 : 0;

  const seen = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    const touchesEdge = minX === 0 || minY === 0 || maxX === w - 1 || maxY === h - 1;
    if (touchesEdge || count < w * h * 0.004) continue; // abaikan sudut membulat / noise

    const EXTRA = 3; // sedikit melebar supaya tidak ada celah di tepi
    const x0 = Math.max(0, Math.floor(minX / sc) - EXTRA);
    const y0 = Math.max(0, Math.floor(minY / sc) - EXTRA);
    const x1 = Math.min(W, Math.ceil((maxX + 1) / sc) + EXTRA);
    const y1 = Math.min(H, Math.ceil((maxY + 1) / sc) + EXTRA);
    boxes.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }

  // urutkan: atas → bawah, lalu kiri → kanan
  boxes.sort((a, b) => a.y - b.y);
  const rows = [];
  for (const b of boxes) {
    const cy = b.y + b.h / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < b.h * 0.5);
    if (row) row.items.push(b);
    else rows.push({ cy, items: [b] });
  }
  rows.sort((a, b) => a.cy - b.cy);
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

async function renderCustomFrame({ custom, images, adjusts }) {
  const c = document.createElement("canvas");
  c.width = custom.w;
  c.height = custom.h;
  const ctx = c.getContext("2d");

  custom.slots.forEach((s, i) => {
    ctx.fillStyle = "#2a1f14";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (images[i]) drawCover(ctx, images[i], s.x, s.y, s.w, s.h, adjusts?.[i]);
  });
  ctx.drawImage(custom.canvas, 0, 0); // bingkai di atas foto

  return new Promise((r) => c.toBlob(r, "image/png"));
}

// contoh template: 3 jendela transparan
function downloadTemplate() {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 1500;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f5ead6";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 3; i++) ctx.clearRect(60, 60 + i * 420, 480, 360);
  c.toBlob((b) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "template-bingkai.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
}

// bingkai tersimpan (blob) → objek siap pakai di state
async function hydrateFrame(rec) {
  const url = URL.createObjectURL(rec.blob);
  const img = await loadImg(url);
  const canvas = document.createElement("canvas");
  canvas.width = rec.w;
  canvas.height = rec.h;
  canvas.getContext("2d").drawImage(img, 0, 0, rec.w, rec.h);
  return { id: rec.id, name: rec.name, canvas, url, w: rec.w, h: rec.h, slots: rec.slots };
}

const canvasToBlob = (canvas) => new Promise((r) => canvas.toBlob(r, "image/png"));

/* ================= KOMPONEN ================= */

export default function PhotoBooth() {
  const [phase, setPhase] = useState("frame"); // frame | shoot | pick | done
  const [remaining, setRemaining] = useState(PHASES.frame.seconds);

  const [layout, setLayout] = useState("strip");
  const [design, setDesign] = useState("film");
  const [caption, setCaption] = useState("");
  const [customs, setCustoms] = useState([]); // bingkai unggahan (tersimpan di storage)
  const [notice, setNotice] = useState("");

  const [shots, setShots] = useState([]); // {id, blob, url, w, h}
  const [slots, setSlots] = useState([]); // array id foto (atau null)
  const [adjusts, setAdjusts] = useState({}); // { indexSlot: {zoom, ox, oy} }
  const [sel, setSel] = useState(0); // slot yang sedang disesuaikan
  const [countdown, setCountdown] = useState(0);
  const [flash, setFlash] = useState(false);
  const [camError, setCamError] = useState("");
  const [camReady, setCamReady] = useState(false);
  const [result, setResult] = useState(null); // {frameBlob, frameUrl, videoBlobs}
  const [busy, setBusy] = useState(false);

  // BARU
  const [timerOn, setTimerOn] = useState(true); // timer sesi (per fase)
  const [countdownOn, setCountdownOn] = useState(true); // hitung mundur 3-2-1 sebelum jepret
  const [filter, setFilter] = useState("none");
  const [mirror, setMirror] = useState(true); // cermin: layar & hasil selalu sama
  const [cameras, setCameras] = useState([]);
  const [camId, setCamId] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const segmentsRef = useRef([]); // satu rekaman per kamera yang dipakai
  const camReqRef = useRef(0);
  const shotId = useRef(0);
  const fileRef = useRef(null);
  const previewRef = useRef(null);
  const gesture = useRef({ pts: new Map(), slot: -1, base: null, rect: null });

  // state terbaru untuk dipakai di timer / event (hindari stale closure)
  const live = useRef({});
  live.current = { phase, layout, design, caption, shots, slots, customs, adjusts, filter, mirror };

  /* ---------- kamera + rekaman ---------- */
  const refreshCameras = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setCameras(list.filter((d) => d.kind === "videoinput"));
    } catch {
      /* abaikan */
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId) => {
      const req = ++camReqRef.current;
      setCamReady(false);

      // hentikan rekaman & stream lama
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const size = { width: { ideal: 1280 }, height: { ideal: 960 } };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId }, ...size }
            : { ...size, facingMode: "user" },
          audio: false,
        });
      } catch {
        if (req !== camReqRef.current) return;
        setCamError("Kamera tidak bisa diakses. Izinkan akses kamera lalu muat ulang halaman.");
        return;
      }
      if (req !== camReqRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setCamError("");
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamId(stream.getVideoTracks()[0]?.getSettings?.().deviceId || deviceId || "");

      // rekam sesi (satu segmen per kamera)
      try {
        const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
          (m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)
        );
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        const chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        segmentsRef.current.push(
          new Promise((res) => {
            rec.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
          })
        );
        rec.start(1000);
        recorderRef.current = rec;
      } catch {
        /* rekaman tidak didukung → foto tetap jalan */
      }

      setCamReady(true);
      refreshCameras(); // label kamera baru terisi setelah izin diberikan
    },
    [refreshCameras]
  );

  useEffect(() => {
    startCamera(null);
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshCameras);
    return () => {
      camReqRef.current++; // batalkan permintaan yang masih berjalan
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshCameras);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera, refreshCameras]);

  // pasang ulang stream saat <video> muncul kembali
  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [phase, camReady]);

  const changeCamera = (id) => {
    if (!id || id === camId) return;
    setCamId(id);
    startCamera(id);
  };

  /* ---------- muat bingkai tersimpan ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await frameStorage.list();
        const loaded = (await Promise.allSettled(rows.map(hydrateFrame)))
          .filter((x) => x.status === "fulfilled")
          .map((x) => x.value);
        if (alive && loaded.length) setCustoms(loaded);
      } catch {
        if (alive) setNotice("Bingkai tersimpan gagal dimuat. Bingkai baru tetap bisa diunggah.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- selesai: render bingkai + hentikan rekaman ---------- */
  const finish = useCallback(async () => {
    const s = live.current;
    if (s.phase === "done") return;
    setBusy(true);
    setPhase("done");

    const custom = findCustom(s.design, s.customs);
    const n = countFor(s.design, s.layout, s.customs);

    // isi slot kosong dengan foto yang belum terpakai
    const chosen = Array.from({ length: n }, (_, i) => s.slots[i] ?? null);
    const unused = s.shots.filter((x) => !chosen.includes(x.id));
    for (let i = 0; i < n && unused.length; i++) {
      if (chosen[i] == null) chosen[i] = unused.shift().id;
    }

    const images = await Promise.all(
      chosen.map((id) => {
        const shot = s.shots.find((x) => x.id === id);
        return shot ? loadImg(shot.url) : null;
      })
    );

    const frameBlob = custom
      ? await renderCustomFrame({ custom, images, adjusts: s.adjusts })
      : await renderFrame({
          layout: s.layout,
          design: s.design,
          images,
          caption: s.caption.trim(),
          adjusts: s.adjusts,
        });

    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    const videoBlobs = (await Promise.all(segmentsRef.current)).filter((b) => b.size > 0);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    setResult({ frameBlob, frameUrl: URL.createObjectURL(frameBlob), videoBlobs });
    setBusy(false);
  }, []);

  /* ---------- pindah fase ---------- */
  const goNext = useCallback(() => {
    const s = live.current;
    if (s.phase === "frame") {
      setPhase("shoot");
      setRemaining(PHASES.shoot.seconds);
    } else if (s.phase === "shoot") {
      setSlots(Array(countFor(s.design, s.layout, s.customs)).fill(null));
      setAdjusts({});
      setSel(0);
      setPhase("pick");
      setRemaining(PHASES.pick.seconds);
    } else if (s.phase === "pick") {
      finish();
    }
  }, [finish]);

  /* ---------- timer (bisa dimatikan) ---------- */
  useEffect(() => {
    if (phase === "done" || !timerOn) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setTimeout(goNext, 0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, goNext, timerOn]);

  /* ---------- unggah bingkai (disimpan ke storage) ---------- */
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("File harus berupa gambar (PNG transparan paling disarankan).");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      const prep = prepareCustomFrame(img);
      if (prep.slots.length === 0) {
        setNotice(
          "Tidak ada area kosong yang terdeteksi. Buat tempat foto sebagai area TRANSPARAN (PNG), atau warnai hijau murni #00FF00 jika editormu tidak mendukung transparan."
        );
        return;
      }
      const slotsFound = prep.slots.slice(0, MAX_CUSTOM_SLOTS);
      const blob = await canvasToBlob(prep.canvas);
      const frame = {
        id: newId(),
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 12) || "Bingkaiku",
        canvas: prep.canvas,
        url: URL.createObjectURL(blob),
        w: prep.w,
        h: prep.h,
        slots: slotsFound,
      };
      setCustoms((prev) => [...prev, frame]);
      setDesign("custom:" + frame.id);

      let msg = "";
      if (prep.slots.length > MAX_CUSTOM_SLOTS) {
        msg = `Terdeteksi ${prep.slots.length} area, dipakai ${MAX_CUSTOM_SLOTS} yang pertama. `;
      }
      try {
        await frameStorage.save({
          id: frame.id,
          name: frame.name,
          w: frame.w,
          h: frame.h,
          slots: frame.slots,
          blob,
        });
      } catch {
        msg += "Bingkai bisa dipakai sekarang, tapi gagal disimpan sehingga akan hilang saat aplikasi ditutup.";
      }
      if (msg) setNotice(msg.trim());
    } catch {
      setNotice("Gambar tidak bisa dibaca. Coba simpan ulang sebagai PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const deleteCustom = async (id) => {
    if (!window.confirm("Hapus bingkai ini dari penyimpanan?")) return;
    try {
      await frameStorage.remove(id);
    } catch {
      setNotice("Bingkai gagal dihapus dari penyimpanan.");
      return;
    }
    setCustoms((prev) => prev.filter((c) => c.id !== id));
    setDesign((d) => (d === "custom:" + id ? "film" : d));
  };

  /* ---------- ambil foto (hasil = persis seperti di layar) ---------- */
  const snap = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const { filter: fKey, mirror: mir } = live.current;
    const w = v.videoWidth;
    const h = v.videoHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (mir) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = FILTERS[fKey]?.css || "none";
    ctx.drawImage(v, 0, 0, w, h);
    ctx.filter = "none";
    c.toBlob((blob) => {
      const id = ++shotId.current;
      setShots((prev) => [...prev, { id, blob, url: URL.createObjectURL(blob), w, h }]);
    }, "image/png");
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
  }, []);

  const startCountdown = () => {
    if (countdown) return;
    if (!countdownOn) {
      snap();
      return;
    }
    let n = 3;
    setCountdown(n);
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        setCountdown(0);
        snap();
      } else {
        setCountdown(n);
      }
    }, 1000);
  };

  /* ---------- pilih foto ke slot ---------- */
  const toggleShot = (id) => {
    const next = [...slots];
    const at = next.indexOf(id);
    if (at >= 0) {
      next[at] = null;
      setSlots(next);
      setAdjusts((a) => {
        const c = { ...a };
        delete c[at];
        return c;
      });
      return;
    }
    const free = next.indexOf(null);
    if (free < 0) return;
    next[free] = id;
    setSlots(next);
    setAdjusts((a) => {
      const c = { ...a };
      delete c[free];
      return c;
    });
    setSel(free);
  };

  /* ---------- geser / zoom foto di dalam bingkai ---------- */
  const updateAdjust = useCallback((i, fn) => {
    const s = live.current;
    const shot = s.shots.find((x) => x.id === s.slots[i]);
    if (!shot) return;
    const ia = shot.w / shot.h;
    const sa = aspectFor(s.design, s.layout, s.customs, i);
    setAdjusts((prev) => ({ ...prev, [i]: clampAdj(fn(prev[i] || DEF_ADJ), ia, sa) }));
  }, []);

  const rebase = (i) => {
    const g = gesture.current;
    const pts = [...g.pts.values()];
    g.slot = i;
    g.base = {
      cur: { ...(live.current.adjusts[i] || DEF_ADJ) },
      p0: pts[0],
      dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
    };
  };

  const onSlotDown = (e, i) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const g = gesture.current;
    g.rect = e.currentTarget.getBoundingClientRect();
    g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setSel(i);
    rebase(i);
  };

  const onSlotMove = (e) => {
    const g = gesture.current;
    if (!g.pts.has(e.pointerId) || !g.base) return;
    g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...g.pts.values()];
    const { base, rect } = g;
    if (pts.length >= 2 && base.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      updateAdjust(g.slot, () => ({ ...base.cur, zoom: base.cur.zoom * (dist / base.dist) }));
    } else {
      const dx = (pts[0].x - base.p0.x) / rect.width;
      const dy = (pts[0].y - base.p0.y) / rect.height;
      updateAdjust(g.slot, () => ({ ...base.cur, ox: base.cur.ox + dx, oy: base.cur.oy + dy }));
    }
  };

  const onSlotUp = (e) => {
    const g = gesture.current;
    g.pts.delete(e.pointerId);
    if (g.pts.size > 0) rebase(g.slot);
    else g.base = null;
  };

  // scroll mouse = zoom (perlu listener non-pasif supaya halaman tidak ikut bergulir)
  useEffect(() => {
    if (phase !== "pick") return;
    const el = previewRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const t = e.target.closest?.("[data-slot]");
      if (!t) return;
      e.preventDefault();
      const i = Number(t.dataset.slot);
      setSel(i);
      updateAdjust(i, (c) => ({ ...c, zoom: c.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [phase, updateAdjust]);

  /* ---------- unduh ZIP ---------- */
  const downloadZip = async () => {
    if (!result) return;
    setBusy(true);
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(
      d.getHours()
    )}${pad2(d.getMinutes())}`;
    const root = zip.folder(`photobooth-${stamp}`);

    const vids = result.videoBlobs || [];
    vids.forEach((b, i) =>
      root.file(vids.length === 1 ? "video-sesi.webm" : `video-sesi-${i + 1}.webm`, b)
    );
    const fotoDir = root.folder("foto");
    shots.forEach((s, i) => fotoDir.file(`foto-${pad2(i + 1)}.png`, s.blob));
    root.file("bingkai.png", result.frameBlob);

    const out = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    a.download = `photobooth-${stamp}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setBusy(false);
  };

  /* ================= RENDER ================= */

  const custom = findCustom(design, customs);
  const n = countFor(design, layout, customs);
  const L = LAYOUTS[layout];
  const landscape = custom ? custom.w > custom.h : L.cols > 1;
  const shotById = (id) => shots.find((s) => s.id === id);
  const urgent = timerOn && remaining <= 10 && phase !== "done";

  // isi satu kotak foto di pratinjau (bisa digeser / dizoom saat fase pilih)
  const slotImage = (sh, i) => {
    const a = adjusts[i] || DEF_ADJ;
    return (
      <>
        <img
          src={sh.url}
          alt=""
          draggable={false}
          className="pb-slot-img"
          style={{ transform: `translate(${a.ox * 100}%, ${a.oy * 100}%) scale(${a.zoom})` }}
        />
        <button
          type="button"
          className="pb-slot-x"
          aria-label="Keluarkan foto"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleShot(sh.id);
          }}
        >
          ×
        </button>
      </>
    );
  };

  const slotHandlers = (sh, i) =>
    sh
      ? {
          "data-slot": i,
          onPointerDown: (e) => onSlotDown(e, i),
          onPointerMove: onSlotMove,
          onPointerUp: onSlotUp,
          onPointerCancel: onSlotUp,
        }
      : {};

  // pratinjau bingkai (dipakai di fase 1 dan 3)
  const renderPreview = (picking) => {
    const slotShot = (i) => (picking && slots[i] != null ? shotById(slots[i]) : null);

    if (custom) {
      return (
        <div
          ref={previewRef}
          className="pb-custom-preview"
          style={{
            width: custom.w >= custom.h ? "min(560px, 100%)" : "min(240px, 100%)",
            aspectRatio: `${custom.w} / ${custom.h}`,
          }}
        >
          {custom.slots.map((s, i) => {
            const sh = slotShot(i);
            return (
              <div
                key={i}
                className={`pb-custom-slot${sh ? " is-filled" : ""}${
                  sh && sel === i ? " is-selected" : ""
                }`}
                style={{
                  left: `${(s.x / custom.w) * 100}%`,
                  top: `${(s.y / custom.h) * 100}%`,
                  width: `${(s.w / custom.w) * 100}%`,
                  height: `${(s.h / custom.h) * 100}%`,
                }}
                {...slotHandlers(sh, i)}
              >
                {sh ? slotImage(sh, i) : <span className="pb-slot-num">{i + 1}</span>}
              </div>
            );
          })}
          <img className="pb-custom-overlay" src={custom.url} alt="" />
        </div>
      );
    }

    return (
      <div
        ref={previewRef}
        className={`pb-strip-preview ${landscape ? "is-landscape" : "is-portrait"}`}
        data-frame={design}
      >
        {Array.from({ length: n }, (_, i) => {
          const sh = slotShot(i);
          return (
            <div
              className={`pb-slot${sh ? " is-filled" : ""}${sh && sel === i ? " is-selected" : ""}`}
              key={i}
              {...slotHandlers(sh, i)}
            >
              {sh ? slotImage(sh, i) : <span className="pb-slot-num">{i + 1}</span>}
            </div>
          );
        })}
        <p className="pb-strip-caption">{caption || "Photo Booth"}</p>
      </div>
    );
  };

  const selShot = phase === "pick" && slots[sel] != null ? shotById(slots[sel]) : null;
  const selAdj = adjusts[sel] || DEF_ADJ;

  return (
    <div className="pb-page">
      <header className="pb-header">
        <h1 className="pb-title">Photo Booth</h1>
        {phase !== "done" ? (
          <>
            <p className="pb-subtitle">{PHASES[phase].label}</p>
            <div
              className={`pb-timer${urgent ? " is-urgent" : ""}${timerOn ? "" : " is-off"}`}
              role="timer"
            >
              {timerOn ? fmt(remaining) : "∞"}
            </div>
            <button
              type="button"
              className={`pb-toggle${timerOn ? " is-on" : ""}`}
              onClick={() => setTimerOn((v) => !v)}
              aria-pressed={timerOn}
            >
              Timer: {timerOn ? "Nyala" : "Mati"}
            </button>
            <div className="pb-steps" aria-hidden="true">
              {Object.keys(PHASES).map((k) => (
                <span key={k} className={`pb-step${k === phase ? " is-active" : ""}`} />
              ))}
            </div>
          </>
        ) : (
          <p className="pb-subtitle">Sesi selesai</p>
        )}
      </header>

      {camError && (
        <div className="pb-alert-overlay">
          <div className="pb-alert-box">
            <p className="pb-alert-text">{camError}</p>
          </div>
        </div>
      )}

      {notice && (
        <div className="pb-alert-overlay" onClick={() => setNotice("")}>
          <div className="pb-alert-box" onClick={(e) => e.stopPropagation()}>
            <p className="pb-alert-text">{notice}</p>
            <button className="pb-alert-btn" onClick={() => setNotice("")}>
              Oke
            </button>
          </div>
        </div>
      )}

      {/* ============ FASE 1: BINGKAI ============ */}
      {phase === "frame" && (
        <div className="pb-layout">
          <div className="pb-camera-wrap">
            <div className="pb-controls">
              {custom ? (
                <p className="pb-hint pb-hint--static">
                  Susunan mengikuti bingkai unggahanmu ({custom.slots.length} foto).
                </p>
              ) : (
                <>
                  <p className="pb-label">Susunan foto</p>
                  <div className="pb-frames">
                    {Object.entries(LAYOUTS).map(([key, l]) => (
                      <button
                        key={key}
                        className={`pb-frame-btn${layout === key ? " is-active" : ""}`}
                        onClick={() => setLayout(key)}
                      >
                        <span className="pb-frame-name">{l.name}</span>
                        <span className="pb-frame-kind">{l.kind}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="pb-label">Desain bingkai</p>
              <div className="pb-frames">
                {Object.entries(DESIGNS).map(([key, d]) => (
                  <button
                    key={key}
                    data-frame={key}
                    className={`pb-frame-btn${design === key ? " is-active" : ""}`}
                    onClick={() => setDesign(key)}
                  >
                    <span className={`pb-frame-icon ${landscape ? "is-landscape" : "is-portrait"}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="pb-frame-name">{d.name}</span>
                  </button>
                ))}

                {customs.map((c) => (
                  <button
                    key={c.id}
                    className={`pb-frame-btn${design === "custom:" + c.id ? " is-active" : ""}`}
                    onClick={() => setDesign("custom:" + c.id)}
                  >
                    <span
                      className="pb-custom-del"
                      role="button"
                      aria-label="Hapus bingkai"
                      title="Hapus bingkai"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustom(c.id);
                      }}
                    >
                      ×
                    </span>
                    <img className="pb-custom-thumb" src={c.url} alt="" />
                    <span className="pb-frame-name">{c.name}</span>
                    <span className="pb-frame-kind">{c.slots.length} foto</span>
                  </button>
                ))}

                <button className="pb-frame-btn pb-upload-btn" onClick={() => fileRef.current?.click()}>
                  <span className="pb-upload-plus">+</span>
                  <span className="pb-frame-name">Unggah</span>
                  <span className="pb-frame-kind">bingkaimu</span>
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={onUpload}
              />
              <p className="pb-help">
                Area <b>transparan</b> di PNG = tempat foto (atau warnai hijau <b>#00FF00</b> kalau
                pakai JPG). Bingkai yang diunggah tersimpan otomatis.{" "}
                <button type="button" className="pb-link" onClick={downloadTemplate}>
                  Unduh contoh template
                </button>
              </p>

              {!custom && (
                <input
                  className="pb-input"
                  placeholder="Tulisan di bingkai (opsional)"
                  value={caption}
                  maxLength={32}
                  onChange={(e) => setCaption(e.target.value)}
                />
              )}
              <button className="pb-btn" onClick={goNext}>
                Lanjut Foto →
              </button>
            </div>
          </div>

          {renderPreview(false)}
        </div>
      )}

      {/* ============ FASE 2: FOTO ============ */}
      {phase === "shoot" && (
        <div className="pb-layout">
          <div className="pb-camera-wrap">
            <div className="pb-camera-frame">
              <video
                ref={videoRef}
                className="pb-video"
                autoPlay
                playsInline
                muted
                style={{
                  transform: mirror ? "scaleX(-1)" : "none",
                  filter: FILTERS[filter].css,
                }}
              />
              {!camReady && !camError && <div className="pb-overlay-text">Menyalakan kamera…</div>}
              {countdown > 0 && (
                <div className="pb-countdown" key={countdown}>
                  {countdown}
                </div>
              )}
              <div className={`pb-flash${flash ? " is-on" : ""}`} />
            </div>

            <div className="pb-tools">
              <label className="pb-field">
                <span className="pb-label">Kamera</span>
                <select
                  className="pb-select"
                  value={camId}
                  onChange={(e) => changeCamera(e.target.value)}
                  disabled={cameras.length === 0}
                >
                  {cameras.length === 0 && <option value="">Mencari kamera…</option>}
                  {cameras.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId}>
                      {c.label || `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pb-checks">
                <label className="pb-check">
                  <input
                    type="checkbox"
                    checked={countdownOn}
                    onChange={(e) => setCountdownOn(e.target.checked)}
                  />
                  Hitung mundur 3 detik
                </label>
                <label className="pb-check">
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={(e) => setMirror(e.target.checked)}
                  />
                  Mode cermin
                </label>
              </div>

              <p className="pb-label">Filter</p>
              <div className="pb-filters">
                {Object.entries(FILTERS).map(([key, f]) => (
                  <button
                    key={key}
                    type="button"
                    className={`pb-filter-chip${filter === key ? " is-active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-controls">
              <button className="pb-btn" onClick={startCountdown} disabled={!!countdown}>
                {countdown ? "Siap-siap…" : "Jepret!"}
              </button>
              <button className="pb-btn pb-btn--ghost" onClick={goNext}>
                Selesai foto →
              </button>
            </div>
          </div>

          <div className="pb-thumbs">
            <p className="pb-label">{shots.length} foto</p>
            <div className="pb-thumb-grid">
              {shots.map((s) => (
                <img key={s.id} src={s.url} alt="" />
              ))}
              {shots.length === 0 && <span className="pb-hint">Belum ada foto</span>}
            </div>
          </div>
        </div>
      )}

      {/* ============ FASE 3: PILIH FOTO ============ */}
      {phase === "pick" && (
        <div className="pb-layout">
          <div className="pb-camera-wrap">
            <p className="pb-label">
              Ketuk foto untuk memasukkan ke bingkai ({slots.filter((x) => x != null).length}/{n})
            </p>
            <div className="pb-thumb-grid is-pick">
              {shots.map((s) => {
                const at = slots.indexOf(s.id);
                return (
                  <button
                    key={s.id}
                    className={`pb-thumb-btn${at >= 0 ? " is-picked" : ""}`}
                    onClick={() => toggleShot(s.id)}
                  >
                    <img src={s.url} alt="" />
                    {at >= 0 && <span className="pb-thumb-badge">{at + 1}</span>}
                  </button>
                );
              })}
              {shots.length === 0 && <span className="pb-hint">Tidak ada foto yang diambil</span>}
            </div>

            <div className="pb-adjust">
              <p className="pb-hint pb-hint--static">
                Usap foto di bingkai untuk menggeser posisinya. Cubit dua jari (atau scroll mouse)
                untuk zoom.
              </p>
              {selShot && (
                <div className="pb-adjust-row">
                  <span className="pb-label">Foto {sel + 1}</span>
                  <input
                    type="range"
                    min="1"
                    max={MAX_ZOOM}
                    step="0.01"
                    value={selAdj.zoom}
                    onChange={(e) =>
                      updateAdjust(sel, (c) => ({ ...c, zoom: Number(e.target.value) }))
                    }
                    aria-label="Zoom"
                  />
                  <button
                    type="button"
                    className="pb-btn pb-btn--ghost pb-btn--small"
                    onClick={() => updateAdjust(sel, () => DEF_ADJ)}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            <button className="pb-btn" onClick={goNext}>
              Selesai &amp; Buat Bingkai
            </button>
          </div>

          {renderPreview(true)}
        </div>
      )}

      {/* ============ HASIL ============ */}
      {phase === "done" && (
        <div className="pb-result">
          {busy && !result && <p className="pb-hint">Menyusun bingkai…</p>}
          {result && (
            <>
              <img
                src={result.frameUrl}
                alt="Hasil bingkai"
                className={`pb-strip-img ${landscape ? "is-landscape" : "is-portrait"}`}
              />
              <div className="pb-actions">
                <button className="pb-btn" onClick={downloadZip} disabled={busy}>
                  {busy ? "Menyiapkan ZIP…" : "Unduh Semua (.zip)"}
                </button>
                <button className="pb-btn pb-btn--ghost" onClick={() => window.location.reload()}>
                  Sesi Baru
                </button>
              </div>
              <p className="pb-hint">
                Isi ZIP: video-sesi.webm · foto/foto-01.png … · bingkai.png
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
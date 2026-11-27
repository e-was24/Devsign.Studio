import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { usePlayer } from "./PlayerContext";

/*
  Connect (ala Spotify Connect) lewat Supabase Realtime (Broadcast + Presence).
  - HOST   : perangkat yang benar-benar memutar audio. Menampilkan QR / link / kode.
  - REMOTE : perangkat yang scan QR / buka link. Hanya mengontrol, tidak memutar audio.
  Tidak butuh tabel database: semua lewat channel `connect:<KODE>`.
*/

const Ctx = createContext(null);
export const useConnect = () => useContext(Ctx);

const KEY = "connect-session";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1
const num = (v) => (Number.isFinite(v) ? v : 0);

const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => ALPHABET[n % ALPHABET.length]).join("");

const deviceId = (() => {
  try {
    let d = localStorage.getItem("connect-device-id");
    if (!d) { d = crypto.randomUUID(); localStorage.setItem("connect-device-id", d); }
    return d;
  } catch { return crypto.randomUUID(); }
})();

function guessName() {
  const u = navigator.userAgent;
  const os = /iPhone|iPad/.test(u) ? "iPhone/iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows"
    : /Mac/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "Perangkat";
  const br = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : "";
  return br ? `${os} · ${br}` : os;
}
const deviceName = guessName();

/** Terima link (…?connect=KODE) atau kode mentah. Kembalikan kode atau null. */
export function parseCode(text) {
  const t = (text || "").trim();
  let raw = t;
  try { raw = new URL(t).searchParams.get("connect") || ""; } catch { /* bukan URL */ }
  const m = raw.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{8}$/.test(m) ? m : null;
}

/* ---- adapter ke PlayerContext: sesuaikan nama di sini kalau berbeda ---- */
function togglePlayer(p) {
  const f = p.togglePlay || p.togglePlayPause || p.toggle;
  if (f) return f();
  if (p.isPlaying) { const x = p.pause; if (x) return x(); }
  else { const x = p.resume || p.play; if (x) return x(); }
  const a = document.querySelector("audio");
  if (a) a.paused ? a.play() : a.pause();
}
const getAudio = () => document.querySelector("audio");
function seekPlayer(p, t) {
  t = Math.max(0, num(t));
  if (p.seek) p.seek(t); else if (p.seekTo) p.seekTo(t);
  else { const a = getAudio(); if (a) a.currentTime = t; }
}

export function ConnectProvider({ children }) {
  const player = usePlayer();
  const playerRef = useRef(player);
  playerRef.current = player;

  const [role, setRole] = useState(null);       // null | "host" | "remote"
  const [code, setCode] = useState(null);
  const [peers, setPeers] = useState([]);       // semua perangkat di channel (presence)
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | lost
  const [remoteState, setRemoteState] = useState(null);
  const [listenHere, setListen] = useState(false); // remote ikut memutar lagu secara sinkron ("dengar bareng")
  const songsCache = useRef(null);

  const roleRef = useRef(null);
  const chRef = useRef(null);
  const queueRef = useRef([]);                  // antrian lokal (fallback next/prev)
  const handleCmdRef = useRef(null);
  const sendStateRef = useRef(null);

  /* ---------- HOST: kirim state pemutar ---------- */
  const sendState = useCallback(() => {
    const ch = chRef.current;
    if (!ch || roleRef.current !== "host") return;
    const p = playerRef.current, a = getAudio(), song = p.currentSong;
    ch.send({
      type: "broadcast", event: "state",
      payload: {
        song: song ? { id: song.id, title: song.title, artist: song.artist } : null,
        isPlaying: !!p.isPlaying,
        position: num(p.currentTime ?? a?.currentTime),
        duration: num(p.duration ?? a?.duration),
        device: deviceName,
      },
    });
  }, []);
  sendStateRef.current = sendState;

  /* ---------- HOST: jalankan perintah dari remote ---------- */
  handleCmdRef.current = async (c) => {
    if (roleRef.current !== "host" || !c) return;
    const p = playerRef.current;
    const step = (dir) => {
      const f = dir > 0 ? (p.nextSong || p.next || p.playNext) : (p.prevSong || p.previousSong || p.prev || p.playPrev);
      if (f) return f();
      const q = queueRef.current, i = q.findIndex((s) => s.id === p.currentSong?.id), t = q[i + dir];
      if (t) p.playSong(t, q);
    };
    switch (c.type) {
      case "toggle": togglePlayer(p); break;
      case "play": if (!p.isPlaying) togglePlayer(p); break;
      case "pause": if (p.isPlaying) togglePlayer(p); break;
      case "next": step(1); break;
      case "prev": step(-1); break;
      case "seek": {
        seekPlayer(p, c.time);
        break;
      }
      case "playSong": {
        const { data } = await supabase.from("songs").select("*").order("position");
        const byId = new Map((data || []).map((s) => [s.id, s]));
        const song = byId.get(c.songId);
        const list = (c.queue || []).map((id) => byId.get(id)).filter(Boolean);
        if (song) { queueRef.current = list.length ? list : [song]; p.playSong(song, queueRef.current); }
        break;
      }
      default: break;
    }
    setTimeout(() => sendStateRef.current?.(), 300);
  };

  /* ---------- gabung / keluar channel ---------- */
  const leave = useCallback(() => {
    if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null; }
    if (roleRef.current === "remote" && playerRef.current.isPlaying) playerRef.current.stopPlayer?.();
    roleRef.current = null;
    setListen(false);
    setRole(null); setCode(null); setPeers([]); setStatus("idle"); setRemoteState(null);
    try { sessionStorage.removeItem(KEY); } catch { /* abaikan */ }
  }, []);

  const join = useCallback((asRole, c) => {
    if (chRef.current) supabase.removeChannel(chRef.current);
    roleRef.current = asRole;
    if (asRole === "remote" && playerRef.current.isPlaying) playerRef.current.stopPlayer?.(); // remote tidak memutar audio

    const ch = supabase.channel(`connect:${c}`, {
      config: { broadcast: { self: false }, presence: { key: deviceId } },
    });
    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      if (roleRef.current === "remote") setRemoteState({ ...payload, recvAt: Date.now() });
    });
    ch.on("broadcast", { event: "cmd" }, ({ payload }) => handleCmdRef.current?.(payload));
    ch.on("broadcast", { event: "hello" }, () => sendStateRef.current?.());
    ch.on("presence", { event: "sync" }, () => setPeers(Object.values(ch.presenceState()).flat()));
    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.track({ id: deviceId, name: deviceName, role: asRole });
        setStatus("connected");
        if (asRole === "remote") ch.send({ type: "broadcast", event: "hello", payload: {} });
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("lost");
    });
    chRef.current = ch;
    setRole(asRole); setCode(c); setPeers([]); setRemoteState(null); setStatus("connecting");
    try { sessionStorage.setItem(KEY, JSON.stringify({ role: asRole, code: c })); } catch { /* abaikan */ }
  }, []);

  const startHost = useCallback(() => join("host", makeCode()), [join]);
  const connectTo = useCallback((text) => {
    const c = parseCode(text);
    if (!c) return false;
    join("remote", c);
    return true;
  }, [join]);

  /* buka link ?connect=KODE atau pulihkan sesi setelah refresh */
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = parseCode(url.searchParams.get("connect") || "");
    if (url.searchParams.has("connect")) {
      url.searchParams.delete("connect");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    if (fromUrl) { join("remote", fromUrl); return; }
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (s?.code && (s.role === "host" || s.role === "remote")) join(s.role, s.code);
    } catch { /* abaikan */ }
  }, [join]);
  useEffect(() => () => { if (chRef.current) supabase.removeChannel(chRef.current); }, []);

  /* HOST: siarkan state saat berubah, dan koreksi posisi tiap 4 detik saat memutar */
  useEffect(() => {
    if (role === "host" && status === "connected") sendState();
  }, [role, status, player.currentSong?.id, player.isPlaying, peers.length, sendState]);
  useEffect(() => {
    if (role !== "host" || !player.isPlaying) return;
    const t = setInterval(sendState, 4000);
    return () => clearInterval(t);
  }, [role, player.isPlaying, sendState]);

  /* REMOTE + "dengar bareng": putar lokal dan ikuti lagu, play/pause, dan posisi host */
  useEffect(() => {
    if (role !== "remote" || !listenHere || !remoteState) return;
    let cancelled = false;
    (async () => {
      const p = playerRef.current, a = getAudio();
      const target = remoteState.song;
      if (!target) { if (p.isPlaying) togglePlayer(p); return; }
      // posisi host saat ini (diperkirakan dari state terakhir)
      const expected = remoteState.position + (remoteState.isPlaying ? (Date.now() - remoteState.recvAt) / 1000 : 0);

      if (p.currentSong?.id !== target.id) {            // lagu beda: putar lagu host
        if (!songsCache.current?.has(target.id)) {
          const { data } = await supabase.from("songs").select("*");
          songsCache.current = new Map((data || []).map((s) => [s.id, s]));
        }
        const song = songsCache.current.get(target.id);
        if (cancelled || !song) return;
        playerRef.current.playSong(song, [song]);
        setTimeout(() => {                                // setelah lagu termuat: samakan jeda & posisi
          const q = playerRef.current;
          if (!remoteState.isPlaying && q.isPlaying) togglePlayer(q);
          seekPlayer(q, expected + 0.6);
        }, 600);
        return;
      }
      if (!!p.isPlaying !== !!remoteState.isPlaying) togglePlayer(p);   // samakan play/pause
      const cur = num(p.currentTime ?? a?.currentTime);
      if (Math.abs(cur - expected) > 1.5) seekPlayer(p, expected);      // koreksi selisih posisi
    })();
    return () => { cancelled = true; };
  }, [role, listenHere, remoteState]);

  /* beri tahu host kalau remote ini ikut mendengarkan */
  useEffect(() => {
    if (status === "connected" && chRef.current && role) {
      chRef.current.track({ id: deviceId, name: deviceName, role, listening: role === "remote" && listenHere });
    }
  }, [status, role, listenHere]);

  const setListenHere = useCallback((on) => {
    setListen(on);
    if (!on && playerRef.current.isPlaying) playerRef.current.stopPlayer?.();
  }, []);

  /* ---------- API untuk UI ---------- */
  const send = useCallback((cmd) => {
    chRef.current?.send({ type: "broadcast", event: "cmd", payload: cmd });
    if (cmd.type === "toggle") { // respons instan di sisi remote, nanti dikoreksi host
      setRemoteState((s) => {
        if (!s) return s;
        const pos = s.position + (s.isPlaying ? (Date.now() - s.recvAt) / 1000 : 0);
        return { ...s, isPlaying: !s.isPlaying, position: pos, recvAt: Date.now() };
      });
    }
  }, []);

  /** Pengganti playSong: kalau jadi remote, perintahnya dikirim ke perangkat pemutar. */
  const playSong = useCallback((song, list) => {
    if (roleRef.current === "remote") {
      send({ type: "playSong", songId: song.id, queue: (list || [song]).map((s) => s.id) });
      return;
    }
    queueRef.current = list || [song];
    playerRef.current.playSong(song, list);
  }, [send]);

  const hostOnline = peers.some((p) => p.role === "host");
  const link = code ? `${window.location.origin}${window.location.pathname}?connect=${code}` : "";

  const value = {
    role, code, link, status, peers, hostOnline, deviceId, deviceName,
    startHost, connectTo, leave, send, playSong, remoteState, listenHere, setListenHere,
    currentSong: role === "remote" ? remoteState?.song ?? null : player.currentSong,
    isPlaying: role === "remote" ? !!remoteState?.isPlaying : player.isPlaying,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
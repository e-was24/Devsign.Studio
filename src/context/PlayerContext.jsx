// src/context/PlayerContext.jsx
import { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext(null);

// ---- helper: deteksi & ekstrak video id dari link YouTube ----
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/"))
        return u.pathname.split("/embed/")[1];
      if (u.pathname.startsWith("/shorts/"))
        return u.pathname.split("/shorts/")[1];
    }
  } catch {
    return null;
  }
  return null;
}

function getSourceType(url) {
  return getYouTubeId(url) ? "youtube" : "audio";
}

// ---- helper: load YouTube IFrame API sekali aja, walau dipanggil berkali-kali ----
let ytApiPromise = null;
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve(window.YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const ytPlayerRef = useRef(null);
  const pollRef = useRef(null);

  // wrapper YT dibuat manual lewat DOM API, TIDAK PERNAH lewat JSX render,
  // supaya React gak pernah nyoba reconcile subtree yang diubah YT API
  const ytWrapperRef = useRef(null);
  const ytSlotIdRef = useRef(
    `yt-player-slot-${Math.random().toString(36).slice(2)}`,
  );

  const [currentSong, setCurrentSong] = useState(null);
  const [sourceType, setSourceType] = useState("audio"); // "audio" | "youtube"
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState("all"); // "off" | "all" | "one"

  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatModeRef = useRef(repeatMode);
  const sourceTypeRef = useRef(sourceType);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);
  useEffect(() => {
    sourceTypeRef.current = sourceType;
  }, [sourceType]);

  // ---- buat wrapper YT sekali aja saat provider mount, lepas dari React tree ----
  useEffect(() => {
    const wrapper = document.createElement("div");
    wrapper.id = ytSlotIdRef.current;
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = "40";
    wrapper.style.borderRadius = "4px";
    wrapper.style.overflow = "hidden";
    wrapper.style.boxShadow = "0 8px 20px rgba(0,0,0,0.35)";
    wrapper.style.width = "1px";
    wrapper.style.height = "1px";
    wrapper.style.bottom = "-9999px";
    wrapper.style.right = "-9999px";
    document.body.appendChild(wrapper);
    ytWrapperRef.current = wrapper;

    return () => {
      wrapper.remove();
      ytWrapperRef.current = null;
    };
  }, []);

  // ---- update posisi/ukuran wrapper via DOM langsung, bukan re-render JSX ----
  useEffect(() => {
    const wrapper = ytWrapperRef.current;
    if (!wrapper) return;

    // ukuran tetap wajar (bukan 1px) supaya YouTube gak menganggap player "disembunyikan",
    // tapi posisinya selalu di luar area yang bisa dilihat user
    wrapper.style.width = "280px";
    wrapper.style.height = "158px";
    wrapper.style.top = "-9999px";
    wrapper.style.left = "-9999px";
    wrapper.style.bottom = "auto";
    wrapper.style.right = "auto";
  }, []);

  // ---- ended handler, dipakai sama-sama oleh audio & youtube ----
  function handleTrackEnded() {
    const mode = repeatModeRef.current;
    const currentQueue = queueRef.current;
    const idx = currentIndexRef.current;

    if (mode === "one") {
      restartCurrentTrack();
      return;
    }

    if (!currentQueue || currentQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = idx + 1;
    if (nextIndex < currentQueue.length) {
      setCurrentIndex(nextIndex);
      loadAndPlay(currentQueue[nextIndex]);
    } else if (mode === "all") {
      setCurrentIndex(0);
      loadAndPlay(currentQueue[0]);
    } else {
      setIsPlaying(false);
    }
  }

  function restartCurrentTrack() {
    if (sourceTypeRef.current === "youtube") {
      ytPlayerRef.current?.seekTo(0, true);
      ytPlayerRef.current?.playVideo();
    } else {
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
    setIsPlaying(true);
  }

  // ---- setup listener elemen <audio> (untuk lagu file/link audio langsung) ----
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (sourceTypeRef.current === "audio") handleTrackEnded();
    };
    const onError = () => {
      if (sourceTypeRef.current !== "audio") return;
      console.error("Audio error:", audio.error, "src:", audio.src);
      setPlayerError("File audio gagal dimuat.");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // ---- polling waktu untuk player YouTube (API-nya gak punya event timeupdate) ----
  function startYtPolling() {
    stopYtPolling();
    pollRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      setCurrentTime(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
    }, 500);
  }
  function stopYtPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }
  useEffect(() => () => stopYtPolling(), []);

  // ---- pastikan instance YT.Player ada, buat sekali & reuse ----
  async function ensureYtPlayer() {
    if (ytPlayerRef.current) return ytPlayerRef.current;

    const YT = await loadYouTubeApi();

    return new Promise((resolve) => {
      const player = new YT.Player(ytSlotIdRef.current, {
        height: "100%",
        width: "100%",
        playerVars: { playsinline: 1, controls: 0, rel: 0 },
        events: {
          onReady: () => {
            ytPlayerRef.current = player;
            resolve(player);
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startYtPolling();
            } else if (e.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopYtPolling();
            } else if (e.data === YT.PlayerState.ENDED) {
              stopYtPolling();
              handleTrackEnded();
            }
          },
          onError: () => {
            setPlayerError(
              "Video YouTube gagal dimuat (mungkin dibatasi embed oleh pemiliknya).",
            );
            setIsPlaying(false);
          },
        },
      });
    });
  }

  // ---- load & play 1 lagu, otomatis pilih jalur audio atau youtube ----
  async function loadAndPlay(song) {
    const type = getSourceType(song.file_url);
    setSourceType(type);
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(0);
    setPlayerError(null);
    setShowPlayer(true);

    if (type === "youtube") {
      audioRef.current.pause(); // matiin jalur audio biar gak dobel suara

      const videoId = getYouTubeId(song.file_url);
      if (!videoId) {
        setPlayerError("Link YouTube tidak valid.");
        setIsPlaying(false);
        return;
      }

      const player = await ensureYtPlayer();
      player.loadVideoById(videoId);
      player.playVideo();
    } else {
      stopYtPolling();
      ytPlayerRef.current?.pauseVideo?.();

      const audio = audioRef.current;
      audio.src = song.file_url;
      audio.load();
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Play failed:", err);
          setPlayerError("File audio gagal diputar.");
          setIsPlaying(false);
        });
    }
  }

  function playSong(song, list = null) {
    if (!song?.file_url) {
      console.error("Song has no file_url:", song);
      return;
    }

    if (currentSong?.id === song.id) {
      togglePlayPause();
      setShowPlayer(true);
      return;
    }

    if (list && list.length > 0) {
      const idx = list.findIndex((s) => s.id === song.id);
      setQueue(list);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([song]);
      setCurrentIndex(0);
    }

    loadAndPlay(song);
  }

  function playNext() {
    const currentQueue = queueRef.current;
    if (!currentQueue || currentQueue.length === 0) return;
    const nextIndex = currentIndex + 1;
    const idx = nextIndex < currentQueue.length ? nextIndex : 0;
    setCurrentIndex(idx);
    loadAndPlay(currentQueue[idx]);
  }

  function playPrev() {
    const currentQueue = queueRef.current;
    if (!currentQueue || currentQueue.length === 0) return;
    const prevIndex = currentIndex - 1;
    const idx = prevIndex >= 0 ? prevIndex : currentQueue.length - 1;
    setCurrentIndex(idx);
    loadAndPlay(currentQueue[idx]);
  }

  function cycleRepeatMode() {
    setRepeatMode((prev) =>
      prev === "off" ? "all" : prev === "all" ? "one" : "off",
    );
  }

  function togglePlayPause() {
    if (sourceType === "youtube") {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } else {
      const audio = audioRef.current;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
    }
  }

  function seek(value) {
    if (sourceType === "youtube") {
      ytPlayerRef.current?.seekTo(value, true);
    } else {
      audioRef.current.currentTime = value;
    }
    setCurrentTime(value);
  }

  function closePlayer() {
    setShowPlayer(false);
  }

  function stopPlayer() {
    audioRef.current.pause();
    ytPlayerRef.current?.pauseVideo?.();
    stopYtPolling();
    setIsPlaying(false);
    setShowPlayer(false);
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        sourceType,
        isPlaying,
        currentTime,
        duration,
        showPlayer,
        playerError,
        queue,
        currentIndex,
        repeatMode,
        playSong,
        playNext,
        playPrev,
        cycleRepeatMode,
        togglePlayPause,
        seek,
        closePlayer,
        stopPlayer,
        setShowPlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}

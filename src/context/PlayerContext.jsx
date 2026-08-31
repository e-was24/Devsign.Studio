// src/context/PlayerContext.jsx
import { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);

  // queue = daftar lagu yang lagi diputar, currentIndex = posisi lagu sekarang di queue
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // "off" | "all" | "one"
  const [repeatMode, setRepeatMode] = useState("all");

  // refs biar handler "ended" selalu baca nilai terbaru (hindari stale closure)
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatModeRef = useRef(repeatMode);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // load + play 1 song tanpa ngutak-ngatik queue
  function loadAndPlay(song) {
    const audio = audioRef.current;
    audio.src = song.file_url;
    audio.load();
    audio.currentTime = 0;
    setCurrentSong(song);
    setCurrentTime(0);
    setShowPlayer(true);

    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("Play failed:", err);
        setIsPlaying(false);
      });
  }

  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);

    const onEnded = () => {
      const mode = repeatModeRef.current;
      const currentQueue = queueRef.current;
      const idx = currentIndexRef.current;

      // repeat 1 lagu terus
      if (mode === "one") {
        audio.currentTime = 0;
        audio.play().then(() => setIsPlaying(true)).catch(console.error);
        return;
      }

      // gak ada queue (misal play lagu tunggal tanpa list)
      if (!currentQueue || currentQueue.length === 0) {
        setIsPlaying(false);
        return;
      }

      const nextIndex = idx + 1;

      if (nextIndex < currentQueue.length) {
        // lanjut ke lagu berikutnya
        setCurrentIndex(nextIndex);
        loadAndPlay(currentQueue[nextIndex]);
      } else {
        // udah sampai lagu terakhir
        if (mode === "all") {
          // repet ke atas lagi
          setCurrentIndex(0);
          loadAndPlay(currentQueue[0]);
        } else {
          // mode "off" -> berhenti di lagu terakhir
          setIsPlaying(false);
        }
      }
    };

    const onError = () => {
      console.error("Audio error:", audio.error, "src:", audio.src);
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

  /**
   * Play lagu.
   * @param {object} song - lagu yang mau diputar
   * @param {object[]} [list] - opsional, daftar lagu (playlist) tempat `song` berada.
   *   Kalau dikasih, next/repeat bakal jalan di dalam list ini.
   */
  function playSong(song, list = null) {
    const audio = audioRef.current;

    if (!song?.file_url) {
      console.error("Song has no file_url:", song);
      return;
    }

    // toggle play/pause kalau klik lagu yang sama & lagi aktif
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(console.error);
      }
      setShowPlayer(true);
      return;
    }

    if (list && list.length > 0) {
      const idx = list.findIndex((s) => s.id === song.id);
      setQueue(list);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      // gak ada list dikasih -> anggap queue cuma lagu ini sendiri
      setQueue([song]);
      setCurrentIndex(0);
    }

    loadAndPlay(song);
  }

  function playNext() {
    const currentQueue = queueRef.current;
    if (!currentQueue || currentQueue.length === 0) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex < currentQueue.length) {
      setCurrentIndex(nextIndex);
      loadAndPlay(currentQueue[nextIndex]);
    } else {
      // tombol "next" manual selalu wrap ke awal
      setCurrentIndex(0);
      loadAndPlay(currentQueue[0]);
    }
  }

  function playPrev() {
    const currentQueue = queueRef.current;
    if (!currentQueue || currentQueue.length === 0) return;

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      loadAndPlay(currentQueue[prevIndex]);
    } else {
      setCurrentIndex(currentQueue.length - 1);
      loadAndPlay(currentQueue[currentQueue.length - 1]);
    }
  }

  // siklus: off -> all -> one -> off
  function cycleRepeatMode() {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }

  function seek(value) {
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  }

  function closePlayer() {
    // cuma nutup popup, musik TETAP jalan di background
    setShowPlayer(false);
  }

  function stopPlayer() {
    // kalau butuh benar-benar stop musiknya
    audioRef.current.pause();
    setIsPlaying(false);
    setShowPlayer(false);
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        showPlayer,
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
// src/components/MiniPlayer.jsx
import { usePlayer } from "../context/PlayerContext";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    showPlayer,
    repeatMode,
    togglePlayPause,
    playNext,
    playPrev,
    cycleRepeatMode,
    seek,
    closePlayer,
  } = usePlayer();

  if (!showPlayer || !currentSong) return null;

  return (
    <div className="player-overlay" onClick={closePlayer}>
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <button className="player-close" onClick={closePlayer}>
          ✕
        </button>
        <div className="player-cover">🎵</div>
        <p className="player-title">{currentSong.title}</p>
        <p className="player-artist">by {currentSong.artist}</p>

        <div className="player-progress">
          <span className="player-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="player-seek"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>

        <div className="player-controls">
          <button
            className={`player-repeat ${repeatMode !== "off" ? "active" : ""}`}
            onClick={cycleRepeatMode}
            title={
              repeatMode === "off"
                ? "Repeat off"
                : repeatMode === "all"
                  ? "Repeat semua lagu"
                  : "Repeat 1 lagu"
            }
          >
            {repeatMode === "one" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
                fill="currentColor"
              >
                <path d="M120-40q-33 0-56.5-23.5T40-120v-720q0-33 23.5-56.5T120-920h720q33 0 56.5 23.5T920-840v720q0 33-23.5 56.5T840-40H120Zm160-40 56-58-62-62h486v-240h-80v160H274l62-62-56-58-160 160L280-80Zm-80-440h80v-160h406l-62 62 56 58 160-160-160-160-56 58 62 62H200v240Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
                fill="currentColor"
              >
                <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z" />
              </svg>
            )}
          </button>

          <button className="player-skip" onClick={playPrev} title="Sebelumnya">
            ⏮
          </button>

          <button className="player-playpause" onClick={togglePlayPause}>
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            className="player-skip"
            onClick={playNext}
            title="Selanjutnya"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

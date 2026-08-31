import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { usePlayer } from "../context/PlayerContext";
import "./css/songs.css";

export default function Songs() {
  const [songs, setSongs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  // ---- player (dari context global, TIDAK lagi lokal) ----
  const { currentSong, isPlaying, playSong } = usePlayer();

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("position", { ascending: true });

    if (!error) setSongs(data);
  }

  function resetForm() {
    setTitle("");
    setArtist("");
    setFile(null);
    setError("");
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");

    if (!title || !artist || !file) {
      setError("Nama lagu, artist, dan file lagu wajib diisi.");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("music")
        .upload(fileName, file, {
          upsert: false,
          contentType: file.type || "audio/mpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("music")
        .getPublicUrl(fileName);

      const nextPosition = songs.length
        ? Math.max(...songs.map((s) => s.position)) + 1
        : 1;

      const { error: insertError } = await supabase.from("songs").insert({
        title,
        artist,
        file_url: publicUrlData.publicUrl,
        file_path: fileName,
        position: nextPosition,
      });

      if (insertError) throw insertError;

      await fetchSongs();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Gagal upload, coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  // ---- drag & drop reorder ----

  function handleDragStart(e, index) {
    dragItem.current = index;
    setDraggingId(songs[index].id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(e, index) {
    dragOverItem.current = index;
    setOverId(songs[index].id);
  }

  function handleDragEnd() {
    const from = dragItem.current;
    const to = dragOverItem.current;

    setDraggingId(null);
    setOverId(null);
    dragItem.current = null;
    dragOverItem.current = null;

    if (from === null || to === null || from === to) return;

    const reordered = [...songs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    setSongs(reordered);
    persistOrder(reordered);
  }

  async function persistOrder(list) {
    const updates = list.map((song, index) =>
      supabase
        .from("songs")
        .update({ position: index + 1 })
        .eq("id", song.id),
    );
    await Promise.all(updates);
  }

  return (
    <>
      <div className="songs-section">
        <div className="songs-header">
          <h2>Our Songs</h2>
          <button className="upload-btn" onClick={() => setShowForm(true)}>
            + Upload
          </button>
        </div>

        <div className="album">
          {songs.length === 0 && (
            <p className="empty-state">
              Belum ada lagu. Upload lagu pertamamu.
            </p>
          )}

          {songs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                className={`song-card ${draggingId === song.id ? "dragging" : ""} ${
                  overId === song.id && draggingId !== song.id
                    ? "drag-over"
                    : ""
                } ${isActive ? "active" : ""}`}
                key={song.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle">⠿</div>

                <button
                  className="song-cover"
                  onClick={() => playSong(song, songs)}
                  aria-label={isActive && isPlaying ? "Pause" : "Play"}
                >
                  <span className="cover-icon">🎵</span>
                  <span className="cover-play-overlay">
                    {isActive && isPlaying ? "⏸" : "▶"}
                  </span>
                </button>

                <div className="song-info">
                  <p className="song-title">{song.title}</p>
                  <p className="song-artist">by {song.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* form upload */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => !uploading && setShowForm(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Upload Lagu</h3>
            <form onSubmit={handleUpload}>
              <label>
                Nama lagu
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul lagu"
                />
              </label>

              <label>
                by
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Nama artist"
                />
              </label>

              <label>
                File lagu (1 file)
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowForm(false)}
                  disabled={uploading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
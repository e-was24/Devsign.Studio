import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { usePlayer } from "../context/PlayerContext";
import "./css/songs.css";
import { IconFileNote, IconLink, IconUpload, IconTrash } from "./icon/ico";

export default function Songs() {
  const [songs, setSongs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const [inputType, setInputType] = useState("file");
  const [file, setFile] = useState(null);
  const [songLink, setSongLink] = useState("");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null); // lagu mana yang lagi diproses hapus

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  const { currentSong, isPlaying, playSong, stopPlayer } = usePlayer();

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
    setSongLink("");
    setInputType("file");
    setError("");
  }

  function switchInputType(type) {
    setInputType(type);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (
      !title ||
      !artist ||
      (inputType === "file" && !file) ||
      (inputType === "link" && !songLink)
    ) {
      setError("Semua field wajib diisi dengan benar.");
      return;
    }

    setUploading(true);

    try {
      let finalFileUrl = "";
      let finalFilePath = null;

      if (inputType === "file") {
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

        finalFileUrl = publicUrlData.publicUrl;
        finalFilePath = fileName;
      } else {
        finalFileUrl = songLink;
        finalFilePath = null;
      }

      const nextPosition = songs.length
        ? Math.max(...songs.map((s) => s.position)) + 1
        : 1;

      const { error: insertError } = await supabase.from("songs").insert({
        title,
        artist,
        file_url: finalFileUrl,
        file_path: finalFilePath,
        position: nextPosition,
      });

      if (insertError) throw insertError;

      await fetchSongs();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data, coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  // ---- hapus lagu ----
  // ---- hapus lagu ----
async function handleDelete(song, e) {
  e.stopPropagation();

  const confirmed = window.confirm(
    `Hapus "${song.title}" dari daftar lagu? Tindakan ini tidak bisa dibatalkan.`
  );
  if (!confirmed) return;

  setDeletingId(song.id);

  try {
    if (currentSong?.id === song.id) {
      stopPlayer();
    }

    if (song.file_path) {
      const { error: storageError } = await supabase.storage
        .from("music")
        .remove([song.file_path]);

      if (storageError) {
        console.error("Gagal hapus file di storage:", storageError);
      }
    }

    // .select() dipakai supaya kita tau baris mana yang BENERAN kehapus.
    // Tanpa ini, RLS bisa diam-diam blokir delete tanpa error apapun.
    const { data: deletedRows, error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", song.id)
      .select();

    if (deleteError) throw deleteError;

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        "Lagu gagal terhapus dari database. Kemungkinan besar policy RLS di tabel 'songs' memblokir DELETE. Cek Supabase Dashboard > Authentication > Policies."
      );
    }

    // update state lokal langsung, gak nunggu fetchSongs() lagi
    setSongs((prev) => prev.filter((s) => s.id !== song.id));
  } catch (err) {
    alert(err.message || "Gagal menghapus lagu, coba lagi.");
  } finally {
    setDeletingId(null);
  }
}

  // ---- drag & drop reorder (tetap sama) ----
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
            + Tambah Lagu
          </button>
        </div>

        <div className="album">
          {songs.length === 0 && (
            <p className="empty-state">
              Belum ada lagu. Tambahkan lagu pertamamu.
            </p>
          )}

          {songs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            const isDeleting = deletingId === song.id;
            return (
              <div
                className={`song-card ${draggingId === song.id ? "dragging" : ""} ${
                  overId === song.id && draggingId !== song.id
                    ? "drag-over"
                    : ""
                } ${isActive ? "active" : ""} ${isDeleting ? "deleting" : ""}`}
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

                <button
                  className="song-delete"
                  onClick={(e) => handleDelete(song, e)}
                  disabled={isDeleting}
                  aria-label={`Hapus ${song.title}`}
                  title="Hapus lagu"
                >
                  <IconTrash />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => !uploading && setShowForm(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Lagu</h3>
            <form onSubmit={handleSubmit}>
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

              <div
                className="input-type-toggle"
                role="radiogroup"
                aria-label="Tipe input lagu"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={inputType === "file"}
                  className={`type-option ${inputType === "file" ? "active" : ""}`}
                  onClick={() => switchInputType("file")}
                >
                  <IconUpload />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={inputType === "link"}
                  className={`type-option ${inputType === "link" ? "active" : ""}`}
                  onClick={() => switchInputType("link")}
                >
                  <IconLink />
                  <span>Link URL</span>
                </button>
              </div>

              {inputType === "file" ? (
                <label className="file-field">
                  File lagu (.mp3, dll)
                  <div className="file-input-wrapper">
                    <label htmlFor="song-file" className="file-input-label">
                      <IconUpload />
                      Pilih file
                    </label>
                    <input
                      id="song-file"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                      className="file-input-hidden"
                    />
                    <span className="file-name-display">
                      {file ? (
                        <>
                          <IconFileNote /> {file.name}
                        </>
                      ) : (
                        "Belum ada file dipilih"
                      )}
                    </span>
                  </div>
                </label>
              ) : (
                <label>
                  Link YouTube / Audio URL
                  <input
                    type="url"
                    value={songLink}
                    onChange={(e) => setSongLink(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </label>
              )}

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
                  {uploading ? "Menyimpan..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
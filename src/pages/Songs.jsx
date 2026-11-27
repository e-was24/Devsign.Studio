import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { usePlayer } from "../context/PlayerContext";
import "./css/songs.css";   // tetap dipakai: gaya modal, kartu lagu, dan pemutar
import "./css/albums.css";  // baru: rak album, sampul, lirik
import { IconFileNote, IconLink, IconUpload, IconTrash } from "./icon/ico";

const COVER_BUCKET = "album-covers";
const coverUrl = (p) => (p ? supabase.storage.from(COVER_BUCKET).getPublicUrl(p).data.publicUrl : null);

// potong persegi dari tengah + kecilkan ke maks 600px
const squareCover = (file) => new Promise((res, rej) => {
  const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement("canvas");
    c.width = c.height = Math.min(600, s);
    c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u);
    c.toBlob((b) => (b ? res(b) : rej(new Error("Gagal memproses gambar"))), "image/jpeg", 0.85);
  };
  img.onerror = () => rej(new Error("Format gambar tidak didukung"));
  img.src = u;
});

/* ---------- sampul album + piringan hitam yang mengintip ---------- */
function Sleeve({ album, big }) {
  const url = coverUrl(album?.cover_path);
  return (
    <div className={"al-sleeve" + (big ? " big" : "")}>
      <span className="al-vinyl" />
      <span className="al-cover" style={url ? { backgroundImage: `url("${url}")` } : undefined}>
        {!url && <b>{album?.virtual ? "♪" : (album?.name || "?")[0]}</b>}
      </span>
    </div>
  );
}

/* ---------- form album (baru / ubah) ---------- */
function AlbumForm({ album, nextPos, onClose, onSaved }) {
  const [name, setName] = useState(album?.name || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(coverUrl(album?.cover_path));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Nama album wajib diisi.");
    setBusy(true); setError("");
    try {
      let cover_path = album?.cover_path || null;
      if (file) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from(COVER_BUCKET)
          .upload(path, await squareCover(file), { contentType: "image/jpeg", cacheControl: "31536000" });
        if (upErr) throw upErr;
        if (cover_path) supabase.storage.from(COVER_BUCKET).remove([cover_path]);
        cover_path = path;
      }
      const row = { name: name.trim(), cover_path };
      const q = album
        ? supabase.from("albums").update(row).eq("id", album.id)
        : supabase.from("albums").insert({ ...row, position: nextPos });
      const { data, error: err } = await q.select().single();
      if (err) throw err;
      onSaved(data);
    } catch (err) { setError(err.message || "Gagal menyimpan album."); setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{album ? "Ubah Album" : "Album Baru"}</h3>
        <form onSubmit={save}>
          <label>Nama album
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Judul album" autoFocus />
          </label>
          <div className="al-cover-pick">
            <div className="al-prev" style={preview ? { backgroundImage: `url("${preview}")` } : undefined}>{!preview && "♪"}</div>
            <div>
              <label htmlFor="album-cover" className="file-input-label"><IconUpload />{preview ? "Ganti foto" : "Pilih foto album"}</label>
              <input id="album-cover" type="file" accept="image/*" className="file-input-hidden"
                onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
              <p className="al-hint">Dipotong persegi otomatis.</p>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={busy}>Batal</button>
            <button type="submit" className="submit-btn" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- form lagu (tambah / ubah) + lirik ---------- */
function SongModal({ song, albums, defaultAlbum, nextPos, onClose, onSaved }) {
  const edit = !!song;
  const [title, setTitle] = useState(song?.title || "");
  const [artist, setArtist] = useState(song?.artist || "");
  const [albumId, setAlbumId] = useState(String(song ? song.album_id ?? "" : defaultAlbum));
  const [type, setType] = useState("file");
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [lyrics, setLyrics] = useState(song?.lyrics || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (!title || !artist || (!edit && ((type === "file" && !file) || (type === "link" && !link)))) {
      return setError("Judul, artist, dan sumber lagu wajib diisi.");
    }
    setBusy(true); setError("");
    try {
      const base = { title, artist, lyrics: lyrics.trim() || null, album_id: albumId === "" ? null : Number(albumId) };
      let q;
      if (edit) {
        q = supabase.from("songs").update(base).eq("id", song.id);
      } else {
        let file_url = link, file_path = null;
        if (type === "file") {
          const ext = file.name.split(".").pop();
          file_path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("music").upload(file_path, file, { upsert: false, contentType: file.type || "audio/mpeg" });
          if (upErr) throw upErr;
          file_url = supabase.storage.from("music").getPublicUrl(file_path).data.publicUrl;
        }
        q = supabase.from("songs").insert({ ...base, file_url, file_path, position: nextPos });
      }
      const { data, error: err } = await q.select().single();
      if (err) throw err;
      onSaved(data, edit);
    } catch (err) { setError(err.message || "Gagal menyimpan lagu."); setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>{edit ? "Ubah Lagu" : "Tambah Lagu"}</h3>
        <form onSubmit={save}>
          <label>Nama lagu<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul lagu" /></label>
          <label>by<input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Nama artist" /></label>
          <label>Album
            <select value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
              <option value="">Tanpa album</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          {!edit && (
            <>
              <div className="input-type-toggle" role="radiogroup" aria-label="Tipe input lagu">
                <button type="button" role="radio" aria-checked={type === "file"} className={`type-option ${type === "file" ? "active" : ""}`} onClick={() => setType("file")}><IconUpload /><span>Upload File</span></button>
                <button type="button" role="radio" aria-checked={type === "link"} className={`type-option ${type === "link" ? "active" : ""}`} onClick={() => setType("link")}><IconLink /><span>Link URL</span></button>
              </div>
              {type === "file" ? (
                <div className="file-input-wrapper">
                  <label htmlFor="song-file" className="file-input-label"><IconUpload />Pilih file lagu</label>
                  <input id="song-file" type="file" accept="audio/*" className="file-input-hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
                  <span className="file-name-display">{file ? <><IconFileNote /> {file.name}</> : "Belum ada file dipilih"}</span>
                </div>
              ) : (
                <label>Link YouTube / Audio URL<input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></label>
              )}
            </>
          )}

          <label>Lirik (opsional)
            <textarea className="al-text" rows={6} value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Tempel lirik di sini, atau unggah file .txt" />
          </label>
          <div>
            <label htmlFor="lyr-file" className="file-input-label"><IconFileNote />Unggah lirik (.txt / .lrc)</label>
            <input id="lyr-file" type="file" accept=".txt,.lrc,text/plain" className="file-input-hidden"
              onChange={async (e) => { const f = e.target.files[0]; if (f) setLyrics(await f.text()); e.target.value = ""; }} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={busy}>Batal</button>
            <button type="submit" className="submit-btn" disabled={busy}>{busy ? "Menyimpan..." : edit ? "Simpan" : "Post"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- halaman ---------- */
export default function Songs() {
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [open, setOpen] = useState(null);            // null = rak album, "none" = tanpa album, angka = id album
  const [albumForm, setAlbumForm] = useState(null);  // null | {} (baru) | album (ubah)
  const [songForm, setSongForm] = useState(null);    // null | {} (baru) | lagu (ubah)
  const [lyricsOf, setLyricsOf] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const cardRefs = useRef([]), dragFrom = useRef(null), dragTo = useRef(null);
  const { currentSong, isPlaying, playSong, stopPlayer } = usePlayer();

  useEffect(() => {
    (async () => {
      const [a, s] = await Promise.all([
        supabase.from("albums").select("*").order("position").order("id"),
        supabase.from("songs").select("*").order("position"),
      ]);
      if (!a.error) setAlbums(a.data);
      if (!s.error) setSongs(s.data);
    })();
  }, []);

  const album = typeof open === "number" ? albums.find((a) => a.id === open)
    : open === "none" ? { id: null, name: "Tanpa album", virtual: true } : null;
  const inAlbum = (s, id) => (id === null ? !s.album_id : s.album_id === id);
  const tracks = album ? songs.filter((s) => inAlbum(s, album.id)).sort((a, b) => a.position - b.position) : [];
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const nextPos = songs.length ? Math.max(...songs.map((s) => s.position || 0)) + 1 : 1;
  const loose = songs.filter((s) => !s.album_id).length;

  /* ---- hapus ---- */
  async function deleteSong(song) {
    if (!window.confirm(`Hapus "${song.title}" dari daftar lagu? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(song.id);
    try {
      if (currentSong?.id === song.id) stopPlayer();
      if (song.file_path) await supabase.storage.from("music").remove([song.file_path]);
      const { data, error } = await supabase.from("songs").delete().eq("id", song.id).select();
      if (error) throw error;
      if (!data?.length) throw new Error("Lagu gagal terhapus. Kemungkinan policy RLS di tabel 'songs' memblokir DELETE.");
      setSongs((p) => p.filter((s) => s.id !== song.id));
    } catch (e) { alert(e.message || "Gagal menghapus lagu."); }
    finally { setDeletingId(null); }
  }
  async function deleteAlbum(a) {
    if (!window.confirm(`Hapus album "${a.name}"? Lagunya tidak ikut terhapus, hanya pindah ke "Tanpa album".`)) return;
    if (a.cover_path) await supabase.storage.from(COVER_BUCKET).remove([a.cover_path]);
    const { error } = await supabase.from("albums").delete().eq("id", a.id);
    if (error) return alert(error.message);
    setSongs((p) => p.map((s) => (s.album_id === a.id ? { ...s, album_id: null } : s)));
    setAlbums((p) => p.filter((x) => x.id !== a.id));
    setOpen(null);
  }

  /* ---- drag & drop urutan lagu dalam satu album (Pointer Events: mouse & touch) ---- */
  const onMove = useCallback((e) => {
    if (dragFrom.current === null) return;
    e.preventDefault();
    const i = cardRefs.current.findIndex((n) => {
      if (!n) return false;
      const r = n.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (i === -1 || i === dragTo.current) return;
    dragTo.current = i;
    setOverId(tracksRef.current[i]?.id ?? null);
  }, []);
  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    const from = dragFrom.current, to = dragTo.current;
    dragFrom.current = dragTo.current = null;
    setDragId(null); setOverId(null);
    if (from === null || to === null || from === to) return;
    const list = [...tracksRef.current];
    const slots = list.map((s) => s.position).sort((a, b) => a - b); // pakai ulang nomor posisi yang sama
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    const next = new Map(list.map((s, i) => [s.id, slots[i]]));
    setSongs((p) => p.map((s) => (next.has(s.id) ? { ...s, position: next.get(s.id) } : s)));
    list.forEach((s, i) => supabase.from("songs").update({ position: slots[i] }).eq("id", s.id).then(() => {}));
  }, [onMove]);
  function dragStart(e, i) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    dragFrom.current = dragTo.current = i;
    setDragId(tracks[i].id);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }
  useEffect(() => () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }, [onMove, onUp]);

  return (
    <>
      <div className="songs-section">
        {!album ? (
          /* ===== RAK ALBUM ===== */
          <>
            <div className="songs-header">
              <h2>Our Songs</h2>
              <button className="upload-btn" onClick={() => setAlbumForm({})}>+ Buat Album</button>
            </div>
            {albums.length === 0 && loose === 0 && <p className="empty-state">Belum ada album. Buat album pertamamu.</p>}
            <div className="al-shelf">
              {albums.map((a) => (
                <button key={a.id} className="al-item" onClick={() => setOpen(a.id)}>
                  <Sleeve album={a} />
                  <span className="al-name">{a.name}</span>
                  <span className="al-count">{songs.filter((s) => s.album_id === a.id).length} lagu</span>
                </button>
              ))}
              {loose > 0 && (
                <button className="al-item" onClick={() => setOpen("none")}>
                  <Sleeve album={{ virtual: true }} />
                  <span className="al-name">Tanpa album</span>
                  <span className="al-count">{loose} lagu</span>
                </button>
              )}
            </div>
          </>
        ) : (
          /* ===== ISI ALBUM ===== */
          <>
            <div className="songs-header">
              <button className="al-link" onClick={() => setOpen(null)}>← Semua album</button>
              <button className="upload-btn" onClick={() => setSongForm({ new: true })}>+ Tambah Lagu</button>
            </div>
            <section className="al-hero">
              <div className="al-hero-cover"><Sleeve album={album} big /></div>
              <div className="al-hero-info">
                <h2>{album.name}</h2>
                <p className="al-count">{tracks.length} lagu</p>
                {!album.virtual && (
                  <div className="al-actions">
                    <button className="al-link" onClick={() => setAlbumForm(album)}>Ubah album & foto</button>
                    <button className="al-link danger" onClick={() => deleteAlbum(album)}>Hapus album</button>
                  </div>
                )}
              </div>
            </section>

            <ol className="album">
              {tracks.length === 0 && <p className="empty-state">Album ini masih kosong. Tambahkan lagu pertamamu.</p>}
              {tracks.map((s, i) => {
                const active = currentSong?.id === s.id;
                return (
                  <li
                    key={s.id}
                    ref={(n) => { cardRefs.current[i] = n; }}
                    className={`song-card ${dragId === s.id ? "dragging" : ""} ${overId === s.id && dragId !== s.id ? "drag-over" : ""} ${active ? "active" : ""} ${deletingId === s.id ? "deleting" : ""}`}
                  >
                    <div className="drag-handle" style={{ touchAction: "none", userSelect: "none" }} onPointerDown={(e) => dragStart(e, i)}>⠿</div>
                    <span className="al-num">{i + 1}</span>
                    <button className="song-cover" onClick={() => playSong(s, tracks)} aria-label={active && isPlaying ? "Pause" : "Play"}>
                      <span className="cover-icon">🎵</span>
                      <span className="cover-play-overlay">{active && isPlaying ? "⏸" : "▶"}</span>
                    </button>
                    <div className="song-info">
                      <p className="song-title">{s.title}</p>
                      <p className="song-artist">by {s.artist}</p>
                    </div>
                    <button className={"al-lyr" + (s.lyrics ? " has" : "")} onClick={() => (s.lyrics ? setLyricsOf(s) : setSongForm(s))}>
                      {s.lyrics ? "Lirik" : "+ Lirik"}
                    </button>
                    <button className="al-lyr" onClick={() => setSongForm(s)}>Ubah</button>
                    <button className="song-delete" onClick={() => deleteSong(s)} disabled={deletingId === s.id} aria-label={`Hapus ${s.title}`} title="Hapus lagu"><IconTrash /></button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {albumForm && (
        <AlbumForm
          album={albumForm.id ? albumForm : null}
          nextPos={albums.length ? Math.max(...albums.map((a) => a.position || 0)) + 1 : 1}
          onClose={() => setAlbumForm(null)}
          onSaved={(row) => {
            setAlbums((p) => (p.some((a) => a.id === row.id) ? p.map((a) => (a.id === row.id ? row : a)) : [...p, row]));
            setAlbumForm(null);
          }}
        />
      )}
      {songForm && (
        <SongModal
          song={songForm.id ? songForm : null}
          albums={albums}
          defaultAlbum={typeof open === "number" ? open : ""}
          nextPos={nextPos}
          onClose={() => setSongForm(null)}
          onSaved={(row, edit) => {
            setSongs((p) => (edit ? p.map((s) => (s.id === row.id ? row : s)) : [...p, row]));
            setSongForm(null);
          }}
        />
      )}
      {lyricsOf && (
        <div className="modal-overlay" onClick={() => setLyricsOf(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{lyricsOf.title}</h3>
            <p className="al-lyr-artist">by {lyricsOf.artist}</p>
            <div className="al-lyrics">{lyricsOf.lyrics}</div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setLyricsOf(null)}>Tutup</button>
              <button className="submit-btn" onClick={() => { setSongForm(lyricsOf); setLyricsOf(null); }}>Ubah lirik</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { slugify } from "../utils/slugify";
import "./css/create-folder-modal.css";

export default function CreateFolderModal({ journeyId = null, onClose, onCreated }) {
  const [folderTitle, setFolderTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function handleTitleChange(value) {
    setFolderTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!folderTitle.trim()) {
      setErrorMsg("Nama folder wajib diisi.");
      return;
    }
    const finalSlug = slugify(slug || folderTitle);
    if (!finalSlug) {
      setErrorMsg("Slug tidak valid.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase.from("gallery_folder").insert({
      folder_title: folderTitle.trim(),
      slug: finalSlug,
      description: description.trim() || null,
      category: category.trim() || null,
      is_private: isPrivate,
      journey_id: journeyId,
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      setErrorMsg(
        error.code === "23505"
          ? "Slug ini sudah dipakai folder lain, coba ganti."
          : "Gagal membuat folder, coba lagi."
      );
      return;
    }

    onCreated();
  }

  return (
    <div className="folder-modal-overlay" onClick={onClose}>
      <div className="folder-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="folder-modal-close" onClick={onClose} aria-label="Tutup">
          &times;
        </button>

        <h2 className="folder-modal-title">Folder Baru</h2>

        <form onSubmit={handleSubmit} className="folder-modal-form">
          <label className="folder-modal-field">
            <span>Nama Folder</span>
            <input
              type="text"
              value={folderTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Pare"
              autoFocus
            />
          </label>

          <label className="folder-modal-field">
            <span>Slug (buat link masuk section)</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="pare"
            />
            <small>/galery/{slug || "..."}</small>
          </label>

          <label className="folder-modal-field">
            <span>Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat (opsional)"
              rows={3}
            />
          </label>

          <label className="folder-modal-field">
            <span>Kategori</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Contoh: liburan, keluarga, kerja"
            />
          </label>

          {/* <label className="folder-modal-checkbox">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Jadikan folder privat</span>
          </label> */}

          {errorMsg && <p className="folder-modal-error">{errorMsg}</p>}

          <div className="folder-modal-actions">
            <button type="button" className="folder-modal-btn secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="folder-modal-btn primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
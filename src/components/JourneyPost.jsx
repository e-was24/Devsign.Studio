import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./css/post.css";

export default function Post({ onJourneyAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // State untuk data journey utama
  const [formData, setFormData] = useState({
    year: "2026",
    month_label: "",
    title: "",
    order_index: 1,
  });

  const [coverFile, setCoverFile] = useState(null); // Hanya 1 foto cover utama

  // Fungsi enkripsi & rename file agar aman & unik
  const encryptAndRename = (file) => {
    const ext = file.name.split(".").pop();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${Date.now()}-${randomStr}.${ext}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coverFile) return alert("Pilih foto cover dulu!");

    setLoading(true);
    try {
      // 1. Upload Cover Utama ke Supabase Storage
      const safeCoverName = encryptAndRename(coverFile);
      const coverPath = `covers/${safeCoverName}`;

      const { error: coverErr } = await supabase.storage
        .from("galeri")
        .upload(coverPath, coverFile);
      if (coverErr) throw coverErr;

      const {
        data: { publicUrl: coverUrl },
      } = supabase.storage.from("galeri").getPublicUrl(coverPath);

      // 2. Simpan data Journey ke tabel 'journeys'
      const { error: journeyErr } = await supabase
        .from("journeys")
        .insert([
          {
            year: parseInt(formData.year),
            month_label: formData.month_label.toUpperCase(),
            title: formData.title.toUpperCase(),
            cover_url: coverUrl,
            order_index: parseInt(formData.order_index),
          },
        ]);

      if (journeyErr) throw journeyErr;

      alert("Journey baru berhasil ditambahkan! 🎉");
      setIsOpen(false);
      
      // Reset Form
      setFormData({
        year: "2026",
        month_label: "",
        title: "",
        order_index: 1,
      });
      setCoverFile(null);

      // Refresh data di halaman utama jika fungsi props tersedia
      if (onJourneyAdded) onJourneyAdded();
      
    } catch (err) {
      console.error(err);
      alert("Gagal mengupload journey.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn-post" onClick={() => setIsOpen(true)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e3e3e3"
        >
          <path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q25-92 100-149t170-57q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H520q-33 0-56.5-23.5T440-240v-206l-64 62-56-56 160-160 160 160-56 56-64-62v206h220q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-83 0-141.5 58.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h100v80H260Zm220-280Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="journey-popup-overlay">
          <div className="journey-popup-box">
            <h2 className="journey-popup-title">Tambah Perjalanan Baru</h2>

            <form onSubmit={handleSubmit}>
              <div className="journey-form-group">
                <label className="journey-label">Tahun</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="journey-input"
                  required
                />
              </div>

              <div className="journey-form-group">
                <label className="journey-label">Bulan (Contoh: AUG)</label>
                <input
                  type="text"
                  placeholder="AUG"
                  value={formData.month_label}
                  onChange={(e) =>
                    setFormData({ ...formData, month_label: e.target.value })
                  }
                  className="journey-input"
                  required
                />
              </div>

              <div className="journey-form-group">
                <label className="journey-label">
                  Judul Kota (Contoh: SOLO)
                </label>
                <input
                  type="text"
                  placeholder="SOLO"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="journey-input"
                  required
                />
              </div>

              <div className="journey-form-group">
                <label className="journey-label">Urutan Timeline (Index)</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData({ ...formData, order_index: e.target.value })
                  }
                  className="journey-input"
                  required
                />
              </div>

              <div className="journey-form-group">
                <label className="journey-label">Foto Cover Card (Utama)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="journey-input"
                  required
                />
              </div>

              <div className="journey-popup-actions">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="journey-btn-cancel"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="journey-btn-submit"
                >
                  {loading ? "Mengupload..." : "Simpan Journey"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
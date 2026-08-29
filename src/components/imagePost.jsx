import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createPortal } from "react-dom";
import "./css/imgPost.css";
import { isGuestSession } from "./AccessGate";

export default function ImgPost({ journeyId, onUploadSuccess, onOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [visible, setVisible] = useState(false);

  // --- STATE BARU: notifikasi custom ---
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error' | 'warning', message: string }

  // Mengambil tanggal otomatis saat ini
  const today = new Date();
  const currentYear = today.getFullYear().toString();
  const currentDateNum = today.getDate().toString();

  // Mengambil nama bulan otomatis dalam bentuk teks (contoh: "Agustus" atau "August")
  const currentMonthName = today.toLocaleString("id-ID", { month: "long" });

  const [formData, setFormData] = useState({
    year: currentYear,
    month_label: currentMonthName,
    date_number: currentDateNum,
    title: "",
  });

  // Auto-dismiss notifikasi
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    setVisible(!isGuestSession());
  });

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setFiles((prev) => [...prev, ...selectedFiles]);

    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const encryptAndRename = (file) => {
    const ext = file.name.split(".").pop();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${Date.now()}-${randomStr}.${ext}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setNotification({
        type: "warning",
        message: "Pilih minimal 1 foto atau video!",
      });
      return;
    }

    setLoading(true);
    try {
      const fullDateLabel =
        `${formData.date_number} ${formData.month_label} ${formData.year}`.toLowerCase();

      for (const file of files) {
        const safeName = encryptAndRename(file);
        const filePath = `items/${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("galeri")
          .upload(filePath, file);

        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from("galeri").getPublicUrl(filePath);

        const mediaType = file.type.includes("video") ? "video" : "image";

        const { error: dbErr } = await supabase.from("gallery_items").insert([
          {
            journey_id: journeyId,
            media_url: publicUrl,
            media_type: mediaType,
            date_label: fullDateLabel,
            alt_text: formData.title || "Dokumentasi perjalanan",
          },
        ]);

        if (dbErr) throw dbErr;
      }

      setNotification({
        type: "success",
        message: "Foto/video baru berhasil ditambahkan! 🎉",
      });

      setFiles([]);
      setPreviews([]);
      setFormData({
        year: "2026",
        month_label: "Agustus",
        date_number: "15",
        title: "",
      });
      setIsOpen(false);

      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Gagal mengupload foto/video.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <button
        title="unggah foto"
        className="sidebar-action-btn imgPost-btn"
        onClick={() => {
          setIsOpen(true);
          if (onOpen) onOpen();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e3e3e3"
        >
          <path d="M480-480ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h320v80H200v560h560v-320h80v320q0 33-23.5 56.5T760-120H200Zm40-160h480L570-480 450-320l-90-120-120 160Zm440-320v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div className="journey-popup-overlay">
            <div className="journey-popup-box">
              <h2 className="journey-popup-title">Tambah Foto/Video Galeri</h2>

              <form onSubmit={handleSubmit}>
                <div className="journey-form-group">
                  <label className="journey-label">Tanggal (Contoh: 15)</label>
                  <input
                    type="number"
                    value={formData.date_number}
                    onChange={(e) =>
                      setFormData({ ...formData, date_number: e.target.value })
                    }
                    placeholder="15"
                    className="journey-input"
                    required
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">Bulan</label>
                  <input
                    type="text"
                    placeholder="Agustus"
                    value={formData.month_label}
                    onChange={(e) =>
                      setFormData({ ...formData, month_label: e.target.value })
                    }
                    className="journey-input"
                    required
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">Tahun</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    placeholder="2026"
                    className="journey-input"
                    required
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">Judul Kota / Tempat</label>
                  <input
                    type="text"
                    placeholder="solo"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="journey-input"
                    required
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">Pilih File</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="journey-input"
                    required
                  />

                  {previews.length > 0 && (
                    <div className="journey-preview-container">
                      {previews.map((src, index) => (
                        <div key={index} className="journey-preview-item">
                          {files[index].type.includes("video") ? (
                            <video
                              src={src}
                              className="journey-preview-media"
                            />
                          ) : (
                            <img
                              src={src}
                              alt="Preview"
                              className="journey-preview-media"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="journey-preview-remove"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="journey-popup-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setFiles([]);
                      setPreviews([]);
                      setFormData({
                        year: "2026",
                        month_label: "Agustus",
                        date_number: "15",
                        title: "",
                      });
                    }}
                    className="journey-btn-cancel"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || files.length === 0}
                    className="journey-btn-submit"
                  >
                    {loading ? "Mengupload..." : `Upload (${files.length})`}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* --- NOTIFIKASI TOAST (custom, bukan alert) --- */}
      {notification &&
        createPortal(
          <div className={`imgpost-toast imgpost-toast-${notification.type}`}>
            <span>
              {notification.type === "success"
                ? "🎉"
                : notification.type === "warning"
                  ? "⚠"
                  : "✕"}
            </span>
            {notification.message}
          </div>,
          document.body,
        )}
    </>
  );
}

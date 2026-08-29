// BtnMakeNote.jsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import "./css/MakeNote.css";
import { isGuestSession } from "./AccessGate";

export default function BtnMakeNote({ journeyId, onNoteSuccess, onOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState(null);

  const today = new Date();
  const currentYear = today.getFullYear().toString();
  const currentDateNum = today.getDate().toString();
  const currentMonthName = today.toLocaleString("id-ID", { month: "long" });

  const [formData, setFormData] = useState({
    year: currentYear,
    month_label: currentMonthName,
    date_number: currentDateNum,
    title: "",
    content: "",
  });

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    setVisible(!isGuestSession());
  }, []);

  const resetForm = () => {
    setFormData({
      year: currentYear,
      month_label: currentMonthName,
      date_number: currentDateNum,
      title: "",
      content: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      setNotification({
        type: "warning",
        message: "Tulis dulu isi catatannya!",
      });
      return;
    }

    setLoading(true);
    try {
      const fullDateLabel =
        `${formData.date_number} ${formData.month_label} ${formData.year}`.toLowerCase();

      const { error } = await supabase.from("journal_notes").insert([
        {
          journey_id: journeyId,
          title: formData.title || "Tanpa judul",
          content: formData.content,
          date_label: fullDateLabel,
        },
      ]);

      if (error) throw error;

      setNotification({
        type: "success",
        message: "Catatan baru berhasil disimpan! 📝",
      });
      resetForm();
      setIsOpen(false);

      if (onNoteSuccess) onNoteSuccess();
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Gagal menyimpan catatan." });
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
       <button
        title="buat note"
        className="sidebar-action-btn btnMakeNote-btn"
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
          <path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div className="journey-popup-overlay">
            <div className="journey-popup-box">
              <h2 className="journey-popup-title">Tulis Catatan Baru</h2>

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
                  <label className="journey-label">Judul Catatan</label>
                  <input
                    type="text"
                    placeholder="Hari yang tak terlupakan..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="journey-input"
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">Isi Catatan</label>
                  <textarea
                    placeholder="Ceritakan momennya di sini..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="journey-input journey-textarea"
                    rows={6}
                    required
                  />
                </div>

                <div className="journey-popup-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      resetForm();
                    }}
                    className="journey-btn-cancel"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="journey-btn-submit"
                  >
                    {loading ? "Menyimpan..." : "Simpan Catatan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

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
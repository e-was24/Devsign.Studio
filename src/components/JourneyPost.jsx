import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { createPortal } from "react-dom";
import "./css/post.css";
import "./css/floating-fab.css";
import { isGuestSession } from "./AccessGate";

const MONTH_OPTIONS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

export default function JourneyPost({ onJourneyAdded, onOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);

  const [formData, setFormData] = useState({
    year: "2026",
    month_label: MONTH_OPTIONS[0],
    title: "",
    order_index: 1,
  });

  const [coverFile, setCoverFile] = useState(null);
  const [notice, setNotice] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [visible, setVisible] = useState(false);

  const showNotice = (message, type = "info") =>
    setNotice({ show: true, message, type });
  const closeNotice = () => setNotice((n) => ({ ...n, show: false }));

  useEffect(() => {
    setVisible(!isGuestSession());
  }, []);

  const fetchNextOrderIndex = async () => {
    setIndexLoading(true);
    try {
      const { data, error } = await supabase
        .from("journeys")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);

      if (error) throw error;

      const highest = data && data.length > 0 ? data[0].order_index : 0;
      setFormData((prev) => ({ ...prev, order_index: highest + 1 }));
    } catch (err) {
      console.error(err);
    } finally {
      setIndexLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchNextOrderIndex();
    if (onOpen) onOpen();
  };

  const closePopup = () => {
    setIsOpen(false);
    setFormData({
      year: "2026",
      month_label: MONTH_OPTIONS[0],
      title: "",
      order_index: 1,
    });
    setCoverFile(null);
  };

  const encryptAndRename = (file) => {
    const ext = file.name.split(".").pop();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${Date.now()}-${randomStr}.${ext}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coverFile) {
      showNotice("Pilih foto cover dulu!", "error");
      return;
    }

    const formattedTitle = formData.title.trim().toUpperCase();

    setLoading(true);
    try {
      const { data: existingJourneys, error: checkErr } = await supabase
        .from("journeys")
        .select("id")
        .ilike("title", formattedTitle);

      if (checkErr) throw checkErr;

      if (existingJourneys && existingJourneys.length > 0) {
        showNotice(
          `Judul "${formattedTitle}" sudah ada. Gunakan nama lain atau tambahkan simbol unik (pt. 2)`,
          "error",
        );
        setLoading(false);
        return;
      }

      const safeCoverName = encryptAndRename(coverFile);
      const coverPath = `covers/${safeCoverName}`;

      const { error: coverErr } = await supabase.storage
        .from("galeri")
        .upload(coverPath, coverFile);
      if (coverErr) throw coverErr;

      const {
        data: { publicUrl: coverUrl },
      } = supabase.storage.from("galeri").getPublicUrl(coverPath);

      const { error: journeyErr } = await supabase.from("journeys").insert([
        {
          year: parseInt(formData.year),
          month_label: formData.month_label.trim().toUpperCase(),
          title: formattedTitle,
          cover_url: coverUrl,
          order_index: parseInt(formData.order_index),
        },
      ]);

      if (journeyErr) throw journeyErr;

      closePopup();
      showNotice("Journey baru berhasil ditambahkan! 🎉", "success");

      if (onJourneyAdded) onJourneyAdded();
    } catch (err) {
      console.error(err);
      showNotice("Gagal mengupload journey.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Tombol tetap berada di dalam Sidebar secara normal */}
      <div className="fab-float journeypost-float">
        <button
          title="Tambah Perjalanan Baru"
          className={`fab-btn ${isOpen ? "is-open" : ""}`}
          onClick={handleOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
          >
            <path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q25-92 100-149t170-57q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H520q-33 0-56.5-23.5T440-240v-206l-64 62-56-56 160-160 160 160-56 56-64-62v206h220q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-83 0-141.5 58.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h100v80H260Zm220-280Z" />
          </svg>
        </button>
      </div>

      {/* Render Popup ke luar DOM Sidebar (langsung ke body) */}
      {isOpen &&
        createPortal(
          <div className="journey-popup-overlay">
            <div className="journey-popup-box">
              <h2 className="journey-popup-title">Tambah Perjalanan Baru</h2>

              <form onSubmit={handleSubmit}>
                {/* Form fields Anda tetap sama */}
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
                  <label className="journey-label">Bulan</label>
                  <select
                    value={formData.month_label}
                    onChange={(e) =>
                      setFormData({ ...formData, month_label: e.target.value })
                    }
                    className="journey-input"
                    required
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
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
                  <label className="journey-label">
                    Urutan Timeline (Index) {indexLoading && "— menghitung..."}
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) =>
                      setFormData({ ...formData, order_index: e.target.value })
                    }
                    className="journey-input"
                    disabled={indexLoading}
                    required
                  />
                </div>

                <div className="journey-form-group">
                  <label className="journey-label">
                    Foto Cover Card (Utama)
                  </label>
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
                    onClick={closePopup}
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
          </div>,
          document.body,
        )}

      {/* Render Alert Notice juga ke luar DOM Sidebar */}
      {notice.show &&
        createPortal(
          <div className="journey-alert-overlay" onClick={closeNotice}>
            <div
              className={`journey-alert-box journey-alert-${notice.type}`}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="journey-alert-text">{notice.message}</p>
              <button className="journey-alert-btn" onClick={closeNotice}>
                Oke
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

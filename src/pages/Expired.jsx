import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./css/Expired.css";

// Ekstensi yang dianggap video — sesuaikan kalau format lain dipakai
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "ogg", "m4v"];

// Ganti dengan alamat email masing-masing
const CONTACTS = [
  { label: "Contact 1 ( elan )", email: "satriaelan5@gmail.com" },
  { label: "not found", email: "there isn't any yet" },
];

function isVideoUrl(url = "") {
  const clean = url.split("?")[0].toLowerCase();
  const ext = clean.substring(clean.lastIndexOf(".") + 1);
  return VIDEO_EXTENSIONS.includes(ext);
}

function Petal({ delay, left, duration, reduceMotion }) {
  return (
    <div
      className="mikir-petal"
      style={{
        left,
        animationName: reduceMotion ? "none" : "mikir-fall",
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function Expired() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // request-access popup state
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);

    fetchGalleryPhotos();
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPopup]);

  const openPopup = () => setShowPopup(true);
  const closePopup = () => setShowPopup(false);

  const buildSubject = () => "Request Access - Mikir Kids";

  const handleMailtoClick = (email) => {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      buildSubject(),
    )}`;
  };

  const handleGmailClick = (email) => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email,
    )}&su=${encodeURIComponent(buildSubject())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const fetchGalleryPhotos = async () => {
    try {
      setLoading(true);
      // Mengambil data dari tabel gallery_items di Supabase
      const { data, error } = await supabase.from("gallery_items").select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        // 1. Acak urutan item (Fisher-Yates shuffle) agar setiap refresh beda yang muncul
        const shuffled = [...data].sort(() => 0.5 - Math.random());

        // 2. Batasi maksimal hanya 8 item saja yang diambil
        const selectedItems = shuffled.slice(0, 8);

        // Layout bawaan Anda yang memiliki posisi (top, left, rot, size, z)
        const defaultLayouts = [
          { top: "6%", left: "6%", rot: -9, size: 132, z: 3 },
          { top: "4%", left: "62%", rot: 7, size: 148, z: 2 },
          { top: "16%", left: "34%", rot: -4, size: 120, z: 5 },
          { top: "34%", left: "4%", rot: 10, size: 138, z: 2 },
          { top: "60%", left: "10%", rot: -6, size: 128, z: 4 },
          { top: "62%", left: "66%", rot: 8, size: 150, z: 3 },
          { top: "40%", left: "78%", rot: -11, size: 118, z: 2 },
          { top: "78%", left: "38%", rot: 5, size: 130, z: 4 },
        ];

        // Gabungkan data item terpilih dengan layout posisi
        const formattedItems = selectedItems.map((item, index) => {
          const layout = defaultLayouts[index % defaultLayouts.length];
          // Pakai kolom media_type dari DB kalau ada, kalau tidak tebak dari ekstensi file
          const mediaType =
            item.media_type || (isVideoUrl(item.media_url) ? "video" : "image");

          return {
            id: item.id,
            src: item.media_url,
            caption: item.alt_text || item.date_label,
            type: mediaType,
            ...layout,
          };
        });

        setPhotos(formattedItems);
      }
    } catch (err) {
      console.error("Gagal mengambil media dari database:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mikir-page">
      {/* floating petals, decorative only */}
      {!reduceMotion &&
        [12, 27, 41, 58, 73, 88].map((left, i) => (
          <Petal
            key={i}
            left={`${left}%`}
            delay={i * 1.3}
            duration={9 + i}
            reduceMotion={reduceMotion}
          />
        ))}

      {/* scattered journey media collage — sits behind the message card */}
      <div className="mikir-photo-layer">
        {!loading &&
          photos.map((p, i) => (
            <div
              key={p.id}
              className="mikir-photo"
              style={{
                top: p.top,
                left: p.left,
                zIndex: p.z,
                "--r": `${p.rot}deg`,
                transform: `rotate(${p.rot}deg)`,
                animationDelay: `${i * 0.08}s, ${i * 0.4}s`,
                width: p.size,
              }}
            >
              <div
                className="mikir-photo-frame"
                style={{ height: p.size * 0.82 }}
              >
                {p.type === "video" ? (
                  <video
                    src={p.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => {
                      console.error("Gagal memuat video:", p.src);
                    }}
                  />
                ) : (
                  <img
                    src={p.src}
                    alt={p.caption}
                    onError={(e) => {
                      console.error("Gagal memuat foto:", p.src);
                      e.currentTarget.parentElement.style.display = "none";
                    }}
                  />
                )}
                {p.type === "video" && (
                  <span className="mikir-video-badge">▶</span>
                )}
              </div>
              <div className="mikir-photo-caption">{p.caption}</div>
            </div>
          ))}
      </div>

      {/* soft vignette so the card reads clearly over the collage */}
      <div className="mikir-vignette" />

      {/* main message card */}
      <div className="mikir-card">
        <div className="mikir-eyebrow">Our Journey</div>

        <div className="mikir-divider" />

        <h1 className="mikir-title">This page has expired.</h1>

        <p className="mikir-desc">
          The moments on this page were safely captured during that trip. This
          link is no longer active—Request access to view the story.
        </p>

        <button className="mikir-card-btn" onClick={openPopup}>
          Request Access
        </button>
      </div>

      {/* request access popup */}
      {showPopup && (
        <div className="mikir-overlay" onClick={closePopup} role="presentation">
          <div
            className="mikir-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mikir-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mikir-modal-close"
              onClick={closePopup}
              aria-label="Tutup"
            >
              ×
            </button>

            <div className="mikir-eyebrow">Our Journey</div>
            <h2 id="mikir-modal-title" className="mikir-modal-title">
              Request access
            </h2>
            <p className="mikir-desc">
              Select a contact, then choose whether to open it via Gmail (web)
              or your default email app.
            </p>

            <div className="mikir-contact-list">
              {CONTACTS.map((c) => (
                <div key={c.email} className="mikir-contact-option">
                  <span className="mikir-contact-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="20px"
                      viewBox="0 -960 960 960"
                      width="20px"
                      fill="currentColor"
                    >
                      <path d="M400-80v-280h-80v-240q0-33 23.5-56.5T400-680h160q33 0 56.5 23.5T640-600v240h-80v280H400Zm80-640q-33 0-56.5-23.5T400-800q0-33 23.5-56.5T480-880q33 0 56.5 23.5T560-800q0 33-23.5 56.5T480-720Z" />
                    </svg>
                  </span>

                  <span className="mikir-contact-text">
                    <span className="mikir-contact-label">{c.label}</span>
                    <span className="mikir-contact-email">{c.email}</span>
                  </span>

                  <span className="mikir-contact-actions">
                    <button
                      type="button"
                      className="mikir-contact-action"
                      onClick={() => handleGmailClick(c.email)}
                    >
                      Gmail
                    </button>
                    <button
                      type="button"
                      className="mikir-contact-action mikir-contact-action--ghost"
                      onClick={() => handleMailtoClick(c.email)}
                    >
                      Mail App
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

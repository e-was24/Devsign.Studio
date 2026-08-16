import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import journeyData from "../data/journeyData";

import "./css/galery-style.css";

export default function Galery() {
  const { slug } = useParams();
  const container = useRef();

  // State untuk menyimpan media yang sedang diklik (null jika modal tertutup)
  const [selectedItem, setSelectedItem] = useState(null);

  const entry = journeyData[slug];

  useGSAP(() => {
    if (!entry) return;
    gsap.fromTo(
      ".galery-item",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
    );
  }, [entry]);

  // Kalau slug nggak ketemu di data, redirect balik ke journey
  if (!entry) {
    return <Navigate to="/journey" replace />;
  }

  // Fungsi helper untuk cek video
  const checkIsVideo = (src) => src.endsWith(".mp4") || src.endsWith(".webm");

  return (
    <>
      <div className="top-safety"></div>
      <div className="galery-container" ref={container}>
        <Link to="/journey" className="back-link">
          ← Kembali
        </Link>

        <h1 className="galery-title">{entry.title}</h1>
        {entry.subtitle && <p className="galery-subtitle">{entry.subtitle}</p>}

        <div className="galery-grid">
          {entry.images.length === 0 ? (
            <p className="galery-empty">Belum ada foto di sini.</p>
          ) : (
            entry.images.map((item, i) => {
              const isVideo = checkIsVideo(item.src);

              return (
                <div 
                  className="galery-item" 
                  key={i}
                  onClick={() => setSelectedItem(item)} // Saat di-klik, buka modal
                  style={{ cursor: "pointer" }}
                >
                  {isVideo ? (
                    <video
                      src={item.src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  ) : (
                    <img src={item.src} alt={item.alt || entry.title} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- LIGHTBOX / MODAL POP-UP --- */}
      {selectedItem && (
        <div className="galery-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}>
              &times;
            </button>
            
            {checkIsVideo(selectedItem.src) ? (
              <video
                src={selectedItem.src}
                controls
                autoPlay
                playsInline
                style={{ width: "100%", maxHeight: "80vh", display: "block" }}
              />
            ) : (
              <img 
                src={selectedItem.src} 
                alt={selectedItem.alt || entry.title} 
                style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }}
              />
            )}
            
            {selectedItem.alt && <p className="modal-caption">{selectedItem.alt}</p>}
          </div>
        </div>
      )}
    </>
  );
}
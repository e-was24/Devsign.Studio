import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ImgPost from "../components/imagePost";
import BtnMakeNote from "../components/MakeNote";
import { isGuestSession } from "../components/AccessGate";

import "./css/galery-style.css";

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- helper: kunci unik tiap item, dan penyimpanan urutan ke localStorage ---
const itemKey = (it) => `${it._type}-${it.id}`;
const getOrderStorageKey = (journeyId) => `galery-order-${journeyId}`;

function loadStoredOrder(journeyId) {
  try {
    const raw = localStorage.getItem(getOrderStorageKey(journeyId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredOrder(journeyId, items) {
  try {
    localStorage.setItem(
      getOrderStorageKey(journeyId),
      JSON.stringify(items.map(itemKey)),
    );
  } catch {
    // localStorage penuh/diblokir - abaikan, gak fatal
  }
}

// sisipkan item baru ke posisi acak di antara item lama (bukan numpuk di akhir)
function insertItemsRandomly(existing, newItems) {
  const result = [...existing];
  for (const item of newItems) {
    const pos = Math.floor(Math.random() * (result.length + 1));
    result.splice(pos, 0, item);
  }
  return result;
}

export default function Galery() {
  const { slug } = useParams();
  const container = useRef();

  const [journey, setJourney] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [displayItems, setDisplayItems] = useState([]); // gabungan: media + note, urutan persist
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // bisa media / note
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [visible, setVisible] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setVisible(!isGuestSession());
  });

  const fetchGaleryData = useCallback(async () => {
    setLoading(true);

    const { data: journeyData, error: journeyError } = await supabase
      .from("journeys")
      .select("*")
      .ilike("title", slug)
      .single();

    if (journeyError || !journeyData) {
      console.error("Journey tidak ditemukan:", journeyError);
      setJourney(null);
      setLoading(false);
      return;
    }

    setJourney(journeyData);

    const { data: itemsData, error: itemsError } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("journey_id", journeyData.id)
      .order("order_index", { ascending: true, nullsFirst: false });

    const { data: notesData, error: notesError } = await supabase
      .from("journal_notes")
      .select("*")
      .eq("journey_id", journeyData.id)
      .order("created_at", { ascending: false });

    const media = !itemsError ? itemsData : [];
    const noteList = !notesError ? notesData : [];

    if (!itemsError) setGalleryItems(media);
    if (!notesError) setNotes(noteList);

    const allItems = [
      ...media.map((m) => ({ ...m, _type: "media" })),
      ...noteList.map((n) => ({ ...n, _type: "note" })),
    ];

    const storedOrder = loadStoredOrder(journeyData.id);

    let finalOrder;
    if (storedOrder && storedOrder.length > 0) {
      const itemMap = new Map(allItems.map((it) => [itemKey(it), it]));
      const orderedKeys = new Set(storedOrder);

      // urutan lama; item yang sudah kehapus otomatis ter-filter (gak ketemu di map)
      const ordered = storedOrder.map((k) => itemMap.get(k)).filter(Boolean);

      // item baru (belum pernah tersimpan urutannya) -> sisipkan acak
      const newItems = allItems.filter((it) => !orderedKeys.has(itemKey(it)));
      finalOrder = insertItemsRandomly(ordered, shuffleArray(newItems));
    } else {
      // pertama kali - acak sekali aja
      finalOrder = shuffleArray(allItems);
    }

    saveStoredOrder(journeyData.id, finalOrder);
    setDisplayItems(finalOrder);

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchGaleryData();
  }, [fetchGaleryData]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(timer);
  }, [notification]);

  // --- Drag & drop hanya berlaku untuk item media (note belum ikut re-order) ---
  const handleDragStart = (e, index) => {
    if (displayItems[index]._type !== "media") return;
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    if (displayItems[index]._type !== "media") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (
      draggedItemIndex === null ||
      draggedItemIndex === targetIndex ||
      displayItems[targetIndex]._type !== "media"
    )
      return;

    const updatedDisplay = [...displayItems];
    const [movedItem] = updatedDisplay.splice(draggedItemIndex, 1);
    updatedDisplay.splice(targetIndex, 0, movedItem);
    setDisplayItems(updatedDisplay);
    setDraggedItemIndex(null);

    // simpan urutan gabungan (media+note) biar konsisten walau refresh
    saveStoredOrder(journey.id, updatedDisplay);

    try {
      const mediaOnly = updatedDisplay.filter((it) => it._type === "media");
      const updates = mediaOnly.map((item, idx) =>
        supabase
          .from("gallery_items")
          .update({ order_index: idx })
          .eq("id", item.id),
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Gagal menyimpan urutan baru:", err);
      setNotification({
        type: "error",
        message: "Gagal menyimpan perubahan urutan.",
      });
      fetchGaleryData();
    }
  };

  const requestDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setIsBurning(true);

    setTimeout(async () => {
      setDeleting(true);
      try {
        if (selectedItem._type === "note") {
          const { error } = await supabase
            .from("journal_notes")
            .delete()
            .eq("id", selectedItem.id);

          if (error) throw error;

          setNotification({
            type: "success",
            message: "Catatan berhasil dihilangkan 📝🔥",
          });
        } else {
          const urlParts = selectedItem.media_url.split("/galeri/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from("galeri").remove([filePath]);
          }

          const { error } = await supabase
            .from("gallery_items")
            .delete()
            .eq("id", selectedItem.id);

          if (error) throw error;

          setNotification({
            type: "success",
            message: "Foto/video berhasil dibakar 🔥",
          });
        }

        setSelectedItem(null);
        fetchGaleryData();
      } catch (err) {
        console.error("Gagal menghapus:", err);
        setNotification({
          type: "error",
          message:
            selectedItem._type === "note"
              ? "Terjadi kesalahan saat menghapus catatan."
              : "Terjadi kesalahan saat menghapus file.",
        });
      } finally {
        setDeleting(false);
        setIsBurning(false);
      }
    }, 1400);
  };

  useGSAP(() => {
    if (displayItems.length === 0) return;
    gsap.fromTo(
      ".galery-item",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
    );
  }, [displayItems]);

  if (loading) {
    return <div className="galery-loading">Memuat galeri...</div>;
  }

  if (!journey) {
    return <Navigate to="/journey" replace />;
  }

  return (
    <>
      <div className="top-safety"></div>
      <div className="galery-container" ref={container}>
        {visible && (
          <button
            className={`sidebar-toggle-btn ${sidebarOpen ? "is-open" : ""}`}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e3e3e3"
            >
              <path d="M507-480 384-357l56 57 180-180-180-180-56 57 123 123ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
            </svg>
          </button>
        )}

        {visible && (
          <>
            <div
              className={`sidebar-overlay ${sidebarOpen ? "is-open" : ""}`}
              onClick={() => setSidebarOpen(false)}
            />
            <div className={`galery-sidebar ${sidebarOpen ? "is-open" : ""}`}>
              <div className="sidebar-actions">
                <ImgPost
                  journeyId={journey.id}
                  onUploadSuccess={fetchGaleryData}
                  onOpen={() => setSidebarOpen(false)}
                />
                <BtnMakeNote
                  journeyId={journey.id}
                  onNoteSuccess={fetchGaleryData}
                  onOpen={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        <Link to="/journey" className="back-link">
          ← Kembali
        </Link>

        <h1 className="galery-title">{journey.title}</h1>
        <p className="galery-subtitle">
          {journey.month_label} {journey.year}
        </p>
        <p className="galery-tips">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#c9b898"
          >
            <path d="M400-240q-33 0-56.5-23.5T320-320v-50q-57-39-88.5-100T200-600q0-117 81.5-198.5T480-880q117 0 198.5 81.5T760-600q0 69-31.5 129.5T640-370v50q0 33-23.5 56.5T560-240H400Zm0-80h160v-92l34-24q41-28 63.5-71.5T680-600q0-83-58.5-141.5T480-800q-83 0-141.5 58.5T280-600q0 49 22.5 92.5T366-436l34 24v92Zm0 240q-17 0-28.5-11.5T360-120v-40h240v40q0 17-11.5 28.5T560-80H400Zm80-520Z" />
          </svg>
          Tips : Drag / geser foto untuk ubah urutan
        </p>

        <div className="galery-grid">
          {displayItems.length === 0 ? (
            <p className="galery-empty">
              Belum ada foto/video/catatan di galeri ini.
            </p>
          ) : (
            displayItems.map((item, index) => {
              if (item._type === "note") {
                return (
                  <div
                    className="galery-item galery-note-card"
                    key={`note-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    title="Klik untuk baca catatan"
                  >
                    <p className="note-card-date">{item.date_label}</p>
                    <h3 className="note-card-title">{item.title}</h3>
                    <p className="note-card-content">{item.content}</p>
                    <span className="note-card-pin" />
                  </div>
                );
              }

              const isVideo =
                item.media_type === "video" || item.media_url.endsWith(".mp4");

              return (
                <div
                  className="galery-item"
                  key={`media-${item.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => setSelectedItem(item)}
                  title="Klik untuk preview, geser untuk ubah urutan"
                >
                  {isVideo ? (
                    <video
                      src={item.media_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.alt_text || journey.title}
                    />
                  )}
                  <p className="pic-location">
                    {item.date_label} ( {item.alt_text} )
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- MODAL: media ATAU note, dibedakan lewat selectedItem._type --- */}
      {selectedItem && (
        <div
          className="galery-modal"
          onClick={() => !isBurning && setSelectedItem(null)}
        >
          <div
            className={`modal-content ${isBurning ? "burning" : ""} ${
              selectedItem._type === "note" ? "modal-content-note" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {!isBurning && (
              <button
                className="modal-close"
                onClick={() => setSelectedItem(null)}
              >
                &times;
              </button>
            )}

            {selectedItem._type === "note" ? (
              <div className="note-modal-wrap">
                <div className="note-modal-body">
                  <p className="note-modal-date">{selectedItem.date_label}</p>
                  <h2 className="note-modal-title">{selectedItem.title}</h2>
                  <p className="note-modal-content">{selectedItem.content}</p>
                </div>
              </div>
            ) : (
              <div className="modal-media-wrap">
                {selectedItem.media_type === "video" ||
                selectedItem.media_url.endsWith(".mp4") ? (
                  <video
                    src={selectedItem.media_url}
                    autoPlay
                    playsInline
                    loop
                    style={{
                      width: "100%",
                      maxHeight: "80vh",
                      display: "block",
                    }}
                  />
                ) : (
                  <img
                    src={selectedItem.media_url}
                    alt={selectedItem.alt_text || "Dokumentasi"}
                    style={{
                      width: "100%",
                      maxHeight: "80vh",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                )}

                {isBurning && (
                  <div className="burn-overlay">
                    <div className="burn-flame flame-1" />
                    <div className="burn-flame flame-2" />
                    <div className="burn-flame flame-3" />
                    <div className="burn-smoke smoke-1" />
                    <div className="burn-smoke smoke-2" />
                  </div>
                )}
              </div>
            )}

            {selectedItem._type === "media" &&
              selectedItem.alt_text &&
              !isBurning && (
                <p className="modal-caption">
                  {selectedItem.date_label} ( {selectedItem.alt_text} )
                </p>
              )}

            {!isBurning && visible && (
              <div className="modal-actions">
                <button onClick={requestDelete} className="modal-delete-btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                  >
                    <path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
                  </svg>
                  {selectedItem._type === "note"
                    ? "sobek (Hapus)"
                    : "burn (Hapus)"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- POPUP KONFIRMASI HAPUS --- */}
      {showDeleteConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-icon">🔥</p>
            <h3 className="confirm-title">
              {selectedItem?._type === "note"
                ? "Sobek catatan ini?"
                : "Bakar dokumentasi ini?"}
            </h3>
            <p className="confirm-text">
              {selectedItem?._type === "note"
                ? "Catatan ini akan hilang permanen dan tidak bisa dikembalikan."
                : "Foto/video ini akan hilang permanen dan tidak bisa dikembalikan."}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                className="confirm-btn-delete"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Membakar..." : "Ya, Bakar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`journey-toast journey-toast-${notification.type}`}>
          <span>{notification.type === "success" ? "🔥" : "⚠"}</span>
          {notification.message}
        </div>
      )}
    </>
  );
}

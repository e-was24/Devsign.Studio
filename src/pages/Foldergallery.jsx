import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import CreateFolderModal from "../components/Createfoldermodal";
import ImgPost from "../components/imagePost";
import BtnMakeNote from "../components/MakeNote";
import { isGuestSession } from "../components/AccessGate";
import "./css/folder-gallery.css";

function formatFolderDate(isoString) {
  const d = new Date(isoString);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function isVideoItem(item) {
  return item?.media_type === "video" || item?.media_url?.endsWith(".mp4");
}

export default function FolderGallery() {
  const { slug } = useParams(); // opsional: /foldergallery vs /foldergallery/:slug

  const [journey, setJourney] = useState(null); // null = mode "semua folder" (lama)
  const [journeyNotFound, setJourneyNotFound] = useState(false);

  const [folders, setFolders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- foto/video/catatan yang belum masuk folder manapun ---
  // digabung jadi satu array, dibedakan lewat _type: "media" | "note"
  const [looseItems, setLooseItems] = useState([]);
  const [loadingLoose, setLoadingLoose] = useState(true);
  const [selectedLooseItem, setSelectedLooseItem] = useState(null);

  const [showAssignFolder, setShowAssignFolder] = useState(false);
  const [assignFolderOptions, setAssignFolderOptions] = useState([]);
  const [selectedAssignFolderId, setSelectedAssignFolderId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [showDeleteLooseConfirm, setShowDeleteLooseConfirm] = useState(false);
  const [deletingLoose, setDeletingLoose] = useState(false);

  const [notification, setNotification] = useState(null);

  // --- sidebar aksi: unggah foto & folder baru, disembunyikan buat guest ---
  const [visible, setVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // tambahkan state baru, taruh dekat state folder lainnya
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState("");

  useEffect(() => {
    setVisible(!isGuestSession());
  });

  // 1) resolve slug -> journey (kalau ada), persis pola Galery.jsx
  useEffect(() => {
    if (!slug) {
      setJourney(null);
      setJourneyNotFound(false);
      return;
    }

    async function resolveJourney() {
      const { data, error } = await supabase
        .from("journeys")
        .select("id, title")
        .ilike("title", slug)
        .maybeSingle();

      if (error || !data) {
        setJourney(null);
        setJourneyNotFound(true);
        return;
      }
      setJourney(data);
      setJourneyNotFound(false);
    }

    resolveJourney();
  }, [slug]);

  // 2) load folders, di-filter by journey_id kalau lagi dalam mode journey
  const loadFolders = useCallback(async () => {
    if (slug && !journey) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from("gallery_folder")
      .select(
        "id, folder_title, description, is_private, category, slug, journey_id, display_order, created_at",
      )
      .eq("is_private", false)
      .order("display_order", { ascending: true });

    if (journey) {
      query = query.eq("journey_id", journey.id);
    }

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    const { data: folderRows, error: folderError } = await query;

    if (folderError) {
      console.error("Gagal memuat folder:", folderError);
      setLoading(false);
      return;
    }

    const withCovers = await Promise.all(
      (folderRows ?? []).map(async (folder) => {
        const { data: items, error: itemsError } = await supabase
          .from("gallery_items")
          .select("media_url, media_type")
          .eq("folder_id", folder.id)
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .limit(2);

        if (itemsError) console.error(itemsError);

        const first = items?.[0] ?? null;
        const second = items?.[1] ?? first;

        return {
          ...folder,
          coverBack: first,
          coverFront: second,
        };
      }),
    );

    setFolders(withCovers);
    setLoading(false);
  }, [activeCategory, journey, slug]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    async function loadCategories() {
      let query = supabase
        .from("gallery_folder")
        .select("category")
        .not("category", "is", null);

      if (journey) query = query.eq("journey_id", journey.id);

      const { data, error } = await query;
      if (error) {
        console.error(error);
        return;
      }
      const unique = [...new Set(data.map((row) => row.category))].filter(
        Boolean,
      );
      setCategories(unique);
    }
    if (!slug || journey) loadCategories();
  }, [journey, slug]);

  // 3) load foto/video + catatan yang belum masuk folder manapun (folder_id null)
  const loadLooseItems = useCallback(async () => {
    if (slug && !journey) {
      setLooseItems([]);
      setLoadingLoose(false);
      return;
    }

    setLoadingLoose(true);

    let mediaQuery = supabase
      .from("gallery_items")
      .select(
        "id, media_url, media_type, alt_text, date_label, journey_id, folder_id, created_at",
      )
      .is("folder_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    let notesQuery = supabase
      .from("journal_notes")
      .select(
        "id, title, content, date_label, journey_id, folder_id, created_at",
      )
      .is("folder_id", null)
      .order("created_at", { ascending: false });

    if (journey) {
      mediaQuery = mediaQuery.eq("journey_id", journey.id);
      notesQuery = notesQuery.eq("journey_id", journey.id);
    }

    const [
      { data: mediaData, error: mediaError },
      { data: noteData, error: noteError },
    ] = await Promise.all([mediaQuery, notesQuery]);

    if (mediaError)
      console.error("Gagal memuat foto tanpa folder:", mediaError);
    if (noteError)
      console.error("Gagal memuat catatan tanpa folder:", noteError);

    // gabung media + note, urutkan campur berdasarkan waktu dibuat (terbaru duluan)
    const combined = [
      ...(mediaData ?? []).map((m) => ({ ...m, _type: "media" })),
      ...(noteData ?? []).map((n) => ({ ...n, _type: "note" })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setLooseItems(combined);
    setLoadingLoose(false);
  }, [journey, slug]);

  useEffect(() => {
    loadLooseItems();
  }, [loadLooseItems]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(timer);
  }, [notification]);

  // --- masukkan foto/catatan lepas ke sebuah folder ---
  const openAssignFolder = async () => {
    let query = supabase
      .from("gallery_folder")
      .select("id, folder_title")
      .eq("is_private", false)
      .order("folder_title", { ascending: true });

    if (journey) {
      query = query.eq("journey_id", journey.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Gagal memuat daftar folder.",
      });
      return;
    }

    setAssignFolderOptions(data ?? []);
    setSelectedAssignFolderId("");
    setShowAssignFolder(true);
  };

  const confirmAssignFolder = async () => {
    if (!selectedAssignFolderId) {
      setNotification({ type: "error", message: "Pilih folder tujuan dulu." });
      return;
    }
    setAssigning(true);
    try {
      const table =
        selectedLooseItem._type === "note" ? "journal_notes" : "gallery_items";

      const { error } = await supabase
        .from(table)
        .update({ folder_id: selectedAssignFolderId })
        .eq("id", selectedLooseItem.id);

      if (error) throw error;

      setNotification({
        type: "success",
        message:
          selectedLooseItem._type === "note"
            ? "Catatan berhasil dimasukkan ke folder. 📁"
            : "Foto berhasil dimasukkan ke folder. 📁",
      });
      setShowAssignFolder(false);
      setSelectedLooseItem(null);
      loadLooseItems();
      loadFolders();
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Gagal memasukkan ke folder.",
      });
    } finally {
      setAssigning(false);
    }
  };

  const requestDeleteLoose = () => {
    setShowDeleteLooseConfirm(true);
  };

  const confirmDeleteLoose = async () => {
    setDeletingLoose(true);
    try {
      if (selectedLooseItem._type === "note") {
        const { error } = await supabase
          .from("journal_notes")
          .delete()
          .eq("id", selectedLooseItem.id);

        if (error) throw error;

        setNotification({
          type: "success",
          message: "Catatan berhasil dihilangkan 📝🔥",
        });
      } else {
        const urlParts = selectedLooseItem.media_url.split("/galeri/");
        if (urlParts.length > 1) {
          await supabase.storage.from("galeri").remove([urlParts[1]]);
        }

        const { error } = await supabase
          .from("gallery_items")
          .delete()
          .eq("id", selectedLooseItem.id);

        if (error) throw error;

        setNotification({
          type: "success",
          message: "Foto/video berhasil dibakar 🔥",
        });
      }

      setShowDeleteLooseConfirm(false);
      setSelectedLooseItem(null);
      loadLooseItems();
    } catch (err) {
      console.error("Gagal menghapus:", err);
      setNotification({
        type: "error",
        message:
          selectedLooseItem._type === "note"
            ? "Terjadi kesalahan saat menghapus catatan."
            : "Terjadi kesalahan saat menghapus file.",
      });
    } finally {
      setDeletingLoose(false);
    }
  };

  // tambahkan fungsi baru, taruh dekat confirmDeleteLoose
  const requestDeleteFolder = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderToDelete(folder);
    setShowDeleteFolderConfirm(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setDeletingFolder(true);
    try {
      // 1) keluarkan dulu semua foto/video di folder ini -> jadi "tanpa folder"
      const { error: itemsError } = await supabase
        .from("gallery_items")
        .update({ folder_id: null })
        .eq("folder_id", folderToDelete.id);

      if (itemsError) throw itemsError;

      // 2) keluarkan juga catatan yang ada di folder ini (kalau ada)
      const { error: notesError } = await supabase
        .from("journal_notes")
        .update({ folder_id: null })
        .eq("folder_id", folderToDelete.id);

      if (notesError) throw notesError;

      // 3) baru hapus foldernya
      const { error: folderError } = await supabase
        .from("gallery_folder")
        .delete()
        .eq("id", folderToDelete.id);

      if (folderError) throw folderError;

      setNotification({
        type: "success",
        message:
          "Folder berhasil dihapus. Isinya dipindah ke 'Tanpa Folder'. 📁",
      });
      setShowDeleteFolderConfirm(false);
      setFolderToDelete(null);
      loadFolders();
      loadLooseItems();
    } catch (err) {
      console.error("Gagal menghapus folder:", err);
      setNotification({
        type: "error",
        message: "Terjadi kesalahan saat menghapus folder.",
      });
    } finally {
      setDeletingFolder(false);
    }
  };

  if (slug && journeyNotFound) {
    return <p className="folder-empty">Journey "{slug}" tidak ditemukan.</p>;
  }

  return (
    <div className="folder-page">
      {journey && (
        <Link to="/journey" className="folder-back-link">
          ← Kembali ke Journey
        </Link>
      )}
      <div className="folder-toolbar">
        <div className="folder-filters">
          <button
            className={`folder-chip ${activeCategory === "all" ? "is-active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`folder-chip ${activeCategory === cat ? "is-active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {journey && <h2 className="folder-journey-title">{journey.title}</h2>}

      <div className="folder-container">
        {loading && <p className="folder-empty">Memuat folder...</p>}

        {!loading && folders.length === 0 && (
          <p className="folder-empty">
            {journey
              ? `Belum ada folder untuk journey "${journey.title}".`
              : "Belum ada folder di kategori ini."}
          </p>
        )}

        {!loading &&
          folders.map((folder) => (
            <Link
              to={`/galery/${folder.slug ?? folder.id}`}
              className="folder_section"
              key={folder.id}
            >
              {folder.coverBack &&
                (isVideoItem(folder.coverBack) ? (
                  <video
                    className="img-cover img2"
                    src={folder.coverBack.media_url}
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    className="img-cover img2"
                    src={folder.coverBack.media_url}
                    alt={folder.folder_title}
                  />
                ))}

              {folder.coverFront &&
                (isVideoItem(folder.coverFront) ? (
                  <video
                    className="img-cover img1"
                    src={folder.coverFront.media_url}
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    className="img-cover img1"
                    src={folder.coverFront.media_url}
                    alt={folder.folder_title}
                  />
                ))}

              {visible && (
                <button
                  className="folder-delete-btn"
                  onClick={(e) => requestDeleteFolder(e, folder)}
                  title="Hapus folder"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="18px"
                    viewBox="0 -960 960 960"
                    width="18px"
                  >
                    <path d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
                  </svg>
                </button>
              )}

              <div className="cover-title">
                <span className="folder-name">{folder.folder_title}</span>
                <span className="folder-date">
                  {formatFolderDate(folder.created_at)}
                </span>
              </div>
            </Link>
          ))}
      </div>

      {/* --- FOTO/VIDEO/CATATAN TANPA FOLDER --- */}
      <div className="folder-loose-section">
        {!loadingLoose && looseItems.length === 0 && (
          <>
            <h3 className="folder-loose-title">
              Belum Ada Foto / Video / Catatan
            </h3>
            <p className="folder-loose-subtitle">
              Foto, video, dan catatan yang dibuat lewat sini atau dikeluarkan
              dari folder akan muncul di bawah.
            </p>
          </>
        )}

        {loadingLoose && <p className="folder-empty">Memuat...</p>}

        {!loadingLoose && looseItems.length > 0 && (
          <div className="folder-loose-grid">
            {looseItems.map((item) =>
              item._type === "note" ? (
                <div
                  className="folder-loose-item folder-loose-note"
                  key={`note-${item.id}`}
                  onClick={() => setSelectedLooseItem(item)}
                  title="Klik untuk baca catatan"
                >
                  <p className="folder-loose-note-date">{item.date_label}</p>
                  <h4 className="folder-loose-note-title">{item.title}</h4>
                  <p className="folder-loose-note-content">{item.content}</p>
                </div>
              ) : (
                <div
                  className="folder-loose-item"
                  key={`media-${item.id}`}
                  onClick={() => setSelectedLooseItem(item)}
                  title="Klik untuk preview"
                >
                  {isVideoItem(item) ? (
                    <video
                      className="folder-loose-media"
                      src={item.media_url}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      className="folder-loose-media"
                      src={item.media_url}
                      alt={item.alt_text || "Dokumentasi"}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* --- SIDEBAR AKSI: unggah foto, buat catatan & folder baru --- */}
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
              <select
                className="folder-upload-target-select"
                value={uploadTargetFolderId}
                onChange={(e) => setUploadTargetFolderId(e.target.value)}
                title="Pilih folder tujuan (opsional)"
              >
                <option value="">Di Halaman ini</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.folder_title}
                  </option>
                ))}
              </select>

              <ImgPost
                journeyId={journey?.id ?? null}
                folderId={uploadTargetFolderId || null}
                onUploadSuccess={() => {
                  setUploadTargetFolderId("");
                  loadLooseItems();
                  loadFolders();
                }}
                onOpen={() => setSidebarOpen(false)}
              />
              <BtnMakeNote
                journeyId={journey?.id ?? null}
                folderId={uploadTargetFolderId || null}
                onNoteSuccess={() => {
                  setUploadTargetFolderId("");
                  loadLooseItems();
                  loadFolders();
                }}
                onOpen={() => setSidebarOpen(false)}
              />
              <button
                className="sidebar-action-btn folder-new-btn"
                onClick={() => {
                  setSidebarOpen(false);
                  setIsModalOpen(true);
                }}
                title="Buat folder baru"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#e3e3e3"
                >
                  <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL PREVIEW FOTO/CATATAN TANPA FOLDER --- */}
      {selectedLooseItem && !showAssignFolder && !showDeleteLooseConfirm && (
        <div
          className="folder-item-modal"
          onClick={() => setSelectedLooseItem(null)}
        >
          <div
            className={`folder-item-modal-content ${
              selectedLooseItem._type === "note"
                ? "folder-modal-content-note"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="folder-modal-close"
              onClick={() => setSelectedLooseItem(null)}
            >
              &times;
            </button>

            {selectedLooseItem._type === "note" ? (
              <div className="folder-note-modal-wrap">
                <p className="folder-note-modal-date">
                  {selectedLooseItem.date_label}
                </p>
                <h2 className="folder-note-modal-title">
                  {selectedLooseItem.title}
                </h2>
                <p className="folder-note-modal-content">
                  {selectedLooseItem.content}
                </p>
              </div>
            ) : (
              <div className="folder-modal-media-wrap">
                {isVideoItem(selectedLooseItem) ? (
                  <video
                    src={selectedLooseItem.media_url}
                    autoPlay
                    playsInline
                    loop
                    style={{
                      width: "100%",
                      maxHeight: "70vh",
                      display: "block",
                    }}
                  />
                ) : (
                  <img
                    src={selectedLooseItem.media_url}
                    alt={selectedLooseItem.alt_text || "Dokumentasi"}
                    style={{
                      width: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                )}
              </div>
            )}

            {visible && (
              <div className="folder-modal-actions">
                <button
                  className="folder-modal-assign-btn"
                  onClick={openAssignFolder}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                  >
                    <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Z" />
                  </svg>
                  masukkan folder
                </button>
                <button
                  className="folder-modal-delete-btn"
                  onClick={requestDeleteLoose}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                  >
                    <path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" />
                  </svg>
                  {selectedLooseItem._type === "note"
                    ? "sobek (hapus)"
                    : "burn (hapus)"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- POPUP MASUKKAN KE FOLDER --- */}
      {showAssignFolder && (
        <div
          className="folder-confirm-overlay"
          onClick={() => !assigning && setShowAssignFolder(false)}
        >
          <div
            className="folder-confirm-box"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="folder-confirm-icon">📁</p>
            <h3 className="folder-confirm-title">Masukkan ke folder mana?</h3>
            <p className="folder-confirm-text">
              {selectedLooseItem?._type === "note"
                ? "Pilih folder tujuan untuk catatan ini."
                : "Pilih folder tujuan untuk foto/video ini."}
            </p>

            <select
              className="folder-move-select"
              value={selectedAssignFolderId}
              onChange={(e) => setSelectedAssignFolderId(e.target.value)}
              disabled={assigning}
            >
              <option value="">Pilih folder...</option>
              {assignFolderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.folder_title}
                </option>
              ))}
            </select>

            <div className="folder-confirm-actions">
              <button
                className="folder-confirm-btn-cancel"
                onClick={() => setShowAssignFolder(false)}
                disabled={assigning}
              >
                Batal
              </button>
              <button
                className="folder-confirm-btn-delete"
                onClick={confirmAssignFolder}
                disabled={assigning}
              >
                {assigning ? "Memasukkan..." : "Masukkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP KONFIRMASI HAPUS FOTO/CATATAN TANPA FOLDER --- */}
      {showDeleteLooseConfirm && (
        <div
          className="folder-confirm-overlay"
          onClick={() => !deletingLoose && setShowDeleteLooseConfirm(false)}
        >
          <div
            className="folder-confirm-box"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="folder-confirm-icon">🔥</p>
            <h3 className="folder-confirm-title">
              {selectedLooseItem?._type === "note"
                ? "Sobek catatan ini?"
                : "Bakar dokumentasi ini?"}
            </h3>
            <p className="folder-confirm-text">
              {selectedLooseItem?._type === "note"
                ? "Catatan ini akan hilang permanen dan tidak bisa dikembalikan."
                : "Foto/video ini akan hilang permanen dan tidak bisa dikembalikan."}
            </p>
            <div className="folder-confirm-actions">
              <button
                className="folder-confirm-btn-cancel"
                onClick={() => setShowDeleteLooseConfirm(false)}
                disabled={deletingLoose}
              >
                Batal
              </button>
              <button
                className="folder-confirm-btn-delete"
                onClick={confirmDeleteLoose}
                disabled={deletingLoose}
              >
                {deletingLoose ? "Membakar..." : "Ya, Bakar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP KONFIRMASI HAPUS FOLDER --- */}
      {showDeleteFolderConfirm && (
        <div
          className="folder-confirm-overlay"
          onClick={() => !deletingFolder && setShowDeleteFolderConfirm(false)}
        >
          <div
            className="folder-confirm-box"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="folder-confirm-icon">🗑️</p>
            <h3 className="folder-confirm-title">
              Hapus folder "{folderToDelete?.folder_title}"?
            </h3>
            <p className="folder-confirm-text">
              Foto, video, dan catatan di dalamnya tidak akan ikut terhapus —
              semuanya akan dipindah ke "Tanpa Folder".
            </p>
            <div className="folder-confirm-actions">
              <button
                className="folder-confirm-btn-cancel"
                onClick={() => setShowDeleteFolderConfirm(false)}
                disabled={deletingFolder}
              >
                Batal
              </button>
              <button
                className="folder-confirm-btn-delete"
                onClick={confirmDeleteFolder}
                disabled={deletingFolder}
              >
                {deletingFolder ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <CreateFolderModal
          journeyId={journey?.id ?? null}
          onClose={() => setIsModalOpen(false)}
          onCreated={() => {
            setIsModalOpen(false);
            loadFolders();
          }}
        />
      )}

      {notification && (
        <div className={`folder-toast folder-toast-${notification.type}`}>
          <span>{notification.type === "success" ? "🔥" : "⚠"}</span>
          {notification.message}
        </div>
      )}
    </div>
  );
}

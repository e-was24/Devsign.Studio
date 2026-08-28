import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { isGuestSession } from "./AccessGate";
import "./css/guest-invite.css";

export default function GuestInviteButton() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVisible(!isGuestSession());
  }, []);

  const generateInvite = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const { data: code, error } = await supabase.rpc("create_guest_invite", {
        valid_minutes: 60,
      });
      if (error) throw error;

      const link = `${window.location.origin}${window.location.pathname}journey?guest=${code}`;
      setInviteInfo({ code, link });
    } catch (err) {
      console.error("Gagal buat kode tamu:", err);
      alert("Gagal membuat kode tamu.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!inviteInfo) return;
    await navigator.clipboard.writeText(inviteInfo.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) {
      setInviteInfo(null);
      setCopied(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="guest-invite-float">
      <button
        className={`guest-invite-fab ${open ? "is-open" : ""}`}
        onClick={toggleOpen}
        title="Bagikan Akses Tamu"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="22px"
            viewBox="0 -960 960 960"
            width="22px"
            fill="currentColor"
          >
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="22px"
            viewBox="0 -960 960 960"
            width="22px"
            fill="currentColor"
          >
            <path d="m298-446 141-141-42-43-100 100-54-54-42 42 97 96Zm-78 126h180v-60H220v60Zm220 0h320v-22q0-45-44-71.5T600-440q-72 0-116 26.5T440-342v22Zm216.5-183.5Q680-527 680-560t-23.5-56.5Q633-640 600-640t-56.5 23.5Q520-593 520-560t23.5 56.5Q567-480 600-480t56.5-23.5ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="guest-invite-panel">
          <p className="guest-invite-title">Bagikan Akses Tamu</p>

          {!inviteInfo ? (
            <button className="guest-invite-btn" onClick={generateInvite} disabled={loading}>
              {loading ? "Membuat..." : "Buat Kode Tamu"}
            </button>
          ) : (
            <div className="guest-invite-result">
              <p className="guest-invite-note">Berlaku 1 jam & hanya sekali pakai:</p>
              <code className="guest-invite-code">{inviteInfo.code}</code>
              <button className="guest-invite-copy" onClick={copyLink}>
                {copied ? "Tersalin! ✓" : "Salin Link"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
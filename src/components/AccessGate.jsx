import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./css/access-gate.css";

const OWNER_SESSION_KEY = "journey_session_token";
const GUEST_SESSION_KEY = "journey_guest_token"; // beda key, beda storage
const ROLE_KEY = "journey_session_role";
const PIN_LENGTH = 8;
const GUEST_CODE_LENGTH = 8;

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function AccessGate({ children }) {
  const [status, setStatus] = useState("checking");
  const [mode, setMode] = useState("pin");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentLength = mode === "pin" ? PIN_LENGTH : GUEST_CODE_LENGTH;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const params = new URLSearchParams(window.location.search);
    const guestCode = params.get("guest");

    if (guestCode) {
      const success = await tryRedeemGuestCode(guestCode);
      window.history.replaceState({}, "", window.location.pathname);
      if (success) return;
    }

    await verifyExistingSession();
  };

  const verifyExistingSession = async () => {
    // cek sesi tamu dulu (sessionStorage) -> kalau ga ada, cek sesi owner (localStorage)
    const guestToken = sessionStorage.getItem(GUEST_SESSION_KEY);
    const ownerToken = localStorage.getItem(OWNER_SESSION_KEY);

    const token = guestToken || ownerToken;
    const isGuest = !!guestToken;

    if (!token) {
      setStatus("locked");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("app_sessions")
        .select("token, role")
        .eq("token", token)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        localStorage.setItem(ROLE_KEY, data.role);
        setStatus("granted");
      } else {
        // token invalid/expired di DB, bersihin storage yang relevan
        if (isGuest) sessionStorage.removeItem(GUEST_SESSION_KEY);
        else localStorage.removeItem(OWNER_SESSION_KEY);
        localStorage.removeItem(ROLE_KEY);
        setStatus("locked");
      }
    } catch (err) {
      console.error("Gagal verifikasi sesi:", err);
      setStatus("locked");
    }
  };

  const tryRedeemGuestCode = async (code) => {
    try {
      const { data: token, error } = await supabase.rpc("redeem_guest_invite", {
        input_code: code,
      });
      if (error) throw error;
      if (!token) return false;

      // GUEST -> sessionStorage, hilang begitu tab/app ditutup
      sessionStorage.setItem(GUEST_SESSION_KEY, token);
      localStorage.setItem(ROLE_KEY, "guest");
      setStatus("granted");
      return true;
    } catch (err) {
      console.error("Gagal redeem kode tamu:", err);
      return false;
    }
  };

  const submit = async (value) => {
    setLoading(true);
    try {
      if (mode === "pin") {
        const { data: isValid, error: verifyErr } = await supabase.rpc(
          "verify_app_password",
          { input_password: value }
        );
        if (verifyErr) throw verifyErr;

        if (!isValid) {
          setError("PIN salah, coba lagi.");
          setValue("");
          setLoading(false);
          return;
        }

        const { data: newToken, error: sessionErr } = await supabase.rpc(
          "create_app_session"
        );
        if (sessionErr) throw sessionErr;

        // OWNER -> localStorage, tetap keinget walau app ditutup
        localStorage.setItem(OWNER_SESSION_KEY, newToken);
        localStorage.setItem(ROLE_KEY, "owner");
        setStatus("granted");
      } else {
        const success = await tryRedeemGuestCode(value);
        if (!success) {
          setError("Kode tamu salah/sudah kadaluarsa.");
          setValue("");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan, coba lagi nanti.");
      setValue("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    if (loading) return;
    setError("");

    if (key === "back") return setValue((prev) => prev.slice(0, -1));
    if (key === "clear") return setValue("");

    setValue((prev) => {
      if (prev.length >= currentLength) return prev;
      const next = prev + key;
      if (next.length === currentLength) submit(next);
      return next;
    });
  };

  useEffect(() => {
    if (status !== "locked") return;
    const onKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) handleKeyPress(e.key);
      if (e.key === "Backspace") handleKeyPress("back");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, loading, mode, value]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setValue("");
    setError("");
  };

  if (status === "checking") {
    return <div className="gate-loading-screen">Memeriksa akses...</div>;
  }

  if (status === "locked") {
    return (
      <div className="gate-overlay">
        <div className="gate-box">
          <h2 className="gate-title">Journey Pribadi</h2>
          <p className="gate-subtitle">
            {mode === "pin" ? "Masukkan PIN untuk melanjutkan" : "Masukkan kode tamu"}
          </p>

          <div className="gate-pin-dots">
            {Array.from({ length: currentLength }).map((_, i) => (
              <span
                key={i}
                className={`gate-pin-dot ${i < value.length ? "filled" : ""}`}
              />
            ))}
          </div>

          {error && <p className="gate-error">{error}</p>}
          {loading && <p className="gate-subtitle">Memeriksa...</p>}

          <div className="gate-keypad">
            {NUMPAD_KEYS.map((key) => {
              if (key === "clear") {
                return (
                  <button key={key} type="button" className="gate-key gate-key-action"
                    onClick={() => handleKeyPress("clear")} disabled={loading}>
                    Hapus
                  </button>
                );
              }
              if (key === "back") {
                return (
                  <button key={key} type="button" className="gate-key gate-key-action"
                    onClick={() => handleKeyPress("back")} disabled={loading}>
                    ⌫
                  </button>
                );
              }
              return (
                <button key={key} type="button" className="gate-key"
                  onClick={() => handleKeyPress(key)} disabled={loading}>
                  {key}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="gate-switch-mode"
            onClick={() => switchMode(mode === "pin" ? "guest" : "pin")}
          >
            {mode === "pin" ? "Punya kode tamu?" : "Punya PIN pribadi?"}
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export function isGuestSession() {
  return localStorage.getItem(ROLE_KEY) === "guest";
}
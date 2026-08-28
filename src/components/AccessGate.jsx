import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./css/access-gate.css";

const SESSION_KEY = "journey_session_token";
const PIN_LENGTH = 8;

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function AccessGate({ children }) {
  const [status, setStatus] = useState("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    verifyExistingSession();
  }, []);

  const verifyExistingSession = async () => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      setStatus("locked");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("app_sessions")
        .select("token")
        .eq("token", token)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatus("granted");
      } else {
        localStorage.removeItem(SESSION_KEY);
        setStatus("locked");
      }
    } catch (err) {
      console.error("Gagal verifikasi sesi:", err);
      setStatus("locked");
    }
  };

  const submitPin = async (value) => {
    setLoading(true);
    try {
      const { data: isValid, error: verifyErr } = await supabase.rpc(
        "verify_app_password",
        { input_password: value }
      );
      if (verifyErr) throw verifyErr;

      if (!isValid) {
        setError("PIN salah, coba lagi.");
        setPin("");
        setLoading(false);
        return;
      }

      const { data: newToken, error: sessionErr } = await supabase.rpc(
        "create_app_session"
      );
      if (sessionErr) throw sessionErr;

      localStorage.setItem(SESSION_KEY, newToken);
      setStatus("granted");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan, coba lagi nanti.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    if (loading) return;
    setError("");

    if (key === "back") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "clear") {
      setPin("");
      return;
    }

    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + key;
      if (next.length === PIN_LENGTH) {
        submitPin(next);
      }
      return next;
    });
  };

  // dukung ketikan fisik keyboard juga (untuk desktop)
  useEffect(() => {
    if (status !== "locked") return;

    const onKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) handleKeyPress(e.key);
      if (e.key === "Backspace") handleKeyPress("back");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, loading]);

  if (status === "checking") {
    return <div className="gate-loading-screen">Memeriksa akses...</div>;
  }

  if (status === "locked") {
    return (
      <div className="gate-overlay">
        <div className="gate-box">
          <h2 className="gate-title">Journey Pribadi</h2>
          <p className="gate-subtitle">Masukkan PIN untuk melanjutkan</p>

          <div className="gate-pin-dots">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`gate-pin-dot ${i < pin.length ? "filled" : ""}`}
              />
            ))}
          </div>

          {error && <p className="gate-error">{error}</p>}
          {loading && <p className="gate-subtitle">Memeriksa...</p>}

          <div className="gate-keypad">
            {KEYPAD_KEYS.map((key) => {
              if (key === "clear") {
                return (
                  <button
                    key={key}
                    type="button"
                    className="gate-key gate-key-action"
                    onClick={() => handleKeyPress("clear")}
                    disabled={loading}
                  >
                    Hapus
                  </button>
                );
              }
              if (key === "back") {
                return (
                  <button
                    key={key}
                    type="button"
                    className="gate-key gate-key-action"
                    onClick={() => handleKeyPress("back")}
                    disabled={loading}
                  >
                    ⌫
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  className="gate-key"
                  onClick={() => handleKeyPress(key)}
                  disabled={loading}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
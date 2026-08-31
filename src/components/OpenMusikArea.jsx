import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { isGuestSession } from "./AccessGate";
import "./css/floating-fab.css";

export default function OpenMusikArea({ onOpen }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isGuestSession());
  }, []);

  if (!visible) return null;

  return (
    <div className="fab-float musik-float">
      <Link
        to="/musik"
        title="Buka Halaman Musik"
        className="fab-btn"
        onClick={onOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
        >
          <path d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z" />
        </svg>
      </Link>
    </div>
  );
}
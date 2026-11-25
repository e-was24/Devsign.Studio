import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { isGuestSession } from "./AccessGate";
import "./css/floating-fab.css";

export default function OpenPhotoBooth({ onOpen }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isGuestSession());
  });

  return (
    <div className="fab-float musik-float">
      <Link
        to="/photo-booth"
        title="Masuk Halaman Foto"
        className="fab-btn"
        onClick={onOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Photo booth"
        >
          <defs>
            <g id="pb-strip">
              <rect x="-4.5" y="-9.5" width="9" height="19" rx="1.2" />
              <rect x="-3.2" y="-7.8" width="6.4" height="4.4" rx=".5" />
              <rect x="-3.2" y="-2.1" width="6.4" height="4.4" rx=".5" />
              <rect x="-3.2" y="3.6" width="6.4" height="4.4" rx=".5" />
            </g>
            <mask
              id="pb-mask"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="24"
              height="24"
            >
              <rect width="24" height="24" fill="#fff" />
              <use
                href="#pb-strip"
                transform="translate(15 12.5) rotate(7)"
                fill="#000"
                stroke="#000"
                stroke-width="3.25"
              />
            </mask>
          </defs>

          <g mask="url(#pb-mask)" opacity=".55">
            <use href="#pb-strip" transform="translate(8.5 11.5) rotate(-9)" />
          </g>

          <use href="#pb-strip" transform="translate(15 12.5) rotate(7)" />
        </svg>
      </Link>
    </div>
  );
}

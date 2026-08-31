import { useNavigate } from "react-router-dom";

export default function UnreleasedPage({
  title = "Halaman Ini Belum Dirilis",
  message = "Sedang disiapkan dengan hati-hati. Mohon tunggu sebentar lagi, ya.",
}) {
  const navigate = useNavigate();

  return (
    <div className="unreleased-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=Special+Elite&display=swap');

        .unreleased-wrap {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          background-color: #e9dfc8;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(120, 90, 60, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(90, 70, 50, 0.08) 0%, transparent 45%);
        }

        .unreleased-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background-color: #fdf8ee;
          background-image:
            radial-gradient(circle at 15% 25%, rgba(120, 90, 60, 0.05) 0%, transparent 45%),
            radial-gradient(circle at 85% 75%, rgba(90, 70, 50, 0.06) 0%, transparent 45%);
          border: 2px solid #f2e8d5;
          border-radius: 6px;
          box-shadow:
            0 14px 34px rgba(40, 28, 15, 0.35),
            0 0 0 2px #8a7355;
          padding: 2.6rem 2rem 2.2rem;
          text-align: center;
          transform: rotate(-1deg);
        }

        .unreleased-card::before {
          content: "";
          position: absolute;
          inset: 8px;
          border: 1px dashed rgba(138, 115, 85, 0.55);
          border-radius: 3px;
          pointer-events: none;
        }

        .unreleased-stamp {
          position: relative;
          width: 78px;
          height: 78px;
          margin: 0 auto 1.4rem;
          background: #f2e8d5;
          border: 2px solid #fdf8ee;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(6deg);
          box-shadow:
            0 6px 14px rgba(40, 28, 15, 0.3),
            0 0 0 2px #8a7355;

          -webkit-mask-image:
            radial-gradient(circle at 0 0, transparent 5px, black 5.5px),
            radial-gradient(circle at 100% 0, transparent 5px, black 5.5px),
            radial-gradient(circle at 0 100%, transparent 5px, black 5.5px),
            radial-gradient(circle at 100% 100%, transparent 5px, black 5.5px);
          mask-image:
            radial-gradient(circle at 0 0, transparent 5px, black 5.5px),
            radial-gradient(circle at 100% 0, transparent 5px, black 5.5px),
            radial-gradient(circle at 0 100%, transparent 5px, black 5.5px),
            radial-gradient(circle at 100% 100%, transparent 5px, black 5.5px);
        }

        .unreleased-stamp svg {
          fill: #6b5842;
          width: 34px;
          height: 34px;
        }

        .unreleased-eyebrow {
          font-family: 'Special Elite', cursive;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6b2c2c;
          margin: 0 0 0.6rem;
        }

        .unreleased-title {
          font-family: 'Special Elite', cursive;
          font-weight: normal;
          font-size: 1.15rem;
          letter-spacing: 0.03em;
          color: #3d2f22;
          margin: 0 0 0.9rem;
          line-height: 1.5;
        }

        .unreleased-message {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.15rem;
          font-style: italic;
          color: #6b5842;
          margin: 0 0 1.8rem;
          line-height: 1.5;
        }

        .unreleased-divider {
          border: none;
          border-top: 1px dashed #8a7355;
          margin: 0 0 1.6rem;
        }

        .unreleased-back-btn {
          font-family: 'Special Elite', cursive;
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          background: #6b5842;
          color: #fdf8ee;
          border: none;
          padding: 0.65rem 1.4rem;
          border-radius: 2px;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.2s ease;
        }

        .unreleased-back-btn:hover {
          background: #3d2f22;
          transform: translateY(-2px);
        }

        .unreleased-back-btn:active {
          transform: translateY(0) scale(0.97);
        }

        @media (max-width: 480px) {
          .unreleased-card {
            padding: 2.2rem 1.4rem 1.8rem;
          }
        }
      `}</style>

      <div className="unreleased-card">
        <div className="unreleased-stamp">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
            <path d="M480-80q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Zm-80-240v-560h160v560H400Z" />
          </svg>
        </div>

        <p className="unreleased-eyebrow">Segera Hadir</p>
        <h1 className="unreleased-title">{title}</h1>
        <p className="unreleased-message">{message}</p>

        <hr className="unreleased-divider" />

        <button className="unreleased-back-btn" onClick={() => navigate(-1)}>
          Kembali
        </button>
      </div>
    </div>
  );
}
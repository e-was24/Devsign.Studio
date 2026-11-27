import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useConnect } from "../context/ConnectContext";
import "./Connect.css";

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ---------- ikon SVG (fill = currentColor supaya mengikuti warna teks tema) ---------- */
function Icon({ d, size = 20 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: "middle", flex: "0 0 auto" }}
    >
      <path d={d} />
    </svg>
  );
}

const D = {
  // ikon milikmu
  sound: "M9,21H5q-0.83,0-1.41-0.59T3,19V12q0-1.88 0.71-3.51T5.64,5.64Q6.85,4.42 8.49,3.71T12,3t3.51,0.71t2.85,1.93t1.93,2.85T21,12v7q0,0.82-0.59,1.41T19,21H15V13h4V12q0-2.93-2.04-4.96T12,5Q9.08,5 7.04,7.04T5,12v1H9v8ZM7,15H5v4H7V15Zm10,0v4h2V15H17ZM7,15H5H7Zm10,0h2H17Z",
  control: "M5.65,4.65l-1.4-1.4Q5.73,1.7 7.71,0.85T12,0t4.29,0.85t3.46,2.4l-1.4,1.4Q17.15,3.4 15.51,2.7T12,2T8.49,2.7T5.65,4.65Zm2.8,2.8l-1.4-1.4Q8,5.1 9.26,4.55T12,4t2.74,0.55t2.21,1.5l-1.4,1.4q-0.68-0.68-1.59-1.06T12,6T10.04,6.39T8.45,7.45ZM9.54,22.96Q8.5,21.93 8.5,20.5V12.45q0-1.43 1.04-2.46T12,8.95t2.46,1.04t1.04,2.46V20.5q0,1.43-1.04,2.46T12,24T9.54,22.96Zm3.88-9.05Q14,13.33 14,12.5t-0.59-1.41T12,10.5t-1.41,0.59Q10,11.68 10,12.5t0.59,1.41T12,14.5t1.41-0.59Z",
  group: "M10.28,12q-0.7,0-1.15-0.53Q8.68,10.95 8.8,10.25l0.3-1.8q0.2-1.07 1.01-1.76T12,6q1.1,0 1.91,0.69t1.01,1.76l0.3,1.8q0.13,0.7-0.33,1.22T13.75,12H10.28Zm0.6-2h2.28l-0.2-1.23Q12.9,8.42 12.63,8.21T12,8T11.39,8.21T11.08,8.77L10.88,10ZM3.1,12.98Q2.53,13 2.11,12.75T1.58,11.98q-0.05-0.22-0.03-0.45T1.68,11.1q0,0.03-0.02-0.1Q1.6,10.95 1.4,10.4Q1.35,10.1 1.48,9.82T1.8,9.35q0,0 0.05-0.05Q1.9,8.82 2.24,8.5Q2.58,8.17 3.08,8.17q0.08,0 0.48,0.1q0,0 0.07-0.02Q3.75,8.13 3.95,8.06T4.38,8Q4.65,8 4.86,8.09T5.2,8.35q0.03,0 0.04,0.01Q5.25,8.38 5.28,8.38Q5.63,8.4 5.89,8.59T6.28,9.1Q6.33,9.27 6.31,9.44T6.25,9.75q0,0.02 0.03,0.1q0.17,0.17 0.28,0.39t0.1,0.44q0,0.1-0.15,0.53q-0.02,0.05 0,0.1q0,0 0.05,0.4q0,0.53-0.44,0.9T5.05,12.98H3.1ZM20,13q-0.82,0-1.41-0.59T18,11q0-0.3 0.09-0.56q0.09-0.26 0.24-0.51L17.63,9.3q-0.25-0.2-0.09-0.5T18,8.5h2q0.83,0 1.41,0.59T22,10.5V11q0,0.82-0.59,1.41T20,13ZM0,18V16.43q0-1.1 1.11-1.76T4,14q0.33,0 0.63,0.01T5.2,14.08q-0.35,0.5-0.53,1.08T4.5,16.38V18H0Zm6,0V16.38q0-1.63 1.66-2.63t4.34-1q2.7,0 4.35,1T18,16.38V18H6Zm14-4q1.8,0 2.9,0.66T24,16.43V18H19.5V16.38q0-0.65-0.16-1.22t-0.49-1.08q0.27-0.05 0.56-0.06T20,14Zm-8,0.75q-1.42,0-2.55,0.38T8.13,16H15.9q-0.22-0.5-1.34-0.88T12,14.75ZM12,16Zm0.03-7Z",
  connect: "M16,22V19.75q-1.4-0.45-2.35-1.6t-1.1-2.65h2q0.2,1.07 1.01,1.79T17.5,18h3q0.63,0 1.06,0.44T22,19.5V22H16Zm3-5q-0.82,0-1.41-0.59T17,15t0.59-1.41T19,13t1.41,0.59Q21,14.18 21,15t-0.59,1.41T19,17ZM9,14q0-3.75 2.63-6.38T18,5V7q-2.92,0-4.96,2.04T11,14H9Zm4,0q0-2.08 1.46-3.54T18,9v2q-1.25,0-2.13,0.88T15,14H13ZM2,11V8.5Q2,7.88 2.44,7.44T3.5,7h3Q7.63,7 8.44,6.29T9.45,4.5h2Q11.3,6 10.35,7.15T8,8.75V11H2ZM5,6Q4.18,6 3.59,5.41T3,4Q3,3.17 3.59,2.59T5,2T6.41,2.59T7,4Q7,4.82 6.41,5.41T5,6Z",
  // ikon tambahan (Material Icons)
  scan: "M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  headphones: "M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z",
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  dot: "M12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12z",
  down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
};

/* ---------- pemindai QR (kamera) ---------- */
function Scanner({ onResult }) {
  const [err, setErr] = useState("");
  const done = useRef(false);
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    let scanner = null, stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (stopped) return;
        scanner = new Html5Qrcode("cn-qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => { if (!done.current) { done.current = true; cb.current(text); } },
          () => {}
        );
      } catch {
        setErr("Kamera tidak bisa dibuka. Izinkan akses kamera (perlu HTTPS), atau pakai tab Kode / Link.");
      }
    })();
    return () => {
      stopped = true;
      if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, []);

  return (
    <>
      <div id="cn-qr-reader" className="cn-reader" />
      {err && <p className="form-error">{err}</p>}
    </>
  );
}

/* ---------- modal hubungkan perangkat ---------- */
export function ConnectModal({ onClose }) {
  const c = useConnect();
  const [mode, setMode] = useState(null); // null | "remote"
  const [tab, setTab] = useState("scan");
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  // remote yang sudah tersambung ke pemutar: tutup modal, kontrol muncul di bawah layar
  useEffect(() => { if (c.role === "remote" && c.hostOnline) onClose(); }, [c.role, c.hostOnline, onClose]);

  function tryConnect(text) {
    if (c.connectTo(text)) { setErr(""); return true; }
    setErr("Kode atau link tidak valid."); return false;
  }
  async function copy() {
    try { await navigator.clipboard.writeText(c.link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* abaikan */ }
  }

  const remotes = c.peers.filter((p) => p.role === "remote");
  let body;

  if (c.role === "host") {
    body = (
      <>
        <p className="cn-sub">Scan QR ini dari perangkat lain, atau buka link / masukkan kode. Musik tetap diputar di perangkat ini.</p>
        <div className="cn-qr"><QRCodeSVG value={c.link} size={190} /></div>
        <p className="cn-code">{c.code}</p>
        <div className="cn-linkrow">
          <input readOnly value={c.link} onFocus={(e) => e.target.select()} />
          <button type="button" className="cancel-btn cn-inline" onClick={copy}>
            {copied ? <><Icon d={D.check} size={16} /> Tersalin</> : "Salin"}
          </button>
        </div>
        <div className="cn-peers">
          <b>Perangkat pengontrol</b>
          {remotes.length === 0 ? <span className="cn-muted">Belum ada yang terhubung…</span>
            : remotes.map((p) => (
              <span key={p.id} className="cn-peer">
                <Icon d={D.dot} size={10} />
                {p.name}
                {p.listening && <><Icon d={D.headphones} size={14} /> dengar bareng</>}
                {p.id === c.deviceId ? " (ini)" : ""}
              </span>
            ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={() => { c.leave(); }}>Putuskan</button>
          <button type="button" className="submit-btn" onClick={onClose}>Selesai</button>
        </div>
      </>
    );
  } else if (c.role === "remote") {
    body = (
      <>
        <p className="cn-sub">
          {c.status === "lost" ? "Koneksi gagal. Coba lagi."
            : c.status === "connecting" ? "Menghubungkan…"
            : "Perangkat pemutar tidak ditemukan. Pastikan halaman Songs terbuka dan QR-nya masih aktif."}
        </p>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={() => { c.leave(); setMode("remote"); }}>Coba kode lain</button>
          <button type="button" className="submit-btn" onClick={() => { c.leave(); onClose(); }}>Batal</button>
        </div>
      </>
    );
  } else if (mode === "remote") {
    body = (
      <>
        <div className="input-type-toggle" role="radiogroup">
          <button type="button" className={`type-option ${tab === "scan" ? "active" : ""}`} onClick={() => setTab("scan")}>
            <Icon d={D.scan} /><span>Scan QR</span>
          </button>
          <button type="button" className={`type-option ${tab === "code" ? "active" : ""}`} onClick={() => setTab("code")}>
            <Icon d={D.link} /><span>Kode / Link</span>
          </button>
        </div>
        {tab === "scan" ? (
          <Scanner onResult={(t) => { if (!tryConnect(t)) setTab("code"); }} />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); tryConnect(input); }}>
            <label>Tempel link atau ketik kode
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://…?connect=ABCD2345 atau ABCD2345" autoFocus />
            </label>
            <button type="submit" className="submit-btn cn-full">Hubungkan</button>
          </form>
        )}
        {err && <p className="form-error">{err}</p>}
        <div className="modal-actions">
          <button type="button" className="cancel-btn cn-inline" onClick={() => setMode(null)}>
            <Icon d={D.back} size={16} /> Kembali
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <button type="button" className="cn-choice" onClick={() => c.startHost()}>
          <b><Icon d={D.sound} /> Putar di perangkat ini</b>
          <span>Tampilkan QR &amp; link agar perangkat lain bisa mengontrol musik di sini.</span>
        </button>
        <button type="button" className="cn-choice" onClick={() => setMode("remote")}>
          <b><Icon d={D.control} /> Kontrol perangkat lain</b>
          <span>Scan QR atau masukkan kode dari perangkat yang sedang memutar musik. Bisa juga dengar bareng.</span>
        </button>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Tutup</button>
        </div>
      </>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cn-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Hubungkan Perangkat</h3>
        {body}
      </div>
    </div>
  );
}

/* ---------- tombol pembuka (taruh di header halaman) ---------- */
export function ConnectButton() {
  const c = useConnect();
  const [open, setOpen] = useState(false);
  const remotes = c.peers.filter((p) => p.role === "remote").length;
  const label = c.role === "host" ? `Terhubung${remotes ? ` (${remotes})` : ""}` : c.role === "remote" ? "Mengontrol" : "Hubungkan";
  return (
    <>
      <button className={"upload-btn cn-btn" + (c.role ? " on" : "")} onClick={() => setOpen(true)}>
        <Icon d={D.connect} /> {label}
      </button>
      {open && <ConnectModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------- kontrol jarak jauh (render sekali di App, dekat pemutar) ---------- */
export function ConnectDock() {
  const c = useConnect();
  const [, tick] = useState(0);
  const [drag, setDrag] = useState(null);
  const [hidden, setHidden] = useState(false); // true = panel disimpan ke dalam amplop
  const isRemote = c?.role === "remote";

  useEffect(() => { if (!isRemote) setHidden(false); }, [isRemote]); // sesi baru selalu mulai terbuka

  useEffect(() => {
    if (!isRemote) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [isRemote]);

  if (!isRemote) return null;
  const s = c.remoteState;
  const host = c.peers.find((p) => p.role === "host");
  const dur = s?.duration || 0;
  const pos = s ? s.position + (s.isPlaying ? (Date.now() - s.recvAt) / 1000 : 0) : 0;
  const shown = drag ?? Math.min(pos, dur || pos);
  const commit = (v) => { c.send({ type: "seek", time: v }); setDrag(null); };

  return (
    <div className={"cn-wrap" + (hidden ? " hidden" : "")}>
      {/* panel kontrol: meluncur masuk ke amplop saat disembunyikan */}
      <div className="cn-dock" inert={hidden}>
        <div className="cn-dock-top">
          <div className="cn-dock-info">
            <p className="cn-dock-title">{s?.song?.title || (c.hostOnline ? "Tidak ada lagu diputar" : "Menunggu perangkat pemutar…")}</p>
            <p className="cn-dock-sub">
              {s?.song ? `by ${s.song.artist} · ` : ""}
              <Icon d={D.sound} size={14} /> {host?.name || "Perangkat pemutar"}{c.hostOnline ? "" : " (terputus)"}
            </p>
          </div>
          <div className="cn-dock-btns">
            <button className="cn-x" onClick={() => setHidden(true)} aria-label="Simpan ke amplop" title="Simpan ke amplop"><Icon d={D.down} size={22} /></button>
            <button className="cn-x" onClick={c.leave} aria-label="Putuskan" title="Putuskan"><Icon d={D.close} size={18} /></button>
          </div>
        </div>
        <div className="cn-seek">
          <span>{fmt(shown)}</span>
          <input type="range" min={0} max={dur || 1} step={1} value={dur ? shown : 0} disabled={!dur || !c.hostOnline}
            onChange={(e) => setDrag(+e.target.value)}
            onPointerUp={(e) => commit(+e.target.value)}
            onKeyUp={(e) => commit(+e.target.value)} />
          <span>{fmt(dur)}</span>
        </div>
        <button
          className={"cn-listen" + (c.listenHere ? " on" : "")}
          onClick={() => c.setListenHere(!c.listenHere)}
          disabled={!c.hostOnline}
        >
          <Icon d={D.group} /> {c.listenHere ? "Dengar bareng: ON" : "Dengar bareng di perangkat ini"}
        </button>
        <div className="cn-ctrls">
          <button onClick={() => c.send({ type: "prev" })} disabled={!c.hostOnline} aria-label="Sebelumnya"><Icon d={D.prev} size={22} /></button>
          <button className="cn-play" onClick={() => c.send({ type: "toggle" })} disabled={!c.hostOnline || !s?.song} aria-label="Play/Pause">
            <Icon d={s?.isPlaying ? D.pause : D.play} size={24} />
          </button>
          <button onClick={() => c.send({ type: "next" })} disabled={!c.hostOnline} aria-label="Berikutnya"><Icon d={D.next} size={22} /></button>
        </div>
      </div>

      {/* amplop: muncul saat panel disembunyikan, ketuk untuk membuka lagi */}
      <button
        className="cn-envelope"
        onClick={() => setHidden(false)}
        tabIndex={hidden ? 0 : -1}
        aria-label="Buka kontrol musik"
        title="Buka kontrol musik"
      >
        <span className="cn-env-front" />
        <span className="cn-env-flap" />
        <span className="cn-env-seal" />
        {s?.isPlaying && <span className="cn-env-eq" aria-hidden="true"><i /><i /><i /></span>}
      </button>
    </div>
  );
}
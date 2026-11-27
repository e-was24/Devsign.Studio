"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import "./css/CalendarPage.css";
import { supabase } from "../supabaseClient";

/* ---------- konstanta ---------- */
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();
const MIN_YEAR = THIS_YEAR - 10, MAX_YEAR = THIS_YEAR + 10;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const TOTAL = 12;                             // hanya 12 bulan dari tahun terpilih yang dimuat
const HEAD = 52, ROW = 78, MONTH_H = HEAD + ROW * 6;
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const TODAY_KEY = keyOf(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const prettyDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/* ---------- Supabase: storage & helper ---------- */
const BUCKET = "memory-photos";
const urlOf = (path) => /^https?:\/\//.test(path) ? path : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
// perkecil foto di browser: versi penuh (1600px) + thumbnail (480px) untuk kalender
const resize = (file, max, q) => new Promise((res, rej) => {
  const img = new Image();
  const u = URL.createObjectURL(file);
  img.onload = () => {
    const sc = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * sc);
    c.height = Math.round(img.height * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u);
    c.toBlob((blob) => (blob ? res(blob) : rej(new Error("Gagal memproses gambar"))), "image/jpeg", q);
  };
  img.onerror = () => rej(new Error("Format gambar tidak didukung"));
  img.src = u;
});

/* ---------- foto dari Journey (gallery_items, hanya dibaca) ---------- */
const MONTH_ID = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8, ags: 8, sep: 9, okt: 10, nov: 11, des: 12 };
const toKey = (y, m, d) => (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null);
// date_label bisa berformat 2026-11-27, 27/11/2026, 27-11-2026, atau "27 November 2026".
// Kalau tidak terbaca, dipakai tanggal unggah (created_at).
const journeyDate = (it) => {
  const t = String(it.date_label || "").trim().toLowerCase();
  let r;
  if ((r = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return toKey(+r[1], +r[2], +r[3]);
  if ((r = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return toKey(+r[3], +r[2], +r[1]);
  if ((r = t.match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/)) && MONTH_ID[r[2]]) return toKey(+r[3], MONTH_ID[r[2]], +r[1]);
  const c = it.created_at ? new Date(it.created_at) : null;
  return c && !isNaN(c) ? keyOf(c.getFullYear(), c.getMonth(), c.getDate()) : null;
};

/* ---------- pengingat: helper ---------- */
const nowKey = () => { const n = new Date(); return keyOf(n.getFullYear(), n.getMonth(), n.getDate()); };
// true jika k adalah hari ini dan jam pengingat sudah lewat
const isDue = (k, time) => {
  if (k !== nowKey()) return false;
  const n = new Date();
  const [h, m] = (time || "08:00").split(":").map(Number);
  return n.getHours() * 60 + n.getMinutes() >= h * 60 + m;
};
const Bell = ({ size = 12 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7-6.5V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v4.5L3 17.5V19h18v-1.5l-2-2Z" />
  </svg>
);
const beep = () => {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.4, 0.8].forEach((t) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.15, c.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.3);
      o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.3);
    });
  } catch {}
};

/* ---------- satu bulan ---------- */
const Month = memo(function Month({ year, index, days, jmap, onOpen, onNote }) {
  const y = year;
  const m = index;
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<div key={"e" + i} className="dm-cell dm-empty" />);
  for (let d = 1; d <= dim; d++) {
    const k = keyOf(y, m, d);
    const info = days[k];
    const isToday = k === TODAY_KEY;
    const jl = jmap[k];                                   // foto dari Journey di tanggal ini
    const total = (info?.count || 0) + (jl?.length || 0);
    const cover = info?.cover || jl?.[0]?.media_url;
    const bg = cover ? urlOf(cover) : null;
    cells.push(
      <div key={k} className={"dm-cell" + (info || jl ? " has" : "") + (bg ? " has-photo" : "")} style={{ "--rot": `${((d * 7) % 5 - 2) * 0.6}deg` }}>
        <button className="dm-open" onClick={() => onOpen(k)} aria-label={`Buka kenangan ${prettyDate(k)}`}>
          {bg && <span className="dm-snap" style={{ backgroundImage: `url("${bg}")` }} />}
          <span className={"dm-num" + (isToday ? " today" : "")}>{d}</span>
          {info?.note && <span className="dm-preview">{info.note}</span>}
          {total > 0 && <span className="dm-count">{total} foto</span>}
          {info?.remind && <span className="dm-bell" title={`Pengingat ${info.time}`}><Bell /></span>}
        </button>
        <button className="dm-add" onClick={() => onNote(k)} aria-label={`Catatan untuk ${prettyDate(k)}`}>
          {info?.note ? "✎" : "+"}
        </button>
      </div>
    );
  }
  return (
    <section className="dm-month" style={{ top: index * MONTH_H, height: MONTH_H }}>
      <h2 className="dm-title" style={{ height: HEAD }}>{MONTHS[m]} <small>{y}</small></h2>
      <div className="dm-grid" style={{ gridAutoRows: ROW }}>{cells}</div>
    </section>
  );
});

/* ---------- modal catatan + pengingat ---------- */
function NoteModal({ dateKey, info, onSave, onClose }) {
  const [text, setText] = useState(info?.note || "");
  const [remind, setRemind] = useState(!!info?.remind);
  const [time, setTime] = useState(info?.time || "08:00");
  const toggle = (on) => {
    setRemind(on);
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
  };
  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Catatan">
        <p className="dm-modal-date">{prettyDate(dateKey)}</p>
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Apa yang kamu ingat dari hari ini?" rows={5} />
        <label className="dm-remind">
          <input type="checkbox" checked={remind} onChange={(e) => toggle(e.target.checked)} />
          <span>Ingatkan saya di tanggal ini</span>
          <input type="time" value={time} disabled={!remind} onChange={(e) => setTime(e.target.value || "08:00")} />
        </label>
        <div className="dm-actions">
          <button className="dm-btn ghost" onClick={onClose}>Batal</button>
          <button className="dm-btn" onClick={() => onSave({ note: text.trim(), remind, time })}>Simpan catatan</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- halaman galeri per tanggal ---------- */
function Gallery({ dateKey, info, journey, onClose, onChange }) {
  const [photos, setPhotos] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const infoRef = useRef(info);
  infoRef.current = info;
  // foto Journey: hanya tampil, tidak bisa dihapus dari kalender
  const jphotos = (journey || []).map((it) => ({ id: "j" + it.id, path: it.media_url, thumb_path: it.media_url, journey: true }));
  const all = [...photos, ...jphotos];

  const fetchList = useCallback(async () => {
    const { data, error } = await supabase.from("photos").select("*").eq("date", dateKey).order("created_at");
    if (error) { setErr("Gagal memuat foto. Cek koneksi atau pengaturan Supabase."); return null; }
    setPhotos(data);
    return data;
  }, [dateKey]);
  useEffect(() => { fetchList(); }, [fetchList]);

  // sinkronkan jumlah foto & latar tanggal ke kalender
  const sync = (list, forceCover) => {
    const cv = infoRef.current?.cover;
    const keep = cv && (/^https?:\/\//.test(cv) || list.some((p) => p.thumb_path === cv)) ? cv : null;
    onChange(dateKey, { count: list.length, cover: forceCover || keep || list[0]?.thumb_path || null });
  };

  const addFiles = async (files) => {
    setBusy(true); setErr("");
    try {
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        const id = crypto.randomUUID();
        const path = `${dateKey}/${id}.jpg`, thumb = `${dateKey}/${id}_t.jpg`;
        const [full, small] = await Promise.all([resize(f, 1600, 0.85), resize(f, 480, 0.8)]);
        const bucket = supabase.storage.from(BUCKET);
        for (const [pth, blob] of [[path, full], [thumb, small]]) {
          const { error } = await bucket.upload(pth, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (error) throw error;
        }
        const { error } = await supabase.from("photos").insert({ id, date: dateKey, path, thumb_path: thumb });
        if (error) throw error;
      }
    } catch (e) { setErr("Gagal mengunggah: " + (e.message || "coba lagi")); }
    const list = await fetchList();
    if (list) sync(list);
    setBusy(false);
  };

  const remove = async (ph) => {
    setViewer(null);
    await supabase.storage.from(BUCKET).remove([ph.path, ph.thumb_path]);
    await supabase.from("photos").delete().eq("id", ph.id);
    const list = await fetchList();
    if (list) sync(list);
  };

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && (viewer ? setViewer(null) : onClose());
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [viewer, onClose]);

  return (
    <div className="dm-gallery">
      <header className="dm-gh">
        <button className="dm-btn ghost" onClick={onClose}>← Kalender</button>
        <button className="dm-btn" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Mengunggah…" : "Tambah foto"}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} />
      </header>
      <div className="dm-gbody">
        <h1 className="dm-gtitle">{prettyDate(dateKey)}</h1>
        <textarea
          className="dm-gnote"
          value={info?.note || ""}
          onChange={(e) => onChange(dateKey, { note: e.target.value })}
          placeholder="Tulis catatan untuk hari ini…"
          rows={3}
        />
        {err && <p className="dm-msg err">{err}</p>}
        {all.length === 0 ? (
          <button className="dm-drop" disabled={busy} onClick={() => fileRef.current?.click()}>
            Belum ada foto di tanggal ini. Pilih foto untuk menyimpannya di sini.
          </button>
        ) : (
          <div className="dm-photos">
            {all.map((ph) => (
              <button key={ph.id} className={"dm-photo" + (ph.thumb_path === info?.cover ? " is-cover" : "") + (ph.journey ? " from-journey" : "")} onClick={() => setViewer(ph)}>
                <img src={urlOf(ph.thumb_path)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      {viewer && (
        <div className="dm-overlay dark" onClick={() => setViewer(null)}>
          <img className="dm-big" src={urlOf(viewer.path)} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="dm-vbar" onClick={(e) => e.stopPropagation()}>
            <button className="dm-btn ghost light" onClick={() => setViewer(null)}>Tutup</button>
            <button className="dm-btn" onClick={() => { sync(photos, viewer.thumb_path); setViewer(null); }}>Jadikan latar tanggal</button>
            {viewer.journey
              ? <span className="dm-vnote">Foto dari Journey</span>
              : <button className="dm-btn danger" onClick={() => remove(viewer)}>Hapus foto</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- halaman utama ---------- */
// onBack: fungsi navigasi (mis. () => navigate("/")); jika tidak diisi, tombol jadi link ke homeHref
export default function CalendarPage({ onBack, homeHref = "/journey" }) {
  const [days, setDays] = useState({});
  const [jmap, setJmap] = useState({});        // { "2026-11-27": [item Journey, ...] }
  const [openKey, setOpenKey] = useState(null);
  const [noteKey, setNoteKey] = useState(null);
  const [year, setYear] = useState(THIS_YEAR);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(800);
  const scroller = useRef(null);

  const daysRef = useRef({});
  const timers = useRef({});

  const checkRef = useRef(null);
  const loadedYears = useRef(new Set());
  const doneRef = useRef(new Set());       // tanggal yang alarmnya sudah ditutup
  const [alarm, setAlarm] = useState(null);

  // muat catatan + latar tanggal + pengingat untuk satu tahun (sekali per tahun)
  const loadYear = useCallback((y) => {
    if (loadedYears.current.has(y)) return;
    loadedYears.current.add(y);
    supabase.from("memories").select("date,note,photo_count,cover_path,remind,remind_time")
      .gte("date", `${y}-01-01`).lte("date", `${y}-12-31`)
      .then(({ data, error }) => {
        if (error) { loadedYears.current.delete(y); console.error(error); return; }
        const m = {};
        data.forEach((r) => {
          m[r.date] = { note: r.note || "", count: r.photo_count || 0, cover: r.cover_path, remind: !!r.remind, time: r.remind_time || "08:00" };
        });
        daysRef.current = { ...daysRef.current, ...m };
        setDays(daysRef.current);
        checkRef.current?.();
      });
  }, []);
  useEffect(() => { loadYear(year); }, [year, loadYear]);

  // ambil foto dari Journey (gallery_items) sekali: hanya metadata, per 1000 baris
  useEffect(() => {
    let off = false;
    (async () => {
      const map = {};
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("gallery_items")
          .select("id,media_url,media_type,date_label,created_at")
          .or("is_active.is.null,is_active.eq.true")
          .order("id").range(from, from + 999);
        if (error) { console.error("Gagal memuat foto Journey", error); break; }
        data.forEach((it) => {
          if (!it.media_url || String(it.media_type || "").startsWith("video")) return;
          const k = journeyDate(it);
          if (k) (map[k] ||= []).push(it);
        });
        if (data.length < 1000) break;
      }
      if (!off) setJmap(map);
    })();
    return () => { off = true; };
  }, []);

  // ubah satu tanggal: tampil langsung, lalu simpan ke Supabase (ditunda 0,5 dtk saat mengetik)
  const patchDay = useCallback((k, patch) => {
    const cur = { note: "", count: 0, cover: null, remind: false, time: "08:00", ...daysRef.current[k], ...patch };
    const next = { ...daysRef.current };
    const empty = !cur.note && !cur.count && !cur.remind && !cur.cover;
    if (empty) delete next[k]; else next[k] = cur;
    daysRef.current = next;
    setDays(next);
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(async () => {
      const q = empty
        ? supabase.from("memories").delete().eq("date", k)
        : supabase.from("memories").upsert({ date: k, note: cur.note, photo_count: cur.count, cover_path: cur.cover, remind: cur.remind, remind_time: cur.time, updated_at: new Date().toISOString() });
      const { error } = await q;
      if (error) console.error("Gagal menyimpan", error);
    }, 500);
  }, []);

  // ---- alarm: cek tiap 20 detik & saat tab dibuka kembali ----
  const markDone = (k, on) => {
    if (on) doneRef.current.add(k); else doneRef.current.delete(k);
    try { localStorage.setItem("date-memory:alarm-done", JSON.stringify([...doneRef.current].slice(-60))); } catch {}
  };
  useEffect(() => {
    try { doneRef.current = new Set(JSON.parse(localStorage.getItem("date-memory:alarm-done") || "[]")); } catch {}
    const check = () => {
      const k = nowKey();
      loadYear(Number(k.slice(0, 4)));       // jaga-jaga saat tab terbuka lewat pergantian tahun
      const info = daysRef.current[k];
      if (!info?.remind || doneRef.current.has(k) || !isDue(k, info.time)) return;
      setAlarm((a) => a || { date: k, note: info.note, count: info.count });
    };
    checkRef.current = check;
    check();
    const id = setInterval(check, 20000);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", check); };
  }, [loadYear]);

  // saat alarm muncul: bunyi + notifikasi browser (jika tab sedang tidak terlihat)
  useEffect(() => {
    if (!alarm) return;
    beep();
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification("Ada kenangan hari ini", { body: alarm.note || prettyDate(alarm.date) });
    }
  }, [alarm]);
  const closeAlarm = (openIt) => {
    markDone(alarm.date, true);
    if (openIt) setOpenKey(alarm.date);
    setAlarm(null);
  };

  // ukur tinggi viewport
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // saat tahun berganti: lompat ke bulan ini (tahun ini) atau Januari
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = (year === THIS_YEAR ? NOW.getMonth() : 0) * MONTH_H;
    setScrollTop(el.scrollTop);
  }, [year]);

  // hanya render bulan yang masuk frame (+1 bulan cadangan)
  const first = Math.max(0, Math.floor(scrollTop / MONTH_H) - 1);
  const last = Math.min(TOTAL - 1, Math.ceil((scrollTop + viewH) / MONTH_H) + 1);
  const months = [];
  for (let i = first; i <= last; i++) {
    months.push(<Month key={`${year}-${i}`} year={year} index={i} days={days} jmap={jmap} onOpen={setOpenKey} onNote={setNoteKey} />);
  }

  const cur = Math.min(TOTAL - 1, Math.max(0, Math.floor((scrollTop + viewH / 3) / MONTH_H)));
  const goToday = () => {
    if (year !== THIS_YEAR) setYear(THIS_YEAR);
    else scroller.current?.scrollTo({ top: NOW.getMonth() * MONTH_H, behavior: "smooth" });
  };

  return (
    <main className="dm-root">
      <header className="dm-top">
        <div className="dm-bar">
          {onBack ? (
            <button className="dm-btn ghost dm-back" onClick={onBack} aria-label="Kembali ke beranda">
              <span aria-hidden="true">←</span><span className="dm-back-label">Beranda</span>
            </button>
          ) : (
            <a className="dm-btn ghost dm-back" href={homeHref} aria-label="Kembali ke beranda">
              <span aria-hidden="true">←</span><span className="dm-back-label">Beranda</span>
            </a>
          )}
          <h1>Kalender</h1>
          <span className="dm-cur">{MONTHS[cur]}</span>
          <div className="dm-year">
            <button className="dm-yarrow" onClick={() => setYear((y) => y - 1)} disabled={year <= MIN_YEAR} aria-label="Tahun sebelumnya">‹</button>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Pilih tahun">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="dm-yarrow" onClick={() => setYear((y) => y + 1)} disabled={year >= MAX_YEAR} aria-label="Tahun berikutnya">›</button>
          </div>
          <button className="dm-btn ghost" onClick={goToday}>Hari ini</button>
        </div>
        <div className="dm-week">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
      </header>

      <div className="dm-scroll" ref={scroller} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <div style={{ height: TOTAL * MONTH_H, position: "relative" }}>{months}</div>
      </div>

      {noteKey && (
        <NoteModal
          dateKey={noteKey}
          info={days[noteKey]}
          onClose={() => setNoteKey(null)}
          onSave={(v) => {
            patchDay(noteKey, v);
            markDone(noteKey, v.remind && isDue(noteKey, v.time)); // jam sudah lewat? jangan bunyi seketika
            setNoteKey(null);
            checkRef.current?.();
          }}
        />
      )}
      {alarm && (
        <div className="dm-overlay alarm">
          <div className="dm-modal dm-alarm" role="alertdialog" aria-label="Pengingat">
            <span className="dm-alarm-icon"><Bell size={34} /></span>
            <p className="dm-modal-date">Hari ini ada kenangan</p>
            <p className="dm-alarm-date">{prettyDate(alarm.date)}</p>
            {alarm.note && <p className="dm-alarm-note">{alarm.note}</p>}
            <div className="dm-actions">
              <button className="dm-btn ghost" onClick={() => closeAlarm(false)}>Tutup</button>
              <button className="dm-btn" onClick={() => closeAlarm(true)}>Buka tanggal ini</button>
            </div>
          </div>
        </div>
      )}
      {openKey && <Gallery dateKey={openKey} info={days[openKey]} journey={jmap[openKey]} onClose={() => setOpenKey(null)} onChange={patchDay} />}
    </main>
  );
}
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { useRef, useState, useEffect } from "react";
import TextPlugin from "gsap/TextPlugin";
import { Link } from "react-router-dom";
import catLoader from "../components/catLoader.gif";
import JourneyPost from "../components/JourneyPost";
import { supabase } from "../supabaseClient";
import { isGuestSession } from "../components/AccessGate";
import GuestInviteButton from "../components/GuestInviteButton";

import "./css/journey-style.css";

gsap.registerPlugin(TextPlugin);

export default function Journey() {
  const container = useRef();
  const layoutRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const CARD_HEIGHT = 85;
  const CARD_GAP = 16;
  const STACK_TOP_OFFSET = 5;
  const GROUP_BOTTOM_SPACING = 55;
  const [visible, setVisible] = useState(false);

  async function fetchJourneys() {
    const { data, error } = await supabase
      .from("journeys")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Gagal mengambil data journey:", error);
    } else {
      setJourneys(data);
    }
  }

  function getGroupHeight(itemCount) {
    const stackHeight = itemCount * CARD_HEIGHT + (itemCount - 1) * CARD_GAP;
    return STACK_TOP_OFFSET + stackHeight + GROUP_BOTTOM_SPACING;
  }

  useEffect(() => {
    fetchJourneys();
  }, []);

  const handleDeleteJourney = async (id, title) => {
    const confirmDelete = window.confirm(
      `Apakah kamu yakin ingin menghapus journey "${title}"? Semua data terkait mungkin akan terpengaruh.`,
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("journeys").delete().eq("id", id);
      if (error) throw error;

      alert("Journey berhasil dihapus! 🗑️");
      fetchJourneys();
    } catch (err) {
      console.error("Gagal menghapus journey:", err);
      alert("Terjadi kesalahan saat menghapus journey.");
    }
  };

  useEffect(() => {
    setVisible(!isGuestSession());
  });

  // --- BARU: kelompokkan journeys bertingkat -> per TAHUN, lalu per BULAN ---
  // Hasil: [ [year, [ [month, items[]], [month, items[]] ]], [year, [...]] ]
  // Urutan tahun & bulan mengikuti kemunculan pertama di array `journeys`
  // (yang sudah terurut berdasarkan order_index dari query Supabase).
  const yearGroups = React.useMemo(() => {
    const yearMap = new Map();

    for (const item of journeys) {
      const yearKey = item.year;
      if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Map());
      const monthMap = yearMap.get(yearKey);

      const monthKey = item.month_label;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey).push(item);
    }

    return Array.from(yearMap.entries()).map(([year, monthMap]) => [
      year,
      Array.from(monthMap.entries()),
    ]);
  }, [journeys]);

  useGSAP(() => {
    const loadingTl = gsap.timeline();

    loadingTl.to(".journey-loading-container", {
      duration: 3.5,
      opacity: 0.5,
      onComplete: () => {
        setIsLoading(false);
        gsap.to(".layout", {
          duration: 1.5,
          display: "block",
          opacity: 1,
        });
      },
    });

    loadingTl.to(layoutRef.current, {
      display: "block",
      duration: 0,
    });
  }, []);

  // Animasi progresif: tiap GRUP BULAN muncul menyusul ke bawah (lintas tahun sekalipun)
  useGSAP(() => {
    if (yearGroups.length === 0) return;
    gsap.fromTo(
      ".journey-month-group",
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.2,
        ease: "power2.out",
        delay: 0.3,
      },
    );
  }, [yearGroups]);

  return (
    <div ref={container}>
      {isLoading && (
        <div className="journey-loading-container">
          <img src={catLoader} alt="Loading" />
        </div>
      )}

      <div className="layout-journey" ref={layoutRef}>
        <JourneyPost onJourneyAdded={fetchJourneys} />
        <GuestInviteButton />
        <div className="drop-line">
          <p className="post-info">
            💡Tip: Select or create a cover below → Upload a photo into that
            cover.
          </p>
          <br />

          {yearGroups.map(([year, monthGroups]) => (
            <div key={year} className="journey-year-section">
              <h2 className="title-years">{year}</h2>

              <div className="line-v">
                {monthGroups.map(([month, items]) => (
                  <div
                    key={`${year}-${month}`}
                    className="journey-month-group"
                    style={{ minHeight: `${getGroupHeight(items.length)}px` }}
                  >
                    <h1 className="title-month">{month}</h1>
                    <div className="line-h-1"></div>

                    <div className="journey-cards-stack">
                      {items.map((item) => (
                        <div key={item.id} className="journey-item-circle-wrap">
                          <div className="journey-item-anchor">
                            <Link
                              to={`/galery/${item.title.toLowerCase()}`}
                              className="link"
                            >
                              <div
                                className="circle-1"
                                title={item.title}
                                style={{
                                  backgroundImage: `url(${item.cover_url})`,
                                  backgroundSize: "cover",
                                }}
                              ></div>
                            </Link>

                            {visible && (
                              <button
                                onClick={() =>
                                  handleDeleteJourney(item.id, item.title)
                                }
                                className="journey-delete-btn"
                                title="Hapus Journey"
                              >
                                &times;
                              </button>
                            )}
                          </div>

                          {/* --- BARU: label judul di samping card --- */}
                          <span className="journey-item-title">
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

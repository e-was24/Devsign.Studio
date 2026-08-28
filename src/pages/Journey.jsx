import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { useRef, useState, useEffect } from "react";
import TextPlugin from "gsap/TextPlugin";
import { Link } from "react-router-dom";
import catLoader from "../components/catLoader.gif";
import JourneyPost from "../components/JourneyPost";
import { supabase } from "../supabaseClient";

import "./css/journey-style.css";

gsap.registerPlugin(TextPlugin);

export default function Journey() {
  const container = useRef();
  const layoutRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const CARD_HEIGHT = 85; // sesuai .circle-1 width/height desktop
  const CARD_GAP = 16; // sesuai gap di .journey-cards-stack
  const STACK_TOP_OFFSET = 5;
  const GROUP_BOTTOM_SPACING = 55; // jarak aman ke grup bulan berikutnya

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

  // --- BARU: kelompokkan journeys berdasarkan month_label ---
  // Hasil: [ ["AUG", [item1, item2]], ["SEP", [item3]], ... ]
  // Urutan grup mengikuti kemunculan pertama tiap bulan di array `journeys`
  // (yang sudah terurut berdasarkan order_index dari query Supabase).
  const monthGroups = React.useMemo(() => {
    const map = new Map();
    for (const item of journeys) {
      const key = item.month_label;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()); // [[month, items[]], ...]
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

  // Animasi progresif: tiap GRUP BULAN muncul menyusul ke bawah
  useGSAP(() => {
    if (monthGroups.length === 0) return;
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
  }, [monthGroups]);

  return (
    <div ref={container}>
      {isLoading && (
        <div className="journey-loading-container">
          <img src={catLoader} alt="Loading" />
        </div>
      )}

      <div className="layout-journey" ref={layoutRef}>
        <JourneyPost onJourneyAdded={fetchJourneys} />

        <div className="drop-line">
          <h2 className="title-years">2026</h2>
          <p className="post-info">💡Tip: Select or create a cover below → Upload a photo into that cover.</p>
          <br />
          <div className="line-v">
            {monthGroups.map(([month, items]) => (
              <div
                key={month}
                className="journey-month-group"
                style={{ minHeight: `${getGroupHeight(items.length)}px` }}
              >
                <h1 className="title-month">{month}</h1>
                <div className="line-h-1"></div>

                <div className="journey-cards-stack">
                  {items.map((item) => (
                    <div key={item.id} className="journey-item-circle-wrap">
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

                      <button
                        onClick={() => handleDeleteJourney(item.id, item.title)}
                        className="journey-delete-btn"
                        title="Hapus Journey"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

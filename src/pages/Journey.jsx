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
import OpenMusikArea from "../components/OpenMusikArea";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {visible && (
          <button
            className={`sidebar-toggle-btn ${sidebarOpen ? "is-open" : ""}`}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#e3e3e3"
            >
              <path d="M507-480 384-357l56 57 180-180-180-180-56 57 123 123ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
            </svg>
          </button>
        )}

        {visible && (
          <>
            <div
              className={`sidebar-overlay ${sidebarOpen ? "is-open" : ""}`}
              onClick={() => setSidebarOpen(false)}
            />
            <div className={`journey-sidebar ${sidebarOpen ? "is-open" : ""}`}>
              <div className="sidebar-actions">
                <JourneyPost
                  onJourneyAdded={fetchJourneys}
                  onOpen={() => setSidebarOpen(false)}
                />
                <GuestInviteButton onOpen={() => setSidebarOpen(false)} />
                <OpenMusikArea onOpen={() => setSidebarOpen(false)} />
              </div>
            </div>
          </>
        )}

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
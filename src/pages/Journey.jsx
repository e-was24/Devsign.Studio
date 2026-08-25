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
  const [journeys, setJourneys] = useState([]); // State untuk menampung data dari DB

  // 1. Fetch data dari tabel 'journeys' di Supabase diurutkan berdasarkan order_index
  useEffect(() => {
    async function fetchJourneys() {
      const { data, error } = await supabase
        .from('journeys')
        .select('*')
        .order('order_index', { ascending: true }); // Mengikuti urutan input

      if (error) {
        console.error('Gagal mengambil data journey:', error);
      } else {
        setJourneys(data);
      }
    }

    fetchJourneys();
  }, []);

  // Animasi GSAP
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

  return (
    <div ref={container}>
      {isLoading && (
        <div className="journey-loading-container">
          <img src={catLoader} alt="Loading" />
        </div>
      )}
      
      <div className="layout-journey" ref={layoutRef}>
        <JourneyPost />

        <div className="drop-line">
          {/* Untuk saat ini kita kelompokkan berdasarkan tahun 2026 */}
          <h2 className="title-years">2026</h2>
          
          <div className="line-v">
            {/* 2. Looping data journeys secara dinamis */}
            {journeys.map((item) => (
              <div key={item.id} className="journey-item-wrapper mb-8">
                {/* Label Bulan dari Database (Contoh: AUG, SEP) */}
                <h1 className="title-month">{item.month_label}</h1>
                <div className="line-h-1"></div>
                
                {/* Link ke halaman detail galeri berdasarkan slug/id kota */}
                <Link to={`/galery/${item.title.toLowerCase()}`} className="link">
                  <div 
                    className="circle-1" 
                    title={item.title}
                    style={{ backgroundImage: `url(${item.cover_url})`, backgroundSize: 'cover' }}
                  ></div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
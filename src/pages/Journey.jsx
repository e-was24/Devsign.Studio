import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import React, { useRef, useState } from "react";
import TextPlugin from "gsap/TextPlugin";
import { Link } from "react-router-dom";
import catLoader from '../components/catLoader.gif';

import "./css/journey-style.css";

gsap.registerPlugin(TextPlugin);

export default function Journey() {
  const container = useRef();
  const layoutRef = useRef();
  const [isLoading, setIsLoading] = useState(true);

  useGSAP(() => {
    const loadingTl = gsap.timeline();

    loadingTl.to(".journey-loading-container", {
      duration: 2.5, // Dibuat sedikit lebih pas untuk durasi loading
      opacity: 0,
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
  });

  return (
    <div ref={container}>
      {isLoading && (
        <div className="journey-loading-container">
          <img src={catLoader} alt="Loading" />
        </div>
      )}
      <div className="layout" ref={layoutRef}>
        <div className="drop-line">
          <h2 className="title-years">2026</h2>
          <div className="line-v">
            {/* Sesi Bulan */}
            <h1 className="title-month">AGU</h1>
            <div className="line-h-1"></div>
            <Link to="/galery/solo" className="link">
              <div className="circle-1" title="solo"></div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
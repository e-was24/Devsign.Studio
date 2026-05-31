import React, { useRef, useState } from "react";
import gsap from 'gsap';
import { useGSAP } from "@gsap/react";
import { TextPlugin } from 'gsap/TextPlugin';

import Kucingku from '../components/KucingKu';
import RiskaLoading from '../components/RiskaLoader';

import './css/riska-style.css';

// Registrasi Plugin GSAP
gsap.registerPlugin(TextPlugin);

function RiskaPage() {
    const container = useRef();
    const layoutRef = useRef();
    const [isLoading, setIsLoading] = useState(true);

    useGSAP(() => {
        const loadingTl = gsap.timeline();

        // 1. Animasi Loading Screen Selesai
        loadingTl.to(".riska-loading-container", {
            duration: 3,
            opacity: 0,
            onComplete: () => setIsLoading(false) // Hapus loading screen dari DOM
        });

        // 2. Aktifkan Layout secara Fisik (Scrollbar hidup)
        loadingTl.to(layoutRef.current, {
            display: "block",
            duration: 0
        });

        // 3. Efek Fade-In Konten Utama Riska
        loadingTl.to(layoutRef.current, {
            opacity: 1,
            duration: 1,
            ease: "power3.out"
        }, "+=0.1");

        // 4. Animasi Masuk Komponen Internal (Profil, Nama, Sosmed)
        loadingTl.from(".profile-riska", {
            opacity: 0,
            duration: 0.5
        }, "-=0.8");

        loadingTl.to(".title-riska", {
            duration: 1,
            text: "Riska Diana Putri",
            ease: "none"
        }, "-=0.6");

        loadingTl.from(".follow-me-riska .followme-btn", {
            opacity: 0,
            scale: 0.5,
            duration: 0.5,
            stagger: 0.2,
            ease: "back.out(1.7)"
        }, "-=0.5");

    }, { scope: container });

    return (
        <div ref={container}>
            {/* Manajemen Render Screen Loading Riska */}
            {isLoading && (
                <div className="riska-loading-container">
                    <RiskaLoading />
                </div>
            )}

            {/* Konten Utama Tersembunyi Sempurna di Awal untuk Menghindari Ghost Space */}
            <div className="layout" ref={layoutRef} style={{ display: 'none', opacity: 0 }}>
                <div className="headers">
                    <div className="profile-riska"></div>
                    <h2 className="title title-riska"></h2>
                    
                    <div className="follow-me-riska">
                        <a className="followme-btn" href="https://open.spotify.com/user/31utljy4n6ahzyg23zowfixjxfai?si=93ddd2d4e42a4728" target="__blank" rel="noopener noreferrer" title="Spotify">
                            <i className="spotify fa-brands fa-spotify"></i>
                        </a>
                        <span className="divider"> | </span>
                        <a className="followme-btn" href="https://www.instagram.com/riskadnaputriii_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="__blank" rel="noopener noreferrer" title="Instagram">
                            <i className="instagram fa-brands fa-instagram"></i>
                        </a>
                    </div>

                    <div className="desCover-riska">
                        <div className="deskrip">
                            Human Anatomy: &nbsp; 
                            <i className='bone fa-solid fa-bone'></i> |  
                            <i className='brain fa-solid fa-brain'></i> |  
                            <i className='droplet fa-solid fa-droplet'></i>
                        </div>

                        <div className="deskrip">
                            Biological Systems: &nbsp; 
                            <i className='dna fa-solid fa-dna'></i> |  
                            <i className='virus fa-solid fa-virus'></i>
                        </div>

                        <div className="deskrip">
                            Dental Specialties: &nbsp; 
                            <i className='tooth fa-solid fa-tooth'></i> |  
                            <i className='microscope fa-solid fa-microscope'></i>
                        </div>
                    </div>
                </div>

                {/* Bagian Kucing Oren Berjalan Tempat Riska */}
                <div className="pet-section">
                    <Kucingku />
                </div>
            </div>
        </div>
    );
}

export default RiskaPage;
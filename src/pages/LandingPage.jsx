import './css/style-page.css';
import Footer from './Footer';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { isGuestSession } from '../components/AccessGate';

function Home() {
    const container = useRef();
    const location = useLocation();
    const [visible, setVisible] = useState(false)
    
    // Deteksi lokasi untuk perubahan tema
    const isRiska = location.pathname === '/riska';
    const isVisitor = location.pathname === '/visitor';
    const isJourney = location.pathname === '/journey'
    const isHome = location.pathname === '/home';
    const expired = location.pathname === '/token-expired';

    useEffect(() => {
        // Logika Ganti Class di Body untuk CSS Global
        if (isRiska) {
            document.body.className = 'theme-riska';
        } else if (isVisitor) {
            document.body.className = 'theme-visitor';
        } else if (isJourney) {
            document.body.className = 'thame-journey';
        } else {
            document.body.className = 'theme-elan';
        }
    }, [location.pathname]);

    useGSAP(() => {
        // Animasi munculnya menu Navigasi
        gsap.from(".menu-link", {
            opacity: 0,
            scale: 0,
            y: -20,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)",
            delay: 0.5
        });
    }, { scope: container });

    useEffect(() => {
        setVisible(!isGuestSession())
    })

    return (
        <div className={`Landing-Page ${isRiska ? 'theme-riska' : ''} ${isVisitor ? 'theme-visitor' : ''}`} ref={container}>
            
            {/* Navigasi tetap muncul kecuali kamu ingin menyembunyikannya di halaman tamu */}
            {!isVisitor && visible && !expired && (
                <div className="profile-menu">
                    <NavLink 
                        to="/elan" 
                        className={({ isActive }) => `menu-link code-link ${isActive ? 'active' : ''}`}
                        title="Elan page"
                    >
                        <i className="code fa-solid fa-code"></i>
                    </NavLink>

                    <NavLink 
                        to="/visitor" 
                        className={({ isActive }) => `menu-link visitor-link ${isActive ? 'active' : ''}`}
                        title="guest page"
                    >
                        <i className="heart fa-regular fa-heart"></i>
                    </NavLink>

                    <NavLink 
                        to="/riska" 
                        className={({ isActive }) => `menu-link dna-link ${isActive ? 'active' : ''}`}
                        title="Riska page"
                    >
                        <i className="dna fa-solid fa-dna"></i>
                    </NavLink>

                    <NavLink 
                        to="/journey" 
                        className={({ isActive }) => `menu-link pwl-link ${isActive ? 'active' : ''}`}
                        title="our journey page"
                    >
                        <i className="pwl fa-solid fa-solid fa-person-walking-luggage"></i>
                    </NavLink>
                </div>
            )}

            <div className="layout-cover">
                {/* Tempat konten ElanPage, RiskaPage, atau GuestPage muncul */}
                <Outlet />
            </div>

            {/* Footer disembunyikan jika di halaman tamu agar fokus ke pilihan kanan/kiri */}
            {!isVisitor && <Footer />}
        </div>
    );
}

export default Home;
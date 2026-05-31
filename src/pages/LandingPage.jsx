import './css/style-page.css';
import Footer from './Footer';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function Home() {
    const container = useRef();
    const location = useLocation();
    
    // Deteksi lokasi untuk perubahan tema
    const isRiska = location.pathname === '/riska';
    const isVisitor = location.pathname === '/visitor';

    useEffect(() => {
        // Logika Ganti Class di Body untuk CSS Global
        if (isRiska) {
            document.body.className = 'theme-riska';
        } else if (isVisitor) {
            document.body.className = 'theme-visitor';
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

    return (
        <div className={`Landing-Page ${isRiska ? 'theme-riska' : ''} ${isVisitor ? 'theme-visitor' : ''}`} ref={container}>
            
            {/* Navigasi tetap muncul kecuali kamu ingin menyembunyikannya di halaman tamu */}
            {!isVisitor && (
                <div className="profile-menu">
                    <NavLink 
                        to="/elan" 
                        className={({ isActive }) => `menu-link code-link ${isActive ? 'active' : ''}`}
                        title="Halaman Elan"
                    >
                        <i className="code fa-solid fa-code"></i>
                    </NavLink>

                    <NavLink 
                        to="/visitor" 
                        className={({ isActive }) => `menu-link visitor-link ${isActive ? 'active' : ''}`}
                        title="Halaman Tamu"
                    >
                        <i className="heart fa-regular fa-heart"></i>
                    </NavLink>

                    <NavLink 
                        to="/riska" 
                        className={({ isActive }) => `menu-link dna-link ${isActive ? 'active' : ''}`}
                        title="Halaman Riska"
                    >
                        <i className="dna fa-solid fa-dna"></i>
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
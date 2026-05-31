import './css/style-page.css';
import Footer from './Footer';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function Home() {
    const container = useRef();
    const location = useLocation();
    const isRiska = location.pathname === '/riska';

    // Efek untuk mengubah class di body agar background global berubah
    useEffect(() => {
        if (isRiska) {
            document.body.classList.add('theme-riska');
        } else {
            document.body.classList.remove('theme-riska');
        }
    }, [isRiska]);

    // Gunakan useGSAP untuk keamanan dan performa
    useGSAP(() => {
        // Animasi masuk (Fade In + Slide Up sedikit)
        // gsap.from(".Landing-Page", {
        //     opacity: 0,
        //     y: 20,
        //     duration: 0.8,
        //     ease: "power2.out"
        // });

        // Animasi stagger untuk ikon menu agar muncul satu per satu
        gsap.from(".menu-link", {
            opacity: 0,
            scale: 0.5,
            duration: 0.5,
            stagger: 0.2,
            delay: 0.3,
            ease: "back.out(1.7)"
        });
    }, { scope: container }); // Scope membatasi GSAP hanya mencari elemen di dalam ref ini

    return (
        <div className={`Landing-Page ${isRiska ? 'theme-riska' : ''}`} ref={container}>
            <div className="profile-menu">
                <NavLink 
                    to="/elan" 
                    className="menu-link code-link" 
                    title="Halaman Elan"
                >
                    <i className="code fa-solid fa-code"></i>
                </NavLink>

                <NavLink 
                    to="/riska" 
                    className="menu-link dna-link" 
                    title="Halaman Riska"
                >
                    <i className="dna fa-solid fa-dna"></i>
                </NavLink>
            </div>

            <div className="layout-cover">
                <Outlet />
            </div>

            <Footer />
        </div>
    );
}

export default Home;

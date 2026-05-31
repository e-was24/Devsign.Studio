import React, { useRef, useState } from "react";
import gsap from 'gsap';
import { useGSAP } from "@gsap/react";
import { TextPlugin } from 'gsap/TextPlugin';

import Rack from './Rack';
import MicroController from './MicroController';
import Specialbutton from '../components/SpecialButton';
import Certification from './Certification';
import ElanLoading from '../components/ElanLoader';

import './css/elan-style.css';

// Registrasi Plugin GSAP
gsap.registerPlugin(TextPlugin);

function ElanPage() {
    const container = useRef();
    const layoutRef = useRef();
    const [isLoading, setIsLoading] = useState(true);

    // HOOK GSAP YANG SUDAH DIBERSIHKAN DARI KUCING
    useGSAP(() => {
        const loadingTl = gsap.timeline();

        // 1. Loading Screen Selesai
        loadingTl.to(".elan-loading", {
            duration: 3,
            opacity: 0,
            onComplete: () => setIsLoading(false) // Hapus loading screen dari DOM
        });

        // 2. Aktifkan Layout secara Fisik (Scrollbar hidup)
        loadingTl.to(layoutRef.current, {
            display: "block",
            duration: 0
        });

        // 3. Efek Fade-In Konten Utama
        loadingTl.to(layoutRef.current, {
            opacity: 1,
            duration: 1,
            ease: "power3.out"
        }, "+=0.1");

        // 4. Animasi Masuk untuk Profil, Nama, dan Sosmed
        loadingTl.from(".profile-elan", {
            opacity: 0,
            duration: 0.5
        }, "-=0.8");

        loadingTl.to(".title-elan", {
            duration: 1,
            text: "Elan Satria Adi Widodo",
            ease: "none"
        }, "-=0.6");

        loadingTl.from(".follow-me .followme-btn", {
            opacity: 0,
            scale: 0.5,
            duration: 0.5,
            stagger: 0.2,
            ease: "back.out(1.7)"
        }, "-=0.5");

        // 5. MEMUNCULKAN SPECIAL BUTTON (Sekarang dijamin jalan karena tidak terhambat kode kucing)
        loadingTl.from(".special-btn-section", {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: "power2.out"
        }, "-=0.3");

    }, { scope: container });

    return (
        <div ref={container}>
            {/* Loading Loader Screen */}
            {isLoading && (
                <div className="elan-loading">
                    <ElanLoading />
                </div>
            )}
            
            {/* Konten Utama */}
            <div className="layout" ref={layoutRef} style={{ display: 'none', opacity: 0 }}>
                <div className="headers">
                    <div className="profile-elan"></div>
                    <h2 className="title title-elan"></h2>
                    
                    <div className="follow-me">
                        <a className="followme-btn" href="https://open.spotify.com/user/31i6jtk52lkjwpcbbdxwlw7qpzoy?si=QP4RL5b5TMiiHus_YkQXfA" target="__blank" rel="noopener noreferrer" title="Spotify">
                            <i className="spotify fa-brands fa-spotify"></i>
                        </a>
                        <span className="divider"> &nbsp;|&nbsp; </span>
                        <a className="followme-btn" href="https://discord.gg/WH8azjEu" target="__blank" rel="noopener noreferrer" title="Discord">
                            <i className="discord fa-brands fa-discord"></i>
                        </a>
                    </div>

                    {/* SEKSI TOMBOL SPESIAL KAMU */}
                    <div className="special-btn-section">
                        <Specialbutton />
                    </div>

                    <div className="desCover">
                        <div className="deskrip">
                            Language: &nbsp;
                            <i className='html fa-brands fa-html5'></i> &nbsp;|&nbsp;  
                            <i className='css fa-brands fa-css3'></i> &nbsp;|&nbsp;  
                            <i className='js fa-brands fa-js'></i> &nbsp;|&nbsp;  
                            <div className='typescript' style={{ display: 'inline-block' }}></div> &nbsp;|&nbsp;  
                            <i className='php fa-brands fa-php'></i>
                        </div>

                        <div className="deskrip">
                            Runtime Environment:  
                            <i className='node-js fa-brands fa-node-js'></i>
                        </div>

                        <div className="deskrip">
                            Tools:  
                            <i className='figma fa-brands fa-figma'></i> &nbsp;|&nbsp;  
                            <i className='git fa-brands fa-git-alt'></i> &nbsp;|&nbsp;  
                            <i className='github fa-brands fa-github'></i> &nbsp;|&nbsp;  
                            <div className='vscode' style={{ display: 'inline-block' }}></div> 
                        </div>

                        <div className="deskrip">
                            Framework:  
                            <i className='react fa-brands fa-react'></i> &nbsp;|&nbsp;  
                            <i className='bootstrap fa-brands fa-bootstrap'></i> &nbsp;|&nbsp;  
                            <div className='nextJs' style={{ display: 'inline-block' }}></div> 
                        </div>

                        <div className="deskrip">
                            Data Base:  
                            <div className='PSQL' style={{ display: 'inline-block' }}></div> 
                        </div>
                    </div>
                </div>

                <h1 className='text-border'>
                    <span style={{ fontSize: '.8em', fontWeight: '100' }}>Web</span>Project 
                    <i className="fa-solid fa-globe"></i>
                </h1>
                <p className='warning'>jangan melakukan transaksi apapun, sistem masih dalam tahap pengembangan!</p>
                
                <div className="rack-container">
                    <Rack />
                </div>

                <div className="microC">
                    <div className="desCover-microController">
                        <div className="deskrip">
                            Languages:  
                            <div className='cpp' title="C++"></div>  C++ &nbsp;|&nbsp;  
                            <i className='python fa-brands fa-python' title="MicroPython"></i>  Python &nbsp;|&nbsp;  
                            <i className='rust fa-brands fa-rust' title="Rust"></i>  Rust
                        </div>

                        <div className="deskrip">
                            Frameworks:  
                            <i className='arduino fa-solid fa-microchip' title="Arduino"></i>  Arduino &nbsp;|&nbsp;  
                            <span className='icon-freertos' title="FreeRTOS"></span>  FreeRTOS
                        </div>

                        <div className="deskrip">
                            Protocols:  
                            <i className='mqtt fa-solid fa-network-wired' title="MQTT"></i>  MQTT &nbsp;|&nbsp;  
                            <i className='wifi fa-solid fa-wifi' title="HTTP/RestAPI"></i>  HTTP
                        </div>

                        <div className="deskrip">
                            Tools:  
                            <div className='icon-platformio' title="PlatformIO"></div>  PlatformIO &nbsp;|&nbsp;  
                            <i className='git fa-brands fa-git-alt'></i>  Git
                        </div>
                    </div>
                </div>

                <h1 className='text-border'>
                    <span style={{ fontSize: '.8em', fontWeight: '100' }}>IoT</span>Project 
                    <i className="fa-regular fa-cloud"></i>
                </h1>
                <div className="rack-container-microC">
                    <MicroController />
                </div>
            </div>
        </div>
    );
}

export default ElanPage;
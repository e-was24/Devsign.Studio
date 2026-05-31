import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Kita hanya butuh walk.gif dan run.gif agar dia murni jalan bolak-balik
import walkGif from './orange/walk.gif';
import './css/kucing.css'; 

const KucingKu = () => {
    const catRef = useRef();
    const containerRef = useRef();

    // Fungsi suara meow saat kucing diklik
    const handleMeow = () => {
        // Menggunakan Audio API bawaan browser, pakai sound effect meow online atau lokal
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/947/947-200.wav');
        audio.volume = 0.5; // Atur volume suara (0.0 sampai 1.0)
        audio.play().catch(err => console.log("Audio play diblokir browser sebelum ada interaksi:", err));
    };

    // GSAP Jalan Mondar-mandir (Ini yang bikin dia pindah posisi, bukan jalan di tempat)
    useGSAP(() => {
        const distance = 280; // Jarak kucing berjalan ke kanan (sesuaikan dengan lebar layar)
        const duration = 6;   // Waktu tempuh jalan (makin kecil makin cepat)

        const tl = gsap.timeline({ repeat: -1 });

        tl.to(catRef.current, {
            x: distance,
            duration: duration,
            ease: "none",
            onStart: () => gsap.set(catRef.current, { scaleX: 1 }) // Hadap kanan saat jalan ke kanan
        })
        .to(catRef.current, {
            x: 0,
            duration: duration,
            ease: "none",
            onStart: () => gsap.set(catRef.current, { scaleX: -1 }) // Balik badan (hadap kiri) saat kembali
        });

        return () => tl.kill();
    }, { scope: containerRef }); // Mengunci scope pada container utama

    return (
        <div className="rack-container-pet" ref={containerRef}>
            <h1 className='text-border'>
                <span style={{ fontSize: '.8em', fontWeight: '100' }}>My</span>
                MedicalPet <i className="fa-solid fa-cat"></i>
            </h1>

            <div className="cat-container">
                <img
                    ref={catRef}
                    src={walkGif}
                    className="vscode-style-cat"
                    onClick={handleMeow}
                    alt="Kucing Oren"
                    title="Klik untuk denger suara Meow! 🐾"
                />
            </div>
        </div>
    );
};

export default KucingKu;
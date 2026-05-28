import React from 'react';
import './style-page.css';

function Footer() {
    // Mendapatkan tahun saat ini secara otomatis agar tidak perlu diedit manual setiap tahun
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-container">
            <div className="footer-content">
                
                {/* Bagian Kiri: Brand / Nama */}
                <div className="footer-brand">
                    <h2><span>My</span>Portfolio.</h2>
                    <p>Membangun aplikasi web modern dan mengeksplorasi dunia IoT & Microcontroller.</p>
                </div>

                {/* Bagian Tengah: Tautan Navigasi Cepat */}
                <div className="footer-links">
                    <h3>Navigasi</h3>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#projects">Projects</a></li>
                        <li><a href="#about">About</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>

                {/* Bagian Kanan: Sosial Media / Kontak */}
                <div className="footer-socials">
                    <h3>Hubungi Saya</h3>
                    <div className="social-icons">
                        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" title="GitHub">
                            <i className="fa-brands fa-github"></i>
                        </a>
                        <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                            <i className="fa-brands fa-linkedin"></i>
                        </a>
                        <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" title="Instagram">
                            <i className="fa-brands fa-instagram"></i>
                        </a>
                        <a href="mailto:emailmu@gmail.com" title="Email">
                            <i className="fa-solid fa-envelope"></i>
                        </a>
                    </div>
                </div>

            </div>

            {/* Garis Pembatas & Hak Cipta */}
            <div className="footer-bottom">
                <p>&copy; {currentYear} Elan satria. &nbsp; All rights reserved.</p>
            </div>
        </footer>
    );
}

export default Footer;
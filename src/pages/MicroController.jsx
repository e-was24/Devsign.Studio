import React from 'react';
import './microController.css';
import Loading from '../components/Loader';

function MicroController() {
    return (
        <>
            {/* 2. BAGIAN SHOWCASE PRODUK (Dengan Efek Loading Tahap Belajar) */}
                <div className="iot-loading-wrapper">

                    {/* ANIMASI DARI LOTTIEFILES */}
                    <div className="loading-cover">
                        <Loading />
                    </div>

                    <div className="iot-loading-text">
                        <h3>Currently in Learning Process</h3>
                        <p>IoT & Microcontroller based projects are coming soon here.</p>
                    </div>
                </div>
        </>
    );
}



export default MicroController;
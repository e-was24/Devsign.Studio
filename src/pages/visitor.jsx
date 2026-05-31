import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react'; // Tambahkan useState
import gsap from 'gsap';
import './css/visitor.css';
import HeartLoading from '../components/LoveLoader';

function Visitor() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true); // State untuk loading

    useEffect(() => {
        // Durasi loading disamakan dengan durasi animasi GSAP
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 5000); // Sesuaikan durasi dengan lamanya animasi HeartLoading

        gsap.fromTo(".side",
            { flex: 0 },
            { flex: 1, duration: 3, ease: "power4.out", stagger: 0.2 }
        );

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            {isLoading ? (
                <div className="loading-cover">
                    <HeartLoading />
                </div>
            ) : (
                <div className="visitor-cover">
                    <div className="side elan-side" onClick={() => navigate('/elan')}>
                        <div className="elan-bg"></div>
                        <div className="content">
                            <h1>Elan</h1>
                            <div className="more-info" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap:'10px'}}>
                                <p>technology</p>
                                <i className="fa-solid fa-code"style={{color: 'yellowgreen', filter: 'drop-shadow(0 0 10px yellowgreen)'}}></i>
                            </div>
                        </div>
                    </div>

                    <div className="side riska-side" onClick={() => navigate('/riska')}>
                        <div className="riska-bg"></div>
                        <div className="content">
                            <h1>Riska</h1>
                            <div className="more-info" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap:'10px'}}>
                                <p>biology</p>
                                <i className="fa-solid fa-staff-snake" style={{color: 'gold', filter: 'drop-shadow(0 0 10px gold)'}}></i>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Visitor;
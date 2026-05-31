import './css/style-page.css';
import Footer from './Footer';
import { Link, Outlet } from 'react-router-dom';

function Home() {
    return (
        <div className='Landing-Page'>
            <div className="profile-menu">
                <Link to="/elan" className="menu-link" title="Halaman Elan">
                    <i className="code fa-solid fa-code"></i>
                </Link>

                <Link to="/riska" className="menu-link" title="Halaman Riska">
                    <i className="dna fa-solid fa-dna"></i>
                </Link>
            </div>

            <div className="layout-cover">
                <Outlet />
            </div>

            <Footer />
        </div>
    );
}

export default Home;
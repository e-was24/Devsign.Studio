import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/LandingPage'; 
import ElanPage from './pages/ElanPage';
import RiskaPage from './pages/RiskaPage';
import Visitior from './pages/visitor';
import Shop from './pages/Shop';
import Journey from './pages/Journey';
import Galery from './pages/Galery';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}>
          {/* Halaman utama langsung muncul Visitor */}
          <Route index element={<Visitior />} /> 
          
          {/* Perbaikan: elemen -> element */}
          <Route path="visitor" element={<Visitior />}/>
          
          <Route path='galery/:slug' element={<Galery/>}/>
          <Route path="elan" element={<ElanPage />} />
          <Route path="riska" element={<RiskaPage />} />
          <Route path="journey" element={<Journey />} />
          <Route path="shop" element={<Shop />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
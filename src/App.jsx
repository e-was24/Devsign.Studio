import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/LandingPage'; 
import ElanPage from './pages/ElanPage';
import RiskaPage from './pages/RiskaPage';
import Visitior from './pages/visitor';
import Shop from './pages/Shop';
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
          
          <Route path="elan" element={<ElanPage />} />
          <Route path="riska" element={<RiskaPage />} />
          <Route path="shop" element={<Shop />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
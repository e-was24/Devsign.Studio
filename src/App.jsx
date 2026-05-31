import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/LandingPage'; 
import ElanPage from './pages/ElanPage';
import RiskaPage from './pages/RiskaPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<ElanPage />} /> 
          <Route path="elan" element={<ElanPage />} />
          <Route path="riska" element={<RiskaPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
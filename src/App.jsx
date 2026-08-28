import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/LandingPage";
import ElanPage from "./pages/ElanPage";
import RiskaPage from "./pages/RiskaPage";
import Visitior from "./pages/visitor";
import Shop from "./pages/Shop";
import Journey from "./pages/Journey";
import Galery from "./pages/Galery";
import AccessGate from "./components/AccessGate";
import GuestInviteButton from "./components/GuestInviteButton";
import "./App.css";


function App() {
  return (
    <AccessGate>
      <Router>
        <GuestInviteButton />
        <Routes>
            <Route path="/" element={<Home />}>
              <Route index element={<Visitior />} />
              <Route path="visitor" element={<Visitior />} />
              <Route path="galery/:slug" element={<Galery />} />
              <Route path="elan" element={<ElanPage />} />
              <Route path="riska" element={<RiskaPage />} />
              <Route path="shop" element={<Shop />} />
              <Route path="journey" element={<Journey />} />
            </Route>
        </Routes>
      </Router>
    </AccessGate>
  );
}

export default App;

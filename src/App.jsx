import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/LandingPage";
import ElanPage from "./pages/ElanPage";
import RiskaPage from "./pages/RiskaPage";
import Visitior from "./pages/visitor";
import Shop from "./pages/Shop";
import Journey from "./pages/Journey";
import Galery from "./pages/Galery";
import AccessGate from "./components/AccessGate";
import ExpiredPage from "./pages/Expired";
import Mei from "./next-gen/mei";
import Rewind from "./next-gen/rewind";
import Musik from "./pages/Songs";
import { PlayerProvider } from "./context/PlayerContext";
import MiniPlayer from "./components/MiniPlayer";
import UnreleasedPage from "./unrelease-page";

import "./App.css";

function App() {
  return (
    <Router>
      <PlayerProvider>
        <AccessGate>
          <Routes>
            <Route>
              <Route path="/" element={<Home />}>
                <Route index element={<Visitior />} />
                <Route path="visitor" element={<Visitior />} />
                <Route path="galery/:slug" element={<Galery />} />
                <Route path="elan" element={<ElanPage />} />
                <Route path="riska" element={<RiskaPage />} />
                <Route path="shop" element={<Shop />} />
                <Route path="journey" element={<Journey />} />
                <Route path="token-expired" element={<ExpiredPage />} />
                <Route path="musik" element={<Musik />} />
                <Route path="/unrelease-page">
                  <Route index element={<UnreleasedPage />} />
                  <Route path="mei" element={<Mei />} />
                  <Route path="rewind" element={<Rewind />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AccessGate>

        <MiniPlayer />
      </PlayerProvider>
    </Router>
  );
}

export default App;

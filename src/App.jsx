import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';

// --- Lazy Load Components ---
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const TeamList = React.lazy(() => import('./components/TeamList'));
const PlayerList = React.lazy(() => import('./components/PlayerList'));
const PlayerDetail = React.lazy(() => import('./components/PlayerDetail'));
const TeamDetail = React.lazy(() => import('./components/TeamDetail'));
const GameDetail = React.lazy(() => import('./components/GameDetail'));
const PlayerRankings = React.lazy(() => import('./components/PlayerRankings'));

// Simple Footer component to maintain brand consistency
function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-gray-400 py-4 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Copyright */}
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <span className="text-sm">© {currentYear} Sideline Metrics. All rights reserved.</span>
          </div>
          
          {/* Swish Credit */}
          <div className="mb-4 md:mb-0">
            <a 
              href="https://swishwebdesigns.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm hover:text-green-500 transition"
            >
              <img 
                src="/assets/swish-logo.png" // Assuming logo is placed here
                alt="Swish Web Designs Logo" 
                className="h-6"
              />
              <span>Created, designed, and powered by Swish Web Designs</span>
            </a>
          </div>

          {/* Links */}
          <div className="flex space-x-4">
            <a href="#" className="text-sm hover:text-green-500 transition">Terms</a>
            <a href="#" className="text-sm hover:text-green-500 transition">Privacy</a>
            <a href="#" className="text-sm hover:text-green-500 transition">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Simple Loading Fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />

      <main className="flex-grow flex-1">
        {/* Wrap Routes in Suspense for lazy loading */}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/teams" element={<TeamList />} />
            <Route path="/team/:abbr/players" element={<PlayerList />} />
            <Route path="/team/:abbr" element={<TeamDetail />} />
            <Route path="/player/:id" element={<PlayerDetail />} />
            <Route path="/game/:game_id" element={<GameDetail />} />
            <Route path="/rankings" element={<PlayerRankings />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

export default App;

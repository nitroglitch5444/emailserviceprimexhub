import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import GridBackground from './components/GridBackground';
import Shop from './pages/Shop';
import Auth from './pages/Auth';
import Checkout from './pages/Checkout';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BotPanel from './pages/BotPanel';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#030712] text-white selection:bg-neon-blue selection:text-black relative">
        <GridBackground />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Shop />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/emails" element={<UserDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/panel" element={<BotPanel />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h1 className="text-6xl font-bold text-accent-primary mb-4">404</h1>
                <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
                <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-accent-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                >
                  Return Home
                </button>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

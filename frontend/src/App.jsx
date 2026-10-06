import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import './App.css';

export default function App() {
  return (
    <div className="app-layout-wrapper">
      <Navbar />
      <main className="app-main-content">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

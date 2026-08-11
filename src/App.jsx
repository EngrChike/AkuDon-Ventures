import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Storefront from './Storefront';
import AdminDashboard from './AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Client Storefront Route */}
        <Route path="/" element={<Storefront />} />
        
        {/* Secure Admin Route */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Catch-all redirect to storefront */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
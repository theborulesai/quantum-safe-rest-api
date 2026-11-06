import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import KeyManagement from './pages/KeyManagement';
import KEM from './pages/KEM';
import Encryption from './pages/Encryption';
import Signatures from './pages/Signatures';
import Messages from './pages/Messages';
import Benchmark from './pages/Benchmark';
import Logs from './pages/Logs';
import SecurityStatus from './pages/SecurityStatus';

const PrivateLayout = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Layout><Outlet /></Layout>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<PrivateLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="keys" element={<KeyManagement />} />
            <Route path="kem" element={<KEM />} />
            <Route path="encrypt" element={<Encryption />} />
            <Route path="sign" element={<Signatures />} />
            <Route path="messages" element={<Messages />} />
            <Route path="benchmark" element={<Benchmark />} />
            <Route path="logs" element={<Logs />} />
            <Route path="security" element={<SecurityStatus />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/DashboardNew';
import HistoryPage from './components/HistoryPage';
import { FiHome, FiClock, FiBarChart2, FiLogOut } from 'react-icons/fi';
import { useAuth } from './contexts/AuthContext';

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  return (
    <nav style={{
      backgroundColor: 'var(--card-bg)',
      boxShadow: 'var(--shadow)',
      marginBottom: '2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{ padding: '1rem 2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              color: 'var(--primary-color)',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FiBarChart2 size={28} />
              Dashboard Financeiro
            </h1>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              {user ? `Olá, ${user.nome_completo.split(' ')[0]}! 👋` : 'Sistema de Otimização de Estoque'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link 
              to="/dashboard" 
              style={{
                textDecoration: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                backgroundColor: location.pathname === '/dashboard' ? 'var(--primary-color)' : 'transparent',
                color: location.pathname === '/dashboard' ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              <FiHome /> Dashboard
            </Link>
            <Link 
              to="/history" 
              style={{
                textDecoration: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                backgroundColor: location.pathname === '/history' ? 'var(--primary-color)' : 'transparent',
                color: location.pathname === '/history' ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              <FiClock /> Histórico
            </Link>
            
            {user && (
              <button
                onClick={logout}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  border: '2px solid #dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#dc2626';
                }}
              >
                <FiLogOut /> Sair
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {isAuthenticated && <Navigation />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <div className="container">
              <HistoryPage />
            </div>
          </ProtectedRoute>
        } />
        
        {/* Redirect root to dashboard or login */}
        <Route path="/" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } />
      </Routes>

      {isAuthenticated && (
        <footer style={{
          backgroundColor: 'var(--card-bg)',
          borderTop: '1px solid var(--border-color)',
          padding: '2rem',
          marginTop: '4rem',
          textAlign: 'center'
        }}>
          <div className="container">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Dashboard Financeiro EOQ - Sistema de Otimização de Estoque
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Backend: FastAPI + NeonDB + JWT | Frontend: React + Vite
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Modelos: EOQ + ROP (Reorder Point) + Estoque de Segurança
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;

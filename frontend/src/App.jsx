import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import OptimizationForm from './components/OptimizationForm';
import ResultsDisplay from './components/ResultsDisplay';
import HistoryPage from './components/HistoryPage';
import { FiHome, FiClock, FiBarChart2 } from 'react-icons/fi';

function Navigation() {
  const location = useLocation();
  
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
              Sistema de Otimização de Estoque
            </h1>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Modelo EOQ (Economic Order Quantity)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              to="/" 
              style={{
                textDecoration: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                backgroundColor: location.pathname === '/' ? 'var(--primary-color)' : 'transparent',
                color: location.pathname === '/' ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              <FiHome /> Início
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
          </div>
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  const [result, setResult] = useState(null);

  const handleResultReceived = (data) => {
    setResult(data);
    // Scroll para o resultado
    setTimeout(() => {
      window.scrollTo({
        top: document.getElementById('results')?.offsetTop - 20,
        behavior: 'smooth'
      });
    }, 100);
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          backgroundColor: '#eff6ff',
          borderLeft: '4px solid var(--primary-color)',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            🎯 Bem-vindo ao Sistema de Otimização EOQ
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '0.5rem' }}>
            Este sistema utiliza o <strong>Modelo EOQ (Economic Order Quantity)</strong> para calcular 
            a quantidade ótima de pedido que minimiza seus custos totais de estoque.
          </p>
          <p style={{ lineHeight: '1.8' }}>
            O cálculo considera seus custos de pedido, custos de estocagem e demanda prevista, 
            utilizando técnicas avançadas de otimização matemática com <strong>SymPy</strong> e 
            previsão de demanda com <strong>Machine Learning (sklearn)</strong>.
          </p>
        </div>

        <OptimizationForm onResultReceived={handleResultReceived} />
      </div>

      <div id="results">
        <ResultsDisplay result={result} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
        <Navigation />
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={
            <div className="container">
              <HistoryPage />
            </div>
          } />
        </Routes>

        <footer style={{
          backgroundColor: 'var(--card-bg)',
          borderTop: '1px solid var(--border-color)',
          padding: '2rem',
          marginTop: '4rem',
          textAlign: 'center'
        }}>
          <div className="container">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Sistema de Otimização de Estoque - Modelo EOQ
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Backend: FastAPI + NeonDB | Frontend: React + Vite
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Tecnologias: pandas, sklearn, statsmodels, seaborn, sympy
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiClock, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // O backend pode retornar { success: true, data: [...] } ou direto [...]
      const data = response.data.success ? response.data.data : response.data;
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      setError('Erro ao carregar histórico. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este cálculo?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/api/history/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Remover da lista local
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar o cálculo. Tente novamente.');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <div>
              <h1>📊 Dashboard EOQ</h1>
              <p className="header-subtitle">Sistema de Otimização de Estoque</p>
            </div>
            <div className="header-actions">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                🏠 Dashboard
              </button>
              <button onClick={handleLogout} className="btn-logout">
                🚪 Sair
              </button>
            </div>
          </div>
        </header>
        <div className="dashboard-content">
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="loading" style={{ 
              width: '40px', 
              height: '40px', 
              borderWidth: '4px',
              borderColor: 'var(--purple) transparent',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--dark-text-secondary)' }}>
              Carregando histórico...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <div>
              <h1>📊 Dashboard EOQ</h1>
              <p className="header-subtitle">Sistema de Otimização de Estoque</p>
            </div>
            <div className="header-actions">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                🏠 Dashboard
              </button>
              <button onClick={handleLogout} className="btn-logout">
                🚪 Sair
              </button>
            </div>
          </div>
        </header>
        <div className="dashboard-content">
          <div className="card">
            <div className="error-message">
              <strong>Erro:</strong> {error}
            </div>
            <button 
              onClick={fetchHistory} 
              className="btn-primary" 
              style={{ marginTop: '1rem' }}
            >
              <FiRefreshCw /> Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>📊 Dashboard EOQ</h1>
            <p className="header-subtitle">Sistema de Otimização de Estoque</p>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              🏠 Dashboard
            </button>
            <button onClick={handleLogout} className="btn-logout">
              🚪 Sair
            </button>
          </div>
        </div>
      </header>
      
      <div className="dashboard-content">
        <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem' 
      }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <FiClock /> Histórico de Cálculos
        </h2>
        <button 
          onClick={fetchHistory} 
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Nenhum cálculo realizado ainda</h3>
          <p>Os cálculos de otimização que você realizar aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: '1.5rem', color: 'var(--dark-text-secondary)' }}>
            Total de {history.length} cálculo{history.length !== 1 ? 's' : ''} realizado{history.length !== 1 ? 's' : ''}
          </p>

          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>S (Pedido)</th>
                  <th>H (Estocagem)</th>
                  <th>D (Demanda)</th>
                  <th>Q* (Ótimo)</th>
                  <th>Custo Mínimo</th>
                  <th>Método</th>
                  <th>R²</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="badge badge-info">#{item.id}</span>
                    </td>
                    <td>{formatDate(item.data_calculo || item.timestamp)}</td>
                    <td>{formatCurrency(item.custo_pedido || 0)}</td>
                    <td>{formatCurrency(item.custo_estocagem || item.custo_armazenagem || 0)}</td>
                    <td>{formatNumber(item.demanda_anual || 0)}</td>
                    <td style={{ fontWeight: '600', color: 'var(--green)' }}>
                      {formatNumber(item.quantidade_otima || item.q_otimo || 0)}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--purple)' }}>
                      {formatCurrency(item.custo_total_minimo || 0)}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)' }}>
                        {item.metodo_previsao || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {item.r2_score !== null && item.r2_score !== undefined ? (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: item.r2_score > 0.7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: item.r2_score > 0.7 ? 'var(--green)' : 'var(--blue)',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {formatNumber(item.r2_score * 100)}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ 
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #ef4444',
                          borderRadius: '8px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Deletar cálculo"
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Resumo para dispositivos móveis */}
          <div style={{ display: 'none' }} className="mobile-cards">
            {history.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  backgroundColor: 'var(--bg-color)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span className="badge badge-info">#{item.id}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {formatDate(item.data_calculo)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Q* Ótimo</p>
                    <p style={{ fontWeight: '600', color: 'var(--secondary-color)' }}>
                      {formatNumber(item.quantidade_otima)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Custo Mínimo</p>
                    <p style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                      {formatCurrency(item.custo_total_minimo)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="btn btn-danger"
                  style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                >
                  <FiTrash2 /> Deletar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

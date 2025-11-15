import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiClock, FiTrash2, FiRefreshCw } from 'react-icons/fi';

const HistoryPage = () => {
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
      const response = await axios.get('/api/history');
      
      if (response.data.success) {
        setHistory(response.data.data);
      }
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
      await axios.delete(`/api/history/${id}`);
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

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="loading" style={{ 
          width: '40px', 
          height: '40px', 
          borderWidth: '4px',
          borderColor: 'var(--primary-color) transparent',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Carregando histórico...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <strong>Erro:</strong> {error}
          <button 
            onClick={fetchHistory} 
            className="btn btn-primary" 
            style={{ marginTop: '1rem' }}
          >
            <FiRefreshCw /> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem' 
      }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiClock /> Histórico de Cálculos
        </h2>
        <button 
          onClick={fetchHistory} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>

      {history.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: 'var(--text-secondary)' 
        }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            📊 Nenhum cálculo realizado ainda
          </p>
          <p>
            Os cálculos de otimização que você realizar aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Total de {history.length} cálculo{history.length !== 1 ? 's' : ''} realizado{history.length !== 1 ? 's' : ''}
          </p>

          <div className="table-container">
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
                    <td>{formatDate(item.data_calculo)}</td>
                    <td>{formatCurrency(item.custo_pedido)}</td>
                    <td>{formatCurrency(item.custo_estocagem)}</td>
                    <td>{formatNumber(item.demanda_anual)}</td>
                    <td style={{ fontWeight: '600', color: 'var(--secondary-color)' }}>
                      {formatNumber(item.quantidade_otima)}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                      {formatCurrency(item.custo_total_minimo)}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem' }}>
                        {item.metodo_previsao || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {item.r2_score !== null && item.r2_score !== undefined ? (
                        <span className={item.r2_score > 0.7 ? 'badge badge-success' : 'badge badge-info'}>
                          {formatNumber(item.r2_score * 100)}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        title="Deletar cálculo"
                      >
                        <FiTrash2 />
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
  );
};

export default HistoryPage;

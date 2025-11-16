import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiPackage, 
  FiClock,
  FiShield,
  FiUpload,
  FiActivity,
  FiBarChart2,
  FiCheckCircle
} from 'react-icons/fi';
import ResultsDisplay from './ResultsDisplay';

const DashboardNew = () => {
  const [activeCalculator, setActiveCalculator] = useState(null); // 'eoq' ou 'rop'
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({
    totalCalculos: 0,
    economiaTotal: 0,
    ultimoCalculo: null
  });
  
  // Estados EOQ
  const [eoqData, setEoqData] = useState({
    custo_pedido: '',
    custo_estocagem: '',
    file: null
  });
  
  // Estados ROP
  const [ropData, setRopData] = useState({
    lead_time: '',
    service_level: '',
    file: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/history');
      // O backend retorna { success: true, count: X, data: [...] }
      const calculos = response.data.data || response.data || [];
      
      if (calculos.length > 0) {
        // Calcular economia: comparar custo otimizado vs. custo sem otimização
        const economiaTotal = calculos.reduce((sum, calc) => {
          // Cenário sem otimização: fazer 2 pedidos por ano (Q = D/2)
          const Q_sem_otimizacao = calc.demanda_anual / 2;
          const D = calc.demanda_anual;
          const S = calc.custo_pedido;
          const H = calc.custo_estocagem;
          
          // Custo total sem otimização
          const custo_sem_eoq = (D * S / Q_sem_otimizacao) + (H * Q_sem_otimizacao / 2);
          
          // Custo total com EOQ (otimizado)
          const custo_com_eoq = calc.custo_total_minimo;
          
          // Economia = diferença entre os dois
          const economia = custo_sem_eoq - custo_com_eoq;
          
          return sum + economia;
        }, 0);

        setStats({
          totalCalculos: calculos.length,
          economiaTotal: economiaTotal,
          ultimoCalculo: calculos[0] // Primeiro item é o mais recente (ordenado por desc)
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      // Não quebrar a UI se não conseguir buscar estatísticas
      setStats({
        totalCalculos: 0,
        economiaTotal: 0,
        ultimoCalculo: null
      });
    }
  };

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

  const handleEOQSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('custo_pedido', eoqData.custo_pedido);
      formData.append('custo_estocagem', eoqData.custo_estocagem);
      formData.append('historical_demand', eoqData.file);

      const response = await axios.post('http://localhost:8000/api/optimize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setActiveCalculator(null);
        fetchStats();
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao calcular EOQ');
    } finally {
      setLoading(false);
    }
  };

  const handleROPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('lead_time', ropData.lead_time);
      formData.append('service_level', ropData.service_level);
      formData.append('historical_demand', ropData.file);

      const response = await axios.post('http://localhost:8000/api/calculate-rop', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setActiveCalculator(null);
        fetchStats();
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao calcular ROP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Hero Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <FiBarChart2 size={32} />
            <div>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total de Análises</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>{stats.totalCalculos}</p>
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <FiDollarSign size={32} />
            <div>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Economia Estimada</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>
                {formatCurrency(stats.economiaTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* EOQ Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '2.5rem',
          boxShadow: activeCalculator === 'eoq' ? '0 20px 60px rgba(102, 126, 234, 0.2)' : '0 4px 20px rgba(0,0,0,0.08)',
          border: activeCalculator === 'eoq' ? '2px solid #667eea' : '2px solid transparent',
          transition: 'all 0.3s ease',
          cursor: activeCalculator ? 'default' : 'pointer',
          transform: activeCalculator === 'eoq' ? 'scale(1.02)' : 'scale(1)'
        }}
        onClick={() => !activeCalculator && setActiveCalculator('eoq')}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <FiPackage size={36} color="white" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937' }}>
              Calcular EOQ
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Lote Econômico de Compra - encontre a quantidade ótima de pedido
            </p>
          </div>

          {activeCalculator === 'eoq' && (
            <form onSubmit={handleEOQSubmit} onClick={(e) => e.stopPropagation()}>
              {error && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Custo de Pedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={eoqData.custo_pedido}
                  onChange={(e) => setEoqData({...eoqData, custo_pedido: e.target.value})}
                  placeholder="Ex: 75.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Custo de Estocagem (R$/ano)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={eoqData.custo_estocagem}
                  onChange={(e) => setEoqData({...eoqData, custo_estocagem: e.target.value})}
                  placeholder="Ex: 2.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  <FiUpload style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Histórico de Demanda (CSV)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setEoqData({...eoqData, file: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveCalculator(null)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '0.875rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {loading ? 'Calculando...' : <><FiCheckCircle /> Calcular</>}
                </button>
              </div>
            </form>
          )}

          {!activeCalculator && (
            <button
              onClick={() => setActiveCalculator('eoq')}
              style={{
                width: '100%',
                padding: '1rem',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Iniciar Cálculo
            </button>
          )}
        </div>

        {/* ROP Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '2.5rem',
          boxShadow: activeCalculator === 'rop' ? '0 20px 60px rgba(245, 87, 108, 0.2)' : '0 4px 20px rgba(0,0,0,0.08)',
          border: activeCalculator === 'rop' ? '2px solid #f5576c' : '2px solid transparent',
          transition: 'all 0.3s ease',
          cursor: activeCalculator ? 'default' : 'pointer',
          transform: activeCalculator === 'rop' ? 'scale(1.02)' : 'scale(1)'
        }}
        onClick={() => !activeCalculator && setActiveCalculator('rop')}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)'
            }}>
              <FiShield size={36} color="white" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937' }}>
              Calcular ROP
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Ponto de Reposição - saiba quando fazer o próximo pedido
            </p>
          </div>

          {activeCalculator === 'rop' && (
            <form onSubmit={handleROPSubmit} onClick={(e) => e.stopPropagation()}>
              {error && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  <FiClock style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Lead Time (dias)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={ropData.lead_time}
                  onChange={(e) => setRopData({...ropData, lead_time: e.target.value})}
                  placeholder="Ex: 7"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f5576c'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Tempo entre pedido e entrega
                </small>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  <FiTrendingUp style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Nível de Serviço (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="99.9"
                  step="0.1"
                  required
                  value={ropData.service_level}
                  onChange={(e) => setRopData({...ropData, service_level: e.target.value})}
                  placeholder="Ex: 95"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f5576c'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  95% = alta confiabilidade
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  <FiUpload style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Histórico de Demanda (CSV)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setRopData({...ropData, file: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveCalculator(null)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '0.875rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {loading ? 'Calculando...' : <><FiCheckCircle /> Calcular</>}
                </button>
              </div>
            </form>
          )}

          {!activeCalculator && (
            <button
              onClick={() => setActiveCalculator('rop')}
              style={{
                width: '100%',
                padding: '1rem',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(240, 147, 251, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Iniciar Cálculo
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div id="results">
        <ResultsDisplay result={result} />
      </div>
    </div>
  );
};

export default DashboardNew;

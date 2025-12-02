import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import config from '../config';
import '../index.css';

const DashboardNew = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Estados do formulário EOQ
  const [formData, setFormData] = useState({
    custo_pedido: '',
    custo_estocagem: '',
    file: null
  });
  
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [fileName, setFileName] = useState('');

  // Carregar histórico de otimizações
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data.slice(0, 10)); // Últimos 10 registros
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido');
        return;
      }
      setFormData(prev => ({
        ...prev,
        file: file
      }));
      setFileName(file.name);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação
    if (!formData.custo_pedido || !formData.custo_estocagem || !formData.file) {
      setError('Por favor, preencha todos os campos e selecione um arquivo CSV');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.custo_pedido) <= 0 || parseFloat(formData.custo_estocagem) <= 0) {
      setError('Os custos devem ser maiores que zero');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Criar FormData para enviar arquivo
      const data = new FormData();
      data.append('custo_pedido', formData.custo_pedido);
      data.append('custo_estocagem', formData.custo_estocagem);
      data.append('historical_demand', formData.file);

      const response = await fetch(`${config.API_URL}/api/optimize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao calcular EOQ');
      }

      const responseData = await response.json();
      setResults(responseData.success ? responseData.data : responseData);
      
      // Limpar formulário
      setFormData({
        custo_pedido: '',
        custo_estocagem: '',
        file: null
      });
      setFileName('');
      
      fetchHistory(); // Atualizar histórico
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Gerar dados para análise de sensibilidade (variação da demanda)
  const generateSensitivityData = () => {
    if (!results) return [];
    
    const baseQ = results.quantidade_otima || results.q_otimo;
    const baseDemand = results.demanda_anual || 10000;
    const S = results.custo_pedido || parseFloat(formData.custo_pedido);
    const H = results.custo_estocagem || parseFloat(formData.custo_estocagem);
    const data = [];
    
    for (let i = -40; i <= 40; i += 10) {
      const demandVariation = baseDemand * (1 + i / 100);
      const newQ = Math.sqrt((2 * demandVariation * S) / H);
      data.push({
        variation: `${i}%`,
        demand: Math.round(demandVariation),
        eoq: Math.round(newQ),
        percentChange: i
      });
    }
    
    return data;
  };

  // Gerar dados de custo total por quantidade
  const generateCostAnalysis = () => {
    if (!results) return [];
    
    const D = results.demanda_anual || 10000;
    const S = results.custo_pedido || parseFloat(formData.custo_pedido);
    const H = results.custo_estocagem || parseFloat(formData.custo_estocagem);
    const optimalQ = results.quantidade_otima || results.q_otimo;
    const data = [];
    
    for (let q = Math.max(10, optimalQ - 200); q <= optimalQ + 200; q += 20) {
      const orderingCost = (D / q) * S;
      const holdingCost = (q / 2) * H;
      const totalCost = orderingCost + holdingCost;
      
      data.push({
        quantity: Math.round(q),
        orderingCost: Math.round(orderingCost),
        holdingCost: Math.round(holdingCost),
        totalCost: Math.round(totalCost),
        isOptimal: Math.abs(q - optimalQ) < 10
      });
    }
    
    return data;
  };

  // Dados para gráfico de pizza - composição de custos
  const getCostBreakdown = () => {
    if (!results) return [];
    
    const orderCost = results.custo_pedido || 0;
    const holdCost = results.custo_armazenagem || results.custo_estocagem || 0;
    
    return [
      { name: 'Custo de Pedido', value: orderCost, color: '#8b5cf6' },
      { name: 'Custo de Armazenagem', value: holdCost, color: '#ec4899' },
    ];
  };

  // Gerar projeção de estoque ao longo do tempo
  const generateStockProjection = () => {
    if (!results) return [];
    
    const data = [];
    const cycles = 6; // 6 ciclos de reabastecimento
    const q = results.quantidade_otima || results.q_otimo;
    const D = results.demanda_anual || 10000;
    const dailyDemand = D / 365;
    
    for (let cycle = 0; cycle < cycles; cycle++) {
      const daysInCycle = q / dailyDemand;
      const steps = 30; // Mais pontos para gráfico mais suave
      
      // Início do ciclo - estoque cheio
      data.push({
        day: Math.round(cycle * daysInCycle),
        stock: Math.round(q)
      });
      
      // Durante o ciclo - estoque diminui linearmente
      for (let step = 1; step < steps; step++) {
        const day = cycle * daysInCycle + (step * daysInCycle / steps);
        const stockLevel = q - (step * daysInCycle / steps) * dailyDemand;
        
        data.push({
          day: Math.round(day),
          stock: Math.round(Math.max(stockLevel, 0))
        });
      }
      
      // Final do ciclo - estoque no mínimo antes de reabastecer
      data.push({
        day: Math.round((cycle + 1) * daysInCycle - 1),
        stock: 0
      });
    }
    
    return data;
  };

  // KPIs principais
  const getKPIs = () => {
    if (!results) return null;
    
    const D = results.demanda_anual || 10000;
    const Q = results.quantidade_otima || results.q_otimo;
    const orderCost = results.custo_pedido || 0;
    const holdCost = results.custo_armazenagem || results.custo_estocagem || 0;
    
    const turnoverRate = D / (Q / 2);
    const daysOfStock = (Q / 2) / (D / 365);
    const totalCost = results.custo_total_minimo || (orderCost + holdCost);
    const efficiency = ((totalCost / (orderCost + holdCost + 1000)) * 100);
    
    return {
      turnoverRate: turnoverRate.toFixed(2),
      daysOfStock: Math.round(daysOfStock),
      ordersPerYear: Math.round(D / Q),
      efficiency: Math.min(efficiency, 100).toFixed(1)
    };
  };


  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>StockOptima</h1>
            <p className="header-subtitle">Sistema de Otimização de Estoque</p>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/history')} className="btn-secondary">
              📜 Histórico
            </button>
            <button onClick={handleLogout} className="btn-logout">
              🚪 Sair
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Formulário de Input */}
        <div className="card">
          <h2 className="card-title">📝 Parâmetros de Cálculo EOQ</h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid var(--purple)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: 'var(--dark-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💡 O que é o EOQ?
            </h3>
            <p style={{ color: 'var(--dark-text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
              O <strong>Economic Order Quantity (EOQ)</strong> é um modelo matemático que calcula a quantidade ideal de produtos 
              a ser pedida em cada reposição, minimizando os custos totais de estoque. O modelo equilibra dois tipos de custos:
            </p>
            <ul style={{ color: 'var(--dark-text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
              <li><strong>Custo de Pedido (S):</strong> Custos fixos ao fazer um pedido (frete, processamento, burocracia)</li>
              <li><strong>Custo de Armazenagem (H):</strong> Custos de manter produtos em estoque (aluguel, seguro, obsolescência)</li>
            </ul>
            <p style={{ color: 'var(--dark-text-secondary)', marginTop: '1rem', lineHeight: '1.6' }}>
              Nossa ferramenta usa <strong>Machine Learning</strong> para analisar seu histórico de vendas, prever a demanda futura 
              e calcular automaticamente o lote ótimo de compra!
            </p>
          </div>

          <p style={{ color: 'var(--dark-text-secondary)', marginBottom: '1.5rem' }}>
            Preencha os dados abaixo para calcular a quantidade ótima de pedido:
          </p>
          
          <form onSubmit={handleSubmit} className="eoq-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="custo_pedido">
                  � Custo de Pedido (S) - R$
                  <span className="tooltip">?<span className="tooltip-text">Custo fixo por pedido (frete, administrativo, etc.)</span></span>
                </label>
                <input
                  type="number"
                  id="custo_pedido"
                  name="custo_pedido"
                  value={formData.custo_pedido}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Ex: 75.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="custo_estocagem">
                  🏪 Custo de Estocagem (H) - R$/unidade/ano
                  <span className="tooltip">?<span className="tooltip-text">Custo de manter uma unidade em estoque por ano</span></span>
                </label>
                <input
                  type="number"
                  id="custo_estocagem"
                  name="custo_estocagem"
                  value={formData.custo_estocagem}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Ex: 2.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="file">
                📊 Histórico de Demanda (CSV)
                <span className="tooltip">?<span className="tooltip-text">Arquivo CSV com colunas: mes, vendas</span></span>
              </label>
              <div 
                style={{ 
                  border: '2px dashed var(--dark-border)', 
                  borderRadius: '12px', 
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: 'var(--dark-bg)'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--purple)';
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--dark-border)';
                  e.currentTarget.style.background = 'var(--dark-bg)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--dark-border)';
                  e.currentTarget.style.background = 'var(--dark-bg)';
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    handleFileChange({ target: { files: [file] } });
                  }
                }}
                onClick={() => document.getElementById('file').click()}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                {fileName ? (
                  <div>
                    <p style={{ color: 'var(--green)', fontWeight: '600', marginBottom: '0.5rem' }}>✓ Arquivo selecionado</p>
                    <p style={{ color: 'var(--dark-text)' }}><strong>{fileName}</strong></p>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--dark-text)', marginBottom: '0.5rem' }}>
                      Arraste um arquivo CSV ou clique para selecionar
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)' }}>
                      O arquivo deve conter as colunas: <code style={{ background: 'var(--dark-card)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>mes</code> e <code style={{ background: 'var(--dark-card)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>vendas</code>
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                id="file"
                name="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                required
              />
            </div>

            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: 'var(--dark-bg)', 
              borderRadius: '8px',
              border: '1px solid var(--dark-border)',
              fontSize: '0.875rem'
            }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--dark-text)' }}>ℹ️ Formato do CSV</h4>
              <p style={{ color: 'var(--dark-text-secondary)', marginBottom: '0.5rem' }}>
                Seu arquivo CSV deve ter exatamente duas colunas:
              </p>
              <pre style={{ 
                backgroundColor: 'var(--dark-card)', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginTop: '0.5rem',
                overflow: 'auto',
                color: 'var(--dark-text)',
                border: '1px solid var(--dark-border)'
              }}>
{`mes,vendas
1,450
2,500
3,480
...`}
              </pre>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Calculando...' : '🚀 Calcular EOQ'}
            </button>
          </form>
        </div>

        {/* Resultados e Gráficos */}
        {results && (
          <>
            {/* KPIs Principais */}
            <div className="kpis-grid">
              <div className="kpi-card kpi-purple">
                <div className="kpi-icon">📦</div>
                <div className="kpi-content">
                  <h3>Lote Ótimo (EOQ)</h3>
                  <p className="kpi-value">{Math.round(results.quantidade_otima || results.q_otimo)}</p>
                  <span className="kpi-label">unidades</span>
                </div>
              </div>

              <div className="kpi-card kpi-pink">
                <div className="kpi-icon">💰</div>
                <div className="kpi-content">
                  <h3>Custo Total Mínimo</h3>
                  <p className="kpi-value">R$ {(results.custo_total_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <span className="kpi-label">por ano</span>
                </div>
              </div>

              <div className="kpi-card kpi-blue">
                <div className="kpi-icon">🔄</div>
                <div className="kpi-content">
                  <h3>Pedidos por Ano</h3>
                  <p className="kpi-value">{Math.round((results.demanda_anual || 10000) / (results.quantidade_otima || results.q_otimo || 1))}</p>
                  <span className="kpi-label">pedidos</span>
                </div>
              </div>

              <div className="kpi-card kpi-green">
                <div className="kpi-icon">⚡</div>
                <div className="kpi-content">
                  <h3>Giro de Estoque</h3>
                  <p className="kpi-value">{getKPIs().turnoverRate}x</p>
                  <span className="kpi-label">por ano</span>
                </div>
              </div>

              <div className="kpi-card kpi-orange">
                <div className="kpi-icon">📅</div>
                <div className="kpi-content">
                  <h3>Dias de Estoque</h3>
                  <p className="kpi-value">{getKPIs().daysOfStock}</p>
                  <span className="kpi-label">dias</span>
                </div>
              </div>

            </div>

            {/* Gráficos - Linha 1 */}
            <div className="charts-grid">
              {/* Análise de Custo Total */}
              <div className="card chart-card">
                <h3 className="chart-title">📈 Análise de Custo Total por Quantidade</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={generateCostAnalysis()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="quantity" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totalCost" stroke="#8b5cf6" strokeWidth={3} name="Custo Total" dot={false} />
                    <Line type="monotone" dataKey="orderingCost" stroke="#ec4899" strokeWidth={2} name="Custo de Pedido" dot={false} />
                    <Line type="monotone" dataKey="holdingCost" stroke="#10b981" strokeWidth={2} name="Custo de Armazenagem" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Projeção de Estoque */}
              <div className="card chart-card">
                <h3 className="chart-title">📊 Ciclos de Reabastecimento de Estoque</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateStockProjection()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9ca3af" label={{ value: 'Dias', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#9ca3af" label={{ value: 'Unidades', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#f3f4f6' }}
                      formatter={(value) => [`${Math.round(value)} unidades`, '']}
                    />
                    <Legend />
                    <Area type="stepAfter" dataKey="stock" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Nível de Estoque" />
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                  Simulação de 6 ciclos de reabastecimento mostrando como o estoque varia ao longo do tempo
                </p>
              </div>
            </div>

            {/* Gráficos - Linha 2 */}
            <div className="charts-grid-3">
              {/* Composição de Custos */}
              <div className="card chart-card">
                <h3 className="chart-title">🥧 Composição de Custos</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getCostBreakdown()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getCostBreakdown().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Análise de Sensibilidade */}
              <div className="card chart-card">
                <h3 className="chart-title">📉 Sensibilidade da Demanda</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={generateSensitivityData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="variation" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Bar dataKey="eoq" fill="#8b5cf6" name="EOQ Ajustado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interpretação dos Resultados */}
            <div className="card">
              <h3 className="card-title">💡 Interpretação dos Resultados</h3>
              <div style={{ 
                display: 'grid', 
                gap: '1.5rem',
                color: 'var(--dark-text-secondary)',
                lineHeight: '1.7'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--purple)'
                }}>
                  <h4 style={{ color: 'var(--dark-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📦 Quantidade Ótima de Pedido
                  </h4>
                  <p>
                    Você deve pedir <strong style={{ color: 'var(--purple)' }}>{Math.round(results.quantidade_otima || results.q_otimo)}</strong> unidades 
                    em cada pedido. Isso equilibra perfeitamente os custos de fazer pedidos frequentes versus manter muito 
                    estoque parado.
                  </p>
                </div>

                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--green)'
                }}>
                  <h4 style={{ color: 'var(--dark-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔄 Frequência de Pedidos
                  </h4>
                  <p>
                    Faça <strong style={{ color: 'var(--green)' }}>
                      {Math.round((results.demanda_anual || 1) / (results.quantidade_otima || results.q_otimo || 1))} pedidos por ano
                    </strong>, ou seja, aproximadamente 1 pedido a cada{' '}
                    <strong style={{ color: 'var(--green)' }}>
                      {Math.round(365 / ((results.demanda_anual || 1) / (results.quantidade_otima || results.q_otimo || 1)))} dias
                    </strong>.
                  </p>
                </div>

                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--blue)'
                }}>
                  <h4 style={{ color: 'var(--dark-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    💰 Economia de Custos
                  </h4>
                  <p>
                    Com esta estratégia, seu custo total anual será de{' '}
                    <strong style={{ color: 'var(--blue)' }}>
                      R$ {(results.custo_total_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>, minimizando desperdícios e maximizando eficiência.
                  </p>
                </div>

                {results.r2_score !== undefined && results.r2_score !== null && (
                  <div style={{ 
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid var(--orange)'
                  }}>
                    <h4 style={{ color: 'var(--dark-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📈 Confiabilidade da Previsão
                    </h4>
                    <p>
                      O modelo de previsão ({results.metodo_previsao}) apresentou uma acurácia de{' '}
                      <strong style={{ color: 'var(--orange)' }}>
                        {(results.r2_score * 100).toFixed(2)}%
                      </strong>. 
                      {results.r2_score > 0.7 
                        ? ' Excelente! A previsão é altamente confiável.' 
                        : ' Considere adicionar mais dados históricos para melhorar a precisão.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Como o Cálculo foi Feito */}
            <div className="card">
              <h3 className="card-title">🧮 Como o Cálculo Foi Feito</h3>
              
              <div style={{ 
                background: 'var(--dark-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--dark-border)',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ color: 'var(--dark-text)', marginBottom: '1rem' }}>📊 Etapa 1: Análise da Demanda</h4>
                <p style={{ color: 'var(--dark-text-secondary)', lineHeight: '1.7', marginBottom: '0.75rem' }}>
                  Analisamos seu histórico de vendas usando <strong style={{ color: 'var(--purple)' }}>algoritmos de Machine Learning</strong> ({results.metodo_previsao || 'Regressão Linear'}) 
                  para prever a demanda futura com precisão.
                </p>
                <div style={{ 
                  background: 'var(--dark-card)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: 'var(--green)',
                  marginTop: '0.5rem'
                }}>
                  Demanda Prevista (D) = {Math.round(results.demanda_anual || 0).toLocaleString('pt-BR')} unidades/ano
                </div>
              </div>

              <div style={{ 
                background: 'var(--dark-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--dark-border)',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ color: 'var(--dark-text)', marginBottom: '1rem' }}>🧪 Etapa 2: Fórmula do EOQ</h4>
                <p style={{ color: 'var(--dark-text-secondary)', lineHeight: '1.7', marginBottom: '0.75rem' }}>
                  Aplicamos a fórmula clássica do <strong style={{ color: 'var(--purple)' }}>Economic Order Quantity (EOQ)</strong>:
                </p>
                <div style={{ 
                  background: 'var(--dark-card)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginTop: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '1.5rem', color: 'var(--purple)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Q* = √(2 × D × S / H)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-secondary)', marginTop: '0.75rem' }}>
                    Onde:<br/>
                    <strong style={{ color: 'var(--dark-text)' }}>D</strong> = Demanda anual ({Math.round(results.demanda_anual || 0).toLocaleString('pt-BR')} unidades)<br/>
                    <strong style={{ color: 'var(--dark-text)' }}>S</strong> = Custo por pedido (R$ {(results.custo_pedido || 0).toFixed(2)})<br/>
                    <strong style={{ color: 'var(--dark-text)' }}>H</strong> = Custo de armazenagem (R$ {((results.custo_armazenagem || results.custo_estocagem || 0)).toFixed(2)}/unidade/ano)
                  </div>
                </div>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--purple)'
                }}>
                  <div style={{ fontSize: '1.2rem', color: 'var(--purple)', fontWeight: 'bold', textAlign: 'center' }}>
                    Q* = {Math.round(results.quantidade_otima || results.q_otimo)} unidades
                  </div>
                </div>
              </div>

              <div style={{ 
                background: 'var(--dark-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--dark-border)'
              }}>
                <h4 style={{ color: 'var(--dark-text)', marginBottom: '1rem' }}>⚖️ Etapa 3: Equilíbrio de Custos</h4>
                <p style={{ color: 'var(--dark-text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
                  O EOQ encontra o ponto onde os custos se equilibram:
                </p>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{ 
                    background: 'var(--dark-card)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--purple)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)', marginBottom: '0.5rem' }}>
                      Custo de Pedidos
                    </div>
                    <div style={{ fontSize: '1.25rem', color: 'var(--purple)', fontWeight: 'bold' }}>
                      R$ {(results.custo_pedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'var(--dark-card)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--pink)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)', marginBottom: '0.5rem' }}>
                      Custo de Armazenagem
                    </div>
                    <div style={{ fontSize: '1.25rem', color: 'var(--pink)', fontWeight: 'bold' }}>
                      R$ {((results.custo_armazenagem || results.custo_estocagem || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '2px solid var(--purple)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--dark-text-secondary)', marginBottom: '0.5rem' }}>
                      <strong>Custo Total Mínimo</strong>
                    </div>
                    <div style={{ fontSize: '1.25rem', color: 'var(--purple)', fontWeight: 'bold' }}>
                      R$ {(results.custo_total_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <p style={{ color: 'var(--dark-text-secondary)', lineHeight: '1.7', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center', fontStyle: 'italic' }}>
                  💡 Qualquer quantidade diferente de {Math.round(results.quantidade_otima || results.q_otimo)} unidades resultará em custos maiores!
                </p>
              </div>
            </div>

            {/* Tabela de Resumo Detalhado */}
              <div className="card">
              <h3 className="card-title">📋 Resumo Detalhado dos Resultados</h3>
              <div className="results-table">
                <div className="result-row">
                  <span className="result-label">📦 Lote Econômico de Compra (EOQ)</span>
                  <span className="result-value">{Math.round(results.quantidade_otima || results.q_otimo)} unidades</span>
                </div>
                <div className="result-row">
                  <span className="result-label">📊 Demanda Anual Prevista</span>
                  <span className="result-value">{Math.round(results.demanda_anual || 0).toLocaleString('pt-BR')} unidades</span>
                </div>
                <div className="result-row">
                  <span className="result-label">🔄 Número de Pedidos por Ano</span>
                  <span className="result-value">{Math.round((results.demanda_anual || 1) / (results.quantidade_otima || results.q_otimo || 1))} pedidos</span>
                </div>
                <div className="result-row">
                  <span className="result-label">⏰ Intervalo entre Pedidos</span>
                  <span className="result-value">{Math.round(365 / ((results.demanda_anual || 1) / (results.quantidade_otima || results.q_otimo || 1)))} dias</span>
                </div>
                <div className="result-row highlight">
                  <span className="result-label">💰 Custo Total Mínimo Anual</span>
                  <span className="result-value">R$ {(results.custo_total_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">📦 Custo de Pedidos</span>
                  <span className="result-value">R$ {(results.custo_pedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">🏪 Custo de Armazenagem</span>
                  <span className="result-value">R$ {(results.custo_armazenagem || results.custo_estocagem || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">📊 Estoque Médio</span>
                  <span className="result-value">{Math.round((results.quantidade_otima || results.q_otimo || 0) / 2)} unidades</span>
                </div>
                <div className="result-row">
                  <span className="result-label">🔄 Taxa de Giro de Estoque</span>
                  <span className="result-value">{getKPIs().turnoverRate}x por ano</span>
                </div>
                <div className="result-row">
                  <span className="result-label">📅 Dias de Cobertura de Estoque</span>
                  <span className="result-value">{getKPIs().daysOfStock} dias</span>
                </div>
                {results.metodo_previsao && (
                  <div className="result-row">
                    <span className="result-label">🤖 Método de Previsão</span>
                    <span className="result-value">{results.metodo_previsao}</span>
                  </div>
                )}
                {results.r2_score !== undefined && results.r2_score !== null && (
                  <div className="result-row">
                    <span className="result-label">📈 Acurácia do Modelo (R²)</span>
                    <span className="result-value">{(results.r2_score * 100).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Histórico Recente */}
            {historyData.length > 0 && (
              <div className="card">
                <h3 className="card-title">🕐 Histórico Recente de Otimizações</h3>
                <div className="history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Demanda Anual</th>
                        <th>EOQ</th>
                        <th>Custo Total</th>
                        <th>Método</th>
                        <th>R²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((item, index) => (
                        <tr key={index}>
                          <td>{new Date(item.data_calculo || item.timestamp).toLocaleDateString('pt-BR')}</td>
                          <td>{Math.round(item.demanda_anual || 0).toLocaleString('pt-BR')}</td>
                          <td>{Math.round(item.quantidade_otima || item.q_otimo)}</td>
                          <td>R$ {(item.custo_total_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td><span style={{ fontSize: '0.875rem' }}>{item.metodo_previsao || 'N/A'}</span></td>
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
                                {(item.r2_score * 100).toFixed(1)}%
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Estado inicial - sem resultados */}
        {!results && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>Bem-vindo ao Dashboard EOQ</h3>
            <p>Preencha os parâmetros acima e clique em "Calcular EOQ" para visualizar as análises e gráficos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardNew;

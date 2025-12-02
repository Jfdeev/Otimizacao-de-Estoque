import React, { useMemo } from 'react';
import { FiCheckCircle, FiTrendingDown, FiInfo } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot, ResponsiveContainer, Area, ComposedChart } from 'recharts';

const ResultsDisplay = ({ result }) => {
  if (!result) return null;

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

  // Gerar dados para o gráfico da função de custo
  const chartData = useMemo(() => {
    const D = result.demanda_anual;
    const S = result.custo_pedido;
    const H = result.custo_estocagem;
    const Q_otimo = result.quantidade_otima;
    
    const data = [];
    const qMin = Math.max(50, Q_otimo * 0.3);
    const qMax = Q_otimo * 2;
    const step = (qMax - qMin) / 100;
    
    for (let Q = qMin; Q <= qMax; Q += step) {
      const custoPedido = (D * S) / Q;
      const custoEstocagem = (H * Q) / 2;
      const custoTotal = custoPedido + custoEstocagem;
      
      data.push({
        Q: parseFloat(Q.toFixed(2)),
        custoTotal: parseFloat(custoTotal.toFixed(2)),
        custoPedido: parseFloat(custoPedido.toFixed(2)),
        custoEstocagem: parseFloat(custoEstocagem.toFixed(2))
      });
    }
    
    return data;
  }, [result]);

  // Tooltip customizado para o gráfico
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '2px solid var(--primary-color)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '5px' }}>
            Q = {formatNumber(payload[0].payload.Q)} unidades
          </p>
          <p style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>
            Custo Total: {formatCurrency(payload[0].payload.custoTotal)}
          </p>
          <p style={{ color: '#e74c3c', fontSize: '0.85rem' }}>
            Custo Pedido: {formatCurrency(payload[0].payload.custoPedido)}
          </p>
          <p style={{ color: '#27ae60', fontSize: '0.85rem' }}>
            Custo Estocagem: {formatCurrency(payload[0].payload.custoEstocagem)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ 
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '2px solid var(--secondary-color)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <FiCheckCircle 
          size={64} 
          style={{ color: 'var(--secondary-color)', marginBottom: '1rem' }} 
        />
        <h2 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem' }}>
          ✅ Otimização Concluída!
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Encontramos a solução ótima para seu estoque
        </p>
      </div>

      {/* Cards de Resultado Principal */}
      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ 
          background: 'linear-gradient(135deg, var(--secondary-color) 0%, #059669 100%)' 
        }}>
          <div className="stat-label">📦 Quantidade Ótima de Pedido (Q*)</div>
          <div className="stat-value">{formatNumber(result.quantidade_otima)} unidades</div>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
            Este é o lote econômico ideal para minimizar seus custos
          </p>
        </div>

        <div className="stat-card" style={{ 
          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)' 
        }}>
          <div className="stat-label">💰 Custo Total Anual Mínimo</div>
          <div className="stat-value">{formatCurrency(result.custo_total_minimo)}</div>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
            Custo total otimizado (pedido + estocagem + produto)
          </p>
        </div>
      </div>

      {/* Cards de ROP - Ponto de Reposição */}
      {result.reorder_point && result.safety_stock && (
        <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
          }}>
            <div className="stat-label">🎯 Ponto de Reposição (ROP)</div>
            <div className="stat-value">{formatNumber(result.reorder_point)} unidades</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
              Quando o estoque atingir este nível, faça um novo pedido
            </p>
          </div>

          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
          }}>
            <div className="stat-label">🛡️ Estoque de Segurança (SS)</div>
            <div className="stat-value">{formatNumber(result.safety_stock)} unidades</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
              Buffer para proteger contra incertezas (nível de serviço: {result.service_level}%)
            </p>
          </div>
        </div>
      )}

      {/* Detalhes da Análise */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiInfo /> Detalhes da Análise
        </h3>
        
        <div className="grid grid-2">
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Custo de Pedido (S)
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {formatCurrency(result.custo_pedido)}
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Custo de Estocagem (H)
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {formatCurrency(result.custo_estocagem)}
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Demanda Anual Prevista (D)
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {formatNumber(result.demanda_anual)} unidades
            </p>
          </div>

          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Método de Previsão
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {result.metodo_previsao}
            </p>
          </div>

          {result.lead_time && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Lead Time
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
                {result.lead_time} dias
              </p>
            </div>
          )}

          {result.demanda_diaria && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Demanda Diária Média
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
                {formatNumber(result.demanda_diaria)} unidades/dia
              </p>
            </div>
          )}

          {result.r2_score !== null && result.r2_score !== undefined && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Qualidade da Previsão (R²)
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
                {formatNumber(result.r2_score * 100)}%
                {result.r2_score > 0.7 && (
                  <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>
                    Boa
                  </span>
                )}
                {result.r2_score <= 0.7 && result.r2_score > 0.5 && (
                  <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>
                    Moderada
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Como a Solução foi Escolhida */}
      <div style={{ 
        backgroundColor: '#eff6ff', 
        borderRadius: '12px', 
        padding: '1.5rem',
        borderLeft: '4px solid var(--primary-color)'
      }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          🎓 Como a Solução foi Escolhida
        </h3>
        
        <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
          <p style={{ marginBottom: '1rem' }}>
            A quantidade ótima <strong>Q* = {formatNumber(result.quantidade_otima)} unidades</strong> foi 
            calculada usando o <strong>Modelo EOQ (Economic Order Quantity)</strong>, um modelo 
            matemático clássico de otimização de estoque.
          </p>

          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>📐 Fundamento Matemático:</h4>
          <p style={{ marginBottom: '1rem' }}>
            O modelo EOQ baseia-se na função de custo total:
          </p>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            CT(Q) = (D × S / Q) + (H × Q / 2)
          </div>

          <p style={{ marginBottom: '0.5rem' }}>Onde:</p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
            <li><strong>D</strong> = Demanda anual ({formatNumber(result.demanda_anual)} unidades)</li>
            <li><strong>S</strong> = Custo por pedido ({formatCurrency(result.custo_pedido)})</li>
            <li><strong>H</strong> = Custo de estocagem por unidade ({formatCurrency(result.custo_estocagem)})</li>
            <li><strong>Q</strong> = Quantidade por pedido (variável a otimizar)</li>
          </ul>

          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>🔍 Processo de Otimização:</h4>
          <ol style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Cálculo da Derivada:</strong> Calculamos a primeira derivada da função de custo 
              em relação a Q usando SymPy
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Encontrar o Ponto Crítico:</strong> Igualamos a derivada a zero e resolvemos para Q
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Validação do Mínimo:</strong> Verificamos que a segunda derivada é positiva, 
              confirmando que é um ponto de mínimo {result.validacao_minimo && '✓'}
            </li>
          </ol>

          <div style={{ 
            backgroundColor: '#f0f9ff', 
            padding: '1rem', 
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>💡 Resultado:</strong>
            </p>
            <p>
              O ponto Q* = {formatNumber(result.quantidade_otima)} é o <strong>único ponto de mínimo global</strong> 
              da função de custo, garantindo que este é o melhor valor possível para minimizar seus 
              custos totais de estoque.
            </p>
          </div>

          {result.derivada_primeira && (
            <details style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--primary-color)' }}>
                🔬 Ver Detalhes Matemáticos (Avançado)
              </summary>
              <div style={{ 
                marginTop: '0.5rem', 
                padding: '1rem', 
                backgroundColor: 'white', 
                borderRadius: '8px'
              }}>
                {/* Gráfico da Função de Custo Total */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)', fontSize: '1rem' }}>
                    📊 Visualização da Função de Custo CT(Q)
                  </h4>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    O gráfico abaixo mostra como o custo total varia em função da quantidade por pedido (Q). 
                    A linha vertical marca o ponto ótimo Q* = {formatNumber(result.quantidade_otima)} unidades.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="Q" 
                        label={{ value: 'Quantidade por Pedido (Q)', position: 'insideBottom', offset: -5 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        label={{ value: 'Custo (R$)', angle: -90, position: 'insideLeft' }}
                        stroke="#6b7280"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconType="line"
                      />
                      
                      {/* Área sombreada para custo de pedido */}
                      <Area
                        type="monotone"
                        dataKey="custoPedido"
                        fill="#fca5a5"
                        stroke="none"
                        fillOpacity={0.3}
                      />
                      
                      {/* Área sombreada para custo de estocagem */}
                      <Area
                        type="monotone"
                        dataKey="custoEstocagem"
                        fill="#86efac"
                        stroke="none"
                        fillOpacity={0.3}
                      />
                      
                      {/* Linha de custo total */}
                      <Line 
                        type="monotone" 
                        dataKey="custoTotal" 
                        stroke="var(--primary-color)" 
                        strokeWidth={3}
                        name="Custo Total CT(Q)"
                        dot={false}
                      />
                      
                      {/* Linha de custo de pedido */}
                      <Line 
                        type="monotone" 
                        dataKey="custoPedido" 
                        stroke="#e74c3c" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Custo de Pedido"
                        dot={false}
                      />
                      
                      {/* Linha de custo de estocagem */}
                      <Line 
                        type="monotone" 
                        dataKey="custoEstocagem" 
                        stroke="#27ae60" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Custo de Estocagem"
                        dot={false}
                      />
                      
                      {/* Linha vertical no ponto ótimo */}
                      <ReferenceLine 
                        x={result.quantidade_otima} 
                        stroke="var(--primary-color)" 
                        strokeWidth={2}
                        label={{ 
                          value: `Q* = ${formatNumber(result.quantidade_otima)}`, 
                          position: 'top',
                          fill: 'var(--primary-color)',
                          fontWeight: 'bold'
                        }}
                      />
                      
                      {/* Ponto destacado no mínimo */}
                      <ReferenceDot 
                        x={result.quantidade_otima} 
                        y={result.custo_total_minimo}
                        r={6}
                        fill="var(--primary-color)"
                        stroke="white"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem', 
                    backgroundColor: '#f0f9ff',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>💡 Interpretação:</strong>
                    </p>
                    <ul style={{ marginLeft: '1.5rem', lineHeight: '1.6' }}>
                      <li>A <span style={{ color: '#e74c3c' }}>linha vermelha tracejada</span> mostra o custo de pedido decrescente</li>
                      <li>A <span style={{ color: '#27ae60' }}>linha verde tracejada</span> mostra o custo de estocagem crescente</li>
                      <li>A <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>linha azul sólida</span> representa o custo total (soma dos dois)</li>
                      <li>O ponto mínimo da curva azul é exatamente Q* = {formatNumber(result.quantidade_otima)}</li>
                    </ul>
                  </div>
                </div>

                {/* Derivadas */}
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#fafafa', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  marginTop: '1rem'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Primeira Derivada:</p>
                  <code style={{ display: 'block', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                    {result.derivada_primeira}
                  </code>
                  
                  {result.derivada_segunda && (
                    <>
                      <p style={{ fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' }}>Segunda Derivada:</p>
                      <code style={{ display: 'block', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                        {result.derivada_segunda}
                      </code>
                      <p style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.75rem', 
                        color: '#27ae60',
                        fontFamily: 'system-ui'
                      }}>
                        ✓ Segunda derivada positiva confirma que Q* é um ponto de mínimo
                      </p>
                    </>
                  )}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Explicação do ROP */}
      {result.reorder_point && result.safety_stock && (
        <div style={{ 
          backgroundColor: '#fef3c7', 
          borderRadius: '12px', 
          padding: '1.5rem',
          marginTop: '1.5rem',
          borderLeft: '4px solid #f59e0b'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#92400e' }}>
            🎯 Entendendo o Ponto de Reposição (ROP)
          </h3>
          
          <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '1rem' }}>
              O <strong>Ponto de Reposição (ROP = {formatNumber(result.reorder_point)} unidades)</strong> indica 
              o nível de estoque em que você deve fazer um novo pedido para evitar rupturas.
            </p>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>📐 Cálculo do ROP:</h4>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '1rem', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              ROP = (Demanda Diária × Lead Time) + Estoque de Segurança
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ marginBottom: '0.5rem' }}><strong>No seu caso:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '0' }}>
                <li>Demanda Diária: {formatNumber(result.demanda_diaria)} unidades/dia</li>
                <li>Lead Time: {result.lead_time} dias</li>
                <li>Estoque de Segurança: {formatNumber(result.safety_stock)} unidades</li>
                {result.desvio_padrao_demanda && (
                  <li>Desvio Padrão da Demanda: {formatNumber(result.desvio_padrao_demanda)} unidades</li>
                )}
              </ul>
            </div>

            <div style={{ 
              backgroundColor: '#eff6ff', 
              padding: '1rem', 
              borderRadius: '8px'
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>💡 Como funciona:</strong>
              </p>
              <ol style={{ marginLeft: '1.5rem', lineHeight: '1.6', marginBottom: '0' }}>
                <li>Quando seu estoque chegar a <strong>{formatNumber(result.reorder_point)} unidades</strong>, faça um pedido de <strong>{formatNumber(result.quantidade_otima)} unidades</strong></li>
                <li>Durante o lead time de {result.lead_time} dias, você consumirá aproximadamente {formatNumber(result.demanda_diaria * result.lead_time)} unidades</li>
                <li>O estoque de segurança de {formatNumber(result.safety_stock)} unidades protege contra variações inesperadas na demanda</li>
                <li>Com nível de serviço de {result.service_level}%, você terá apenas {100 - result.service_level}% de chance de ruptura</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Recomendações Práticas */}
      <div style={{ 
        backgroundColor: '#fefce8', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginTop: '1.5rem',
        borderLeft: '4px solid var(--warning-color)'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#92400e' }}>
          💼 Recomendações Práticas
        </h3>
        
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Faça pedidos de {formatNumber(result.quantidade_otima)} unidades</strong> para 
            minimizar custos
          </li>
          {result.reorder_point && (
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Monitore seu estoque e faça novo pedido quando atingir {formatNumber(result.reorder_point)} unidades</strong> (Ponto de Reposição)
            </li>
          )}
          <li style={{ marginBottom: '0.5rem' }}>
            Com a demanda anual de {formatNumber(result.demanda_anual)} unidades, você precisará 
            fazer aproximadamente <strong>{formatNumber(result.demanda_anual / result.quantidade_otima)} pedidos por ano</strong>
          </li>
          {result.safety_stock && (
            <li style={{ marginBottom: '0.5rem' }}>
              Mantenha sempre um <strong>estoque de segurança de {formatNumber(result.safety_stock)} unidades</strong> para evitar rupturas
            </li>
          )}
          <li style={{ marginBottom: '0.5rem' }}>
            Revise estes cálculos periodicamente, especialmente se houver mudanças significativas 
            na demanda ou nos custos
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ResultsDisplay;

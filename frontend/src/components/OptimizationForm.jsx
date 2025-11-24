import React, { useState } from 'react';
import axios from 'axios';
import { FiUpload, FiDollarSign } from 'react-icons/fi';

const OptimizationForm = ({ onResultReceived }) => {
  const [formData, setFormData] = useState({
    custo_pedido: '',
    custo_estocagem: '',
    file: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

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
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validação
    if (!formData.custo_pedido || !formData.custo_estocagem || !formData.file) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.custo_pedido) <= 0 || parseFloat(formData.custo_estocagem) <= 0) {
      setError('Os custos devem ser maiores que zero');
      setLoading(false);
      return;
    }

    try {
      // Criar FormData para enviar arquivo
      const data = new FormData();
      data.append('custo_pedido', formData.custo_pedido);
      data.append('custo_estocagem', formData.custo_estocagem);
      data.append('historical_demand', formData.file);

      // Enviar para API
      const response = await axios.post('http://localhost:8000/api/optimize', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Passar resultado para componente pai
      if (response.data.success) {
        onResultReceived(response.data.data);
        
        // Limpar formulário
        setFormData({
          custo_pedido: '',
          custo_estocagem: '',
          file: null
        });
        setFileName('');
      }

    } catch (err) {
      console.error('Erro ao otimizar:', err);
      setError(
        err.response?.data?.detail || 
        'Erro ao processar otimização. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        📦 Calcular Lote Econômico de Compra (EOQ)
      </h2>
      
      <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        Preencha os dados abaixo para calcular a quantidade ótima de pedido que minimiza 
        seus custos totais de estoque.
      </p>

      {error && (
        <div className="alert alert-error">
          <strong>Erro:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="custo_pedido">
            <FiDollarSign style={{ display: 'inline', marginRight: '0.5rem' }} />
            Custo de Pedido (S)
          </label>
          <input
            type="number"
            id="custo_pedido"
            name="custo_pedido"
            value={formData.custo_pedido}
            onChange={handleInputChange}
            placeholder="Ex: 75.00"
            step="0.01"
            min="0.01"
            required
          />
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
            Custo fixo por pedido (frete, administrativo, etc.)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="custo_estocagem">
            <FiDollarSign style={{ display: 'inline', marginRight: '0.5rem' }} />
            Custo de Estocagem (H)
          </label>
          <input
            type="number"
            id="custo_estocagem"
            name="custo_estocagem"
            value={formData.custo_estocagem}
            onChange={handleInputChange}
            placeholder="Ex: 2.00"
            step="0.01"
            min="0.01"
            required
          />
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
            Custo de manter uma unidade em estoque por ano
          </small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="lead_time">
              🚚 Lead Time (dias)
            </label>
            <input
              type="number"
              id="lead_time"
              name="lead_time"
              value={formData.lead_time}
              onChange={handleInputChange}
              placeholder="Ex: 7"
              min="1"
              max="365"
              required
            />
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Tempo entre pedido e entrega
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="service_level">
              🎯 Nível de Serviço (%)
            </label>
            <input
              type="number"
              id="service_level"
              name="service_level"
              value={formData.service_level}
              onChange={handleInputChange}
              placeholder="Ex: 95"
              step="0.1"
              min="50"
              max="99.9"
              required
            />
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Confiabilidade desejada (95% recomendado)
            </small>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="file">
            <FiUpload style={{ display: 'inline', marginRight: '0.5rem' }} />
            Histórico de Demanda (CSV)
          </label>
          <div style={{ 
            border: '2px dashed var(--border-color)', 
            borderRadius: '8px', 
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--primary-color)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--border-color)';
            const file = e.dataTransfer.files[0];
            if (file) {
              handleFileChange({ target: { files: [file] } });
            }
          }}
          onClick={() => document.getElementById('file').click()}
          >
            <FiUpload size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
            {fileName ? (
              <p><strong>{fileName}</strong></p>
            ) : (
              <>
                <p>Arraste um arquivo CSV ou clique para selecionar</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  O arquivo deve conter as colunas: <code>mes</code> e <code>vendas</code>
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

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? (
            <>
              <span className="loading"></span>
              Processando...
            </>
          ) : (
            <>
              🚀 Otimizar Estoque
            </>
          )}
        </button>
      </form>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: 'var(--bg-color)', 
        borderRadius: '8px',
        fontSize: '0.875rem'
      }}>
        <h4 style={{ marginBottom: '0.5rem' }}>ℹ️ Formato do CSV</h4>
        <p>Seu arquivo CSV deve ter exatamente duas colunas:</p>
        <pre style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '4px', 
          marginTop: '0.5rem',
          overflow: 'auto'
        }}>
mes,vendas
1,450
2,500
3,480
...
        </pre>
      </div>
    </div>
  );
};

export default OptimizationForm;

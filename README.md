# Sistema de Otimização de Estoque - Modelo EOQ

Sistema full stack para otimização de logística usando o modelo EOQ (Economic Order Quantity / Lote Econômico de Compra).

## 📋 Visão Geral

Este sistema calcula a quantidade ótima de pedido que minimiza os custos totais de estoque, considerando:
- **Custos de Pedido (S)**: Custos fixos por pedido (frete, administrativo, etc.)
- **Custos de Estocagem (H)**: Custo de manter uma unidade em estoque por ano
- **Demanda Anual (D)**: Prevista usando Machine Learning a partir de dados históricos

## 🛠️ Tecnologias Utilizadas

### Backend (Python/FastAPI)
- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM para banco de dados
- **NeonDB**: Banco de dados PostgreSQL na nuvem
- **pandas**: Manipulação e análise de dados
- **scikit-learn**: Machine Learning para previsão de demanda
- **statsmodels**: Análise estatística
- **seaborn**: Visualização de dados
- **sympy**: Cálculo simbólico para otimização matemática

### Frontend (React)
- **React 18**: Biblioteca JavaScript para UI
- **React Router**: Navegação entre páginas
- **Axios**: Cliente HTTP para requisições à API
- **React Icons**: Ícones modernos
- **Vite**: Build tool rápido e moderno

## 📁 Estrutura do Projeto

```
Otimizacao de Estoque/
├── backend/
│   ├── main.py              # API FastAPI com endpoints
│   ├── model.py             # Modelo SQLAlchemy + conexão NeonDB
│   ├── optimize.py          # Lógica de otimização EOQ
│   ├── requirements.txt     # Dependências Python
│   ├── .env                 # Variáveis de ambiente
│   └── example_demand.csv   # Arquivo CSV de exemplo
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── OptimizationForm.jsx   # Formulário de entrada
│   │   │   ├── ResultsDisplay.jsx     # Exibição de resultados
│   │   │   └── HistoryPage.jsx        # Página de histórico
│   │   ├── App.jsx          # Componente principal
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Estilos globais
│   ├── index.html           # HTML base
│   ├── package.json         # Dependências Node.js
│   └── vite.config.js       # Configuração Vite
│
└── EOQ-model/
    └── index.ipynb          # Análise matemática do modelo
```

## 🚀 Como Executar

### 1. Backend (FastAPI)

```bash
# Navegar para a pasta backend
cd backend

# Criar ambiente virtual (opcional, mas recomendado)
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Iniciar o servidor
python main.py
```

O backend estará disponível em `http://localhost:8000`
- Documentação da API: `http://localhost:8000/docs`

### 2. Frontend (React)

```bash
# Em um novo terminal, navegar para a pasta frontend
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## 📊 Como Usar

### 1. Preparar o Arquivo CSV

Crie um arquivo CSV com o histórico de demanda. O arquivo deve ter exatamente duas colunas:

```csv
mes,vendas
1,450
2,480
3,520
...
```

Um arquivo de exemplo está disponível em `backend/example_demand.csv`.

### 2. Calcular o EOQ

1. Acesse `http://localhost:3000`
2. Preencha os campos:
   - **Custo de Pedido (S)**: Exemplo: 75.00
   - **Custo de Estocagem (H)**: Exemplo: 2.00
   - **Upload do CSV**: Selecione seu arquivo de demanda histórica
3. Clique em "Otimizar Estoque"

### 3. Visualizar Resultados

O sistema exibirá:
- **Quantidade Ótima (Q*)**: Lote econômico ideal
- **Custo Total Mínimo**: Custo anual otimizado
- **Demanda Anual Prevista**: Calculada por ML
- **Explicação Matemática**: Como a solução foi escolhida

### 4. Consultar Histórico

- Acesse a aba "Histórico" para ver todos os cálculos anteriores
- Visualize, compare e delete cálculos salvos

## 🧮 Modelo Matemático

O modelo EOQ baseia-se na função de custo total:

```
CT(Q) = (D × S / Q) + (H × Q / 2)
```

Onde:
- **D** = Demanda Anual
- **S** = Custo de Pedido
- **H** = Custo de Estocagem por unidade
- **Q** = Quantidade por pedido (variável a otimizar)

A quantidade ótima **Q*** é encontrada:
1. Calculando a primeira derivada: `dCT/dQ`
2. Igualando a zero e resolvendo para Q
3. Validando que é um mínimo (segunda derivada positiva)

Resultado:
```
Q* = √(2DS/H)
```

## 🔑 API Endpoints

### POST /api/optimize
Calcula o lote econômico ótimo.

**Entrada (multipart/form-data):**
- `custo_pedido` (float): Custo S
- `custo_estocagem` (float): Custo H
- `historical_demand` (file): CSV com histórico

**Resposta:**
```json
{
  "success": true,
  "data": {
    "quantidade_otima": 547.72,
    "custo_total_minimo": 101234.56,
    "demanda_anual": 10000,
    "r2_score": 0.95
  }
}
```

### GET /api/history
Retorna todos os cálculos salvos.

**Resposta:**
```json
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

### DELETE /api/history/{id}
Deleta um cálculo específico.

## 🗄️ Banco de Dados

O sistema usa **NeonDB** (PostgreSQL serverless) com a seguinte estrutura:

**Tabela: calculos**
- `id`: Identificador único
- `custo_pedido`: Custo S
- `custo_estocagem`: Custo H
- `demanda_anual`: Demanda D prevista
- `quantidade_otima`: Q* calculado
- `custo_total_minimo`: CT(Q*)
- `metodo_previsao`: Método usado (Linear Regression)
- `r2_score`: Qualidade da previsão
- `data_calculo`: Timestamp

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
DATABASE_URL=postgresql://user:password@host/database
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

## 📝 Notas Importantes

1. **Validação**: Todos os custos (S, H) devem ser maiores que zero
2. **CSV**: O arquivo deve ter exatamente as colunas `mes` e `vendas`
3. **Previsão**: O sistema usa regressão linear para estimar a demanda futura
4. **R²**: Indica a qualidade da previsão (0-1, quanto maior melhor)

## 🎓 Fundamentação Acadêmica

O modelo EOQ foi desenvolvido por **Ford W. Harris** em 1913 e é um dos modelos mais utilizados em gestão de estoques. Este sistema implementa:

- **Otimização Matemática**: Usando cálculo diferencial (SymPy)
- **Machine Learning**: Previsão de demanda (sklearn)
- **Análise Estatística**: Validação de resultados (statsmodels)
- **Persistência**: Histórico de cálculos (NeonDB)

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do backend no terminal
2. Consulte a documentação interativa em `/docs`
3. Revise o notebook `EOQ-model/index.ipynb` para entender a matemática

## 📄 Licença

Este projeto é para fins educacionais e acadêmicos.

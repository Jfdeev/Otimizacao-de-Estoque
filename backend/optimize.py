"""
optimize.py - Lógica de Otimização EOQ (Economic Order Quantity)
Usa pandas, sklearn e sympy para previsão de demanda e otimização
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
import sympy as sp
from typing import Dict, Tuple
import io


def forecast_demand(csv_content: bytes) -> Tuple[float, float, str, float, pd.DataFrame]:
    """
    Lê o CSV de demanda histórica e prevê a demanda anual para os próximos 12 meses
    usando LinearRegression do sklearn.
    
    Args:
        csv_content: Conteúdo do arquivo CSV em bytes
        
    Returns:
        Tuple com (demanda_anual_prevista, r2_score, método_usado, desvio_padrao, df_original)
    """
    # Ler CSV
    df = pd.read_csv(io.BytesIO(csv_content))
    
    # Validar colunas
    if 'mes' not in df.columns or 'vendas' not in df.columns:
        raise ValueError("O CSV deve conter as colunas 'mes' e 'vendas'")
    
    # Preparar dados para regressão linear
    # X = índice do mês (0, 1, 2, ..., n-1)
    X = np.arange(len(df)).reshape(-1, 1)
    y = df['vendas'].values
    
    # Criar e treinar modelo de regressão linear
    model = LinearRegression()
    model.fit(X, y)
    
    # Calcular R² para avaliar qualidade da previsão
    y_pred = model.predict(X)
    r2 = r2_score(y, y_pred)
    
    # Prever os próximos 12 meses
    ultimo_mes = len(df)
    proximos_12_meses = np.arange(ultimo_mes, ultimo_mes + 12).reshape(-1, 1)
    previsao_12_meses = model.predict(proximos_12_meses)
    
    # Garantir que não haja previsões negativas
    previsao_12_meses = np.maximum(previsao_12_meses, 0)
    
    # Demanda anual = soma das previsões dos próximos 12 meses
    demanda_anual = float(np.sum(previsao_12_meses))
    
    # Calcular desvio padrão da demanda (usando dados históricos)
    desvio_padrao = float(np.std(df['vendas'].values))
    
    return demanda_anual, r2, "Linear Regression (sklearn)", desvio_padrao, df


def calculate_eoq_sympy(D: float, S: float, H: float) -> Dict[str, float]:
    """
    Calcula o Lote Econômico de Compra (Q*) usando SymPy.
    
    Função de Custo Total:
    CT(Q) = (D * S / Q) + (H * Q / 2)
    
    Onde:
    - D = Demanda Anual
    - S = Custo de Pedido
    - H = Custo de Estocagem por unidade
    - Q = Quantidade por pedido
    
    Args:
        D: Demanda Anual prevista
        S: Custo de Pedido
        H: Custo de Estocagem
        
    Returns:
        Dicionário com Q_otimo, custo_minimo, derivada_primeira, derivada_segunda
    """
    # Validar entradas
    if D <= 0 or S <= 0 or H <= 0:
        raise ValueError("Todos os parâmetros (D, S, H) devem ser maiores que zero")
    
    # Definir a variável simbólica Q
    Q = sp.Symbol('Q', positive=True, real=True)
    
    # Definir a função de custo total
    # CT(Q) = (D * S / Q) + (H * Q / 2)
    CT = (D * S / Q) + (H * Q / 2)
    
    # Calcular a primeira derivada
    CT_prime = sp.diff(CT, Q)
    
    # Resolver CT'(Q) = 0 para encontrar o ponto crítico
    pontos_criticos = sp.solve(CT_prime, Q)
    
    # Pegar apenas a solução positiva
    Q_star = None
    for solucao in pontos_criticos:
        if solucao.is_real and solucao > 0:
            Q_star = float(solucao)
            break
    
    if Q_star is None:
        raise ValueError("Não foi possível encontrar um ponto crítico válido")
    
    # Calcular a segunda derivada para verificar se é mínimo
    CT_double_prime = sp.diff(CT_prime, Q)
    segunda_derivada_no_ponto = float(CT_double_prime.subs(Q, Q_star))
    
    # Verificar se é mínimo (segunda derivada positiva)
    if segunda_derivada_no_ponto <= 0:
        raise ValueError("O ponto crítico não é um mínimo")
    
    # Calcular o custo total mínimo substituindo Q* na função de custo
    custo_minimo = float(CT.subs(Q, Q_star))
    
    # Calcular número de pedidos por ano
    numero_pedidos = D / Q_star
    
    return {
        "Q_otimo": Q_star,
        "custo_minimo": custo_minimo,
        "numero_pedidos_ano": numero_pedidos,
        "derivada_primeira": str(CT_prime),
        "derivada_segunda": str(CT_double_prime),
        "segunda_derivada_no_ponto": segunda_derivada_no_ponto
    }


def optimize_inventory(
    custo_pedido: float,
    custo_estocagem: float,
    csv_content: bytes,
    nome_produto: str = None
) -> Dict:
    """
    Função principal de otimização que integra previsão de demanda e cálculo EOQ.
    
    Args:
        custo_pedido: Custo S (custo por pedido)
        custo_estocagem: Custo H (custo de estocagem por unidade)
        csv_content: Conteúdo do arquivo CSV com histórico de demanda
        nome_produto: Nome do produto/item (opcional)
        
    Returns:
        Dicionário completo com todos os resultados da otimização EOQ
    """
    # 1. Prever demanda anual usando sklearn
    demanda_anual, r2, metodo, desvio_padrao, df = forecast_demand(csv_content)
    
    # 2. Calcular Q* e custo mínimo usando sympy
    resultado_eoq = calculate_eoq_sympy(demanda_anual, custo_pedido, custo_estocagem)
    
    # 3. Preparar resultado
    resultado = {
        "custo_pedido": custo_pedido,
        "custo_estocagem": custo_estocagem,
        "demanda_anual": demanda_anual,
        "quantidade_otima": resultado_eoq["Q_otimo"],
        "custo_total_minimo": resultado_eoq["custo_minimo"],
        "numero_pedidos_ano": resultado_eoq["numero_pedidos_ano"],
        "metodo_previsao": metodo,
        "r2_score": r2,
        "derivada_primeira": resultado_eoq["derivada_primeira"],
        "derivada_segunda": resultado_eoq["derivada_segunda"],
        "validacao_minimo": resultado_eoq["segunda_derivada_no_ponto"] > 0,
        "desvio_padrao_demanda": desvio_padrao,
        "demanda_diaria": demanda_anual / 365,
        "nome_produto": nome_produto,
        "dados_historicos": df['vendas'].tolist()  # Para gráficos
    }
    
    return resultado

"""
main.py - API FastAPI para Dashboard de Otimização de Estoque (EOQ)
Sistema com autenticação JWT e multi-usuário
"""

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
import os
from dotenv import load_dotenv

from model import User, Calculos, get_db, init_db
from optimize import optimize_inventory
from auth import (
    UserCreate, UserLogin, Token, UserResponse, get_current_user_id,
    get_password_hash, verify_password, create_access_token
)

load_dotenv()

# Criar aplicação FastAPI
app = FastAPI(
    title="Dashboard Financeiro de Otimização de Estoque - EOQ",
    description="Sistema de gestão de estoque com EOQ (Economic Order Quantity), análises financeiras e visualizações, multi-usuário com autenticação JWT",
    version="3.0.0"
)

# Configurar CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Permitir localhost e Vercel
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    FRONTEND_URL
]
# Adicionar padrão Vercel automaticamente
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app$",  # Permitir todos os domínios Vercel
)

# Inicializar banco de dados ao iniciar a aplicação
@app.on_event("startup")
async def startup_event():
    """Inicializa o banco de dados"""
    init_db()
    print("✅ Banco de dados inicializado com sucesso!")
    print("🔐 Sistema de autenticação JWT ativado")
    print("📊 Dashboard Financeiro EOQ disponível")


# ============= ROTAS PÚBLICAS =============

@app.get("/")
async def root():
    """Endpoint raiz - informações da API"""
    return {
        "message": "Dashboard Financeiro de Otimização de Estoque - EOQ",
        "version": "3.0.0",
        "features": [
            "Cálculo de Lote Econômico (EOQ)",
            "Previsão de Demanda com Machine Learning",
            "Análise de Custos e Sensibilidade",
            "Visualizações e Gráficos Financeiros",
            "KPIs e Métricas de Desempenho",
            "Autenticação JWT",
            "Dashboard Multi-usuário"
        ],
        "endpoints": {
            "auth": {
                "POST /api/auth/register": "Registrar novo usuário",
                "POST /api/auth/login": "Login e obter token JWT"
            },
            "optimization": {
                "POST /api/optimize": "Calcular EOQ (requer autenticação)",
                "GET /api/history": "Histórico de cálculos do usuário",
                "GET /api/dashboard": "KPIs e estatísticas do dashboard"
            }
        }
    }


@app.get("/health")
async def health_check():
    """Health check para monitoramento"""
    return {"status": "healthy", "version": "2.0.0"}


# ============= AUTENTICAÇÃO =============

@app.post("/api/auth/register", response_model=dict)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Registra um novo usuário no sistema
    
    Args:
        user_data: Dados do usuário (email, senha, nome_completo, empresa)
    
    Returns:
        Mensagem de sucesso e dados do usuário (sem senha)
    """
    # Verificar se o email já existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado no sistema"
        )
    
    # Criar hash da senha
    hashed_password = get_password_hash(user_data.password)
    
    # Criar novo usuário
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        nome_completo=user_data.nome_completo,
        empresa=user_data.empresa
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "success": True,
        "message": "Usuário registrado com sucesso!",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "nome_completo": new_user.nome_completo,
            "empresa": new_user.empresa
        }
    }


@app.post("/api/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Endpoint de login - retorna token JWT
    
    Args:
        form_data: Email (username) e senha
    
    Returns:
        Token JWT e dados do usuário
    """
    # Buscar usuário por email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Verificar se usuário existe e senha está correta
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Criar token JWT
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "nome_completo": user.nome_completo,
            "empresa": user.empresa
        }
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retorna informações do usuário autenticado
    """
    user = db.query(User).filter(User.id == current_user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return user


# ============= OTIMIZAÇÃO (ROTAS PROTEGIDAS) =============

@app.post("/api/optimize")
async def optimize(
    custo_pedido: float = Form(..., gt=0, description="Custo de Pedido (S)"),
    custo_estocagem: float = Form(..., gt=0, description="Custo de Estocagem (H)"),
    historical_demand: UploadFile = File(..., description="CSV com histórico de demanda"),
    nome_produto: Optional[str] = Form(None, description="Nome do produto/item"),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Endpoint POST /api/optimize
    
    Calcula EOQ (Economic Order Quantity - Lote Econômico de Compra)
    Requer autenticação JWT
    
    Parâmetros:
    - custo_pedido: Custo por pedido (S)
    - custo_estocagem: Custo de estocagem por unidade (H)
    - historical_demand: CSV com colunas 'mes' e 'vendas'
    - nome_produto: Nome do produto (opcional)
    """
    try:
        # Validar tipo de arquivo
        if not historical_demand.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="O arquivo deve ser um CSV (.csv)"
            )
        
        # Ler conteúdo do arquivo CSV
        csv_content = await historical_demand.read()
        
        # Executar otimização EOQ
        resultado = optimize_inventory(
            custo_pedido=custo_pedido,
            custo_estocagem=custo_estocagem,
            csv_content=csv_content,
            nome_produto=nome_produto
        )
        
        # Salvar no banco de dados (associado ao usuário)
        novo_calculo = Calculos(
            user_id=current_user_id,
            custo_pedido=resultado["custo_pedido"],
            custo_estocagem=resultado["custo_estocagem"],
            demanda_anual=resultado["demanda_anual"],
            lead_time=None,
            service_level=None,
            quantidade_otima=resultado["quantidade_otima"],
            custo_total_minimo=resultado["custo_total_minimo"],
            numero_pedidos_ano=resultado["numero_pedidos_ano"],
            demanda_diaria=resultado["demanda_diaria"],
            desvio_padrao_demanda=resultado["desvio_padrao_demanda"],
            safety_stock=None,
            reorder_point=None,
            metodo_previsao=resultado["metodo_previsao"],
            r2_score=resultado["r2_score"],
            derivada_primeira=resultado["derivada_primeira"],
            derivada_segunda=resultado["derivada_segunda"],
            validacao_minimo="Mínimo confirmado" if resultado["validacao_minimo"] else "Não é mínimo",
            nome_produto=resultado.get("nome_produto")
        )
        
        db.add(novo_calculo)
        db.commit()
        db.refresh(novo_calculo)
        
        # Retornar resultado completo
        return {
            "success": True,
            "data": novo_calculo.to_dict(),
            "message": "EOQ calculado com sucesso!"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erro de validação: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar otimização: {str(e)}"
        )


@app.get("/api/history")
async def get_history(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retorna histórico de cálculos do usuário autenticado
    Ordenados do mais recente para o mais antigo
    """
    try:
        # Buscar apenas cálculos do usuário logado
        calculos = db.query(Calculos).filter(
            Calculos.user_id == current_user_id
        ).order_by(Calculos.data_calculo.desc()).all()
        
        # Converter para lista de dicionários
        historico = [calculo.to_dict() for calculo in calculos]
        
        return {
            "success": True,
            "count": len(historico),
            "data": historico
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar histórico: {str(e)}"
        )


@app.get("/api/history/{calculo_id}")
async def get_calculo_by_id(
    calculo_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retorna um cálculo específico (apenas se pertencer ao usuário)
    """
    try:
        calculo = db.query(Calculos).filter(
            Calculos.id == calculo_id,
            Calculos.user_id == current_user_id
        ).first()
        
        if not calculo:
            raise HTTPException(
                status_code=404,
                detail=f"Cálculo não encontrado ou você não tem permissão"
            )
        
        return {
            "success": True,
            "data": calculo.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar cálculo: {str(e)}"
        )


@app.delete("/api/history/{calculo_id}")
async def delete_calculo(
    calculo_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Deleta um cálculo (apenas se pertencer ao usuário)
    """
    try:
        calculo = db.query(Calculos).filter(
            Calculos.id == calculo_id,
            Calculos.user_id == current_user_id
        ).first()
        
        if not calculo:
            raise HTTPException(
                status_code=404,
                detail=f"Cálculo não encontrado ou você não tem permissão"
            )
        
        db.delete(calculo)
        db.commit()
        
        return {
            "success": True,
            "message": f"Cálculo {calculo_id} deletado com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao deletar cálculo: {str(e)}"
        )


@app.get("/api/dashboard")
async def get_dashboard_stats(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retorna KPIs e estatísticas para o dashboard do usuário
    
    Métricas:
    - Total de itens gerenciados
    - Investimento total em estoque
    - Economia potencial
    - Alertas de reposição
    """
    try:
        # Buscar todos os cálculos do usuário
        calculos = db.query(Calculos).filter(
            Calculos.user_id == current_user_id
        ).all()
        
        if not calculos:
            return {
                "success": True,
                "data": {
                    "total_itens": 0,
                    "investimento_total": 0,
                    "custo_anual_otimizado": 0,
                    "alertas_reposicao": []
                }
            }
        
        # Calcular métricas
        total_itens = len(calculos)
        investimento_total = sum(c.quantidade_otima * c.custo_estocagem for c in calculos)
        custo_anual_total = sum(c.custo_total_minimo for c in calculos)
        
        # Identificar itens que precisam de reposição (exemplo: estoque atual < ROP)
        alertas = []
        for c in calculos:
            if c.reorder_point:
                alertas.append({
                    "id": c.id,
                    "nome_produto": c.nome_produto or f"Item #{c.id}",
                    "reorder_point": c.reorder_point,
                    "quantidade_otima": c.quantidade_otima,
                    "data_calculo": c.data_calculo.isoformat()
                })
        
        return {
            "success": True,
            "data": {
                "total_itens": total_itens,
                "investimento_total": round(investimento_total, 2),
                "custo_anual_otimizado": round(custo_anual_total, 2),
                "alertas_reposicao": alertas[:5],  # Top 5 alertas
                "calculos_recentes": [c.to_dict() for c in calculos[:5]]  # 5 mais recentes
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar dashboard: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"🚀 Iniciando Dashboard Financeiro de Otimização de Estoque...")
    print(f"📊 Modelo EOQ (Economic Order Quantity) disponível")
    print(f"📈 Análises Financeiras e Visualizações")
    print(f"🔐 Autenticação JWT ativada")
    print(f"🌐 Servidor: http://{host}:{port}")
    print(f"📚 Documentação: http://{host}:{port}/docs")
    
    uvicorn.run(app, host=host, port=port)

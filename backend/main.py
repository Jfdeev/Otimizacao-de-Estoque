"""
main.py - API FastAPI para Otimização de Estoque (Modelo EOQ)
"""

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
from dotenv import load_dotenv

from model import Calculos, get_db, init_db
from optimize import optimize_inventory

load_dotenv()

# Criar aplicação FastAPI
app = FastAPI(
    title="API de Otimização de Estoque EOQ",
    description="Sistema de otimização logística usando o modelo EOQ (Economic Order Quantity)",
    version="1.0.0"
)

# Configurar CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar banco de dados ao iniciar a aplicação
@app.on_event("startup")
async def startup_event():
    """Inicializa o banco de dados"""
    init_db()
    print("✅ Banco de dados inicializado com sucesso!")


@app.get("/")
async def root():
    """Endpoint raiz - informações da API"""
    return {
        "message": "API de Otimização de Estoque EOQ",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/optimize": "Calcula o lote econômico ótimo",
            "GET /api/history": "Retorna histórico de cálculos"
        }
    }


@app.post("/api/optimize")
async def optimize(
    custo_pedido: float = Form(..., gt=0, description="Custo de Pedido (S)"),
    custo_estocagem: float = Form(..., gt=0, description="Custo de Estocagem (H)"),
    historical_demand: UploadFile = File(..., description="CSV com histórico de demanda (colunas: mes, vendas)"),
    db: Session = Depends(get_db)
):
    """
    Endpoint POST /api/optimize
    
    Recebe:
    - custo_pedido (S): Custo por pedido
    - custo_estocagem (H): Custo de estocagem por unidade
    - historical_demand: Arquivo CSV com colunas 'mes' e 'vendas'
    
    Retorna:
    - quantidade_otima (Q*): Lote econômico de compra
    - custo_total_minimo: Custo total anual mínimo
    - demanda_anual: Demanda prevista para os próximos 12 meses
    - metodo_previsao: Método usado para previsão
    - r2_score: Qualidade da previsão (0-1)
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
        
        # Executar otimização
        resultado = optimize_inventory(
            custo_pedido=custo_pedido,
            custo_estocagem=custo_estocagem,
            csv_content=csv_content
        )
        
        # Salvar no banco de dados
        novo_calculo = Calculos(
            custo_pedido=resultado["custo_pedido"],
            custo_estocagem=resultado["custo_estocagem"],
            demanda_anual=resultado["demanda_anual"],
            quantidade_otima=resultado["quantidade_otima"],
            custo_total_minimo=resultado["custo_total_minimo"],
            metodo_previsao=resultado["metodo_previsao"],
            r2_score=resultado["r2_score"]
        )
        
        db.add(novo_calculo)
        db.commit()
        db.refresh(novo_calculo)
        
        # Retornar resultado
        return {
            "success": True,
            "data": {
                "id": novo_calculo.id,
                "quantidade_otima": resultado["quantidade_otima"],
                "custo_total_minimo": resultado["custo_total_minimo"],
                "demanda_anual": resultado["demanda_anual"],
                "custo_pedido": resultado["custo_pedido"],
                "custo_estocagem": resultado["custo_estocagem"],
                "metodo_previsao": resultado["metodo_previsao"],
                "r2_score": resultado["r2_score"],
                "derivada_primeira": resultado["derivada_primeira"],
                "derivada_segunda": resultado["derivada_segunda"],
                "validacao_minimo": resultado["validacao_minimo"]
            },
            "message": "Otimização calculada com sucesso!"
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
async def get_history(db: Session = Depends(get_db)):
    """
    Endpoint GET /api/history
    
    Retorna todos os cálculos de otimização salvos no banco de dados,
    ordenados do mais recente para o mais antigo.
    """
    try:
        # Buscar todos os cálculos ordenados por data (mais recente primeiro)
        calculos = db.query(Calculos).order_by(Calculos.data_calculo.desc()).all()
        
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
async def get_calculo_by_id(calculo_id: int, db: Session = Depends(get_db)):
    """
    Endpoint GET /api/history/{calculo_id}
    
    Retorna um cálculo específico por ID.
    """
    try:
        calculo = db.query(Calculos).filter(Calculos.id == calculo_id).first()
        
        if not calculo:
            raise HTTPException(
                status_code=404,
                detail=f"Cálculo com ID {calculo_id} não encontrado"
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
async def delete_calculo(calculo_id: int, db: Session = Depends(get_db)):
    """
    Endpoint DELETE /api/history/{calculo_id}
    
    Deleta um cálculo específico por ID.
    """
    try:
        calculo = db.query(Calculos).filter(Calculos.id == calculo_id).first()
        
        if not calculo:
            raise HTTPException(
                status_code=404,
                detail=f"Cálculo com ID {calculo_id} não encontrado"
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


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"🚀 Iniciando servidor na porta {port}...")
    print(f"📚 Documentação disponível em: http://{host}:{port}/docs")
    
    uvicorn.run(app, host=host, port=port)

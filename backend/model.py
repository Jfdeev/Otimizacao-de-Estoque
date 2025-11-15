"""
model.py - Modelo de Dados e Conexão com NeonDB
"""

from sqlalchemy import create_engine, Column, Integer, Float, DateTime, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Configuração do Banco de Dados NeonDB
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_jlQ2ZoKkhE0i@ep-quiet-surf-aez9l6hy-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
)

# Criar engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Calculos(Base):
    """
    Tabela para persistir os cálculos de otimização EOQ
    """
    __tablename__ = "calculos"

    id = Column(Integer, primary_key=True, index=True)
    custo_pedido = Column(Float, nullable=False)
    custo_estocagem = Column(Float, nullable=False)
    demanda_anual = Column(Float, nullable=False)
    quantidade_otima = Column(Float, nullable=False)
    custo_total_minimo = Column(Float, nullable=False)
    metodo_previsao = Column(String, nullable=True)
    r2_score = Column(Float, nullable=True)
    data_calculo = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            "id": self.id,
            "custo_pedido": self.custo_pedido,
            "custo_estocagem": self.custo_estocagem,
            "demanda_anual": self.demanda_anual,
            "quantidade_otima": self.quantidade_otima,
            "custo_total_minimo": self.custo_total_minimo,
            "metodo_previsao": self.metodo_previsao,
            "r2_score": self.r2_score,
            "data_calculo": self.data_calculo.isoformat() if self.data_calculo else None
        }


def init_db():
    """
    Inicializa o banco de dados criando todas as tabelas
    """
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency para obter sessão do banco
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

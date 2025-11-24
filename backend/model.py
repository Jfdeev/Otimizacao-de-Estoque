"""
model.py - Modelo de Dados e Conexão com NeonDB
"""

from sqlalchemy import create_engine, Column, Integer, Float, DateTime, String, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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


class User(Base):
    """
    Tabela de Usuários do Sistema
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nome_completo = Column(String, nullable=False)
    empresa = Column(String, nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento com cálculos
    calculos = relationship("Calculos", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        """Converte o objeto para dicionário (sem senha)"""
        return {
            "id": self.id,
            "email": self.email,
            "nome_completo": self.nome_completo,
            "empresa": self.empresa,
            "data_criacao": self.data_criacao.isoformat() if self.data_criacao else None
        }


class Calculos(Base):
    """
    Tabela para persistir os cálculos de otimização EOQ + ROP
    """
    __tablename__ = "calculos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Dados de entrada
    custo_pedido = Column(Float, nullable=False)
    custo_estocagem = Column(Float, nullable=False)
    demanda_anual = Column(Float, nullable=False)
    lead_time = Column(Integer, nullable=True)  # Lead time em dias
    service_level = Column(Float, nullable=True)  # Nível de serviço (0.95 = 95%)
    
    # Resultados EOQ
    quantidade_otima = Column(Float, nullable=False)
    custo_total_minimo = Column(Float, nullable=False)
    numero_pedidos_ano = Column(Float, nullable=True)
    
    # Resultados ROP
    demanda_diaria = Column(Float, nullable=True)
    desvio_padrao_demanda = Column(Float, nullable=True)
    safety_stock = Column(Float, nullable=True)  # Estoque de segurança
    reorder_point = Column(Float, nullable=True)  # Ponto de reposição
    
    # Previsão de demanda
    metodo_previsao = Column(String, nullable=True)
    r2_score = Column(Float, nullable=True)
    
    # Derivadas matemáticas (para exibição educacional)
    derivada_primeira = Column(Text, nullable=True)
    derivada_segunda = Column(Text, nullable=True)
    validacao_minimo = Column(String, nullable=True)
    
    # Metadados
    data_calculo = Column(DateTime, default=datetime.utcnow)
    nome_produto = Column(String, nullable=True)  # Opcional: nome do produto/item
    
    # Relacionamento com usuário
    user = relationship("User", back_populates="calculos")

    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "custo_pedido": float(self.custo_pedido) if self.custo_pedido else None,
            "custo_estocagem": float(self.custo_estocagem) if self.custo_estocagem else None,
            "demanda_anual": float(self.demanda_anual) if self.demanda_anual else None,
            "lead_time": self.lead_time,
            "service_level": float(self.service_level) if self.service_level else None,
            "quantidade_otima": float(self.quantidade_otima) if self.quantidade_otima else None,
            "custo_total_minimo": float(self.custo_total_minimo) if self.custo_total_minimo else None,
            "numero_pedidos_ano": float(self.numero_pedidos_ano) if self.numero_pedidos_ano else None,
            "demanda_diaria": float(self.demanda_diaria) if self.demanda_diaria else None,
            "desvio_padrao_demanda": float(self.desvio_padrao_demanda) if self.desvio_padrao_demanda else None,
            "safety_stock": float(self.safety_stock) if self.safety_stock else None,
            "reorder_point": float(self.reorder_point) if self.reorder_point else None,
            "metodo_previsao": self.metodo_previsao,
            "r2_score": float(self.r2_score) if self.r2_score is not None else None,
            "derivada_primeira": self.derivada_primeira,
            "derivada_segunda": self.derivada_segunda,
            "validacao_minimo": self.validacao_minimo,
            "data_calculo": self.data_calculo.isoformat() if self.data_calculo else None,
            "nome_produto": self.nome_produto
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

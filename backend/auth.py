"""
Sistema de Autenticação JWT
Gerencia registro, login e validação de tokens
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv

load_dotenv()

# Configurações de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "sua-chave-secreta-super-segura-mude-isso-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

# OAuth2 scheme para extrair token do header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ============= MODELOS PYDANTIC =============

class UserCreate(BaseModel):
    """Modelo para criação de usuário"""
    email: EmailStr
    password: str
    nome_completo: str
    empresa: Optional[str] = None


class UserLogin(BaseModel):
    """Modelo para login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Modelo de resposta de token"""
    access_token: str
    token_type: str
    user: dict


class TokenData(BaseModel):
    """Dados extraídos do token"""
    email: Optional[str] = None
    user_id: Optional[int] = None


class UserResponse(BaseModel):
    """Resposta com dados do usuário (sem senha)"""
    id: int
    email: str
    nome_completo: str
    empresa: Optional[str]
    data_criacao: datetime
    
    class Config:
        from_attributes = True


# ============= FUNÇÕES DE CRIPTOGRAFIA =============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto corresponde ao hash (usa bcrypt diretamente)"""
    # bcrypt tem limite de 72 bytes, truncar se necessário
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """Gera hash da senha (usa bcrypt diretamente)"""
    # bcrypt tem limite de 72 bytes, truncar se necessário
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


# ============= FUNÇÕES JWT =============

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria token JWT com dados do usuário
    
    Args:
        data: Dicionário com dados a incluir no token
        expires_delta: Tempo de expiração customizado
    
    Returns:
        Token JWT assinado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    """
    Decodifica e valida token JWT
    
    Args:
        token: Token JWT a decodificar
    
    Returns:
        TokenData com informações do usuário
    
    Raises:
        HTTPException: Se token inválido ou expirado
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        if email is None or user_id is None:
            raise credentials_exception
        
        token_data = TokenData(email=email, user_id=user_id)
        return token_data
    
    except JWTError:
        raise credentials_exception


# ============= DEPENDÊNCIAS FASTAPI =============

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependência para extrair usuário do token JWT
    Usar em rotas protegidas: @app.get("/rota", dependencies=[Depends(get_current_user)])
    
    Args:
        token: Token JWT extraído do header Authorization
    
    Returns:
        TokenData com dados do usuário autenticado
    """
    return decode_access_token(token)


def get_current_user_id(token_data: TokenData = Depends(get_current_user)) -> int:
    """
    Extrai apenas o ID do usuário autenticado
    
    Args:
        token_data: Dados do token já validado
    
    Returns:
        ID do usuário
    """
    return token_data.user_id

"""
index.py - Entry point para Vercel Serverless Functions
Importa a aplicação FastAPI e a expõe como handler
"""

import sys
import os
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Importar a aplicação FastAPI
from main import app

# Vercel handler
app = app

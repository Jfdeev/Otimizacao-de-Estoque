"""
Script para resetar o banco de dados (DROP + CREATE)
"""

from model import Base, engine

def reset_database():
    """Dropa todas as tabelas e recria"""
    print("🗑️  Dropando todas as tabelas...")
    Base.metadata.drop_all(bind=engine)
    print("✅ Tabelas dropadas!")
    
    print("\n📦 Criando novas tabelas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas com sucesso!")
    print("\nTabelas criadas:")
    print("  - users (com user_id)")
    print("  - calculos (com foreign key para users)")

if __name__ == "__main__":
    reset_database()

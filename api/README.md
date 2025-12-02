# API Directory

Este diretório contém o entry point para as Vercel Serverless Functions.

## 📁 Estrutura

```
api/
└── index.py    # Handler principal que importa a aplicação FastAPI
```

## ⚡ Como Funciona

A Vercel detecta automaticamente arquivos Python na pasta `api/` e os transforma em serverless functions.

O arquivo `index.py` importa a aplicação FastAPI do diretório `backend/` e a expõe como handler.

## 🔧 Configuração

Não é necessário modificar este arquivo. Ele funciona automaticamente com a estrutura definida em `vercel.json`.

## 📚 Mais Informações

- [Vercel Python Runtime](https://vercel.com/docs/runtimes#official-runtimes/python)
- [FastAPI on Vercel](https://vercel.com/guides/using-fastapi-with-vercel)

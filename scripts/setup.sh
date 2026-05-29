#!/bin/bash
# INKU·AI — Script de Setup Inicial
set -e

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║         INKU·AI — Setup Inicial               ║"
echo "║         IP/UNIKIVI · FUNDECIT 2026            ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado. Instale em: https://nodejs.org (v20+)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js v20+ necessário. Versão actual: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Copiar .env
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Ficheiro .env criado a partir de .env.example"
  echo "⚠️  IMPORTANTE: Edite backend/.env com as suas credenciais!"
else
  echo "ℹ️  .env já existe"
fi

# Instalar dependências
echo ""
echo "📦 A instalar dependências Node.js..."
npm install

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║                SETUP CONCLUÍDO!               ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  1. Edite backend/.env com suas credenciais   ║"
echo "║  2. Execute: cd backend && npm run dev        ║"
echo "║  3. Aceda a: http://localhost:5000            ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

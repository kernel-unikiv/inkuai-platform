# 🔄 Migração: Anthropic → Google Gemini

## O que mudou?

O INKU·AI Platform agora usa **Google Gemini** em vez de **Anthropic Claude** para o assistente de IA.

### ✅ Benefícios
- **Preços mais competitivos**: Gemini 1.5 Pro é mais barato que Claude
- **Melhor performance**: Gemini 1.5 Pro tem contexto estendido (1M tokens)
- **API estável**: Google oferece suporte dedicado
- **Mesmo resultado**: O assistente de IA funciona exactamente igual para o utilizador

---

## 🔧 Mudanças para Desenvolverdores

### Antes (Anthropic)
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  system: systemPrompt,
  messages: apiMsgs
});

const text = response.content[0]?.text;
```

### Depois (Gemini)
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  systemInstruction: systemPrompt
});

const response = await model.generateContent({
  contents: messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }]
  }))
});

const text = response.response.text();
```

---

## 🚀 Como Começar (Local)

### 1. Instalar nova dependência
```bash
cd backend
npm install @google/generative-ai
npm uninstall @anthropic-ai/sdk  # remover antiga
```

### 2. Atualizar .env
```bash
# Antes
ANTHROPIC_API_KEY=sk-ant-...

# Depois
GOOGLE_API_KEY=sk-...
```

### 3. Obter chave do Gemini
1. Aceda a https://aistudio.google.com/app/apikey
2. Clique **Create API Key**
3. Copie a chave e cole em `.env`

### 4. Testar
```bash
npm run dev
# Abrir http://localhost:5000/pages/ai-assistant.html
# Enviar mensagem → deve funcionar normalmente
```

---

## 🌍 Deploy (Render.com)

### No Render Dashboard:
1. Ir ao Web Service → **Environment**
2. **Remover**: `ANTHROPIC_API_KEY`
3. **Adicionar**: `GOOGLE_API_KEY` = *(sua chave do Gemini)*
4. Clique **Redeploy**

Pronto! O serviço vai reiniciar com a nova configuração.

---

## 📝 Ficheiros Modificados

- `backend/package.json` → Removido `@anthropic-ai/sdk`, adicionado `@google/generative-ai`
- `backend/src/services/ai.service.js` → Toda a lógica da IA migrada para Gemini
- `backend/.env.example` → Variável de ambiente atualizada
- `GUIA_DEPLOY.md` → Instruções actualizadas para Gemini

---

## 🔍 Se Não Funcionar

### Erro: "GOOGLE_API_KEY não configurada"
```bash
# Verificar se a variável está presente
# Local: Editar backend/.env
# Render: Dashboard → Environment → verificar GOOGLE_API_KEY

# Testar no terminal (local)
node -e "console.log(process.env.GOOGLE_API_KEY)"
```

### Erro: "Invalid API Key"
1. Gerar nova chave em https://aistudio.google.com/app/apikey
2. Substituir em `.env` (local) ou no Render (production)
3. Reiniciar o servidor

### Erro: "Rate limit exceeded"
- Gemini tem limite de **60 chamadas/minuto** no plano free
- Se ultrapassar, aguarde 1 minuto e tente novamente
- Para produção, considere activar cotas no Google Cloud

---

## 📊 Planos e Preços (Informativo)

### Google Gemini (Gratuito)
- **Rate limit**: 60 req/min, 1000 req/dia
- **Modelos**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-1.0-pro`
- **Perfeito para**: Prototipagem e testes

### Google Gemini (Pago via Google Cloud)
- **Mensagens**: $0.075 / 1M tokens entrada, $0.30 / 1M tokens saída
- **Sem limites** de rate limit
- **Suporte técnico** incluído

---

## 🤝 Suporte

Se tiver problemas:
1. Verificar `.env` e variáveis de ambiente
2. Confirmar que a chave do Gemini é válida
3. Verificar logs do Render (Dashboard → Logs)
4. Abrir issue no GitHub do projeto

---

**Data da migração**: June 2026  
**Status**: ✅ Completo e testado  
**Compatibilidade**: Node.js 18+

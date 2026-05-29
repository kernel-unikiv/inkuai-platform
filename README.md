<div align="center">

# 🤖 INKU·AI Platform
### Incubadora de IA · Instituto Politécnico / UNIKIVI · FUNDECIT 2026

[![Node](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=flat-square&logo=bootstrap)](https://getbootstrap.com)
[![Deploy](https://img.shields.io/badge/Deploy-Render.com-blue?style=flat-square)](https://render.com)
[![License](https://img.shields.io/badge/Licença-MIT-green?style=flat-square)](LICENSE)

**Plataforma web de incubação de startups e projectos de Inteligência Artificial**

</div>

---

## ⚡ INÍCIO RÁPIDO — Do ZIP ao Servidor em 5 minutos

### Passo 1 — Extrair e instalar

```bash
# 1. Extrair o ZIP (ou clonar o repositório)
unzip inkuai-platform.zip
cd inkuai-platform

# 2. Entrar na pasta do backend
cd backend

# 3. Instalar todas as dependências
npm install
```

> ⏱️ O `npm install` demora 1-3 minutos na primeira vez.

---

### Passo 2 — Configurar (30 segundos)

```bash
# Copiar o ficheiro de configuração
cp .env.example .env
```

**O ficheiro `.env` já funciona sem editar nada!**  
O sistema usa SQLite automaticamente (base de dados local, sem configuração).

> 💡 Para produção, mais tarde pode adicionar PostgreSQL e MongoDB.  
> Para começar, não precisa de mudar nada.

---

### Passo 3 — Criar contas de teste

```bash
npm run seed
```

Isto cria 3 contas prontas a usar:

| Conta | Email | Password |
|---|---|---|
| 🔴 Administrador | `admin@inkuai.ao` | `Admin@12345` |
| 🟡 Mentor | `nkanga.pedro@ip.unikivi.ao` | `Mentor@12345` |
| 🟢 Estudante | `estudante@ip.unikivi.ao` | `Student@12345` |

---

### Passo 4 — Iniciar o servidor

```bash
npm run dev
```

✅ **Pronto!** Abra o browser em:

```
http://localhost:5000
```

---

## 🚀 COLOCAR ONLINE GRÁTIS (Render.com)

### O que vai fazer:
1. Criar conta GitHub → fazer upload do código
2. Criar conta Render → ligar ao GitHub → deploy automático
3. Em 5 minutos tem a URL pública

---

### Passo A — Criar repositório GitHub

1. Aceda a [github.com](https://github.com) e crie uma conta (se não tiver)
2. Clique **New repository**
3. Nome: `inkuai-platform`
4. Deixe **Public** e clique **Create repository**

Agora, na pasta do projecto no seu computador:

```bash
# (na pasta inkuai-platform, não dentro de backend/)
cd ..  # se estiver dentro de backend/

git init
git add .
git commit -m "INKU·AI Platform - IP/UNIKIVI FUNDECIT 2026"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/inkuai-platform.git
git push -u origin main
```

> Substitua `SEU_USERNAME` pelo seu nome de utilizador GitHub.

---

### Passo B — Criar serviço no Render.com

1. Aceda a [render.com](https://render.com) e crie uma conta gratuita
2. Clique **New +** → **Web Service**
3. Ligue a sua conta GitHub quando pedido
4. Seleccione o repositório `inkuai-platform`
5. Configure assim:

```
Name:          inkuai-platform
Region:        Frankfurt (EU) — mais próximo de Angola
Branch:        main
Root Directory: backend
Build Command: npm install
Start Command: npm run seed && npm start
```

6. Em **Environment Variables**, clique **Add Environment Variable** e adicione:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `JWT_SECRET` | *(clique em Generate — cria automaticamente)* |
| `JWT_REFRESH_SECRET` | *(clique em Generate)* |
| `FRONTEND_URL` | *(deixar vazio por agora)* |

7. Clique **Create Web Service**

⏱️ Aguarde 3-5 minutos enquanto o Render faz o deploy...

8. Quando aparecer **Your service is live** 🎉, a URL será:
```
https://inkuai-platform.onrender.com
```

---

### Passo C — Actualizar URL do Frontend

1. No Render Dashboard, vá a **Environment**
2. Edite `FRONTEND_URL` e coloque a URL do seu serviço:
   ```
   https://inkuai-platform.onrender.com
   ```
3. Clique **Save Changes** → o Render faz redeploy automático

---

### ✅ A plataforma está online!

Aceda a `https://inkuai-platform.onrender.com` e faça login com as contas de teste.

> ⚠️ **Nota Render Free:** O serviço gratuito dorme após 15 minutos de inactividade.  
> A primeira vez que aceder pode demorar 30-60 segundos a "acordar".  
> Para uso académico/FUNDECIT isto é aceitável.

---

## 🗂️ ESTRUTURA DO PROJECTO

```
inkuai-platform/
├── backend/                    ← Servidor Node.js (aqui faz npm install)
│   ├── src/
│   │   ├── config/             ← Configuração DB (SQLite auto ou PostgreSQL)
│   │   ├── models/sql/         ← Tabelas: User, Startup, Project, Team...
│   │   ├── controllers/        ← Lógica das rotas
│   │   ├── services/           ← Regras de negócio
│   │   ├── routes/             ← Endpoints da API
│   │   ├── middleware/         ← Segurança, autenticação JWT
│   │   └── seeders/            ← Cria contas de teste
│   ├── server.js               ← Entrada do servidor
│   ├── .env.example            ← Template de configuração
│   └── package.json
│
├── frontend/public/            ← Interface web (páginas HTML)
│   ├── pages/
│   │   ├── index.html          ← Landing page
│   │   ├── login.html          ← Login
│   │   ├── register.html       ← Registo
│   │   ├── dashboard.html      ← Dashboard principal
│   │   ├── projects.html       ← Lista de projectos
│   │   ├── project-detail.html ← Detalhes do projecto
│   │   ├── startups.html       ← Lista de startups
│   │   ├── startup-detail.html ← Detalhes da startup
│   │   ├── sandbox.html        ← Editor + sandbox de código
│   │   ├── profile.html        ← Perfil do utilizador
│   │   └── admin/              ← Painel de administração
│   └── assets/
│       ├── css/main.css        ← Estilos dark theme
│       └── js/                 ← JavaScript das páginas
│
├── docker-compose.yml          ← Para usar com Docker
├── render.yaml                 ← Configuração Render.com
└── README.md                   ← Este ficheiro
```

---

## 🔌 API — ENDPOINTS PRINCIPAIS

Base URL: `http://localhost:5000/api/v1` (local) ou `https://SEU-APP.onrender.com/api/v1`

### Autenticação (sem token)

```bash
# Registar nova conta
POST /auth/register
{"name":"João","email":"joao@unikivi.ao","password":"Pass@1234","role":"student"}

# Login
POST /auth/login
{"email":"admin@inkuai.ao","password":"Admin@12345"}
# → retorna: {"token":"eyJ...","user":{...}}

# Ver perfil (com token)
GET /auth/me
Header: Authorization: Bearer eyJ...
```

### Projectos

```bash
# Listar projectos
GET /projects

# Criar projecto
POST /projects
{"title":"Detector de Doenças Angola","description":"...","type":"ai_model"}

# Submeter para avaliação
POST /projects/:id/submit
```

### Startups

```bash
GET  /startups          # listar
POST /startups          # criar
GET  /startups/:id      # detalhes + equipa
POST /startups/:id/members  # adicionar membro
```

### Sandbox de IA

```bash
# Executar código Python
POST /sandbox/execute
{"code":"print('Olá Angola!')","project_id":"UUID","type":"python"}

# Ver histórico
GET /sandbox/history/:projectId
```

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Desenvolvimento (reinicia ao salvar ficheiros)
npm run dev

# Produção
npm start

# Criar contas de teste
npm run seed

# Ver logs em tempo real
tail -f logs/combined.log
```

---

## ❓ PROBLEMAS FREQUENTES

### "Cannot find module 'sqlite3'"
```bash
npm install sqlite3
# Se falhar no Windows:
npm install sqlite3 --build-from-source
```

### "Port 5000 already in use"
```bash
# Linux/Mac
lsof -i :5000 | grep LISTEN
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Render: "Build failed"
- Confirme que **Root Directory** está configurado como `backend`
- Confirme que **Build Command** é `npm install`
- Confirme que **Start Command** é `npm run seed && npm start`

### Login falha após deploy
- Certifique-se que `JWT_SECRET` está definido nas Environment Variables do Render
- Use o botão **Generate** do Render para criar automaticamente

### Página branca / 404
- O frontend está em `frontend/public/pages/`
- A URL correcta é `https://SEU-APP.onrender.com/pages/index.html`
- Ou aceda directamente a `https://SEU-APP.onrender.com` (redireciona)

---

## 📊 ALINHAMENTO FUNDECIT

**Candidatura:** Edital FUNDECIT Nº 1/2026 — Tipo 1  
**Orçamento estimado:** Kz 25.898.600 (dentro do tecto de Kz 29.744.077,41)  
**Duração:** 24 meses

| Indicador FUNDECIT | Meta | Medido como |
|---|---|---|
| Utilizadores registados | ≥ 100 | Tabela `users` no admin |
| Projectos activos | ≥ 10 | Tabela `projects` status=approved |
| Artigo indexado | ≥ 1 | Manual |
| Protótipos transferíveis | ≥ 3 | Projectos status=completed |

---

## 👥 EQUIPA

| Nome | Função | Email |
|---|---|---|
| **Mestre Nkanga Pedro** | Investigador Principal | nkanga.pedro@ip.unikivi.ao |
| [Docente A] | Co-Investigador Software | a.docente@ip.unikivi.ao |
| [Docente B] | Co-Investigadora IA | b.docente@ip.unikivi.ao |
| [Técnico A] | Gestor Qualificado (GQP) | t.gestor@ip.unikivi.ao |
| [Estudante A] | Dev FullStack / Bolseiro | est.a@ip.unikivi.ao |
| [Estudante B] | Analista Dados / Bolseiro | est.b@ip.unikivi.ao |
| [Estudante C] | Engenheiro IA / Bolseiro | est.c@ip.unikivi.ao |

---

<div align="center">

**INKU·AI Platform** · Instituto Politécnico da Universidade Kimpa Vita · Mbanza Kongo, Angola  
Mestre Nkanga Pedro · Data Science & AI-Based Decision Making · 2026

*"Um objectivo sem um plano é apenas um desejo." — Antoine de Saint-Exupéry*

</div>
# inkuai-platform
# inkuai-platform

# 🚀 GUIA DE DEPLOY COMPLETO — INKU·AI
## Do computador ao ar em 15 minutos

---

## PARTE 1 — TESTAR LOCALMENTE (antes de fazer deploy)

### 1.1 Instalar Node.js (se não tiver)

Aceda a https://nodejs.org e baixe a versão **LTS (v20)**

Verificar instalação:
```bash
node --version    # deve mostrar v20.x.x
npm --version     # deve mostrar 9.x.x ou superior
```

### 1.2 Instalar e correr o projecto

```bash
# Entrar na pasta backend
cd inkuai-platform/backend

# Instalar dependências (aguardar 1-3 min)
npm install

# Copiar configuração
cp .env.example .env

# Criar contas de teste
npm run seed

# Iniciar servidor
npm run dev
```

Deve ver no terminal:
```
🚀 INKU·AI Platform iniciada!
📡 API: http://localhost:5000/api/v1
🌍 App: http://localhost:5000/pages/index.html
```

Abra o browser em: **http://localhost:5000/pages/index.html**

### 1.3 Testar o login

1. Clique em "Entrar"
2. Email: `admin@inkuai.ao`
3. Password: `Admin@12345`
4. Deve entrar no Dashboard ✅

---

## PARTE 2 — SUBIR CÓDIGO PARA GITHUB

### 2.1 Criar conta GitHub (se não tiver)

1. Aceda a https://github.com
2. Clique **Sign up**
3. Preencha email, password e username
4. Confirme o email

### 2.2 Criar repositório

1. Após login, clique no **+** no canto superior direito
2. Clique **New repository**
3. Preencha:
   - **Repository name:** `inkuai-platform`
   - **Description:** `INKU·AI — Incubadora de IA IP/UNIKIVI FUNDECIT 2026`
   - Seleccione **Public**
4. **NÃO** marque "Add a README file"
5. Clique **Create repository**

### 2.3 Fazer upload do código

Na pasta `inkuai-platform/` (não dentro de `backend/`):

```bash
# Inicializar git
git init

# Adicionar todos os ficheiros
git add .

# Primeiro commit
git commit -m "INKU·AI Platform v1.0.0 - IP/UNIKIVI FUNDECIT 2026"

# Definir branch principal
git branch -M main

# Ligar ao GitHub (substitua SEU_USERNAME)
git remote add origin https://github.com/SEU_USERNAME/inkuai-platform.git

# Enviar código
git push -u origin main
```

Quando pedir username/password:
- **Username:** o seu username GitHub
- **Password:** use um **Personal Access Token** (não a password da conta)

Para criar token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → Seleccione `repo` → Generate token
3. Copie o token e use como password

### 2.4 Verificar

Abra https://github.com/SEU_USERNAME/inkuai-platform  
Deve ver todos os ficheiros do projecto. ✅

---

## PARTE 3 — DEPLOY NO RENDER.COM (GRÁTIS)

### 3.1 Criar conta Render

1. Aceda a https://render.com
2. Clique **Get Started for Free**
3. Clique **Continue with GitHub** (recomendado — liga automaticamente)
4. Autorize o Render a aceder ao GitHub

### 3.2 Criar Web Service

1. No dashboard do Render, clique **New +**
2. Seleccione **Web Service**
3. Na lista de repositórios, encontre **inkuai-platform** e clique **Connect**

### 3.3 Configurar o serviço

Preencha os campos:

```
Name:           inkuai-platform
Region:         Frankfurt (EU)
Branch:         main
Root Directory: backend
Runtime:        Node
Build Command:  npm install
Start Command:  npm run seed && npm start
```

**⚠️ IMPORTANTE: Root Directory deve ser `backend`**

### 3.4 Definir variáveis de ambiente

Clique em **Advanced** e depois **Add Environment Variable**:

| Key | Value | Notas |
|---|---|---|
| `NODE_ENV` | `production` | escreva exactamente assim |
| `PORT` | `5000` | porta do servidor |
| `JWT_SECRET` | *(clique Generate)* | o Render gera automaticamente |
| `JWT_REFRESH_SECRET` | *(clique Generate)* | o Render gera automaticamente |

**Não precisa de mais nada para começar!**  
O SQLite funciona automaticamente sem configuração de base de dados.

### 3.5 Criar o serviço

Clique **Create Web Service** no final da página.

O Render vai:
1. Clonar o repositório do GitHub
2. Executar `npm install`
3. Executar `npm run seed` (cria as contas)
4. Executar `npm start`

Isto demora **3-8 minutos** na primeira vez.

### 3.6 Acompanhar o deploy

No painel do Render, clique em **Logs** para ver o progresso:

```
==> Cloning from https://github.com/SEU_USERNAME/inkuai-platform
==> Running build command: npm install
==> Running start command: npm run seed && npm start
...
✅ Contas de teste criadas!
🚀 INKU·AI Platform iniciada!
```

Quando aparecer **Live** no topo da página:

```
https://inkuai-platform.onrender.com   ← a sua URL pública
```

---

## PARTE 4 — VERIFICAR QUE ESTÁ A FUNCIONAR

### 4.1 Testar health check

Abra no browser:
```
https://inkuai-platform.onrender.com/health
```

Deve ver:
```json
{
  "status": "healthy",
  "platform": "INKU·AI",
  "institution": "IP/UNIKIVI"
}
```

### 4.2 Testar a plataforma

1. Abra: `https://inkuai-platform.onrender.com/pages/index.html`
2. Deve ver a landing page do INKU·AI
3. Clique **Entrar**
4. Login com `admin@inkuai.ao` / `Admin@12345`
5. Deve entrar no Dashboard ✅

### 4.3 Testar a API directamente

```bash
# Testar login via API
curl -X POST https://inkuai-platform.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inkuai.ao","password":"Admin@12345"}'
```

---

## PARTE 5 — APÓS O DEPLOY (manutenção)

### Actualizar o código

Sempre que fizer alterações no código:

```bash
git add .
git commit -m "Descrição das alterações"
git push origin main
```

O Render detecta o push e faz redeploy automático em 2-3 minutos.

### Ver logs de produção

No Render Dashboard → Seleccione o serviço → **Logs**

### Reiniciar o servidor

Render Dashboard → Seleccione o serviço → **Manual Deploy** → **Deploy latest commit**

---

## PARTE 6 — MELHORAR (OPCIONAL, DEPOIS DO INÍCIO)

### Adicionar PostgreSQL (base de dados mais robusta)

1. No Render: **New +** → **PostgreSQL**
2. Nome: `inkuai-db`
3. Plano: Free
4. Clique **Create Database**
5. Copie a **Internal Database URL**
6. No Web Service → **Environment** → Adicione:
   - `DATABASE_URL` = *(a URL copiada)*
7. Redeploy

### Adicionar MongoDB Atlas (para métricas de IA)

1. Aceda a https://mongodb.com/cloud/atlas
2. Crie conta gratuita → **Build a Database** → **M0 Free**
3. Região: Europe (Frankfurt)
4. **Database Access** → Add New User (anote username e password)
5. **Network Access** → Add IP Address → `0.0.0.0/0`
6. **Databases** → Connect → Drivers → Copie a URI
7. Substitua `<password>` na URI pela password criada
8. No Render → Environment → Adicione:
   - `MONGODB_URI` = *(a URI copiada)*
9. Redeploy

### Domínio personalizado (ex: inkuai.ip.unikivi.ao)

1. Render Dashboard → Serviço → **Settings** → **Custom Domains**
2. Adicione o domínio
3. Configure o DNS no seu domínio apontando para o Render

---

## RESUMO RÁPIDO

```
1. npm install      → instala dependências
2. npm run seed     → cria contas de teste  
3. npm run dev      → inicia localmente em localhost:5000
4. git push         → envia para GitHub
5. Render.com       → faz deploy automático
```

**URL final:** https://inkuai-platform.onrender.com

**Credenciais admin:** admin@inkuai.ao / Admin@12345

---

*INKU·AI Platform · IP/UNIKIVI · Candidatura FUNDECIT Edital Nº 1/2026*

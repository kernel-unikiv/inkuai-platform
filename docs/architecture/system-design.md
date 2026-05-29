# INKU·AI — Arquitectura do Sistema

## Visão Geral

A plataforma INKU·AI adopta uma arquitectura MVC em camadas com separação clara entre frontend, backend, base de dados e sandbox.

## Camadas

### 1. Presentation Layer (Frontend)
- HTML5 + Bootstrap 5 + JavaScript ES6 Vanilla
- Comunicação com o backend via REST API (Fetch API)
- Autenticação com JWT armazenado em localStorage
- Layout responsivo com sidebar, topbar e cards

### 2. Application Layer (Backend)
- Node.js 20 + Express.js 4
- Arquitectura MVC: Routes → Controllers → Services → Models
- Middleware: authenticate (JWT), authorize (RBAC), validate (Joi), rateLimit, error handler
- API RESTful com respostas padronizadas via ApiResponse util

### 3. Data Layer (Bases de Dados)
- **PostgreSQL** (via Sequelize ORM): dados estruturados e relacionais
- **MongoDB** (via Mongoose ODM): logs, execuções sandbox, métricas IA

### 4. Sandbox Layer (Execução Segura)
- Docker containers isolados (sem rede, read-only, memória limitada)
- Python 3.11 com bibliotecas científicas (numpy, pandas, scikit-learn)
- Timeout de 30s, máx 128MB RAM

### 5. Infrastructure Layer
- Render.com (hosting backend gratuito)
- Supabase (PostgreSQL gratuito)
- MongoDB Atlas (MongoDB gratuito)
- GitHub (código + CI/CD)
- Docker (sandbox)

## Fluxo de Autenticação JWT

```
Cliente → POST /auth/login → AuthController → AuthService
       → Verificar email+password → bcrypt.compare
       → jwt.sign (access 7d + refresh 30d)
       → Retornar tokens ao cliente
       → Cliente guarda em localStorage
       → Todas as rotas protegidas: Authorization: Bearer <token>
       → authenticate middleware: jwt.verify → req.user
```

## Segurança OWASP Top 10

| Ameaça | Mitigação |
|---|---|
| A01 Broken Access Control | JWT + RBAC (authorize middleware) |
| A02 Cryptographic Failures | bcrypt(12) + HTTPS obrigatório |
| A03 Injection | Joi validation + mongoSanitize + Sequelize ORM |
| A04 Insecure Design | Rate limiting + Sandbox network isolation |
| A05 Misconfiguration | Helmet.js + CSP + CORS restrito |
| A07 Auth Failures | Rate limit login (10/15min) + JWT expiry |
| A10 SSRF | Sandbox: network=none + Docker CapDrop ALL |

## Padrões de Código

- Todas as respostas API seguem: `{ success, timestamp, data/message }`
- Erros tratados por `error.middleware.js` global
- Logs via Winston (ficheiro + console)
- Validação de input com Joi (schemas em `/validators`)
- Services contêm toda a business logic (Controllers apenas delegam)

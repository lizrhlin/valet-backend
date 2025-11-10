# Valet Backend

Backend API para Valet - Fastify + TypeScript + Prisma + PostgreSQL

## 🚀 Stack

- **Framework**: Fastify 5.x
- **Linguagem**: TypeScript
- **Validação**: Zod + fastify-type-provider-zod
- **Auth**: JWT (@fastify/jwt)
- **Database**: PostgreSQL + Prisma ORM
- **Logs**: Pino (JSON estruturado)
- **Segurança**: Helmet, Rate Limit, CORS
- **Observabilidade**: Health checks + Métricas Prometheus
- **Testes**: Vitest
- **Code Quality**: ESLint + Prettier

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar .env.example para .env
cp .env.example .env

# Editar .env com suas configurações
```

## 🗄️ Database Setup

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar migration
npm run prisma:migrate

# Abrir Prisma Studio (GUI)
npm run prisma:studio
```

## 🏃 Executar Localmente

```bash
# Modo desenvolvimento (com watch)
npm run dev

# Build
npm run build

# Produção
npm start
```

## 🐳 Docker

```bash
# Subir todos os serviços (app + postgres)
npm run docker:up

# ou
docker-compose up -d

# Parar serviços
npm run docker:down
```

A aplicação estará disponível em:
- API: http://localhost:3000
- Docs (Swagger): http://localhost:3000/docs
- Métricas: http://localhost:3000/metrics

## 🧪 Testes

```bash
# Rodar testes
npm test

# Com coverage
npm run test:coverage
```

## 📝 Endpoints

### Health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (verifica DB)

### Auth
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Login

### Users (autenticado)
- `GET /users/me` - Obter usuário atual
- `PATCH /users/me` - Atualizar usuário atual

## 🔒 Segurança

- Helmet (security headers)
- Rate limiting (100 req/15min)
- CORS restrito
- Payload size limit (1MB)
- JWT stateless
- Passwords com bcrypt (10 rounds)

## 📊 Observabilidade

- **Health checks**: `/health/live`, `/health/ready`
- **Métricas Prometheus**: `/metrics`
- **Logs estruturados**: Pino (JSON em produção, pretty em dev)
- **OpenAPI Docs**: `/docs`

## 📁 Estrutura

```
src/
├─ server.ts           # Entry point
├─ app.ts              # App configuration
├─ plugins/            # Fastify plugins (env, db, security, etc)
├─ routes/             # HTTP routes
├─ schemas/            # Zod schemas
├─ services/           # Business logic
├─ utils/              # Helpers (jwt, etc)
└─ types/              # TypeScript declarations
```

## 🔧 Scripts Disponíveis

```json
"dev": "tsx watch src/server.ts",
"build": "tsc",
"start": "node dist/server.js",
"test": "vitest",
"lint": "eslint . --ext .ts",
"format": "prettier --write \"src/**/*.ts\"",
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"docker:up": "docker-compose up -d",
"docker:down": "docker-compose down"
```

## 🌍 Variáveis de Ambiente

Ver `.env.example` para lista completa.

Principais:
- `DATABASE_URL` - Connection string PostgreSQL
- `JWT_SECRET` - Secret para JWT (min 32 chars)
- `PORT` - Porta do servidor (default: 3000)
- `NODE_ENV` - Ambiente (development/production)

## 📄 License

ISC

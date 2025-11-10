# 📚 API Documentation - Backend Liz

## Base URL
```
Development: http://localhost:3000
Production: https://api.liz-app.com
```

## 🔐 Autenticação

Todas as rotas protegidas requerem header:
```
Authorization: Bearer <token>
```

---

## 📋 Rotas Disponíveis (47 Total)

### 🔑 Autenticação (4 rotas)

#### POST /auth/register
Criar nova conta de usuário
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "Senha@123",
  "phone": "(11) 98765-4321",
  "userType": "CLIENT" // ou "PROFESSIONAL"
}
```

#### POST /auth/login
Fazer login
```json
{
  "email": "joao@example.com",
  "password": "Senha@123"
}
```
**Response:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { ... }
}
```

#### POST /auth/refresh
Renovar access token
```json
{
  "refreshToken": "eyJhbGci..."
}
```

#### POST /auth/logout
Fazer logout (invalida refresh token)

---

### 👤 Usuários (2 rotas)

#### GET /users/me
Buscar perfil do usuário autenticado
**Headers:** `Authorization: Bearer <token>`

#### PATCH /users/me
Atualizar perfil
```json
{
  "name": "João Silva Santos",
  "phone": "(11) 99999-9999",
  "avatar": "https://..."
}
```

---

### 📂 Categorias e Serviços (5 rotas)

#### GET /api/categories
Listar todas as categorias
**Query params:** `?isActive=true`

#### GET /api/categories/:id
Buscar categoria por ID

#### GET /api/categories/:id/subcategories
Listar subcategorias de uma categoria

#### GET /api/subcategories
Listar todas as subcategorias
**Query params:** `?categoryId=1&isActive=true`

#### GET /api/subcategories/:id
Buscar subcategoria por ID

---

### 👷 Profissionais (3 rotas)

#### GET /api/professionals
Buscar profissionais com filtros avançados

**Query params:**
- `subcategoryId` - Filtrar por serviço específico
- `categoryId` - Filtrar por categoria
- `minRating` - Rating mínimo (1-5)
- `available` - Apenas disponíveis (true/false)
- `sortBy` - Ordenar por: `rating`, `servicesCompleted`
- `page` - Número da página (default: 1)
- `limit` - Itens por página (default: 20)

**Exemplo:**
```
GET /api/professionals?subcategoryId=1&minRating=4.5&page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "clxxx",
      "name": "João Eletricista",
      "rating": 4.8,
      "reviewCount": 45,
      "servicesCompleted": 120,
      "available": true,
      "subcategories": [
        {
          "subcategoryId": 1,
          "name": "Troca de lâmpadas",
          "price": 50.00,
          "estimatedDuration": 30
        }
      ]
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

#### GET /api/professionals/:id
Buscar profissional por ID (com todos os detalhes)

#### GET /api/professionals/:id/availability
Buscar disponibilidade do profissional
**Query params:** `?date=2025-11-15`

---

### 📅 Agendamentos (6 rotas)

#### POST /appointments
Criar novo agendamento
```json
{
  "professionalId": "clxxx",
  "subcategoryId": "1",
  "addressId": "clyyy",
  "scheduledDate": "2025-11-15T00:00:00Z",
  "scheduledTime": "14:00",
  "notes": "Preciso trocar 3 lâmpadas"
}
```

#### GET /appointments
Listar agendamentos do usuário
**Query params:**
- `status` - Filtrar por status: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 20)

**Response:**
```json
{
  "data": [...],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### GET /appointments/:id
Buscar agendamento por ID

#### PATCH /appointments/:id/cancel
Cancelar agendamento (cliente ou profissional)
```json
{
  "reason": "Preciso remarcar para outro dia"
}
```

#### PATCH /appointments/:id/confirm
Confirmar agendamento (apenas profissional)

#### PATCH /appointments/:id/complete
Marcar serviço como completado (apenas profissional)

---

### 📍 Endereços (6 rotas)

#### GET /user/addresses
Listar endereços do usuário

#### GET /user/addresses/:id
Buscar endereço por ID

#### POST /user/addresses
Criar novo endereço
```json
{
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Apto 45",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01310-100",
  "isDefault": true,
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

#### PUT /user/addresses/:id
Atualizar endereço
```json
{
  "number": "125",
  "complement": "Apto 46"
}
```

#### DELETE /user/addresses/:id
Deletar endereço

#### PATCH /user/addresses/:id/set-default
Marcar endereço como padrão

---

### ⭐ Avaliações (6 rotas) 🆕

#### POST /reviews
Criar avaliação para um agendamento completado
```json
{
  "appointmentId": "clxxx",
  "rating": 5,
  "comment": "Excelente serviço! Muito profissional.",
  "punctuality": 5,
  "quality": 5,
  "communication": 5
}
```

#### GET /reviews
Listar avaliações com filtros
**Query params:**
- `professionalId` - Filtrar por profissional
- `clientId` - Filtrar por cliente
- `minRating` - Rating mínimo (1-5)
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 10)

#### GET /reviews/:id
Buscar avaliação por ID

#### GET /reviews/professional/:professionalId
Listar todas as avaliações de um profissional

**Response:**
```json
{
  "data": [
    {
      "id": "clxxx",
      "rating": 5,
      "comment": "Ótimo trabalho!",
      "punctuality": 5,
      "quality": 5,
      "communication": 5,
      "createdAt": "2025-11-10T20:00:00Z",
      "client": {
        "id": "clyyy",
        "name": "João Silva",
        "avatar": "https://..."
      },
      "appointment": {
        "subcategory": {
          "id": 1,
          "name": "Troca de lâmpadas"
        }
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

#### GET /reviews/professional/:professionalId/stats
Obter estatísticas de avaliação do profissional

**Response:**
```json
{
  "professionalId": "clxxx",
  "averageRating": 4.8,
  "totalReviews": 45,
  "ratingDistribution": {
    "1": 0,
    "2": 1,
    "3": 3,
    "4": 10,
    "5": 31
  },
  "averagePunctuality": 4.9,
  "averageQuality": 4.8,
  "averageCommunication": 4.7
}
```

#### DELETE /reviews/:id
Deletar avaliação (apenas autor ou admin)

---

### 🔔 Notificações (9 rotas) 🆕

#### GET /notifications
Listar notificações do usuário

**Query params:**
- `type` - Filtrar por tipo: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `BOOKING`, `CHAT`, `REVIEW`, `SYSTEM`
- `isRead` - Filtrar por lidas: `true` ou `false`
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "clxxx",
      "type": "BOOKING",
      "title": "Agendamento Confirmado",
      "message": "Seu agendamento foi confirmado pelo profissional",
      "isRead": false,
      "createdAt": "2025-11-10T20:00:00Z",
      "data": {
        "appointmentId": "clyyy"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### GET /notifications/:id
Buscar notificação por ID

#### GET /notifications/unread
Listar apenas notificações não lidas
**Query params:** `?limit=20`

#### GET /notifications/stats
Obter estatísticas de notificações

**Response:**
```json
{
  "total": 50,
  "unread": 5,
  "byType": {
    "INFO": 10,
    "SUCCESS": 5,
    "WARNING": 2,
    "ERROR": 1,
    "BOOKING": 20,
    "CHAT": 8,
    "REVIEW": 3,
    "SYSTEM": 1
  }
}
```

#### POST /notifications
Criar notificação (apenas admin)
```json
{
  "userId": "clxxx",
  "type": "SYSTEM",
  "title": "Manutenção programada",
  "message": "O sistema estará em manutenção amanhã das 2h às 4h",
  "data": {
    "maintenanceStart": "2025-11-11T02:00:00Z",
    "maintenanceEnd": "2025-11-11T04:00:00Z"
  }
}
```

#### PATCH /notifications/:id/read
Marcar notificação como lida

#### PATCH /notifications/read-all
Marcar todas notificações como lidas
**Body (opcional):**
```json
{
  "type": "BOOKING"
}
```

#### DELETE /notifications/:id
Deletar notificação

#### DELETE /notifications/clear-read
Deletar todas as notificações já lidas

---

### ⭐ Favoritos (6 rotas)

#### GET /favorites
Listar profissionais favoritos do usuário

**Response:**
```json
[
  {
    "favoriteId": "clxxx",
    "createdAt": "2025-11-10T20:00:00Z",
    "professional": {
      "id": "clyyy",
      "name": "João Eletricista",
      "rating": 4.8,
      "subcategories": [...]
    }
  }
]
```

#### GET /favorites/check/:professionalId
Verificar se profissional está nos favoritos

**Response:**
```json
{
  "isFavorite": true
}
```

#### POST /favorites
Adicionar profissional aos favoritos
```json
{
  "professionalId": "clxxx"
}
```

#### DELETE /favorites/:professionalId
Remover profissional dos favoritos

#### POST /favorites/toggle
Toggle favorito (adiciona se não existe, remove se existe)
```json
{
  "professionalId": "clxxx"
}
```

**Response:**
```json
{
  "isFavorite": true,
  "message": "Added to favorites"
}
```

#### DELETE /favorites/all
Limpar todos os favoritos

---

## 🔄 Status de Agendamento

| Status | Descrição | Pode Avaliar? |
|--------|-----------|---------------|
| `PENDING` | Aguardando confirmação do profissional | ❌ |
| `CONFIRMED` | Confirmado pelo profissional | ❌ |
| `IN_PROGRESS` | Serviço em andamento | ❌ |
| `COMPLETED` | Serviço finalizado | ✅ |
| `CANCELLED` | Cancelado | ❌ |
| `REJECTED` | Rejeitado pelo profissional | ❌ |

## 📊 Tipos de Notificação

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `INFO` | Informações gerais | "Novo serviço disponível" |
| `SUCCESS` | Ações bem-sucedidas | "Pagamento confirmado" |
| `WARNING` | Avisos importantes | "Serviço iniciado" |
| `ERROR` | Erros e problemas | "Pagamento recusado" |
| `BOOKING` | Agendamentos | "Agendamento confirmado" |
| `CHAT` | Mensagens | "Nova mensagem recebida" |
| `REVIEW` | Avaliações | "Você recebeu uma avaliação" |
| `SYSTEM` | Sistema | "Manutenção programada" |

---

## 🎯 Filtros Avançados

### Busca de Profissionais

**Por Serviço:**
```
GET /api/professionals?subcategoryId=1
```

**Por Categoria:**
```
GET /api/professionals?categoryId=1
```

**Por Rating:**
```
GET /api/professionals?minRating=4.5
```

**Apenas Disponíveis:**
```
GET /api/professionals?available=true
```

**Ordenar por Rating:**
```
GET /api/professionals?sortBy=rating&order=desc
```

**Combinar Filtros:**
```
GET /api/professionals?categoryId=1&minRating=4.0&available=true&sortBy=rating&page=1&limit=20
```

---

## 📊 Paginação

Todas as rotas que retornam listas suportam paginação:

**Request:**
```
GET /api/professionals?page=2&limit=10
```

**Response:**
```json
{
  "data": [...],
  "total": 45,
  "page": 2,
  "limit": 10,
  "totalPages": 5
}
```

---

## ⚠️ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 500 | Erro interno do servidor |

---

## 🧪 Testando a API

### Com cURL:

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@teste.com","password":"Cliente@123"}'
```

**Buscar Categorias:**
```bash
curl http://localhost:3000/api/categories
```

**Buscar Profissionais (autenticado):**
```bash
curl http://localhost:3000/api/professionals?subcategoryId=1 \
  -H "Authorization: Bearer <seu_token>"
```

### Com Swagger UI:

Acesse: `http://localhost:3000/docs`

---

## 📝 Notas Importantes

1. **Autenticação JWT:**
   - Access token expira em 7 dias
   - Refresh token expira em 30 dias
   - Use `/auth/refresh` para renovar tokens

2. **Validação de Dados:**
   - Todos os campos são validados com Zod
   - Senhas devem ter: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial
   - CPF validado no formato brasileiro
   - CEP validado (8 dígitos)
   - Telefone no formato brasileiro

3. **Segurança:**
   - Senhas são hash com bcrypt
   - Headers CORS configurados
   - Rate limiting em produção
   - Helmet.js para headers de segurança
   - Apenas clientes podem avaliar agendamentos completados
   - Apenas o autor da avaliação ou admin pode deletá-la

4. **Performance:**
   - Queries otimizadas com índices
   - Paginação em todas as listas
   - Cache de queries frequentes
   - Recálculo automático de ratings ao criar/deletar avaliações

5. **Sistema de Avaliações:**
   - Apenas agendamentos completados podem ser avaliados
   - Cada agendamento pode ter apenas uma avaliação
   - Rating geral (obrigatório) + aspectos específicos (opcionais):
     - Pontualidade
     - Qualidade
     - Comunicação
   - Rating do profissional é recalculado automaticamente

6. **Sistema de Notificações:**
   - 8 tipos diferentes de notificações
   - Filtros por tipo e status de leitura
   - Estatísticas detalhadas
   - Marcar como lida individualmente ou em lote
   - Limpar notificações lidas

---

**Documentação gerada em:** 10 de novembro de 2025 - 21:00 UTC  
**Versão da API:** 1.0.0  
**Total de Rotas:** 47 rotas funcionais ✅
**Status:** MVP 100% Completo 🎉

# 🔄 Refatoração do Sistema de Reviews

## Problema Atual

Temos 2 tabelas separadas:
- `Review` (cliente → profissional)
- `ProfessionalReview` (profissional → cliente)

E 4 relacionamentos confusos no User:
- `reviewsAsClient`
- `reviewsReceivedAsClient`
- `reviewsAsProfessional`
- `reviewsGivenAsProfessional`

## Solução Proposta

### 1. Unificar em uma única tabela `Review`

```prisma
enum ReviewRole {
  CLIENT
  PROFESSIONAL
}

model Review {
  id             String      @id @default(cuid())
  
  // Relacionamento com agendamento
  appointmentId  String
  appointment    Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  
  // Quem avaliou (FROM)
  fromUserId     String
  fromUser       User        @relation("ReviewsGiven", fields: [fromUserId], references: [id])
  roleFrom       ReviewRole  // CLIENT ou PROFESSIONAL
  
  // Quem foi avaliado (TO)
  toUserId       String
  toUser         User        @relation("ReviewsReceived", fields: [toUserId], references: [id])
  roleTo         ReviewRole  // CLIENT ou PROFESSIONAL
  
  // Avaliação
  rating         Int         // 1-5 estrelas
  comment        String?     @db.Text
  
  // Critérios específicos (opcionais)
  punctuality    Int?        // 1-5
  quality        Int?        // 1-5 (para profissionais)
  communication  Int?        // 1-5
  respectful     Int?        // 1-5 (para clientes)
  payment        Int?        // 1-5 (para clientes)
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@map("reviews")
  @@unique([appointmentId, fromUserId]) // Cada user avalia o appointment 1x
  @@index([toUserId])
  @@index([fromUserId])
  @@index([rating])
}
```

### 2. Atualizar User model

```prisma
model User {
  // ... outros campos
  
  // Reviews (simplificado)
  reviewsGiven    Review[] @relation("ReviewsGiven")
  reviewsReceived Review[] @relation("ReviewsReceived")
  
  // Remover:
  // reviewsAsClient
  // reviewsReceivedAsClient
  // reviewsAsProfessional
  // reviewsGivenAsProfessional
}
```

### 3. Queries no Backend

```typescript
// Buscar avaliações RECEBIDAS por um profissional
const professionalReviews = await prisma.review.findMany({
  where: {
    toUserId: professionalId,
    roleTo: 'PROFESSIONAL'
  },
  include: {
    fromUser: {
      select: { name: true, avatar: true }
    }
  }
});

// Buscar avaliações RECEBIDAS por um cliente
const clientReviews = await prisma.review.findMany({
  where: {
    toUserId: clientId,
    roleTo: 'CLIENT'
  }
});

// Buscar avaliações que EU DEI
const myReviews = await prisma.review.findMany({
  where: {
    fromUserId: myUserId
  }
});

// Calcular rating médio de um usuário
const avgRating = await prisma.review.aggregate({
  where: { toUserId: userId },
  _avg: { rating: true },
  _count: true
});
```

## Passos da Migração

### 1. Criar nova tabela unificada
```sql
-- Já está no schema acima
```

### 2. Migrar dados existentes
```sql
-- Migrar reviews de clientes → profissionais
INSERT INTO reviews_new (id, appointmentId, fromUserId, toUserId, roleFrom, roleTo, rating, comment, punctuality, quality, communication, createdAt, updatedAt)
SELECT 
  id,
  appointmentId,
  clientId as fromUserId,
  professionalId as toUserId,
  'CLIENT' as roleFrom,
  'PROFESSIONAL' as roleTo,
  rating,
  comment,
  punctuality,
  quality,
  communication,
  createdAt,
  updatedAt
FROM reviews;

-- Migrar reviews de profissionais → clientes
INSERT INTO reviews_new (id, appointmentId, fromUserId, toUserId, roleFrom, roleTo, rating, comment, punctuality, respectful, payment, createdAt, updatedAt)
SELECT 
  id,
  appointmentId,
  professionalId as fromUserId,
  clientId as toUserId,
  'PROFESSIONAL' as roleFrom,
  'CLIENT' as roleTo,
  rating,
  comment,
  punctuality,
  respectful,
  payment,
  createdAt,
  updatedAt
FROM professional_reviews;
```

### 3. Atualizar rating dos usuários
```sql
-- Atualizar rating de profissionais
UPDATE users u
SET 
  rating = (
    SELECT AVG(rating) 
    FROM reviews_new r 
    WHERE r.toUserId = u.id AND r.roleTo = 'PROFESSIONAL'
  ),
  reviewCount = (
    SELECT COUNT(*) 
    FROM reviews_new r 
    WHERE r.toUserId = u.id AND r.roleTo = 'PROFESSIONAL'
  )
WHERE userType = 'PROFESSIONAL';

-- Atualizar rating de clientes
UPDATE users u
SET 
  rating = (
    SELECT AVG(rating) 
    FROM reviews_new r 
    WHERE r.toUserId = u.id AND r.roleTo = 'CLIENT'
  ),
  reviewCount = (
    SELECT COUNT(*) 
    FROM reviews_new r 
    WHERE r.toUserId = u.id AND r.roleTo = 'CLIENT'
  )
WHERE userType = 'CLIENT';
```

### 4. Atualizar endpoints do backend

**Antes:**
- `GET /reviews/professional/:id` (reviews de cliente → profissional)
- `GET /professional-reviews/client/:id` (reviews de profissional → cliente)

**Depois (unificado):**
- `GET /reviews?toUserId=:id&roleTo=PROFESSIONAL` - reviews recebidas por profissional
- `GET /reviews?toUserId=:id&roleTo=CLIENT` - reviews recebidas por cliente
- `GET /reviews?fromUserId=:id` - reviews que eu dei

## Frontend: RatingAPI Atualizado

```typescript
export class RealRatingAPI implements BackendRatingAPI {
  
  // Buscar avaliações recebidas por um profissional
  async getProfessionalRatings(professionalId: string): Promise<Rating[]> {
    const response = await fetch(
      `${this.baseURL}/api/reviews?toUserId=${professionalId}&roleTo=PROFESSIONAL`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    return response.json();
  }
  
  // Buscar avaliação que cliente deu para profissional
  async getRatingByAppointmentId(appointmentId: string): Promise<Rating | null> {
    const response = await fetch(
      `${this.baseURL}/api/reviews?appointmentId=${appointmentId}&roleTo=PROFESSIONAL`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    return response.json();
  }
  
  // Buscar avaliação que profissional deu para cliente
  async getClientRatingByAppointmentId(appointmentId: string): Promise<Rating | null> {
    const response = await fetch(
      `${this.baseURL}/api/reviews?appointmentId=${appointmentId}&roleTo=CLIENT`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    return response.json();
  }
  
  // Criar avaliação (unificado)
  async submitRating(ratingData: RatingRequest): Promise<Rating> {
    const payload = {
      appointmentId: ratingData.bookingId,
      fromUserId: myUserId, // do token
      toUserId: ratingData.professionalId || ratingData.clientId,
      roleFrom: ratingData.ratingType === 'professional' ? 'CLIENT' : 'PROFESSIONAL',
      roleTo: ratingData.ratingType === 'professional' ? 'PROFESSIONAL' : 'CLIENT',
      rating: ratingData.rating,
      comment: ratingData.comment,
      punctuality: ratingData.rating,
      quality: ratingData.ratingType === 'professional' ? ratingData.rating : undefined,
      respectful: ratingData.ratingType === 'client' ? ratingData.rating : undefined,
      payment: ratingData.ratingType === 'client' ? ratingData.rating : undefined,
    };
    
    const response = await fetch(`${this.baseURL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    
    return response.json();
  }
}
```

## Benefícios

✅ **1 tabela** em vez de 2
✅ **2 relacionamentos** no User em vez de 4
✅ Queries **muito mais simples**
✅ **Lógica unificada** no backend
✅ **Menos confusão** no frontend
✅ **Fácil de entender** para novos desenvolvedores

## Próximos Passos

1. ✅ Criar novo schema
2. ⏳ Gerar migração do Prisma
3. ⏳ Executar migração
4. ⏳ Atualizar rotas do backend
5. ⏳ Atualizar frontend (RatingAPI)
6. ⏳ Testar tudo
7. ⏳ Remover tabelas antigas

Quer que eu continue com a implementação?

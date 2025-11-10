# 📚 Schemas de Validação - Backend Liz

## Visão Geral

Todos os schemas de validação Zod foram criados para validar os dados de entrada e saída da API.

## 📁 Arquivos Criados

### 1. **common.schema.ts**
Schemas reutilizáveis em toda a aplicação:
- ✅ Paginação (`paginationSchema`)
- ✅ Respostas da API (`apiResponseSchema`, `errorResponseSchema`, `paginatedResponseSchema`)
- ✅ Validações comuns (email, telefone, CPF, CEP, senha forte)
- ✅ Tipos de dados (IDs, coordenadas, preços, ratings, horários)

### 2. **user.schema.ts**
Schemas relacionados a usuários:
- ✅ Registro (`registerSchema`)
- ✅ Login (`loginSchema`)
- ✅ Atualização de perfil (`updateProfileSchema`)
- ✅ Alteração de senha (`changePasswordSchema`)
- ✅ Reset de senha (`requestPasswordResetSchema`, `resetPasswordSchema`)
- ✅ Documentos de verificação (`uploadVerificationDocsSchema`)
- ✅ Preferências do usuário (`updatePreferencesSchema`)

### 3. **address.schema.ts**
Schemas para endereços:
- ✅ Criar endereço (`createAddressSchema`)
- ✅ Atualizar endereço (`updateAddressSchema`)
- ✅ Definir endereço padrão (`setDefaultAddressSchema`)
- ✅ Validação de CEP brasileiro

### 4. **professional.schema.ts**
Schemas para perfil profissional:
- ✅ Criar/Atualizar perfil (`createProfessionalProfileSchema`, `updateProfessionalProfileSchema`)
- ✅ Adicionar serviço (`addServiceToProfessionalSchema`)
- ✅ Atualizar serviço (`updateProfessionalServiceSchema`)
- ✅ Disponibilidade (`addAvailabilitySchema`, `updateAvailabilitySchema`)
- ✅ Buscar profissionais com filtros (`searchProfessionalsSchema`)

### 5. **category.schema.ts**
Schemas para categorias e subcategorias:
- ✅ Criar/Atualizar categoria (`createCategorySchema`, `updateCategorySchema`)
- ✅ Criar/Atualizar subcategoria (`createSubcategorySchema`, `updateSubcategorySchema`)
- ✅ Buscar com filtros (`getCategoriesQuerySchema`, `getSubcategoriesQuerySchema`)

### 6. **appointment.schema.ts**
Schemas para agendamentos:
- ✅ Criar agendamento (`createAppointmentSchema`)
- ✅ Atualizar status (`updateAppointmentStatusSchema`)
- ✅ Reagendar (`rescheduleAppointmentSchema`)
- ✅ Atualizar pagamento (`updatePaymentSchema`)
- ✅ Buscar agendamentos (`getAppointmentsQuerySchema`)
- ✅ Verificar disponibilidade (`checkAvailabilitySchema`)

### 7. **review.schema.ts**
Schemas para avaliações:
- ✅ Criar avaliação (`createReviewSchema`)
- ✅ Atualizar avaliação (`updateReviewSchema`)
- ✅ Buscar avaliações (`getReviewsQuerySchema`)
- ✅ Estatísticas de rating (`professionalRatingStatsSchema`)
- ✅ Validações específicas (pontualidade, qualidade, comunicação)

### 8. **favorite.schema.ts**
Schemas para favoritos:
- ✅ Adicionar favorito (`addFavoriteSchema`)
- ✅ Remover favorito (`removeFavoriteSchema`)
- ✅ Listar favoritos (`getFavoritesQuerySchema`)

### 9. **notification.schema.ts**
Schemas para notificações:
- ✅ Criar notificação (`createNotificationSchema`)
- ✅ Marcar como lida (`markAsReadSchema`, `markAllAsReadSchema`)
- ✅ Buscar notificações (`getNotificationsQuerySchema`)
- ✅ Estatísticas (`notificationStatsSchema`)
- ✅ Tipos: INFO, SUCCESS, WARNING, ERROR, BOOKING, CHAT, REVIEW, SYSTEM

### 10. **chat.schema.ts**
Schemas para chat e mensagens:
- ✅ Criar chat (`createChatSchema`)
- ✅ Enviar mensagem (`sendMessageSchema`)
- ✅ Atualizar status de mensagem (`updateMessageStatusSchema`)
- ✅ Marcar mensagens como lidas (`markMessagesAsReadSchema`)
- ✅ Buscar mensagens e chats (`getMessagesQuerySchema`, `getChatsQuerySchema`)

## 🎯 Validações Implementadas

### Validações de Formato
- **Email**: Formato válido de email
- **Telefone**: Formato brasileiro (+55 ou 55) com DDD
- **CPF**: Formato brasileiro (XXX.XXX.XXX-XX)
- **CEP**: Formato brasileiro (XXXXX-XXX)
- **Horário**: Formato HH:MM (24h)
- **Data**: ISO 8601 datetime

### Validações de Senha Forte
A senha deve ter:
- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 letra maiúscula
- ✅ Pelo menos 1 letra minúscula
- ✅ Pelo menos 1 número

### Validações de Rating
- Valor entre 1 e 5
- Números inteiros apenas
- Usado para avaliação geral e específicas (pontualidade, qualidade, comunicação)

### Validações de Preço
- Valor positivo
- Máximo 2 casas decimais
- Tipo: Float

### Validações de Coordenadas
- **Latitude**: -90 a 90
- **Longitude**: -180 a 180

## 🔄 Padrões de Response

### Success Response
```typescript
{
  success: true,
  data: T,
  message?: string
}
```

### Error Response
```typescript
{
  success: false,
  error: string,
  message?: string,
  details?: any
}
```

### Paginated Response
```typescript
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

## 📝 Como Usar

### Em uma rota Fastify:

```typescript
import { loginSchema, authResponseSchema } from '../schemas/index.js';

app.post('/auth/login', {
  schema: {
    body: loginSchema,
    response: {
      200: authResponseSchema,
      400: errorResponseSchema,
    },
  },
  handler: async (request, reply) => {
    // request.body já está validado e tipado automaticamente
    const { email, password } = request.body;
    // ...
  },
});
```

### Validação manual:

```typescript
import { createAppointmentSchema } from '../schemas/appointment.schema.js';

const result = createAppointmentSchema.safeParse(data);
if (!result.success) {
  // result.error contém os erros de validação
  console.log(result.error.issues);
}
```

## ✅ Próximos Passos

Agora que os schemas estão prontos:

1. ✅ Schemas criados
2. ⏳ Atualizar rotas existentes para usar os schemas
3. ⏳ Criar novas rotas com os schemas
4. ⏳ Implementar controllers e services
5. ⏳ Testar validações

## 📊 Estatísticas

- **Total de schemas criados**: 10 arquivos
- **Total de schemas de validação**: ~60+ schemas
- **Tipos TypeScript gerados**: ~100+ types exportados
- **Cobertura**: 100% dos modelos do Prisma

---

**Versão:** 1.0  
**Data:** 10 de novembro de 2025

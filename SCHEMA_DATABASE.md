# 📊 Schema do Banco de Dados - Aplicativo Liz

## Visão Geral

Este documento descreve o schema completo do banco de dados PostgreSQL para o aplicativo Liz (Valet), uma plataforma que conecta clientes a profissionais de serviços domésticos.

## 🗂️ Estrutura de Modelos

### 1. **Usuários (Users)**

Tabela principal que armazena todos os usuários do sistema (clientes, profissionais e admins).

**Campos principais:**
- `userType`: CLIENT | PROFESSIONAL | ADMIN
- `status`: ACTIVE | INACTIVE | SUSPENDED | PENDING_VERIFICATION
- `email`, `name`, `phone`, `password`
- `avatar`: URL da foto de perfil
- `cpf`, `rg`: Documentos para verificação
- Preferências: notificações, modo escuro, idioma

**Relacionamentos:**
- 1:N com Address (endereços)
- 1:1 com Professional (perfil profissional)
- 1:N com Appointment (como cliente e como profissional)
- 1:N com Review (avaliações dadas e recebidas)
- 1:N com Favorite, Notification, Message

---

### 2. **Perfil Profissional (Professional)**

Extensão do modelo User para profissionais. Contém informações específicas de prestadores de serviço.

**Campos principais:**
- `specialty`: Especialização principal
- `description`: Descrição do profissional
- `experience`: Anos de experiência
- `servicesCompleted`: Total de serviços realizados
- `available`: Se está disponível para novos agendamentos
- `isVerified`: Se foi verificado pelo sistema
- `rating`: Média de avaliações (0-5)
- `reviewCount`: Total de avaliações
- `location`: Cidade/região de atuação
- `latitude`, `longitude`: Coordenadas para cálculo de distância
- `lastSeen`: Última vez online

**Relacionamentos:**
- 1:1 com User
- N:N com Category (via ProfessionalCategory)
- N:N com Subcategory (via ProfessionalSubcategory) - inclui preço
- 1:N com Availability (horários disponíveis)

---

### 3. **Categorias e Subcategorias**

Sistema hierárquico de serviços.

#### **Category** (Categorias principais)
Exemplo: Elétrica, Hidráulica, Limpeza, Reformas

**Campos:**
- `name`, `slug`, `icon`, `backgroundColor`
- `description`: Descrição da categoria
- `isActive`: Se está ativa no sistema
- `order`: Ordem de exibição

#### **Subcategory** (Serviços específicos)
Exemplo: Troca de lâmpadas, Instalação de chuveiro, Desentupimento

**Campos:**
- `categoryId`: Categoria pai
- `name`, `slug`, `description`
- `suggestedMinPrice`, `suggestedMaxPrice`: Faixa de preço sugerida
- `estimatedDuration`: Tempo estimado em minutos
- `imageUrl`: Imagem do serviço
- `isActive`, `order`

---

### 4. **Relacionamentos Profissional-Serviços**

#### **ProfessionalCategory**
Relacionamento N:N entre Professional e Category.
Indica em quais categorias o profissional atua.

#### **ProfessionalSubcategory**
Relacionamento N:N entre Professional e Subcategory.
**Importante:** Inclui o preço específico que o profissional cobra por cada serviço.

**Campos:**
- `professionalId`, `subcategoryId`
- `price`: Preço do profissional para este serviço
- `description`: Descrição personalizada do profissional
- `isActive`: Se o profissional ainda oferece este serviço

---

### 5. **Endereços (Address)**

Endereços salvos dos usuários para agendamentos.

**Campos:**
- `userId`: Dono do endereço
- `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `zipCode`
- `latitude`, `longitude`: Para cálculo de distância
- `isDefault`: Endereço padrão do usuário

---

### 6. **Agendamentos (Appointment)**

Tabela central do sistema - representa um serviço agendado.

**Campos principais:**
- `orderNumber`: Número único do pedido (visível ao usuário)
- `clientId`: Cliente que solicitou
- `professionalId`: Profissional que vai realizar
- `subcategoryId`: Serviço solicitado
- `addressId`: Onde será realizado
- `scheduledDate`, `scheduledTime`: Data e hora marcada
- `estimatedDuration`, `actualDuration`: Tempo estimado e real (em minutos)
- `status`: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | REJECTED
- `price`: Valor do serviço
- `paymentMethod`: CASH | CARD | PIX
- `paymentStatus`: PENDING | PAID | REFUNDED
- `notes`: Observações do cliente
- `cancellationReason`: Motivo do cancelamento (se houver)

**Timestamps:**
- `createdAt`: Quando foi criado
- `confirmedAt`: Quando foi confirmado
- `startedAt`: Quando iniciou
- `completedAt`: Quando finalizou
- `cancelledAt`: Quando foi cancelado

**Relacionamentos:**
- 1:1 com Review (avaliação)
- 1:1 com Chat (conversa)
- 1:N com Message (mensagens)

---

### 7. **Avaliações (Review)**

Avaliações que clientes fazem dos profissionais após o serviço.

**Campos:**
- `appointmentId`: Agendamento avaliado (único - uma avaliação por agendamento)
- `clientId`: Quem avaliou
- `professionalId`: Quem foi avaliado
- `rating`: Nota geral (1-5 estrelas)
- `comment`: Comentário opcional
- `punctuality`, `quality`, `communication`: Notas específicas (1-5)

**Importante:** Ao criar/atualizar uma avaliação, deve-se recalcular o `rating` e `reviewCount` do Professional.

---

### 8. **Favoritos (Favorite)**

Profissionais favoritados pelos clientes.

**Campos:**
- `userId`: Cliente que favoritou
- `professionalId`: Profissional favoritado

**Constraint:** Unique em (userId, professionalId) - não pode favoritar o mesmo profissional duas vezes.

---

### 9. **Notificações (Notification)**

Sistema de notificações in-app.

**Campos:**
- `userId`: Destinatário
- `type`: INFO | SUCCESS | WARNING | ERROR | BOOKING | CHAT | REVIEW | SYSTEM
- `title`, `message`: Conteúdo da notificação
- `data`: Dados adicionais em JSON (ex: appointmentId, chatId)
- `isRead`: Se foi lida

**Tipos de notificações:**
- **BOOKING**: Agendamento confirmado, cancelado, iniciado, etc.
- **CHAT**: Nova mensagem recebida
- **REVIEW**: Nova avaliação recebida
- **SYSTEM**: Avisos do sistema

---

### 10. **Chat e Mensagens**

Sistema de chat entre cliente e profissional.

#### **Chat**
Sala de conversa (geralmente vinculada a um agendamento).

**Campos:**
- `appointmentId`: Agendamento relacionado (opcional)

#### **ChatParticipant**
Participantes de um chat.

**Campos:**
- `chatId`, `userId`
- `lastReadAt`: Última vez que leu mensagens

#### **Message**
Mensagens enviadas em um chat.

**Campos:**
- `chatId`: Chat onde foi enviada
- `senderId`: Quem enviou
- `appointmentId`: Agendamento relacionado (opcional)
- `content`: Conteúdo da mensagem
- `status`: SENT | DELIVERED | READ
- `attachments`: URLs de anexos (imagens, etc.)

---

### 11. **Disponibilidade (Availability)**

Horários de disponibilidade do profissional por dia da semana.

**Campos:**
- `professionalId`: Profissional
- `dayOfWeek`: Dia da semana (0=Domingo, 6=Sábado)
- `startTime`, `endTime`: Horário de início e fim (ex: "08:00", "18:00")
- `isActive`: Se está ativa

**Exemplo:**
- Segunda (1): 08:00 às 12:00
- Segunda (1): 14:00 às 18:00
- Terça (2): 09:00 às 17:00

---

## 🔄 Fluxo Típico de Agendamento

1. **Cliente busca serviço** → Consulta Subcategories
2. **Cliente escolhe profissional** → Consulta Professionals com ProfessionalSubcategories
3. **Cliente verifica disponibilidade** → Consulta Availability e Appointments existentes
4. **Cliente cria agendamento** → Cria Appointment (status: PENDING)
5. **Profissional recebe notificação** → Cria Notification (type: BOOKING)
6. **Profissional confirma** → Atualiza Appointment (status: CONFIRMED, confirmedAt)
7. **No dia do serviço** → Atualiza para IN_PROGRESS (startedAt)
8. **Serviço finalizado** → Atualiza para COMPLETED (completedAt, actualDuration)
9. **Cliente avalia** → Cria Review, atualiza Professional (rating, reviewCount)

---

## 🔐 Índices e Performance

Os principais índices criados para otimização:

### Users
- `email` (único)
- `userType`
- `status`

### Professionals
- `userId` (único)
- `available`
- `rating`

### Appointments
- `clientId`, `professionalId`, `subcategoryId`
- `status`
- `scheduledDate`
- `orderNumber` (único)

### Reviews
- `professionalId`
- `clientId`
- `rating`

### Notifications
- `userId`
- `isRead`
- `type`
- `createdAt`

### Messages
- `chatId`
- `senderId`
- `appointmentId`
- `createdAt`

---

## 📊 Queries Importantes

### Buscar profissionais por serviço
```prisma
professional.findMany({
  where: {
    available: true,
    status: 'ACTIVE',
    subcategories: {
      some: {
        subcategoryId: X,
        isActive: true
      }
    }
  },
  include: {
    user: true,
    subcategories: {
      where: { subcategoryId: X }
    }
  }
})
```

### Calcular rating médio do profissional
```sql
SELECT AVG(rating), COUNT(*) 
FROM reviews 
WHERE professionalId = 'xxx'
```

### Verificar disponibilidade
```prisma
// 1. Buscar availability do profissional para o dia da semana
// 2. Buscar appointments existentes na data
// 3. Calcular slots livres
```

---

## 🚀 Próximas Etapas

1. ✅ Schema criado
2. ⏳ Criar migration inicial
3. ⏳ Implementar seeds (categorias e subcategorias padrão)
4. ⏳ Criar schemas de validação Zod
5. ⏳ Implementar rotas da API
6. ⏳ Testar fluxos completos

---

## 📝 Notas Importantes

- **Soft Delete**: Não implementado. Usar `isActive` ou mudar `status` quando necessário.
- **Timestamps**: Todos os modelos têm `createdAt` e `updatedAt` (exceto relacionamentos simples).
- **Cascata**: Delete em User cascateia para Professional, Addresses, Reviews, etc.
- **Validações**: Devem ser implementadas nas rotas com Zod.
- **Preços**: Armazenados como Float. Converter para string formatada no frontend.
- **Datas**: Usar DateTime do Prisma. Frontend converte para formato local.

---

**Versão:** 1.0  
**Data:** 10 de novembro de 2025

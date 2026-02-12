-- Remove tabelas de chat e mensagens
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "chat_participants" CASCADE;
DROP TABLE IF EXISTS "chats" CASCADE;

-- Remove enum MessageStatus
DROP TYPE IF EXISTS "MessageStatus";

-- Atualizar tipo NotificationType para remover CHAT
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";

CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING', 'REVIEW', 'SYSTEM');

-- Atualizar coluna type em notifications
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType" USING (
  CASE 
    WHEN "type"::text = 'CHAT' THEN 'INFO'::"NotificationType"
    ELSE "type"::text::"NotificationType"
  END
);

DROP TYPE "NotificationType_old";

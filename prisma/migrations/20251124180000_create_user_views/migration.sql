-- CreateViews: Criar views para separar visualização de clientes e profissionais

-- View: Todos os usuários (sem dados sensíveis)
CREATE OR REPLACE VIEW all_users AS
SELECT 
  id,
  email,
  name,
  phone,
  avatar,
  "userType",
  status,
  cpf,
  "notificationsEnabled",
  "darkMode",
  language,
  "createdAt",
  "updatedAt"
FROM users;

-- View: Apenas clientes
CREATE OR REPLACE VIEW clients AS
SELECT 
  id,
  email,
  name,
  phone,
  avatar,
  status,
  "notificationsEnabled",
  "darkMode",
  language,
  "createdAt",
  "updatedAt"
FROM users
WHERE "userType" = 'CLIENT';

-- View: Apenas profissionais com dados específicos
CREATE OR REPLACE VIEW professionals AS
SELECT 
  id,
  email,
  name,
  phone,
  avatar,
  status,
  -- Campos específicos de profissionais
  specialty,
  description,
  experience,
  "servicesCompleted",
  available,
  "isVerified",
  location,
  latitude,
  longitude,
  rating,
  "reviewCount",
  "avgResponseTime",
  "lastSeen",
  "createdAt",
  "updatedAt"
FROM users
WHERE "userType" = 'PROFESSIONAL';

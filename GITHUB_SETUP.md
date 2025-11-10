# 🚀 Como Subir para o GitHub

## Passo 1: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. **Repository name:** `valet-backend` ou `liz-backend`
3. **Description:** Backend API para app Liz - Serviços domésticos
4. **Visibility:** Private ou Public (sua escolha)
5. **NÃO** marque "Initialize with README" (já temos um)
6. Clique em **"Create repository"**

## Passo 2: Conectar Repositório Local

Depois de criar, o GitHub mostrará comandos. Use estes:

```powershell
# Adicionar remote
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git

# Renomear branch para main (padrão atual do GitHub)
git branch -M main

# Fazer push
git push -u origin main
```

### Exemplo completo:

Se seu usuário for `diogenes` e o repo `liz-backend`:

```powershell
git remote add origin https://github.com/diogenes/liz-backend.git
git branch -M main
git push -u origin main
```

## Passo 3: Autenticação

Quando pedir credenciais:
- **Username:** seu usuário do GitHub
- **Password:** use um **Personal Access Token** (não a senha da conta)

### Como gerar um Token:

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Classic"**
3. Dê um nome: "Valet Backend"
4. Marque o scope: **repo** (acesso total aos repositórios)
5. Clique em **"Generate token"**
6. **COPIE O TOKEN** (não será mostrado novamente!)
7. Use este token como senha no git push

## Passo 4: Configurar Git Credentials (Opcional)

Para não precisar digitar sempre:

```powershell
# Windows Credential Manager
git config --global credential.helper wincred
```

## Passo 5: Verificar

Após o push, acesse seu repositório no GitHub e confira se todos os arquivos estão lá!

---

## 📦 O que foi commitado:

- ✅ 58 arquivos
- ✅ 15.673 linhas de código
- ✅ Toda estrutura do backend
- ✅ Migrations do Prisma
- ✅ Documentação completa
- ❌ `.env` (ignorado por segurança)
- ❌ `node_modules/` (ignorado)
- ❌ `Liz/` app React Native (repo separado)

---

## 🔒 Segurança

**IMPORTANTE:** O arquivo `.env` com suas credenciais do banco NÃO foi enviado (está no .gitignore). 

Quando clonar o repo em outro lugar:
1. Copie `.env.example` para `.env`
2. Preencha com suas credenciais
3. Rode `npm install`
4. Rode `npx prisma migrate deploy`

---

## 📝 README.md do Projeto

O arquivo `README.md` já está incluído com:
- Instruções de instalação
- Como rodar o projeto
- Documentação da API
- Tecnologias utilizadas

Está tudo pronto para o GitHub! 🎉

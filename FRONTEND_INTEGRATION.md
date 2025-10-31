# 🧪 Teste de Registro de Usuário

## ✅ **Backend Atualizado**

O backend agora espera o campo `username` (não `nome`) para manter consistência com padrões internacionais de APIs.

## 📝 **Estrutura Correta do Request**

### **Endpoint:** `POST /api/users/register`

### **Body esperado:**
```json
{
  "username": "João Silva",
  "email": "joao@exemplo.com",
  "password": "MinhaSenh@123"
}
```

### **Validações:**
- ✅ `username`: 2-100 caracteres
- ✅ `email`: formato válido, único no banco
- ✅ `password`: mínimo 6 caracteres, deve conter:
  - 1 letra minúscula
  - 1 letra maiúscula
  - 1 número

## 🚀 **Código Frontend Correto**

```typescript
const registerUser = async (
  username: string,
  email: string,
  password: string
) => {
  const response = await fetch("http://localhost:3001/api/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to register user");
  }

  return response.json();
};
```

## 🧪 **Teste com curl**

```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "João Silva",
    "email": "joao@teste.com",
    "password": "MinhaSenh@123"
  }'
```

## ✅ **Resposta Esperada (201)**

```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "673e2f1a9d8e4b2c1a3f5e6d",
    "username": "João Silva",
    "email": "joao@teste.com",
    "ativo": true,
    "emailVerificado": false,
    "dataCriacao": "2025-10-31T...",
    "dataUltimaAtualizacao": "2025-10-31T..."
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

## ❌ **Possíveis Erros**

### **400 - Validation Error**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "password",
      "message": "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"
    }
  ]
}
```

### **409 - Email já existe**
```json
{
  "error": "Email already exists",
  "message": "Um usuário com este email já existe"
}
```

## 📋 **Checklist de Debug**

- [ ] URL correta: `http://localhost:3001/api/users/register`
- [ ] Header `Content-Type: application/json` presente
- [ ] Body com campos: `username`, `email`, `password` (não `nome`)
- [ ] Senha atende os requisitos (minúscula, maiúscula, número)
- [ ] Email com formato válido
- [ ] Email ainda não cadastrado no banco
- [ ] Servidor rodando na porta 3001
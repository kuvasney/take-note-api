# 🌐 Configuração CORS para Deploy

## ✅ Solução Implementada

O backend agora aceita requisições de:
- ✅ Origens configuradas em `CORS_ORIGIN` e `FRONTEND_URL`
- ✅ Domínios `.vercel.app` (Vercel)
- ✅ Domínios `.netlify.app` (Netlify)
- ✅ `localhost:5173` e `localhost:3000` (desenvolvimento)
- ✅ Requisições sem origin (mobile apps, Postman)

## 🚀 Configuração por Ambiente

### **1. Desenvolvimento Local**
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### **2. Frontend e Backend no mesmo domínio Vercel**
```env
# Backend: https://seuapp.vercel.app/api
# Frontend: https://seuapp.vercel.app

NODE_ENV=production
CORS_ORIGIN=https://seuapp.vercel.app
FRONTEND_URL=https://seuapp.vercel.app
```

### **3. Frontend e Backend em domínios diferentes**
```env
# Backend: https://api.seuapp.com
# Frontend: https://seuapp.com

NODE_ENV=production
CORS_ORIGIN=https://seuapp.com
FRONTEND_URL=https://seuapp.com
```

### **4. Múltiplos domínios (produção + staging)**
```env
NODE_ENV=production
CORS_ORIGIN=https://seuapp.com
FRONTEND_URL=https://staging.seuapp.com
```

## 🔧 Configuração no Vercel

### **Dashboard do Backend:**
1. Acesse Project Settings → Environment Variables
2. Adicione as variáveis:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/db
CORS_ORIGIN = https://seu-frontend.vercel.app
FRONTEND_URL = https://seu-frontend.vercel.app
JWT_SECRET = your-secret-key
JWT_REFRESH_SECRET = your-refresh-secret
```

### **Se frontend e backend estiverem no mesmo projeto Vercel:**
```
CORS_ORIGIN = https://seu-app.vercel.app
FRONTEND_URL = https://seu-app.vercel.app
```

## 🐛 Troubleshooting CORS

### **Erro: "Access to fetch blocked by CORS"**

**Causa:** Origin não está na lista permitida.

**Solução:**
1. Verifique o console do backend - deve mostrar: `⚠️ CORS blocked request from origin: ...`
2. Adicione o domínio correto em `CORS_ORIGIN`
3. Redeploy do backend

### **Erro: "Preflight request doesn't pass"**

**Causa:** Helmet bloqueando requisições OPTIONS.

**Solução:** Já resolvido! `crossOriginResourcePolicy: { policy: 'cross-origin' }` permite preflight.

### **Erro: "Credentials mode requires server to allow credentials"**

**Causa:** `credentials: true` no frontend mas CORS não permite.

**Solução:** Já configurado! `credentials: true` está habilitado no CORS.

## 📝 Exemplo de Requisição do Frontend

```typescript
// Frontend deve incluir credentials se estiver enviando cookies/tokens
fetch('https://api.seuapp.com/api/notes', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include' // Importante para CORS com credentials
});
```

## 🔒 Headers Permitidos

**Allowed Headers:**
- `Content-Type`
- `Authorization`

**Exposed Headers:**
- `Content-Range`
- `X-Content-Range`

**Methods:**
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

## ⚡ Dicas para Produção

1. **Use HTTPS sempre** - CORS com `credentials: true` exige HTTPS
2. **Defina origin específica** - Evite `*` em produção
3. **Monitore logs** - Verifique warnings de CORS bloqueado
4. **Teste em staging** - Sempre teste CORS antes de produção

## 🎯 Checklist de Deploy

- [ ] `CORS_ORIGIN` configurado no Vercel
- [ ] `FRONTEND_URL` configurado (se diferente)
- [ ] `NODE_ENV=production` definido
- [ ] Backend e frontend usando HTTPS
- [ ] Testado requisições autenticadas
- [ ] Logs do backend verificados

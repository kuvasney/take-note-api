# 🔐 Como Usar JWT com as Notas no Frontend

## 📋 **O que mudou?**

Agora **todas as rotas de notas exigem autenticação**. Cada nota está associada a um usuário específico.

## 🎯 **Fluxo Completo**

### **1. Login do Usuário**
```typescript
// 1. Fazer login
const loginResponse = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'usuario@email.com', 
    password: 'senha123' 
  })
});

const { tokens, user } = await loginResponse.json();

// 2. Salvar tokens no localStorage
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
localStorage.setItem('user', JSON.stringify(user));
```

### **2. Buscar Notas (Com Autenticação)**
```typescript
const getNotes = async () => {
  // Pegar token do localStorage
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3001/api/notes', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`  // ✅ Enviar token aqui
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expirado - tentar renovar
      await refreshAccessToken();
      return getNotes(); // Tentar novamente
    }
    throw new Error('Failed to fetch notes');
  }
  
  return response.json();
};
```

### **3. Criar Nova Nota**
```typescript
const createNote = async (noteData: {
  titulo: string;
  conteudo: string;
  cor?: string;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
}) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3001/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(noteData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create note');
  }
  
  return response.json();
};
```

### **4. Atualizar Nota**
```typescript
const updateNote = async (noteId: string, updates: Partial<Note>) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:3001/api/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update note');
  }
  
  return response.json();
};
```

### **5. Deletar Nota**
```typescript
const deleteNote = async (noteId: string) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:3001/api/notes/${noteId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete note');
  }
  
  return response.json();
};
```

### **6. Renovar Token Expirado**
```typescript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://localhost:3001/api/users/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (!response.ok) {
    // Refresh token também expirado - redirecionar para login
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  const { tokens } = await response.json();
  
  // Atualizar tokens
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  
  return tokens.accessToken;
};
```

## 🛠️ **Helper: API Client com Token Automático**

```typescript
// apiClient.ts
class ApiClient {
  private baseUrl = 'http://localhost:3001';
  
  private async getHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
  
  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token expirado - tentar renovar
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        throw new Error('RETRY_WITH_NEW_TOKEN');
      }
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
  
  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }
  
  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }
  
  async put(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }
  
  async delete(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }
  
  private async refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/users/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      const { tokens } = await response.json();
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      return tokens.accessToken;
    } catch {
      localStorage.clear();
      window.location.href = '/login';
      return null;
    }
  }
}

export const api = new ApiClient();

// Uso:
// const notes = await api.get('/api/notes');
// const newNote = await api.post('/api/notes', { titulo: 'Test', conteudo: 'Content' });
```

## 🔒 **Segurança Implementada**

### **Backend:**
- ✅ Todas as rotas de notas exigem autenticação
- ✅ Cada nota tem um `userId` associado
- ✅ Usuários só veem/editam suas próprias notas
- ✅ Filtros automáticos por `userId` em todas as queries
- ✅ Validação de propriedade antes de update/delete

### **Frontend:**
- ✅ Token enviado em cada requisição
- ✅ Renovação automática de tokens expirados
- ✅ Redirecionamento para login se sessão expirou
- ✅ Tokens armazenados no localStorage

## ⚠️ **Erros Comuns**

### **401 - Unauthorized**
```json
{
  "error": "Access denied",
  "message": "Token de acesso é obrigatório"
}
```
**Solução:** Fazer login primeiro e enviar o token.

### **401 - Token Expired**
```json
{
  "error": "Token expired",
  "message": "Token expirado. Use o refresh token para obter um novo."
}
```
**Solução:** Usar o refresh token para renovar.

### **404 - Note Not Found**
```json
{
  "error": "Note not found",
  "message": "No note found with ID: ..."
}
```
**Solução:** Você está tentando acessar uma nota que não existe ou não pertence a você.

## 📝 **Exemplo Completo React**

```typescript
// useNotes.ts
import { useState, useEffect } from 'react';
import { api } from './apiClient';

export const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadNotes();
  }, []);
  
  const loadNotes = async () => {
    try {
      const data = await api.get('/api/notes');
      setNotes(data.notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const createNote = async (noteData) => {
    const newNote = await api.post('/api/notes', noteData);
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  };
  
  const updateNote = async (id, updates) => {
    const updated = await api.put(`/api/notes/${id}`, updates);
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    return updated;
  };
  
  const deleteNote = async (id) => {
    await api.delete(`/api/notes/${id}`);
    setNotes(prev => prev.filter(n => n.id !== id));
  };
  
  return { notes, loading, createNote, updateNote, deleteNote, refreshNotes: loadNotes };
};
```

## 🎯 **Resumo**

1. **Login** → Recebe tokens
2. **Salvar tokens** → localStorage
3. **Cada requisição** → Enviar `Authorization: Bearer token`
4. **Token expira** → Renovar com refresh token
5. **Refresh expira** → Fazer login novamente

Todas as notas agora são **isoladas por usuário** e **totalmente protegidas**! 🔐
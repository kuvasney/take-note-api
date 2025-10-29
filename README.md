# Notes API

A REST API for a notes application built with Node.js, Express, MongoDB, and TypeScript.

## Features

- 📝 Create, read, update, and delete notes
- 📌 Pin/unpin notes
- 🏷️ Tag-based organization and filtering
- 🔍 Full-text search across notes
- 📦 Archive/unarchive functionality
- 🎨 Custom note colors
- ⏰ Reminders system
- 👥 Collaboration support
- 🔄 Note reordering
- ✅ Input validation with Zod
- 🛡️ Security with Helmet and CORS
- 📊 Pagination support

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Language**: TypeScript
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Development**: tsx (TypeScript execution)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn or pnpm

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/notes-app
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**
   Make sure MongoDB is running locally or update `MONGODB_URI` with your MongoDB Atlas connection string.

5. **Run the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notes` | List all notes with pagination |
| `GET` | `/api/notes/search` | Search notes with filters |
| `GET` | `/api/notes/:id` | Get specific note |
| `POST` | `/api/notes` | Create new note |
| `PUT` | `/api/notes/:id` | Update existing note |
| `PATCH` | `/api/notes/:id/pin` | Toggle pin status |
| `PATCH` | `/api/notes/:id/archive` | Toggle archive status |
| `DELETE` | `/api/notes/:id` | Delete note |
| `POST` | `/api/notes/reorder` | Reorder notes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health status |

## Request/Response Examples

### Create Note

**POST** `/api/notes`

```json
{
  "titulo": "My Note Title",
  "conteudo": "Note content here...",
  "cor": "#ffeb3b",
  "tags": ["work", "important"],
  "pinned": false,
  "lembretes": [
    {
      "id": "reminder-1",
      "dataHora": "2024-12-01T10:00:00Z",
      "texto": "Review this note"
    }
  ],
  "colaboradores": ["user@example.com"]
}
```

### Search Notes

**GET** `/api/notes/search?search=work&tags=important&page=1&limit=10`

### List Notes with Filters

**GET** `/api/notes?archived=false&pinned=true&page=1&limit=20`

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "details": "Additional error details (in development)"
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests

### Project Structure

```
src/
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/         # Mongoose models
├── routes/         # Express routes
├── types/          # TypeScript type definitions
├── validation/     # Zod schemas
└── server.ts       # Application entry point
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/notes-app` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Deploy no Vercel

### Correções para TypeScript

Este projeto foi otimizado para deployment no Vercel com as seguintes correções:

- ✅ Tipos de retorno explícitos em todas as funções async
- ✅ Tratamento correto de parâmetros não utilizados  
- ✅ Validação de ObjectId do MongoDB
- ✅ Middleware de tratamento de erros tipado
- ✅ Configuração do Vercel (`vercel.json`)
- ✅ Build limpo sem erros de TypeScript

### Passos para Deploy

1. **Conecte o repositório ao Vercel**
   - Faça login no Vercel
   - Importe o projeto do GitHub
   - Configure o diretório raiz como `backend`

2. **Configure as variáveis de ambiente no Vercel**
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_connection_string
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```

3. **MongoDB Atlas Setup**
   - Crie um cluster no MongoDB Atlas
   - Configure o IP whitelist (0.0.0.0/0 para Vercel)
   - Obtenha a connection string
   - Substitua `<password>` pela senha real

4. **Build e Deploy**
   - O Vercel executará automaticamente `npm run build`
   - O projeto será servido a partir de `dist/server.js`

## License

This project is licensed under the MIT License.
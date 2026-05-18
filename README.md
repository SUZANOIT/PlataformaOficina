# Sistema Web Gerador de Orçamentos

Um sistema completo (Full-Stack) moderno e responsivo para geração e gestão de orçamentos comerciais, construído com Node.js, Express, Prisma, PostgreSQL, React e TailwindCSS.

## Arquitetura e Tecnologias

### Backend
- **Node.js** com **Express**
- **TypeScript** para tipagem forte
- **Prisma ORM** para interação com o banco de dados
- **PostgreSQL** como banco de dados (via Docker)
- **Zod** para validação de esquemas
- **Bcrypt** e **JWT** para autenticação

### Frontend
- **React** com **Vite**
- **TypeScript**
- **TailwindCSS** para estilização utilitária e design system (inspirado em shadcn/ui)
- **React Hook Form** + **Zod** para formulários dinâmicos e validação
- **Lucide React** para ícones modernos
- **Zustand** para gerenciamento de estado global

## Como Executar

### Pré-requisitos
- Node.js (v18+)
- Docker e Docker Compose

### 1. Iniciar Banco de Dados
Na raiz do projeto, suba o container do PostgreSQL:
```bash
docker compose up -d
```

### 2. Configurar Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```
(Opcionalmente, confira o arquivo `.env` gerado no diretório `backend/`)

### 3. Configurar Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173` no seu navegador. O backend estará rodando na porta `3333`.

## Funcionalidades
- **Autenticação:** Cadastro e Login de usuários.
- **Dashboard:** Visão geral de métricas, valor total vendido e últimos orçamentos.
- **Formulário de Orçamento:** Interface moderna com máscaras para inputs, cálculo automático em tempo real dos itens, e organização lógica (Empresa, Cliente, Itens, Condições).
- **Geração de PDF:** Imprima ou exporte o layout final visual do orçamento.
- **Temas:** Suporte a dark mode via Tailwind e classes nativas do design system corporativo.

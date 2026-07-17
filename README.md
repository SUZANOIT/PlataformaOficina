# Plataforma Oficina & Gestão de Frotas (Suzano IT)

Um sistema completo (Full-Stack) moderno, responsivo e modular para gestão de frotas, oficinas, orçamentos e controle financeiro. Construído com **Node.js, Express, Prisma, PostgreSQL, React e TailwindCSS**.

---

## 📦 Módulos da Plataforma

A plataforma é dividida em módulos estratégicos para atender ponta a ponta a operação de oficinas, gestores de frota e administração central:

### 1. Gestão de Frotas (Fleet)
- **Painel de Veículos:** Controle completo de veículos com visualização em árvore (Gestores > Subfrotas > Veículos) e cockpit de detalhes.
- **Linha do Tempo de Manutenção:** Histórico cronológico e visual de manutenções, peças trocadas e serviços executados por veículo.
- **DRE por Veículo:** Controle de receitas e despesas individuais de cada ativo com gráficos de proporção.
- **Controle de Status:** Monitoramento em tempo real (Disponível, Em Manutenção, etc).

### 2. Orçamentos e Ordens de Serviço (Quotes & OS)
- **Gerador de Orçamentos:** Interface avançada com cálculo automático, agrupamento lógico (Itens, Condições) e geração de PDF premium.
- **Gestão de Peças e Serviços:** Catálogo de serviços, produtos e fornecedores.
- **Aprovação de Orçamentos:** Fluxos de status para clientes e gestores de frota autorizarem reparos.

### 3. Financeiro e Contábil (Financial & Accounting)
- **Contas a Pagar e Receber:** Controle de fluxo de caixa, pagamentos e faturamento.
- **Relatórios:** Dashboards de faturamento consolidado e conciliação bancária.
- **Empresas de Orçamento:** Configuração de filiais, impostos e regras de negócio.

### 4. Gestão de Pessoas (RH & Collaborators)
- **Colaboradores:** Cadastro e gestão de funcionários, mecânicos e gestores.
- **Controle de Acessos:** Perfis e permissões granulares por tipo de usuário (Mecânico, Gestor, Admin).

### 5. Logística e Guincho (Towing)
- **Controle de Resgates:** Gestão de chamados de guincho e remoção de veículos.
- **Integração:** Associação direta de um veículo guinchado a uma nova OS na oficina.

### 6. Painel SaaS e Administração (Admin)
- **Multi-tenancy:** Estrutura preparada para múltiplas empresas/oficinas usarem o sistema simultaneamente.
- **Assinaturas (MyPlan):** Controle de planos de assinatura da plataforma (SaaS Dashboard).
- **Configurações Globais:** Personalização de e-mails, integrações e parâmetros da plataforma.

---

## 🛠️ Arquitetura e Tecnologias

### Backend
- **Node.js** com **Express** e **TypeScript**
- **Prisma ORM** para interação com o banco de dados
- **PostgreSQL** como banco de dados (via Docker)
- **Zod** para validação de esquemas
- **Bcrypt** e **JWT** para autenticação e segurança

### Frontend
- **React** com **Vite** e **TypeScript**
- **TailwindCSS** para design system premium e glassmorphism
- **React Hook Form** + **Zod** para formulários dinâmicos e validação
- **Lucide React** para iconografia moderna
- **Zustand** para gerenciamento de estado global
- Estilos focados em micro-interações, suporte a Dark Mode e UI Responsiva.

---

## 🚀 Como Executar Localmente

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
*(Opcionalmente, confira o arquivo `.env` gerado no diretório `backend/`)*

### 3. Configurar Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173` no seu navegador. O backend estará rodando na porta `3333`.

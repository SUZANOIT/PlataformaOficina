#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor
BLUE='\033[0;34m'

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    Gerenciador de Migrações do Banco de Dados    ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 1. Verificar se o Docker / PostgreSQL está rodando
echo -e "\n${YELLOW}[1/4] Verificando conexão com o Banco de Dados...${NC}"

# Testar se a porta 5432 está aberta
if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h localhost -p 5432 >/dev/null 2>&1
    DB_STATUS=$?
else
    # Fallback puramente em Bash usando /dev/tcp
    (echo > /dev/tcp/127.0.0.1/5432) >/dev/null 2>&1
    DB_STATUS=$?
fi

if [ $DB_STATUS -ne 0 ]; then
    echo -e "${YELLOW}Aviso: O PostgreSQL não está escutando na porta 5432.${NC}"
    echo -e "Tentando iniciar o banco via docker-compose..."
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose up -d db
    elif command -v docker >/dev/null 2>&1; then
        docker compose up -d db
    else
        echo -e "${RED}Erro: Docker ou Docker Compose não estão instalados no sistema.${NC}"
        echo -e "Por favor, inicie o banco de dados PostgreSQL manualmente antes de prosseguir."
        exit 1
    fi
    
    echo "Aguardando o banco iniciar (5s)..."
    sleep 5
else
    echo -e "${GREEN}✔ Banco de Dados está rodando e escutando na porta 5432!${NC}"
fi

# 2. Entrar na pasta do backend e verificar dependências
echo -e "\n${YELLOW}[2/4] Verificando dependências do backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules não encontrado no backend. Instalando dependências...${NC}"
    npm install
else
    echo -e "${GREEN}✔ Dependências do backend já estão instaladas.${NC}"
fi

# 3. Gerar o Prisma Client
echo -e "\n${YELLOW}[3/4] Gerando Prisma Client...${NC}"
npx prisma generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Prisma Client gerado com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha ao gerar o Prisma Client.${NC}"
    exit 1
fi

# 4. Rodar as migrações
echo -e "\n${YELLOW}[4/4] Executando migrações do Prisma...${NC}"
echo "Selecione uma opção de migração:"
options=("Desenvolvimento (Prisma Migrate Dev - Interativo)" "Produção/CI (Prisma Migrate Deploy - Silencioso)" "Cancelar")
select opt in "${options[@]}"; do
    case $opt in
        "Desenvolvimento (Prisma Migrate Dev - Interativo)")
            npx prisma migrate dev
            break
            ;;
        "Produção/CI (Prisma Migrate Deploy - Silencioso)")
            npx prisma migrate deploy
            break
            ;;
        "Cancelar")
            echo -e "${YELLOW}Migrações canceladas pelo usuário.${NC}"
            exit 0
            ;;
        *) 
            echo -e "${RED}Opção inválida.${NC}"
            ;;
    esac
done

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Migrações aplicadas com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha ao aplicar as migrações.${NC}"
    exit 1
fi

# 5. Executar Seed
echo -e "\n${YELLOW}[BÔNUS] Deseja alimentar o banco de dados (rodar Seed/reset.ts)? (s/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY]|[sS]|[sS][iI][mM])$ ]]; then
    echo -e "Executando seed do banco..."
    npx prisma db seed
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✔ Banco alimentado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Falha ao rodar o seed do banco.${NC}"
    fi
else
    echo -e "Seed ignorado."
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}   ✔ PROCESSO DE MIGRAÇÃO CONCLUÍDO COM SUCESSO!   ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "Dicas úteis:"
echo -e "- Para visualizar os dados no navegador: ${YELLOW}npm run db:studio${NC} (na raiz do projeto)"
echo -e "- Para criar uma nova migration após alterar schema.prisma: ${YELLOW}npm run db:migrate${NC}"
echo -e "- Para reiniciar o banco completamente: ${YELLOW}npm run db:reset${NC}\n"

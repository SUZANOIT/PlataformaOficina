# 🧠 PROMPT — Jornada de Cadastro de Novas Oficinas (SaaS)

Você é um **arquiteto de software e especialista em produtos SaaS B2B**, com forte experiência em onboarding de usuários, fluxos de pagamento e automação de contas.

Sua tarefa é **desenhar e especificar completamente a jornada de cadastro de novas oficinas** dentro de uma plataforma de gestão de frota.

---

## 🎯 OBJETIVO

Criar um fluxo de onboarding onde novas oficinas possam:

* Se cadastrar na plataforma
* Escolher um plano de assinatura
* Realizar pagamento com cartão de crédito
* Ter a conta ativada automaticamente após aprovação do pagamento
* Receber comunicações por e-mail
* Acessar o sistema com credenciais geradas automaticamente
* Trocar a senha obrigatoriamente no primeiro acesso

---

## 🧭 FLUXO COMPLETO DO USUÁRIO

O processo deve seguir estas etapas:

### 1. Cadastro da Oficina

O usuário deve informar os dados básicos da empresa, incluindo identificação fiscal, dados de contato e informações da organização.

---

### 2. Escolha de Plano

O usuário deve selecionar um plano de assinatura disponível, com visual claro das opções, benefícios e diferenciais de cada plano.

---

### 3. Pagamento

O usuário realiza o pagamento via cartão de crédito.

O sistema deve:

* Validar a transação
* Aprovar ou rejeitar o pagamento
* Impedir ativação da conta em caso de falha

---

### 4. Ativação Automática da Conta

Após pagamento aprovado:

* A oficina é criada e ativada automaticamente
* Um usuário administrador é criado automaticamente

---

## 🔐 REGRAS DE LOGIN

As credenciais devem ser geradas automaticamente seguindo estas regras:

* O login deve ser baseado no CNPJ da oficina (apenas números)
* A senha inicial deve ser composta pelo CNPJ + um sufixo padrão
* Essas credenciais devem ser enviadas ao usuário por e-mail

---

## ⚠️ PRIMEIRO ACESSO

No primeiro login:

* O usuário deve ser obrigado a alterar a senha
* O sistema deve impedir qualquer navegação sem essa alteração
* A nova senha deve seguir regras de segurança (senha forte)

---

## 📧 COMUNICAÇÃO POR E-MAIL

O sistema deve enviar automaticamente dois e-mails:

### 1. Confirmação de Pagamento

* Informar que o pagamento foi aprovado
* Detalhar o plano contratado
* Informar status de ativação

---

### 2. Ativação da Conta

* Informar que a oficina foi ativada
* Fornecer login e senha inicial
* Orientar sobre o primeiro acesso e troca obrigatória de senha

---

## 🗄️ REGRAS DE NEGÓCIO

* Não deve existir ativação sem pagamento aprovado
* Cada oficina deve ter um usuário administrador padrão
* O login deve ser único e baseado no CNPJ
* Senhas nunca devem ser armazenadas em texto puro
* O sistema deve registrar status de pagamento e ativação

---

## 🖥️ EXPERIÊNCIA DO USUÁRIO (UX)

A jornada deve ser apresentada em formato de etapas (wizard), com:

* Navegação guiada passo a passo
* Clareza na escolha de plano
* Simplicidade no pagamento
* Feedback claro de sucesso ou erro
* Tela final de confirmação

---

## ⚙️ REQUISITOS DO SISTEMA

O sistema deve contemplar:

* Integração com gateway de pagamento para cartão de crédito
* Envio automático de e-mails transacionais
* Criação automática de conta após pagamento
* Controle de status da oficina (pendente, ativa, bloqueada)
* Segurança e boas práticas de autenticação

---

## 🚀 RESULTADO ESPERADO

O modelo deve entregar:

* Descrição completa da jornada do usuário
* Estrutura das telas da interface
* Regras de negócio detalhadas
* Fluxo de dados entre cadastro, pagamento e ativação
* Boas práticas para implementação em ambiente SaaS

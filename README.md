# FinanceFlow

Aplicação web de gestão financeira pessoal, desenvolvida com Angular. O sistema permite organizar contas, categorias, transações, orçamentos, metas e relatórios em um único lugar.

> Este projeto utiliza o JSON Server como API local para fins de estudo e demonstração.

## Tecnologias

- Angular 19 com componentes standalone e rotas lazy-loaded;
- TypeScript e RxJS;
- Angular Reactive Forms;
- Angular SSR;
- SCSS com temas claro e escuro;
- Chart.js para gráficos;
- JSON Server para persistência local;
- Jasmine/Karma para testes unitários;
- Playwright para testes end-to-end.

## Pré-requisitos

- Node.js 18.19 ou superior;
- npm;
- navegador atualizado.

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/eduardoKrakhecke/gestao-financeira.git
cd gestao-financeira
npm install
```

## Execução local

O projeto precisa do Angular e do JSON Server em execução. Abra dois terminais:

Terminal 1 — API local:

```bash
npm run api
```

A API ficará disponível em `http://localhost:3000`.

Terminal 2 — aplicação Angular:

```bash
npm start
```

A aplicação ficará disponível em `http://localhost:4200`.

### Usuário de demonstração

As credenciais disponíveis podem ser consultadas em `db.json`. No banco inicial, existe o seguinte usuário:

```text
E-mail: eduardo@example.com
Senha: demo-only
```

## Funcionalidades

- Login, cadastro e proteção de rotas;
- Dashboard com resumo financeiro;
- Cadastro e edição de contas;
- Cadastro, edição e exclusão de categorias;
- Cadastro e acompanhamento de transações;
- Orçamentos por categoria e período;
- Metas financeiras;
- Transferências entre contas;
- Relatórios com filtros por data, gráficos e exportação CSV;
- Configurações de perfil, foto, preferências e senha;
- Tema claro e escuro;
- Layout responsivo com header e sidebar.

## Rotas principais

| Rota | Descrição |
| --- | --- |
| `/login` | Autenticação do usuário |
| `/register` | Cadastro de usuário |
| `/dashboard` | Visão geral das finanças |
| `/transactions` | Transações financeiras |
| `/accounts` | Contas bancárias e carteiras |
| `/categories` | Categorias de receitas e despesas |
| `/budgets` | Orçamentos |
| `/pages` | Metas financeiras |
| `/transfers` | Transferências |
| `/reports` | Relatórios e gráficos |
| `/settings` | Configurações do perfil e da aplicação |

## Arquitetura de pastas

```text
src/
├── app/
│   ├── core/
│   │   ├── auth/       # Autenticação, guards e interceptor
│   │   ├── layout/     # Layout principal, header e sidebar
│   │   └── services/   # Serviços globais
│   ├── features/       # Módulos funcionais da aplicação
│   │   ├── accounts/
│   │   ├── budgets/
│   │   ├── categories/
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── transactions/
│   │   └── transfers/
│   ├── shared/         # Componentes reutilizáveis
│   ├── app.config.ts
│   └── app.routes.ts
├── environments/      # Configurações por ambiente
└── styles/             # Variáveis, temas, formulários e botões
```

Cada feature mantém seus próprios componentes, páginas, modelos, serviços e rotas. As rotas principais carregam as funcionalidades sob demanda para reduzir o bundle inicial.

## API local

O arquivo `db.json` contém os dados simulados da aplicação. Os principais recursos são:

```text
users
accounts
categories
transactions
budgets
goals
transfers
```

O endereço da API é definido nos arquivos de ambiente:

- `src/environments/environment.development.ts`;
- `src/environments/environment.ts`.

Por padrão, ambos apontam para `http://localhost:3000`.

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm start` | Inicia o servidor de desenvolvimento Angular |
| `npm run api` | Inicia o JSON Server |
| `npm run build` | Gera o build da aplicação |
| `npm run watch` | Gera o build em modo de observação |
| `npm test` | Executa os testes unitários |
| `npx playwright test` | Executa os testes end-to-end |
| `npm run serve:ssr:gestao-financeira` | Executa o bundle SSR já compilado |

Para executar o SSR, gere primeiro o build com `npm run build`.

## Observações

- A autenticação atual é demonstrativa e usa um token local armazenado no navegador;
- O JSON Server não deve ser utilizado como backend de produção;
- As senhas do banco local são apenas dados de demonstração;
- Fotos de perfil são armazenadas como Data URL no usuário do `db.json`;
- Para produção, recomenda-se utilizar uma API real, autenticação segura e armazenamento externo para imagens.

## Licença

Este projeto é destinado a estudos e demonstração de desenvolvimento com Angular.

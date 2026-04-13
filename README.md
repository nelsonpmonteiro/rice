# RICE — Ferramenta Colaborativa de Priorização

Aplicação web para sessões de priorização usando o framework RICE (Reach · Impact · Confidence · Effort).  
Participantes votam em tempo real; admins controlam rodadas e ajustam scores manualmente.

---

## Funcionalidades

| Quem | O que pode fazer |
|---|---|
| **Qualquer pessoa com o link** | Entrar em uma sessão, escolher um nome, votar em cada iniciativa com seus fatores RICE |
| **Painel ao vivo** | Ver o ranking atualizado em tempo real à medida que os votos chegam |
| **Admin** | Criar sessões, adicionar iniciativas, abrir/fechar votação, aplicar ajustes manuais (override) nos scores, arquivar sessões |

---

## Deploy em 5 passos

### Pré-requisitos
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- [Git](https://git-scm.com/) instalado

---

### Passo 1 — Criar o banco no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** (menu lateral)
3. Cole o conteúdo de `supabase/migrations/001_init.sql` e clique em **Run**
4. Pronto — tabelas, realtime e políticas de segurança criadas

---

### Passo 2 — Pegar as credenciais do Supabase

Em **Settings > API** do seu projeto Supabase, copie:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Passo 3 — Subir o código no GitHub

```bash
# Na pasta do projeto
git init
git add .
git commit -m "feat: rice prioritization tool"

# Crie um repositório no github.com e siga as instruções para push
git remote add origin https://github.com/SEU_USUARIO/rice-tool.git
git push -u origin main
```

---

### Passo 4 — Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Importe o repositório que você acabou de criar
3. Em **Environment Variables**, adicione as 4 variáveis:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role do Supabase |
| `ADMIN_PASSWORD` | Senha que você escolher para o admin |

4. Clique em **Deploy**

Em ~2 minutos o projeto estará no ar com uma URL `rice-tool.vercel.app`.

---

### Passo 5 — Usar

| URL | Função |
|---|---|
| `/` | Página inicial — lista sessões abertas |
| `/admin` | Login do administrador |
| `/admin/dashboard` | Gerenciar sessões (após login) |
| `/session/[slug]` | Tela de votação para participantes |
| `/dashboard/[slug]` | Painel ao vivo (sem precisar votar) |

**Fluxo típico:**
1. Admin entra em `/admin` e cria uma sessão (ex: slug `q2-estoque`)
2. Admin adiciona as iniciativas
3. Admin clica em **▶ Abrir votação**
4. Compartilha o link `/session/q2-estoque` com o time
5. Abre `/dashboard/q2-estoque` no projetor/telão
6. Scores atualizam em tempo real enquanto o time vota
7. Quando quiser, admin aplica overrides (ajuste fino) — o painel reflete instantaneamente
8. Admin clica em **⏸ Encerrar votação** para fechar a rodada

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Copiar e preencher o arquivo de variáveis
cp .env.local.example .env.local
# edite .env.local com suas credenciais do Supabase

# Rodar localmente
npm run dev
# Acesse http://localhost:3000
```

---

## Estrutura do projeto

```
rice-app/
├── app/
│   ├── page.tsx                     # Home — lista sessões
│   ├── session/[slug]/page.tsx      # Tela de votação (participante)
│   ├── dashboard/[slug]/page.tsx    # Painel ao vivo
│   ├── admin/
│   │   ├── page.tsx                 # Login admin
│   │   └── dashboard/page.tsx      # Gerenciar sessões
│   └── api/admin/
│       ├── login/route.ts
│       ├── sessions/route.ts
│       ├── initiatives/route.ts
│       └── overrides/route.ts
├── lib/
│   ├── supabase.ts                  # Cliente Supabase + tipos
│   ├── rice.ts                      # Cálculo RICE + escalas
│   └── auth.ts                      # Autenticação admin
├── middleware.ts                    # Proteção das rotas /admin
└── supabase/migrations/001_init.sql # Schema completo do banco
```

---

## Como funciona o score em tempo real

- Cada voto é salvo na tabela `votes` no Supabase
- A view `initiative_scores` calcula a média dos fatores por iniciativa
- Se o admin aplicou um override em algum fator, ele substitui a média para aquele fator
- O Supabase Realtime notifica todos os clientes conectados quando um voto ou override é inserido/atualizado
- O painel e a tela de sessão re-buscam os scores automaticamente — sem polling, sem refresh manual

---

## Personalização rápida

**Mudar nome do produto:** edite `app/layout.tsx` → `metadata.title`

**Adicionar domínio próprio:** em Vercel > Project > Settings > Domains

**Escalar para mais usuários:** o tier gratuito do Supabase suporta até 500MB de banco e 2GB de egress/mês. Para times maiores, o plano Pro custa ~$25/mês.

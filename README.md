# AI Parametric House 3D

Gerador parametrico de edificacoes residenciais a partir de linguagem natural, com visualizacao 3D em tempo real.

Descreva a casa que deseja em portugues e a IA gera a planta com comodos, aberturas, telhado, piscina, vegetacao e muro — tudo renderizado em 3D no navegador.

## Stack

- **Next.js 16** (App Router)
- **React Three Fiber** + Drei (Three.js)
- **OpenAI SDK** (compativel com Kimi-K2.5, DeepSeek, GPT-4, etc.)
- **Zod v4** (validacao de schema)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Edite .env.local com sua OPENAI_API_KEY
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variaveis de ambiente

| Variavel | Obrigatoria | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Sim | — |
| `OPENAI_MODEL` | Nao | `gpt-4.1-mini` |
| `OPENAI_BASE_URL` | Nao | `https://api.openai.com/v1` |

## Features

- Geracao de projeto arquitetonico via prompt em portugues
- Streaming SSE com feedback visual de progresso
- Auto-retry (ate 3x) quando a IA gera comodos sobrepostos
- Validacao geometrica (overlap detection) e de requisitos
- Edicao parametrica no sidebar (lote, telhado, estilo)
- Materiais procedurais PBR (sem texturas externas)
- Telhado (plano, duas aguas, quatro aguas), piscina, vegetacao, muro
- Portas internas com supressao automatica de paredes compartilhadas
- Persistencia do projeto em localStorage
- Fallback deterministico quando a IA falha

## Scripts

```bash
pnpm dev       # servidor de desenvolvimento
pnpm build     # build de producao
pnpm lint      # eslint
```

## Relatório de Qualidade de Código
**Data:** 2026-05-27
**Escopo:** src/
**Stack detectada:** TypeScript (Next.js 16 + React Three Fiber + OpenAI SDK)
**Fonte de convenções:** AGENTS.md

### Ferramentas Automáticas

```
pnpm lint — 1 erro, 1 aviso:
  - src/app/page.tsx: react-hooks/set-state-in-effect (erro)
  - src/components/three/Terrain.tsx: @typescript-eslint/no-unused-vars (aviso)
```

### Arquitetura

- Nenhum problema encontrado. Lógica de domínio (schema, normalize, geometry-validation) está desacoplada do framework. A rota API é uma fachada fina. Componentes 3D consomem tipos do domínio sem acoplamento reverso.

### Estilo e Convenções — TypeScript

| # | Severidade | Arquivo:Linha | Descrição |
|---|---|---|---|
| 1 | ERRO | `src/app/page.tsx:~192` | ESLint `react-hooks/set-state-in-effect` — setState chamado fora do fluxo esperado pelo hook |
| 2 | AVISO | `src/components/three/Terrain.tsx` | Variável não utilizada (`@typescript-eslint/no-unused-vars`) |
| 3 | AVISO | `src/lib/normalize-project.ts:12` | `any` explícito (parâmetro e retorno). Há eslint-disable, mas poderia usar um tipo genérico `Record<string, unknown>` no retorno |
| 4 | AVISO | `src/components/BuildingScene.tsx` | Componente excessivamente grande (714 linhas). Considerar extrair `MergedWalls`, `OpeningsGroup`, `FloorSlabs` etc. para arquivos separados |
| 5 | AVISO | `src/lib/prompt-to-project.ts` | Arquivo longo (452 linhas) com duas funções exportadas distintas (`promptToProject` e `promptToProjectStream`) que poderiam ser separadas |
| 6 | AVISO | `src/lib/prompt-to-project.ts:301-452` | Aninhamento > 3 níveis no loop `while` + `for await` + múltiplos `if` em `promptToProjectStream` |

### Segurança

- Nenhum problema encontrado. A API valida presença e tamanho do prompt (linhas 11, 18 em route.ts). Segredos vêm de variáveis de ambiente.

### Manutenção

| # | Severidade | Arquivo:Linha | Descrição |
|---|---|---|---|
| 7 | AVISO | `src/lib/prompt-to-project.ts` | Lógica de retry duplicada entre `promptToProject` (linhas 1-205) e `promptToProjectStream` (linhas 301-452) — padrões quase idênticos de validação + correção |
| 8 | SUGESTÃO | `src/components/BuildingScene.tsx:21-22` | Constantes `WALL_THICKNESS` e `SLAB_THICKNESS` com mesmo valor (0.15) — considerar unificar ou nomear melhor |
| 9 | SUGESTÃO | `src/lib/prompt-to-project.ts:207` | `MAX_RETRIES = 3` — considerar extrair para config centralizada se for reutilizado |

### Resumo
- **Erros:** 1
- **Avisos:** 7
- **Sugestões:** 2

**Próximo passo:** Resolver o erro de ESLint em `page.tsx` e considerar decomposição de `BuildingScene.tsx` (714 linhas) em componentes menores.

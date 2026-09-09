# VitrineLocal — Fase 1: Auditoria Técnica de Produção

Status: **em andamento**  
Data: 2026-09-09

## Objetivo

Validar a base técnica antes de liberar o VitrineLocal para uso comercial em produção. A fase 1 prioriza build, arquitetura, dependências, roteamento, segurança de acesso, persistência e capacidade de recuperação.

## Resultado inicial

### 1. Build / CI

- O projeto usa Vite + React 19 + Supabase JS.
- O workflow `CI` executa `npm install` e `npm run build` em Node 22.
- O último workflow verificado está **verde**.
- Ainda não existem testes automatizados de comportamento/E2E no CI.

**Status:** 🟡 aprovado para continuar auditoria; cobertura automatizada insuficiente para produção.

### 2. Dependências

- `package.json` está funcional e enxuto.
- Não há `package-lock.json` no repositório verificado.
- Isso reduz a reprodutibilidade exata do build entre ambientes.

**Ação:** gerar e versionar lockfile antes do deploy comercial.

### 3. Arquitetura frontend

A entrada principal é `src/main-clean.jsx`, com componentes React e acesso ao Supabase. Porém ainda existem vários runtimes legados em `src/` e a implementação atual de eventos usa `src/events-runtime.js` carregado diretamente pelo `index.html`.

O runtime de eventos manipula o DOM diretamente, usa `innerHTML` e um `setInterval` para observar a rota. A aplicação principal continua contendo referências à antiga comunidade/conteúdo.

**Risco:** duas camadas de UI podem disputar o DOM e gerar comportamento inconsistente em navegação, mobile e futuras alterações.

**Ação crítica:** migrar Agenda de Eventos para React dentro de `main-clean.jsx` e remover o runtime de transição. A remoção definitiva da comunidade deve ocorrer na mesma migração, não apenas por ocultação visual.

### 4. Roteamento

A função `parsePath()` da aplicação principal ainda não reconhece `/{cidade}/eventos`. A rota atualmente é criada pelo runtime de eventos, fora do roteador React.

**Status:** 🔴 precisa correção antes da produção.

### 5. Planos e limites

O componente `src/PlanUsageReact.jsx` agora é um componente React puro e consulta o plano efetivo e os consumos no Supabase. Isso evita a montagem duplicada do React.

A aplicação já possui proteção de limites no banco para recursos do plano. A etapa comercial ainda depende de checkout/webhook e reconciliação automática de assinatura.

**Status:** 🟡 tecnicamente encaminhado; monetização ainda não pronta.

### 6. Segurança

A aplicação depende de RLS e funções de banco para separar usuário comum e administrador. A auditoria anterior indicou proteção para campos administrativos sensíveis e operações de planos.

Pendências conhecidas:

- ativar proteção contra senhas vazadas no Supabase Auth;
- revisar políticas permissivas duplicadas;
- corrigir a política de `analytics_events` para usar o padrão de inicialização de `auth.uid()` recomendado pelo advisor;
- eliminar índices duplicados;
- revisar exposição de RPCs e funções `security definer` mantendo validação administrativa no banco;
- garantir que nenhuma chave secreta seja enviada ao frontend.

**Status:** 🟡 boa base, pendências de hardening.

### 7. Banco / versionamento

As alterações de schema feitas durante o desenvolvimento não estão representadas de forma completa por migrations versionadas no repositório. Isso é um risco operacional: um novo ambiente não consegue necessariamente reproduzir o banco apenas a partir do Git.

**Ação crítica:** consolidar migrations oficiais do schema atual, incluindo `events` e regras de planos/RLS, antes do deploy.

### 8. Produção ainda bloqueada por

1. checkout e webhooks de pagamento;
2. migrations reproduzíveis;
3. integração React definitiva da Agenda de Eventos;
4. testes E2E dos fluxos críticos;
5. recuperação de senha/e-mail e confirmação de cadastro revisados;
6. domínio, HTTPS e variáveis de ambiente de produção;
7. Termos, Privacidade, LGPD e fluxo de exclusão de conta/dados;
8. monitoramento/erros/backups;
9. piloto controlado com empresas reais.

## Ordem de execução da Fase 1

1. Corrigir arquitetura de eventos e retirar dependência do runtime DOM.
2. Eliminar/arquivar código legado que não é carregado.
3. Consolidar migrations do banco.
4. Aplicar hardening de RLS, índices e Auth.
5. Validar build novamente.
6. Criar testes automatizados para autenticação, cadastro de empresa, planos, limites, promoções e agenda.
7. Só então avançar para a Fase 2 (auditoria funcional).

## Critério de saída da Fase 1

A fase será considerada concluída quando:

- o build estiver verde;
- a aplicação tiver uma única arquitetura de UI para as telas principais;
- a Agenda de Eventos estiver integrada ao roteamento React;
- o schema puder ser recriado por migrations;
- RLS/Auth estiverem sem pendências críticas conhecidas;
- houver uma suíte mínima de testes automatizados para os fluxos de maior risco.

# VitrineLocal

SaaS de descoberta e divulgação de empresas, promoções e conteúdo local. O MVP começa em Laguna/SC e usa uma arquitetura multi-cidade desde o início.

## Stack

- React 19 + Vite 8
- Supabase Auth + Postgres + RLS
- GitHub como repositório

## Supabase

Projeto: `Vitrine` (`sa-east-1`).

O banco inicial contém cidades, categorias, empresas, fotos, produtos/serviços, promoções, posts, envios da comunidade, planos, assinaturas, anúncios e eventos de analytics. Laguna/SC, categorias e os planos Free/Pro/Premium já estão semeados.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto Supabase.
3. Rode `npm install`.
4. Rode `npm run dev`.

Nunca coloque chaves secretas/service role no frontend.

## MVP atual

- Home com busca e categorias.
- Catálogo de empresas.
- Login e criação de conta.
- Cadastro de empresa autenticado com status inicial `pending`.
- Área básica da conta.
- Estrutura para feed local, promoções, anúncios e analytics.
- Arquitetura preparada para adicionar novas cidades sem duplicar o produto.

## Próxima etapa

Adicionar aprovação administrativa, perfis públicos completos, upload de mídia via Storage, promoções, conteúdo da comunidade, geração de posts com IA, analytics do comerciante e integração oficial com Instagram/Meta.

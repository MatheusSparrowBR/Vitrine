# VitrineLocal

SaaS de descoberta e divulgação de empresas, promoções e conteúdo local. O MVP começa em Laguna/SC e usa uma arquitetura multi-cidade desde o início.

## Stack

- React 19 + Vite 8
- Supabase Auth + Postgres + RLS + Storage
- GitHub como repositório

## Supabase

Projeto: `Vitrine` (`sa-east-1`).

O banco contém cidades, categorias, empresas, fotos, produtos/serviços, promoções, posts, envios da comunidade, planos, assinaturas, anúncios e eventos de analytics. Laguna/SC, categorias e os planos Free/Pro/Premium já estão semeados.

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
- Perfis públicos completos.
- Promoções e área do comerciante.
- Envio de conteúdo da comunidade com moderação.
- Painel administrativo.
- Banner Premium da Home cadastrado/publicado somente pelo administrador.
- Upload das artes Premium para o bucket `premium-banners` do Supabase Storage.
- Upload de fotos e vídeos das empresas para `business-media`.
- Upload privado de fotos e vídeos enviados pela comunidade para `community-submissions`.
- Mídia da comunidade aprovada é copiada para `community-published` antes da publicação no feed.
- Arquitetura preparada para adicionar novas cidades sem duplicar o produto.

## Banner Premium da Home

- Espaço de destaque logo abaixo do hero da Home.
- Banner vinculado a uma empresa e cidade.
- Cadastro e publicação restritos ao administrador.
- Novo banner entra inativo/em revisão.
- A arte é validada no navegador e aceita JPG, PNG ou WebP de até 10 MB.
- A imagem é enviada para o Supabase Storage e o caminho do objeto é salvo em `advertisements.image_path`.
- Ao excluir um banner, o sistema tenta remover também o objeto correspondente do Storage.
- Admin pode publicar, pausar ou excluir.
- Prioridade controla a ordem.
- Início e fim permitem programação.
- Múltiplos banners alternam automaticamente na Home.
- Cobrança automática do Premium ficará conectada posteriormente; até lá, a confirmação é administrativa.

## Mídia de empresas e comunidade

- Empresa: proprietários autenticados podem enviar múltiplos arquivos de imagem/vídeo para a galeria da empresa.
- Comunidade: usuário autenticado pode enviar uma foto ou vídeo diretamente pelo formulário; o arquivo fica privado até a moderação.
- Administração: conteúdos pendentes usam URL assinada para pré-visualização.
- Aprovação: a mídia privada é transferida para o bucket público `community-published`, o post é criado e o arquivo privado é removido.
- Rejeição: a submissão é marcada como rejeitada e a mídia privada é removida.
- Buckets, limites de tamanho e políticas RLS são versionados nas migrations do Supabase.

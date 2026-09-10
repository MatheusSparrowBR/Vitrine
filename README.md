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

- Home comercial com busca, categorias, empresas em destaque, promoções, eventos e CTA para comerciantes.
- Catálogo de empresas com filtro por cidade/categoria.
- Diretório público otimizado via `public_business_directory` para leituras públicas de empresas.
- Login e criação de conta.
- Cadastro de empresa autenticado com status inicial `pending` e encaminhamento para escolha de plano.
- Perfis públicos completos com galeria e contato.
- Promoções e área do comerciante.
- Envio de conteúdo da comunidade com moderação.
- Painel administrativo com UX v2.
- Gestão administrativa de empresas, promoções, eventos, banners, categorias, cidades e planos.
- Edição/exclusão de promoções e publicação/pausa de campanhas.
- Banner Premium da Home cadastrado/publicado somente pelo administrador.
- Upload das artes Premium para o bucket `premium-banners` do Supabase Storage.
- Upload de fotos e vídeos das empresas para `business-media`.
- Upload privado de fotos e vídeos enviados pela comunidade para `community-submissions`.
- Mídia da comunidade aprovada é copiada para `community-published` antes da publicação no feed.
- Seção pública de planos na Home carregada da tabela `plans`.
- Área do comerciante para atualizar logo, capa e galeria com upload real para o Storage.
- Funil comercial: cadastro da empresa → escolha de plano → checkout Stripe para planos pagos → retorno e gerenciamento da assinatura.
- Analytics público por eventos (`page_view`, `profile_view`, `whatsapp_click`, `instagram_click`, `website_click`, `business_click`, `promotion_click`, `event_click`, `category_click`, `banner_click`).
- Dashboard de Analytics para administradores e comerciantes.
- Arquitetura preparada para adicionar novas cidades sem duplicar o produto.

## Planos

A Home apresenta os planos ativos cadastrados no Supabase:

- **Grátis** — R$ 0,00/mês
- **Pro** — R$ 29,90/mês ou R$ 299/ano
- **Premium** — R$ 59,90/mês ou R$ 599/ano

O comerciante pode começar no plano Grátis sem pagamento. Os planos pagos usam a Edge Function `create-checkout-session` e o portal de cobrança quando existe uma assinatura ativa. A sincronização de status depende da configuração das credenciais e webhook do Stripe no ambiente Supabase.

## Banner Premium da Home

- Espaço de destaque logo abaixo do hero da Home.
- Banner vinculado a uma empresa e cidade.
- Cadastro e publicação restritos ao administrador.
- A arte é validada no navegador e aceita JPG, PNG ou WebP de até 10 MB.
- A imagem é enviada para o Supabase Storage e o caminho do objeto é salvo em `advertisements.image_path`.
- Ao excluir um banner, o sistema tenta remover também o objeto correspondente do Storage.
- Admin pode publicar, pausar, editar ou excluir.
- Prioridade controla a ordem.
- Início e fim permitem programação.
- Múltiplos banners elegíveis alternam automaticamente na Home.

## Mídia de empresas e comunidade

- **Empresa:** proprietários autenticados podem atualizar logo e capa e enviar múltiplos arquivos de imagem/vídeo para a galeria da empresa.
- **Galeria:** arquivos são armazenados em `business-media`; cada item mantém URL, caminho do Storage e tipo de mídia em `business_photos`.
- **Exclusão:** excluir uma mídia remove o registro e tenta remover também o objeto do Storage.
- **Perfil público:** a galeria diferencia imagens e vídeos e apresenta a logo cadastrada na identidade do perfil.
- **Comunidade:** usuário autenticado pode enviar foto e/ou vídeo diretamente pelo formulário; a mídia fica privada até a moderação.
- **Administração:** conteúdos pendentes usam URL assinada para pré-visualização.
- **Aprovação:** a mídia privada é transferida para `community-published`, o post é criado e o arquivo privado é removido.
- **Rejeição:** a submissão é marcada como rejeitada e a mídia privada é removida.
- Buckets, limites de tamanho e políticas RLS são versionados nas migrations do Supabase.

## Analytics

O rastreador global registra eventos anônimos no Supabase quando o backend está configurado. A página `/admin/analytics` consolida os eventos e assinaturas da plataforma. A página `/conta/analytics` mostra o desempenho da empresa selecionada nos últimos 30 dias. Nenhuma chave secreta ou service role é usada no frontend.

## Diagnóstico do diretório público

As leituras públicas de `businesses` feitas pelo frontend são redirecionadas para `public_business_directory`, preservando o formato esperado pelos componentes React (`categories` e `cities`). O runtime também cria um painel de diagnóstico fixo quando uma requisição ao Supabase retorna erro HTTP ou falha de rede, mostrando operação, status e mensagem sem expor chaves ou cabeçalhos.

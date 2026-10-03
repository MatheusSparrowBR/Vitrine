# Fase SEO 3 — Search Console

## Propriedade recomendada

Usar uma **Propriedade do domínio**:

`vitrinelocal.net`

Ela cobre as variantes do domínio, incluindo `www` e diferentes protocolos. A verificação da propriedade de domínio é feita pelo provedor DNS, normalmente com um registro TXT fornecido pelo Google Search Console.

Fonte oficial:
https://support.google.com/webmasters/answer/9008080?hl=pt-BR

## Verificação

1. Abrir o Google Search Console.
2. Adicionar a propriedade `vitrinelocal.net` como **Domínio**.
3. Copiar o registro TXT fornecido pelo Google.
4. Adicionar o TXT no DNS do domínio.
5. Concluir a verificação no Search Console.

O valor do TXT deve ser exatamente o fornecido pelo Google; ele não deve ser inventado ou substituído por outro valor.

## Sitemap

O VitrineLocal publica:

`https://vitrinelocal.net/sitemap.xml`

O `robots.txt` já declara esse sitemap.

Depois de verificar a propriedade:

1. Abrir o relatório **Sitemaps**.
2. Enviar `sitemap.xml`.
3. Confirmar que o status de leitura é aceito.
4. Acompanhar as URLs descobertas e a indexação no relatório de páginas.

Fonte oficial:
https://support.google.com/webmasters/answer/7451001?hl=pt-BR

## Inspeção inicial

Após a publicação da Fase 3, inspecionar no Search Console pelo menos:

- `https://vitrinelocal.net/`
- `https://vitrinelocal.net/laguna`
- uma página de categoria, por exemplo `/laguna/empresas?categoria=restaurantes`
- uma página individual de empresa
- `https://vitrinelocal.net/laguna/eventos`

Verificar:

- URL canônica escolhida;
- disponibilidade para rastreamento;
- noindex ausente nas páginas públicas;
- dados estruturados detectados;
- versão renderizada da página.

O Google observa que o novo rastreamento e a reindexação podem levar vários dias após a publicação. 

## Critério de acompanhamento

Não usar o Search Console como confirmação imediata de indexação após cada deploy. Acompanhar:

- sitemap lido sem erro;
- páginas descobertas;
- páginas indexadas;
- impressões;
- cliques;
- consultas de pesquisa;
- problemas de cobertura;
- problemas de dados estruturados.

A presença no sitemap ajuda o Google a descobrir URLs, mas não garante que todas serão indexadas.

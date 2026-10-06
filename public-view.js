const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function renderDetail(template, item, collection) {
  if (!item) return template;
  const project = collection === 'projetos';
  const title = escape(item.titulo);
  const label = project ? 'Projeto' : item.tipo === 'evento' ? 'Evento' : 'Notícia';
  const date = item.data ? new Date(item.data + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
  const when = item.dataEvento ? new Date(item.dataEvento + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + (item.horaEvento ? ' às ' + item.horaEvento : '') : item.horario;
  const image = item.imagem ? `<img class="post-cover" src="${escape(item.imagem)}" alt="${escape(item.imagemAlt || item.titulo)}">` : '';
  const event = !project && item.tipo === 'evento' ? `<div class="post-event">${when ? `<p>Quando: ${escape(when)}</p>` : ''}${item.dataEvento && item.horario ? `<p>Observações: ${escape(item.horario)}</p>` : ''}${item.local ? `<p>Local: ${escape(item.local)}</p>` : ''}</div>` : '';
  const base = process.env.AMABA_SITE_URL?.replace(/\/$/, '');
  const page = project ? 'projeto.html' : 'postagem.html';
  const share = base ? `<link rel="canonical" href="${escape(`${base}/${page}?id=${encodeURIComponent(item.id)}`)}"><meta property="og:url" content="${escape(`${base}/${page}?id=${encodeURIComponent(item.id)}`)}">${item.imagem ? `<meta property="og:image" content="${escape(new URL(item.imagem, base + '/').href)}">` : ''}` : '';
  const article = `<article id="post-article"><span class="eyebrow">${label}</span><h1>${title}</h1>${date ? `<p>Publicado em ${date} · AMABA</p>` : ''}<p class="section-lead">${escape(item.resumo)}</p>${image}${event}<div class="post-body">${(item.paragrafos || []).map(p => `<p>${escape(p)}</p>`).join('')}</div></article>`;
  return template.replace(/<title>.*?<\/title>/, () => `<title>${title} | AMABA</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escape(item.resumo)}"><meta property="og:title" content="${title} | AMABA"><meta property="og:description" content="${escape(item.resumo)}"><meta property="og:type" content="article">${share}`)
    .replace(/<article id="post-article"[\s\S]*?<\/article>/, () => article)
    .replace(/<div id="post-missing"[\s\S]*?<\/div>/, '')
    .replace(/<p id="post-loading"[\s\S]*?<\/p>/, '')
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .replace(/<script src="assets\/postagens.js" defer><\/script>/, '');
}
function renderListing(template, posts) {
  const visiblePosts = template.includes('data-news-only') ? posts.filter(p => p.tipo === 'noticia') : posts;
  const items = [...visiblePosts].sort((a,b) => b.data.localeCompare(a.data));
  const cards = items.map(item => `<article class="post-card">${item.imagem ? `<img src="${escape(item.imagem)}" alt="${escape(item.imagemAlt || item.titulo)}" loading="lazy">` : ''}<div class="post-card-body"><span class="eyebrow">${item.tipo === 'evento' ? 'Evento' : 'Notícia'}</span><h2>${escape(item.titulo)}</h2><p>${escape(item.resumo)}</p><a class="text-link" href="postagem.html?id=${encodeURIComponent(item.id)}">Ler publicação →</a></div></article>`).join('');
  let html = template.replace(/<div id="post-grid" class="post-grid"><\/div>/, () => `<div id="post-grid" class="post-grid">${cards}</div>`)
    .replace(/(<p id="post-count"[^>]*>).*?(<\/p>)/, `$1${items.length} ${items.length === 1 ? 'publicação encontrada' : 'publicações encontradas'}$2`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript><p>A busca e os filtros precisam de JavaScript. As publicações estão disponíveis abaixo.</p></noscript>');
  if (!items.length) html = html.replace('id="post-empty" hidden', 'id="post-empty"');
  return html;
}
module.exports = { renderDetail, renderListing, escape };

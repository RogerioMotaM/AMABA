(async () => {
  let data;
  try { const response = await fetch('/api/conteudo'); if (!response.ok) throw new Error(); data = await response.json(); } catch {
    for (const target of document.querySelectorAll('.publication-card, .partner-placeholder, .update-box')) {
      const message = document.createElement('p'); message.textContent = 'Não foi possível carregar as atualizações. ';
      const button = document.createElement('button'); button.className = 'button button-outline'; button.textContent = 'Tentar novamente'; button.onclick = () => location.reload(); message.append(button); message.setAttribute('role', 'status'); target.replaceChildren(message);
    }
    return;
  }
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
  function card(item, collection) {
    const article = node('article', '', collection === 'parceiros' ? 'post-card partner-card' : 'post-card');
    if (item.imagem) { const img = node('img'); img.src = item.imagem; img.alt = item.imagemAlt || item.titulo || item.nome; img.loading = 'lazy'; article.append(img); }
    const body = node('div', '', 'post-card-body'); body.append(node('h3', item.titulo || item.nome), node('p', item.resumo));
    if (collection === 'publicacoes') { const link = node('a', 'Ler publicação →', 'text-link'); link.href = `postagem.html?id=${encodeURIComponent(item.id)}`; body.append(link); }
    if (collection === 'projetos') { const link = node('a', 'Conhecer projeto →', 'text-link'); link.href = `projeto.html?id=${encodeURIComponent(item.id)}`; body.append(link); }
    if (collection === 'parceiros' && item.url) { const link = node('a', 'Conhecer parceiro ↗', 'text-link'); link.href = item.url; body.append(link); }
    if (item.tipo === 'evento' && (item.dataEvento || item.horario)) body.append(node('p', item.dataEvento ? new Date(item.dataEvento + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + (item.horaEvento ? ' às ' + item.horaEvento : '') : item.horario));
    article.append(body); return article;
  }
  function replace(target, items, collection) {
    if (!target || !items.length) return;
    const grid = node('div', '', 'post-grid'); items.forEach(item => grid.append(card(item, collection))); target.replaceWith(grid);
  }
  const posts = data.publicacoes.sort((a,b) => b.data.localeCompare(a.data));
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const nextEvents = posts.filter(p => p.tipo === 'evento' && p.dataEvento && p.dataEvento >= today).sort((a,b) => (a.dataEvento + (a.horaEvento || '')).localeCompare(b.dataEvento + (b.horaEvento || '')));
  if (location.pathname.endsWith('noticias.html')) {
    replace(document.querySelector('#noticias-lista .publication-card'), posts.filter(p => p.tipo === 'noticia'), 'publicacoes');
    const featured = document.querySelector('#noticias-lista .post-card');
    if (featured?.querySelector('img')) featured.classList.add('featured-news');
    const target = document.querySelector('#eventos-lista .publication-card');
    const events = posts.filter(p => p.tipo === 'evento');
    if (target && events.length) {
      const container = node('div');
      const groups = [['Próximos eventos', nextEvents], ['Eventos encerrados', events.filter(p => p.dataEvento && p.dataEvento < today).sort((a,b) => b.dataEvento.localeCompare(a.dataEvento))], ['Outros eventos', events.filter(p => !p.dataEvento)]];
      for (const [title, items] of groups) if (items.length) { container.append(node('h3', title)); const grid = node('div', '', 'post-grid'); items.forEach(item => grid.append(card(item, 'publicacoes'))); container.append(grid); }
      target.replaceWith(container);
    }
  }
  if (location.pathname.endsWith('projetos.html')) replace(document.querySelector('.publication-card'), data.projetos, 'projetos');
  if (location.pathname.endsWith('parceiros.html')) replace(document.querySelector('.partner-placeholder'), data.parceiros, 'parceiros');
  if (location.pathname === '/' || location.pathname.endsWith('index.html')) {
    const news = posts.filter(p => p.tipo === 'noticia').slice(0, 2), events = nextEvents.slice(0, 2);
    for (const [id, title, items] of [['noticias-title', 'Últimas notícias', news], ['eventos-title', 'Próximos eventos', events]]) {
      const target = document.querySelector(`[aria-labelledby="${id}"]`);
      if (target && items.length) { const group = node('div'); const heading = node('h2', title); heading.id = id; group.append(heading); const grid = node('div', '', 'post-grid'); items.forEach(item => grid.append(card(item, 'publicacoes'))); group.append(grid); target.replaceWith(group); }
    }
  }
})();

// Publicações são carregadas do servidor; o painel controla rascunhos e publicação.
const publicacoes = [];

(async () => {
  try {
    const response = await fetch('/api/conteudo');
    if (!response.ok) throw new Error('Conteúdo indisponível');
    const posts = (await response.json()).publicacoes;
    publicacoes.push(...(document.querySelector('[data-news-only]') ? posts.filter(post => post.tipo === 'noticia') : posts));
  } catch {
    const loading = document.querySelector('#post-loading');
    if (loading) loading.hidden = true;
    const target = document.querySelector('#post-count') || document.querySelector('#post-missing p');
    if (target) {
      target.textContent = 'Não foi possível carregar o conteúdo. ';
      const button = document.createElement('button'); button.className = 'button button-outline'; button.textContent = 'Tentar novamente'; button.onclick = () => location.reload(); target.append(button);
    }
    const missing = document.querySelector('#post-missing');
    if (missing) { missing.hidden = false; missing.querySelector('h1').textContent = 'Conteúdo indisponível no momento.'; }
    return;
  }
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const label = post => post.tipo === 'evento' ? 'Evento' : 'Notícia';
  const date = value => {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
  };
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const image = post => {
    const node = el('img');
    node.src = post.imagem;
    node.alt = post.imagemAlt || post.titulo;
    node.loading = 'lazy';
    return node;
  };
  if (document.querySelector('[data-post-list]')) {
    const search = document.querySelector('#post-search');
    const category = document.querySelector('#post-category');
    const render = () => {
      const query = normalize(search.value.trim());
      const posts = publicacoes.filter(post => (!category.value || post.tipo === category.value) && normalize(`${post.titulo} ${post.resumo}`).includes(query)).sort((a, b) => b.data.localeCompare(a.data));
      const grid = document.querySelector('#post-grid');
      grid.replaceChildren();
      posts.forEach(post => {
        const card = el('article', '', 'post-card');
        if (post.imagem) card.append(image(post));
        const body = el('div', '', 'post-card-body');
        body.append(el('span', `${label(post)} · ${date(post.data)}`, 'eyebrow'), el('h2', post.titulo), el('p', post.resumo));
        const link = el('a', 'Ler publicação →', 'text-link');
        link.href = `postagem.html?id=${encodeURIComponent(post.id)}`;
        link.setAttribute('aria-label', `Ler publicação: ${post.titulo}`);
        body.append(link);
        card.append(body);
        grid.append(card);
      });
      document.querySelector('#post-count').textContent = `${posts.length} ${posts.length === 1 ? 'publicação encontrada' : 'publicações encontradas'}`;
      const empty = document.querySelector('#post-empty');
      empty.hidden = posts.length > 0;
      empty.querySelector('h2').textContent = publicacoes.length ? 'Nenhuma publicação encontrada.' : 'Nenhuma publicação por enquanto.';
      empty.querySelector('p').textContent = publicacoes.length ? 'Experimente outro assunto ou selecione todos os tipos de publicação.' : 'As notícias e os eventos serão apresentados aqui quando publicados pela AMABA.';
    };
    document.querySelector('.post-filters').addEventListener('submit', event => event.preventDefault());
    search.addEventListener('input', render);
    category.addEventListener('change', render);
    render();
  }
  if (document.querySelector('[data-post-detail]')) {
    const id = new URLSearchParams(location.search).get('id');
    const post = publicacoes.find(item => item.id === id);
    document.querySelector('#post-loading').hidden = true;
    if (!post) { document.querySelector('#post-missing').hidden = false; return; }
    document.querySelector('#post-missing').hidden = true;
    document.querySelector('#post-article').hidden = false;
    document.title = `${post.titulo} | AMABA`;
    document.querySelector('meta[name="description"]').content = post.resumo;
    document.querySelector('#post-type').textContent = label(post);
    document.querySelector('#post-title').textContent = post.titulo;
    document.querySelector('#post-meta').textContent = `Publicado em ${date(post.data)} · AMABA`;
    document.querySelector('#post-summary').textContent = post.resumo;
    if (post.imagem) {
      const cover = document.querySelector('#post-image');
      cover.src = post.imagem;
      cover.alt = post.imagemAlt || post.titulo;
      cover.hidden = false;
    }
    if (post.tipo === 'evento' && (post.local || post.horario)) {
      const info = document.querySelector('#post-event');
      info.hidden = false;
      if (post.local) info.append(el('p', `Local: ${post.local}`));
      if (post.horario) info.append(el('p', `Quando: ${post.horario}`));
    }
    (post.paragrafos || []).forEach(paragraph => document.querySelector('#post-body').append(el('p', paragraph)));
  }
})();

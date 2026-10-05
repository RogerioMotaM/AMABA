(() => {
  const $ = selector => document.querySelector(selector);
  const labels = { publicacoes: 'Publicações', projetos: 'Projetos', parceiros: 'Parceiros' };
  let csrf = '', section = 'publicacoes', data = {}, dirty = false, account = {}, revision = 1, uploading = false;
  const leave = () => { if (uploading) { status('Aguarde o envio da foto antes de continuar.'); return false; } return !dirty || confirm('Há alterações não salvas. Deseja descartá-las?'); };
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  const status = text => { $('#status').textContent = text; };
  async function api(url, method = 'GET', value) {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: value ? JSON.stringify(value) : undefined });
    let result; try { result = await response.json(); } catch { throw new Error('Servidor indisponível. Tente novamente.'); }
    if (!response.ok) { if (response.status === 401) showLogin(); throw new Error(result.erro || 'Não foi possível concluir.'); }
    return result;
  }
  function showLogin() { $('#login').hidden = false; $('#panel').hidden = true; $('#logout').hidden = true; csrf = ''; }
  function node(tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
  async function load() { data = await api('/api/admin/conteudo'); $('#login').hidden = true; $('#panel').hidden = false; $('#logout').hidden = false; $('#account-name').textContent = `Conectada como ${account.usuario} · ${account.role === 'admin' ? 'Administrador' : 'Editor'}`; $('#user-management').hidden = account.role !== 'admin'; render(); if (account.role === 'admin') await loadUsers(); }
  async function loadUsers() {
    const users = await api('/api/admin/usuarios'); $('#users-list').replaceChildren();
    users.forEach(user => { const row = node('div', '', 'admin-record'); row.append(node('div', `${user.username} · ${user.role === 'admin' ? 'Administrador' : 'Editor'}`)); if (user.username !== account.usuario) { const button = node('button', 'Remover acesso', 'button admin-delete'); button.onclick = async () => { if (!confirm(`Remover o acesso de ${user.username}?`)) return; try { await api('/api/admin/usuarios/' + encodeURIComponent(user.username), 'DELETE'); await loadUsers(); status('Acesso removido.'); } catch(e) { status(e.message); } }; row.append(button); } $('#users-list').append(row); });
    const entries = await api('/api/admin/auditoria'); $('#audit-list').replaceChildren();
    entries.reverse().slice(0, 20).forEach(entry => $('#audit-list').append(node('p', `${new Date(entry.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${entry.usuario} · ${entry.acao} · ${entry.colecao}`)));
  }
  function render() {
    $('#stats').replaceChildren();
    Object.entries(labels).forEach(([key, text]) => { const card = node('div', '', 'admin-stat'); card.append(node('strong', String(data[key].length)), node('span', text)); $('#stats').append(card); });
    $('#list-title').textContent = labels[section];
    document.querySelectorAll('[data-section]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.section === section)));
    $('#records').replaceChildren();
    const query = $('#admin-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const items = data[section].filter(item => (item.titulo || item.nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    if (!items.length) $('#records').append(node('p', data[section].length ? 'Nenhum cadastro encontrado.' : 'Nenhum cadastro ainda. Clique em “Novo cadastro” para começar.'));
    items.forEach(item => {
      const row = node('article', '', 'admin-record'), text = node('div', '');
      text.append(node('h3', item.titulo || item.nome), node('p', `${item.publicado ? 'Publicado' : 'Rascunho'}${item.data ? ' · ' + item.data : ''}`));
      const edit = node('button', 'Editar', 'button button-outline'); edit.onclick = () => editor(item);
      const remove = node('button', 'Excluir', 'button admin-delete');
      remove.onclick = async () => { if (!leave() || !confirm(`Excluir “${item.titulo || item.nome}”? Essa ação remove o cadastro do site.`)) return; try { await api(`/api/admin/${section}/${item.id}`, 'DELETE'); dirty = false; $('#editor').hidden = true; await load(); status('Cadastro excluído.'); } catch (e) { status(e.message); } };
      row.append(text, edit, remove); $('#records').append(row);
    });
  }
  function fields() {
    document.querySelectorAll('[data-post-field]').forEach(el => el.hidden = section !== 'publicacoes');
    document.querySelectorAll('[data-partner-field]').forEach(el => el.hidden = section !== 'parceiros');
    document.querySelectorAll('[data-text-field]').forEach(el => el.hidden = section === 'parceiros');
    document.querySelectorAll('[data-event-field]').forEach(el => el.hidden = section !== 'publicacoes' || $('#record-type').value !== 'evento');
    $('#record-date').required = section === 'publicacoes';
    $('#record-event-date').required = section === 'publicacoes' && $('#record-type').value === 'evento' && $('#record-published').checked;
    $('#title-label').textContent = section === 'parceiros' ? 'Nome do parceiro' : 'Título';
  }
  function editor(item = {}) {
    if (!leave()) return;
    $('#edit-form').reset(); $('#record-id').value = item.id || '';
    revision = item.revisao || 1;
    $('#record-title').value = item.titulo || item.nome || '';
    $('#record-type').value = item.tipo || 'noticia';
    $('#record-date').value = item.data || new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    for (const [field, key] of [['summary','resumo'],['image','imagem'],['alt','imagemAlt'],['url','url'],['location','local'],['time','horario']]) $(`#record-${field}`).value = item[key] || '';
    $('#record-body').value = (item.paragrafos || []).join('\n\n'); $('#record-published').checked = item.publicado || false;
    $('#record-event-date').value = item.dataEvento || ''; $('#record-event-time').value = item.horaEvento || '';
    dirty = false; preview();
    $('#editor-title').textContent = item.id ? 'Editar cadastro' : 'Novo cadastro'; fields(); $('#editor').hidden = false; $('#editor').scrollIntoView({ behavior: 'smooth' }); $('#record-title').focus();
  }
  $('#login-form').onsubmit = async event => { event.preventDefault(); const button = event.submitter; button.disabled = true; try { const result = await api('/api/login', 'POST', { usuario: $('#username').value.trim(), senha: $('#password').value }); csrf = result.csrf; account = result; $('#password').value = ''; await load(); status(''); } catch (e) { status(e.message); } finally { button.disabled = false; } };
  $('#password-form').onsubmit = async event => { event.preventDefault(); event.submitter.disabled = true; try { await api('/api/admin/senha', 'POST', { atual: $('#current-password').value, nova: $('#new-password').value }); $('#password-form').reset(); status('Senha alterada.'); } catch(e) { status(e.message); } finally { event.submitter.disabled = false; } };
  $('#user-form').onsubmit = async event => { event.preventDefault(); event.submitter.disabled = true; try { await api('/api/admin/usuarios', 'POST', { usuario: $('#new-username').value, senha: $('#user-password').value, role: $('#user-role').value }); $('#user-form').reset(); await loadUsers(); status('Acesso criado.'); } catch(e) { status(e.message); } finally { event.submitter.disabled = false; } };
  $('#logout').onclick = async () => { if (!leave()) return; try { await api('/api/logout', 'POST'); dirty = false; showLogin(); status('Você saiu da administração.'); } catch(e) { status(e.message); } };
  document.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { if (!leave()) return; dirty = false; section = button.dataset.section; $('#admin-search').value = ''; $('#editor').hidden = true; render(); status(''); });
  $('#new').onclick = () => editor(); $('#cancel').onclick = () => { if (leave()) { dirty = false; $('#editor').hidden = true; } }; $('#record-type').onchange = fields;
  $('#admin-search').oninput = render;
  $('#record-published').onchange = fields;
  $('#edit-form').addEventListener('input', () => { dirty = true; });
  function preview() { const image = $('#image-preview'); const url = $('#record-image').value.trim(); image.hidden = !url; if (url && /^(assets\/|https:\/\/)/.test(url)) image.src = url; else image.removeAttribute('src'); }
  $('#record-image').oninput = preview;
  $('#image-preview').onerror = () => { $('#image-preview').hidden = true; status('Não foi possível exibir a imagem. Verifique o endereço.'); };
  $('#image-upload').onchange = async () => {
    const file = $('#image-upload').files[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 30 * 1024 * 1024) { status('Selecione uma foto JPG, PNG ou WebP de até 30 MB.'); return; }
    const control = $('#image-upload'); control.disabled = true; uploading = true;
    try {
      const bitmap = await createImageBitmap(file), canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const image = canvas.toDataURL('image/webp', .82); if (!image.startsWith('data:image/webp;')) throw new Error('Este navegador não permite otimizar a imagem.');
      const result = await api('/api/admin/upload', 'POST', { imagem: image }); $('#record-image').value = result.path; dirty = true; preview(); status('Foto enviada. Salve o cadastro para utilizá-la.');
    } catch (e) { status(e.message); } finally { control.disabled = false; uploading = false; }
  };
  $('#preview-record').onclick = () => {
    const content = $('#preview-content'); content.replaceChildren(node('span', 'Prévia do cadastro', 'eyebrow'), node('h2', $('#record-title').value), node('p', $('#record-summary').value));
    if ($('#record-image').value) { const image = node('img', '', 'post-cover'); image.src = $('#record-image').value; image.alt = $('#record-alt').value; content.append(image); }
    $('#record-body').value.split(/\n\s*\n/).filter(Boolean).forEach(text => content.append(node('p', text)));
    $('#preview-dialog').showModal();
  };
  $('#close-preview').onclick = () => $('#preview-dialog').close();
  $('#edit-form').onsubmit = async event => {
    event.preventDefault(); if (uploading) { status('Aguarde o envio da foto antes de salvar.'); return; } const button = event.submitter; button.disabled = true;
    const item = { revisao: revision, titulo: section === 'parceiros' ? '' : $('#record-title').value, nome: section === 'parceiros' ? $('#record-title').value : '', tipo: $('#record-type').value, data: $('#record-date').value, dataEvento: $('#record-event-date').value, horaEvento: $('#record-event-time').value, publicado: $('#record-published').checked, paragrafos: $('#record-body').value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) };
    for (const [field,key] of [['summary','resumo'],['image','imagem'],['alt','imagemAlt'],['url','url'],['location','local'],['time','horario']]) item[key] = $(`#record-${field}`).value;
    const id = $('#record-id').value;
    try { await api(`/api/admin/${section}${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', item); dirty = false; $('#editor').hidden = true; await load(); status('Cadastro salvo.'); } catch(e) { status(e.message); } finally { button.disabled = false; }
  };
  (async () => { try { const response = await fetch('/api/session'); if (response.ok) { account = await response.json(); csrf = account.csrf; await load(); } else if (response.status !== 401) status('Inicie o servidor AMABA para acessar a administração.'); } catch { status('Inicie o servidor AMABA para acessar a administração.'); } })();
})();

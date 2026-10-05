(() => {
  const form = document.querySelector('#intake-form'), content = document.querySelector('#intake-content');
  const download = document.querySelector('#intake-download'), remove = document.querySelector('#intake-delete');
  let data, csrf, busy = false;
  const status = (message, error = false) => { const el = document.querySelector('#intake-status'); el.textContent = message; el.style.color = error ? '#a52539' : ''; };
  const lock = value => { busy = value; form.querySelector('[type=submit]').disabled = value; download.disabled = value || !data?.acolhimento; remove.disabled = value || !data?.acolhimento; };
  async function request(method = 'GET', input) {
    const response = await fetch('/api/familias/acolhimento', { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' }, ...(input ? { body: JSON.stringify(input) } : {}) });
    if (response.status === 401) { location.replace('login.html'); throw new Error('Entre novamente.'); }
    const result = await response.json(); if (!response.ok) throw new Error(result.erro || 'Não foi possível concluir.'); return result;
  }
  function render() {
    const record = data.acolhimento;
    for (const field of ['cidade', 'uf', 'telefone']) form.elements[field].value = record?.[field] || '';
    form.elements.canal.value = record?.canal || 'email';
    form.elements.telefone.required = form.elements.canal.value !== 'email';
    form.querySelectorAll('[name=interesses]').forEach(el => { el.checked = record?.interesses.includes(el.value) || false; });
    // Every new submission asks for a fresh, explicit authorization.
    form.elements.consentimento.checked = false; form.elements.maioridade.checked = false;
    document.querySelector('#intake-expiry').textContent = record ? `Respostas salvas. Prazo de retenção até ${new Date(record.expiraEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.` : 'Você ainda não tem respostas armazenadas.';
    lock(false);
  }
  form.elements.canal.addEventListener('change', () => { form.elements.telefone.required = form.elements.canal.value !== 'email'; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return; lock(true); status('Salvando…');
    const input = Object.fromEntries(new FormData(form));
    input.interesses = [...form.querySelectorAll('[name=interesses]:checked')].map(el => el.value);
    input.consentimento = form.elements.consentimento.checked; input.maioridade = form.elements.maioridade.checked;
    try { const result = await request('PUT', input); data.acolhimento = result.acolhimento; render(); status('Formulário salvo. Você pode atualizar ou excluir suas respostas quando quiser.'); }
    catch (error) { status(error instanceof TypeError ? 'Não foi possível conectar. Tente novamente.' : error.message, true); lock(false); }
  });
  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ conta: data.conta, acolhimento: data.acolhimento }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'meus-dados-acolhimento-amaba.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  remove.addEventListener('click', async () => {
    if (busy || !confirm('Excluir as respostas do acolhimento e revogar sua autorização? Sua conta será mantida.')) return;
    lock(true);
    try { await request('DELETE'); data.acolhimento = null; render(); status('Respostas excluídas da base ativa e autorização revogada. Sua conta foi mantida.'); }
    catch (error) { status(error.message, true); lock(false); }
  });
  (async () => {
    try { data = await request(); csrf = data.csrf; document.querySelector('#intake-account').textContent = `Conta: ${data.conta.nome} · ${data.conta.email}. Esses dados não precisam ser preenchidos novamente.`; render(); document.querySelector('#intake-loading').hidden = true; content.hidden = false; }
    catch { document.querySelector('#intake-loading').textContent = 'Não foi possível carregar. Recarregue a página para tentar novamente.'; }
  })();
})();

# Administração da AMABA

Requer Node.js 22 ou mais recente. O site e a administração devem ser servidos pelo servidor incluído, pois hospedagem somente de HTML não executa os cadastros.

No PowerShell, na pasta do projeto:

```powershell
$env:AMABA_ADMIN_PASSWORD = Read-Host 'Defina a senha administrativa (mínimo 12 caracteres)'
npm start
```

Abra http://127.0.0.1:3000/admin.html e entre com usuário `admin` e a senha definida. Não há senha padrão. Inicialmente a senha vem do ambiente. Depois que um usuário é criado ou uma senha é alterada pelo painel, os acessos ficam em `data/usuarios.json`, com senhas protegidas por scrypt e salt individual. A variável inicial deixa de definir a senha dos usuários persistidos.

O painel permite criar, editar e excluir notícias, eventos, projetos e parceiros. Marque **Publicar no site** para disponibilizar um cadastro. Rascunhos aparecem somente no painel. Publicações alimentam a listagem, a leitura individual, Notícias e eventos e os destaques da página inicial. Projetos e parceiros publicados aparecem nas respectivas páginas.

O painel permite enviar JPG, PNG ou WebP de até 30 MB. O navegador reduz a foto a no máximo 1600 pixels e converte para WebP antes de enviar; o servidor limita o envio otimizado a aproximadamente 3 MB. Também é possível usar caminhos existentes em `assets/` ou endereços HTTPS. Conteúdo é texto simples, com parágrafos separados por linha em branco. Use a prévia antes de publicar. Eventos publicados exigem data própria, separada da data de publicação.

Os registros ficam em `data/conteudo.json`. O servidor preserva até 30 cópias anteriores em `data/backups/` antes de alterar o conteúdo. Faça também backup externo da pasta `data/` e das imagens `assets/upload-*.webp`. Não mantenha duas instâncias gravando no mesmo arquivo. O histórico das operações fica em `data/auditoria.ndjson`; não contém senhas. As sessões expiram após oito horas e são encerradas ao reiniciar o servidor.

Em **Minha conta e acessos da equipe**, administradores criam e removem usuários e consultam o histórico. Editores gerenciam conteúdo, mas não acessos. Cada pessoa pode alterar a própria senha. A remoção de um usuário encerra suas sessões; não é possível excluir o próprio acesso.

Para recuperar o acesso, o responsável pela hospedagem deve parar o servidor e executar:

```powershell
$env:AMABA_RESET_PASSWORD = Read-Host 'Nova senha (mínimo 12 caracteres)'
node scripts/reset-password.js nome-do-usuario
Remove-Item Env:AMABA_RESET_PASSWORD
```

Reinicie o servidor após a recuperação. Recuperação automática por e-mail não está incluída, pois o serviço de envio e os endereços oficiais ainda não foram definidos.

Para restaurar um backup de conteúdo, pare o servidor e execute:

```powershell
node scripts/restore.js data/backups/nome-do-backup.json
```

O script valida a estrutura e preserva uma cópia do estado anterior. Ele restaura o conteúdo, não os usuários nem as imagens. A restauração foi verificada com dados de teste.

Se outra pessoa salvar um cadastro enquanto você o edita, o servidor recusará a versão antiga em vez de sobrescrever a alteração. Copie o texto que deseja preservar, recarregue o painel e revise a versão atual. A proteção de concorrência funciona em uma única instância do servidor; várias instâncias exigem armazenamento com transações.

Para hospedagem, use um serviço que execute Node.js, mantenha armazenamento persistente e forneça HTTPS. Defina `HOST=0.0.0.0`, `PORT` conforme o provedor, `AMABA_ADMIN_PASSWORD` como segredo e `AMABA_SECURE_COOKIE=1` sob HTTPS. Opcionalmente `AMABA_DATA_FILE` define o caminho do arquivo persistente. Configure o proxy para preservar o cabeçalho Host. A publicação em hospedagem não foi realizada por esta implementação.

Defina `AMABA_SITE_URL=https://seu-dominio` para gerar `/sitemap.xml` com o endereço oficial. `/robots.txt` exclui administração e API do rastreamento. As páginas individuais de postagens e projetos e a listagem são renderizadas pelo servidor, inclusive sem JavaScript. O servidor responde 404 para publicações inexistentes ou rascunhos.

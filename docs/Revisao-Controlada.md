# Revisão controlada

## Alterações aplicadas

- Gravações de conteúdo sem leitura antiga durante o recebimento das requisições; revisão por cadastro para recusar edições desatualizadas.
- Até 30 backups anteriores do conteúdo e ferramenta de restauração que preserva o estado atual.
- Fotos WebP reduzidas a até 1600 pixels, mantendo os JPG originais. As referências públicas passaram a usar as versões otimizadas.
- Login com usuários individuais, senhas protegidas por scrypt, permissões de administrador/editor, troca de senha, recuperação pelo responsável da hospedagem e auditoria das alterações.
- Busca de cadastros, upload de fotos otimizado pelo navegador, prévia e aviso de alterações não salvas.
- Data e horário próprios para eventos; separação entre próximos, encerrados e cadastros antigos sem data estruturada.
- Página individual de projeto, renderização das páginas individuais e listagem pelo servidor, metadados de compartilhamento, página 404, robots e sitemap configurável.
- Tratamento de falhas de carregamento com opção de tentar novamente; ajustes de foco e proporções do círculo de projetos em telas pequenas.
- Textos de privacidade/termos alinhados ao acesso administrativo e documentação operacional atualizada.

## Verificações

`npm test` cobre acesso restrito, sessão, CSRF, rascunhos, cadastros, edição e exclusão, requisições simultâneas, conflito de revisão, datas inválidas, páginas renderizadas, conteúdo escapado, projetos individuais, sitemap, upload, permissões, remoção de acesso, alteração de senha, auditoria e restauração válida/inválida.

Também foram conferidos os links locais, a codificação UTF-8 e a sintaxe dos arquivos JavaScript.

## Pendências para lançamento

- Conferência visual e dos fluxos no navegador: a ferramenta da sessão não disponibilizou nenhum navegador, portanto esta validação não foi concluída.
- Contatos, doações, dados institucionais e conteúdos aprovados da AMABA.
- Domínio, HTTPS, armazenamento persistente e cópia externa dos backups e das imagens enviadas.
- Definição de serviço de e-mail, caso seja desejada recuperação automática de senha.
- Cadastro e acompanhamento das mães continuam sendo um módulo futuro, separado do conteúdo público. Nenhum dado das famílias é coletado por esta implementação.
- O armazenamento continua em arquivos. É adequado a uma instância; operação com múltiplas instâncias exige banco de dados e transações.

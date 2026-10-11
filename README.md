# Ki-eventos — versão de desenvolvimento

Plataforma de convites digitais para particulares e profissionais/empresas, com interface em português e moeda preparada para Angola.

## Incluído nesta entrega
- Landing page responsiva com modelos de demonstração.
- Registo, início de sessão e pedido de recuperação de palavra-passe via Supabase Auth.
- Painel do organizador com lista de eventos e pesquisa.
- Criar e editar eventos.
- Publicar/despublicar convites.
- Páginas públicas por URL `/convite/:slug`.
- RSVP público através de função SQL restrita.
- Painel de respostas RSVP, estatísticas e exportação CSV.
- Partilha por WhatsApp e cópia de link.
- Migrações SQL iniciais com RLS.
- Estrutura de base para planos e subscrições em Kz.
- Instruções para GitHub, Vercel e Supabase.

## Limites importantes
Este é um MVP de desenvolvimento. Antes de produção, ainda é necessário testar os fluxos no projecto Supabase real, aplicar medidas de limitação de abuso no RSVP público, testar políticas RLS, implementar armazenamento de imagens e escolher/validar um fornecedor de pagamentos. O painel profissional já pode usar o tipo de conta do perfil quando for criada a interface de perfil; a separação de organizações/equipas e permissões avançadas ainda não está implementada. Não existe integração de pagamento activa nem se deve anunciar que pagamentos são aceites até ao onboarding comercial e testes reais.

## 1. Requisitos
- Node.js LTS
- Git
- Conta GitHub
- Conta Vercel
- Projecto Supabase

## 2. Executar localmente
```bash
npm install
cp .env.example .env.local
```
Edita `.env.local` com:
```env
VITE_SUPABASE_URL=https://TEU-PROJECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=A_TUA_CHAVE_PUBLICA
VITE_SITE_URL=http://localhost:5173
```
Depois:
```bash
npm run dev
```
Abre o URL que o Vite indicar.

## 3. Configurar Supabase
1. Cria um projecto Supabase.
2. Em SQL Editor, executa `supabase/migrations/001_initial_schema.sql`.
3. Executa `supabase/migrations/002_payments_foundation.sql`.
4. Em Authentication → URL Configuration, define o Site URL local e depois o domínio de produção; adiciona URLs de redireccionamento usadas no teu ambiente.
5. Configura confirmação de e-mail de acordo com o que pretendes para a aplicação.
6. Copia Project URL e a chave pública anon/publishable para o ambiente local e para a Vercel.
7. Testa com contas e eventos de teste antes de utilizar dados reais.

**Nunca coloques `service_role` ou segredos de pagamentos em variáveis `VITE_*`, no frontend ou no GitHub.**

### Notas de segurança
- A função `get_public_event` só retorna eventos publicados e não expõe respostas.
- A função `submit_public_rsvp` valida evento, prazo, estado, acompanhantes e tamanho de campos.
- RSVP anónimo continua sujeito a spam/abuso; adicionar rate limiting/CAPTCHA ou gateway antes de produção.
- Confirma as políticas RLS no painel Supabase e testa com dois utilizadores distintos.
- As políticas de plano/subscrição não permitem ao utilizador alterar o estado para `paid`.

## 4. GitHub
Cria um repositório `ki-eventos`, extrai o ZIP, abre terminal na pasta e executa:
```bash
git init
git add .
git commit -m "Ki-eventos MVP"
git branch -M main
git remote add origin https://github.com/TEU-UTILIZADOR/ki-eventos.git
git push -u origin main
```
Se o repositório já tiver ficheiros, integra-os com cuidado em vez de substituir sem revisão.

## 5. Vercel
1. Importa o repositório GitHub na Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Adiciona `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SITE_URL` nas Environment Variables.
6. Para rotas directas `/convite/slug`, a regra de rewrite já está no `vercel.json`.
7. Faz redeploy após mudar variáveis.

## 6. Pagamentos em Angola
A migração `002_payments_foundation.sql` cria planos e subscrições em kwanzas (AOA), mas não inicia cobranças. Antes de implementar, contactar os fornecedores e confirmar disponibilidade comercial, taxas, liquidação, requisitos legais, API, ambiente de testes e assinatura de callbacks. Avaliar:
- EMIS / Gateway de Pagamentos Online: https://multicaixa.ao/pt/oferta/canais/comerciantes/gateway-de-pagamentos-online/
- AppyPay: https://www.appypay.co.ao/api-info
- ProxyPay: https://developer.proxypay.co.ao/opg/v1/

O fluxo deve ser criado no servidor: iniciar como `pending`, confirmar a transacção por callback/webhook autenticado e só então marcar `paid`. Nunca confiar apenas no redireccionamento do browser.

## 7. Próximas tarefas de produção
1. Testes end-to-end e revisão de SQL/RLS por pessoa qualificada.
2. Rate limiting/CAPTCHA para RSVP e logs de abuso.
3. Upload de imagens para Supabase Storage com políticas por proprietário.
4. Perfil do utilizador, tipo de conta e ferramentas profissionais.
5. Multi-utilizador/equipas para empresas de eventos.
6. Fornecedor de pagamentos seleccionado e Edge Function implementada.
7. Termos de utilização, política de privacidade e processo de eliminação/exportação de dados.
8. Monitorização de erros, backups e teste de recuperação.

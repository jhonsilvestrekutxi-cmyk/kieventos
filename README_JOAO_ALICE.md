# Convite Digital — João & Alice (baseado no modelo VowsFlow/Kutxi)

Este projeto usa como modelo a aplicação React/TypeScript enviada, preservando a estrutura de gestão de convidados, RSVP, dashboard dos noivos, editor visual, QR check-in, galerias e integração Supabase.

## Iniciar localmente
1. Instale Node.js 20+.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local`.
4. Execute `npm run dev`.
5. Abra o endereço indicado pelo Vite.

## Acessos de demonstração
- Utilizador: `admin`
- Senha inicial: `0315`

**Segurança:** estas credenciais são apenas para demonstração/local. A autenticação estática/local não é adequada para proteger um site público. Antes de publicar com RSVP real, configure autenticação segura no Supabase, RLS e permissões do administrador. Não reutilize a senha inicial em produção.

## Links para testar
- Página inicial/plataforma: `/`
- Convite público: `/?view=invite`
- Convite individual (depois de criar convidado): `/?invite=TOKEN`

## Informações inseridas
- Noivo: João Sucualali
- Noiva: Alice Catuluta
- Data indicada nos materiais: 14 de Novembro; configurado provisoriamente como 14/11/2026. Confirmar o ano e horário com os noivos antes da publicação.
- Igreja: Igreja Metodista Unida Gaspar Adão de Almeida, Rua da Bomba dos Mutilados, Viana, Luanda.
- Mapa da igreja: https://www.google.com/maps/dir/?api=1&destination=-8.945046,13.374337
- Espaço da celebração: Quinta Viver das Palmeiras, Viana, Luanda.
- Mapa do espaço: https://maps.app.goo.gl/9FdjBTNdoA3sr8Dx7

Os horários, contactos, fotografias de perfil, dress code e detalhes adicionais continuam editáveis no painel. Dados de pagamento e hóspedes fictícios foram removidos para evitar informação incorreta.

## Base de dados (RSVP entre dispositivos)
O repositório inclui `supabase_schema.sql` e a integração em `src/services/supabase.ts` / `src/services/dbService.ts`. Configure as variáveis `VITE_DATABASE_MODE=supabase`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local`, execute o SQL no Supabase e reveja as políticas RLS antes de publicar. A chave `anon/publishable` pode estar no frontend apenas com RLS bem configurado; nunca coloque service-role keys no cliente.

## PDFs
Os PDFs de convite já existentes foram mantidos dentro da pasta `convite-pdfs/`. Os seus links internos podem apontar para um endereço provisório; depois de publicar, atualize-os com o URL final do site.

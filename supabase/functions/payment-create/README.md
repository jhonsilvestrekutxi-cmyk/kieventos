# payment-create (server-side integration placeholder)

Do not accept card/payment secrets from the browser. Implement this as a Supabase Edge Function when a provider is selected and merchant credentials are approved.

Expected flow:
1. Require a valid authenticated user.
2. Read the plan and amount from the database; never trust a price submitted by the client.
3. Create a `subscriptions` row with `pending`.
4. Call the chosen provider from the server using secrets stored with `supabase secrets set`.
5. Return only the provider's checkout URL/reference to the client.
6. Verify the provider's signed callback/webhook server-side before changing status to `paid`.
7. Make callback processing idempotent and log provider references.
8. Do not mark paid based on a browser redirect alone.

Provider-specific API endpoints, signatures, merchant onboarding and settlement details must be confirmed with the chosen provider before implementing the live adapter.
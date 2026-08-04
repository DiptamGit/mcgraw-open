# McGraw Open

Official website for the McGraw Open doubles tennis tournament.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the minimal deployment and environment
isolation setup.

## Checks

- `npm run lint`
- `npm test` — domain, action, and component unit tests
- `npm run build`
- `npm run test:e2e` — group-stage browser smoke suite

The smoke suite needs Docker and a running local Supabase stack
(`npx supabase start`). It reseeds the local database, builds the app, serves it
on port 3100, and never touches staging or production.

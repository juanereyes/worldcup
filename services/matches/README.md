# Matches Service

This service owns access to football-data.org and keeps the API token out of browser code.

Run it with:

```powershell
corepack npm run matches:dev
```

Environment:

```env
FOOTBALL_DATA_API_TOKEN=your_token_here
```

Current API:

- `GET /health` returns service health.
- `GET /matches/carousel` returns the World Cup matches for the carousel window.


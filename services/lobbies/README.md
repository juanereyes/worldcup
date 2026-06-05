# Lobby Service

Owns prediction-game lobbies and lobby memberships in a separate SQLite database.

## Development

```powershell
corepack npm run lobbies:dev
```

The service listens on `http://127.0.0.1:8003`.

## API

- `GET /health` returns service health.
- `POST /lobbies` creates a lobby with a unique 4-character uppercase alphanumeric code and an optional password.
- `GET /lobbies/{code}` returns lobby metadata, member count, point system, and members when the authenticated session belongs to a lobby member.
- `PUT /lobbies/{code}/point-system` saves a lobby point system when the authenticated session belongs to a lobby admin.
- `PUT /lobbies/{code}/custom-settings` saves custom lobby settings and marks the point system as custom when the authenticated session belongs to a lobby admin.
- `GET /lobbies/{code}/predictions` returns the authenticated lobby member's match predictions.
- `PUT /lobbies/{code}/predictions/{matchId}` auto-saves the authenticated lobby member's match prediction.
- `GET /predictions/default` returns the authenticated user's default match predictions.
- `PUT /predictions/default/{matchId}` auto-saves the authenticated user's default match prediction.
- `PUT /lobbies/{code}/predictions-copy/{all|phase}` copies default predictions into a lobby.
- `POST /lobbies/{code}/members` adds a user to a lobby, requiring the lobby password when one is set.
- `DELETE /lobbies/{code}/members/{userId}` removes a user from a lobby. If the authenticated session belongs to an admin, it can remove a non-admin member.
- `DELETE /lobbies/{code}` deletes a lobby when the authenticated session belongs to a lobby admin.
- `GET /users/{userId}/lobbies` returns every lobby a user belongs to.

## Scoring

- `simple` and `regular` scoring rules are implemented in the lobby service.

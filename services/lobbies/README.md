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
- `GET /lobbies/{code}` returns lobby metadata, member count, and members.
- `POST /lobbies/{code}/members` adds a user to a lobby, requiring the lobby password when one is set.
- `DELETE /lobbies/{code}/members/{userId}` removes a user from a lobby. Passing `actingUserId` lets an admin remove a non-admin member.
- `DELETE /lobbies/{code}` deletes a lobby when `actingUserId` belongs to a lobby admin.
- `GET /users/{userId}/lobbies` returns every lobby a user belongs to.

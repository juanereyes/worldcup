# Auth Service

This service will own account entry flows separately from the main World Cup app.

Current scope:

- frontend-only login and account entry scaffold
- no password handling
- no backend implementation
- no database implementation

Planned service boundaries:

- `client/` for the auth web client
- `server/` for the future Python API
- `data/` for the future service-owned SQLite database

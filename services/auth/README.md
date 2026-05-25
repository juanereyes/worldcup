# Auth Service

This service will own account entry flows separately from the main World Cup app.

Current scope:

- login and account entry frontend
- Python auth API scaffold
- SQLite user database owned by this service
- Argon2id password hashing through `argon2-cffi`

Service boundaries:

- `client/` for the auth web client
- `server/` for the Python API
- `data/` for the service-owned SQLite database

Run the auth client:

```powershell
corepack npm run auth:dev
```

Run the auth server:

```powershell
C:\Users\juane\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m pip install -r services\auth\server\requirements.txt
C:\Users\juane\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe services\auth\server\app.py
```

Current API:

- `POST /users` creates a user with a unique username and email.
- `POST /sessions` verifies username/email plus password and sets an HttpOnly session cookie.
- `GET /session` returns the signed-in user when the session cookie is valid.
- `DELETE /session` deletes the server session and clears the session cookie.

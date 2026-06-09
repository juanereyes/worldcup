# Auth Service

This service will own account entry flows separately from the main World Cup app.

Current scope:

- login and account entry frontend
- Python auth API scaffold
- SQLite user database owned by this service
- Argon2id password hashing through `argon2-cffi`
- one-time email verification links sent with Resend

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

- `POST /users` creates an unverified user with a unique username and email, then sends a 5-minute verification link.
- `GET /email-verifications/{token}` verifies a user's email when the one-time token is valid.
- `POST /email-verifications` resends a verification link for an unverified email.
- `POST /sessions` verifies username/email plus password for verified users and sets an HttpOnly session cookie.
- `GET /session` returns the signed-in user when the session cookie is valid.
- `DELETE /session` deletes the server session and clears the session cookie.
- `DELETE /account` deletes the signed-in auth account and clears the session cookie.

Email environment variables:

```powershell
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL="World Cup Picks <verify@picks-football.com>"
AUTH_CLIENT_URL=http://127.0.0.1:5174/
```

If `RESEND_API_KEY` is not set locally, `POST /users` and `POST /email-verifications` return a `devVerificationUrl` in the JSON response so the verification flow can be tested without sending email.

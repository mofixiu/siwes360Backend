Backend for my SIWES Logbook app

## Running

```bash
cp .env.example .env   # then set DB_PASSWORD and JWT_SECRET
mysql -u root -p siwes360 < database/002_password_resets.sql   # once, for password reset
npm start
```

## Who can do what

Every route under `/api` except `/api/auth/login`, `/register`, `/forgot-password`,
`/verify-reset-otp` and `/reset-password` needs a bearer token. The role is read from
the database on each request, not trusted from the token.

| Role | Can |
| --- | --- |
| student | Read and edit their own account, student record and internship details; write, edit and delete their own logs while pending or rejected; read their own grades and notifications |
| supervisor | Read and edit their own account and profile; read and review (approve/reject) logs of students who chose them as supervisor |
| admin | Create, list and delete accounts; edit student records; grade students of their own school |
| itf | Read students, supervisors, logs and grades |

Password hashes never appear in responses. Account updates accept only `full_name`,
`email` and `phone`; passwords change through `/api/auth/change-password`.

## Passwords

- `POST /api/auth/change-password` `{ current_password, new_password }` (signed in)
- `POST /api/auth/forgot-password` `{ email }` emails a 6-digit code (10 minutes, 5 tries)
- `POST /api/auth/verify-reset-otp` `{ email, otp }` returns `{ reset_token }` (15 minutes, single use)
- `POST /api/auth/reset-password` `{ reset_token, new_password }`

Reset needs the `password_resets` table (`database/002_password_resets.sql`) and SMTP
settings in `.env`. Without SMTP the reset endpoints answer 503 rather than claim a code
was sent. For local testing, `MAIL_TRANSPORT=console` prints the email to the server log.

## Tests

```bash
npm test
```

Creates a throwaway `siwes360_test` database on the configured MySQL server, seeds
users of every role, checks the access rules over HTTP, then drops it.

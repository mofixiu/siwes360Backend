Backend for my SIWES Logbook app

## Running

```bash
cp .env.example .env   # then set DB_PASSWORD and JWT_SECRET
mysql -u root -p siwes360 < database/002_password_resets.sql   # once, for password reset
mysql -u root -p siwes360 < database/003_weekly_signoffs.sql   # once, for weekly sign-off
npm start
```

### Demo data

```bash
npm run seed:demo                  # builds a separate siwes360_demo database
DB_NAME=siwes360_demo npm start
```

`database/seed_demo.js` drops and recreates `siwes360_demo` (it refuses any name not ending
in `_demo`) with three made-up institutions, their students, supervisors, a school admin and an
ITF officer, and about nine weeks of logbook entries dated relative to today. Everyone in it is
fictional and every email uses the reserved `.example` domain. The demo password is in the script.

## Who can do what

Every route under `/api` except `/api/auth/login`, `/register`, `/forgot-password`,
`/verify-reset-otp` and `/reset-password` needs a bearer token. The role is read from
the database on each request, not trusted from the token.

| Role | Can |
| --- | --- |
| student | Read and edit their own account, student record and internship details; write, edit and delete their own logs while pending or rejected; read their own grades and notifications |
| supervisor | Read and edit their own account and profile; read and review (approve/reject) logs of students who chose them as supervisor |
| admin | The institution's SIWES coordinator. Only students whose `school_id` is the admin's school: read their records, logs, sign-offs and grades; edit, grade and remove them; the `/api/admin` dashboard. Create and list accounts |
| itf | Read every institution's students, logs, sign-offs and grades; the `/api/itf` dashboard |

Supervisors also sign off each week of a student's logbook (below). Password hashes never appear in responses. Account updates accept only `full_name`,
`email` and `phone`; passwords change through `/api/auth/change-password`.

## Weekly sign-off

Like the weekly signature on the paper SIWES logbook. Internship weeks run Monday to Sunday;
week 1 is the week that holds the internship start date (`utils/weeks.js`, mirrored in the app).

- `GET /api/supervisors/:id/queue` (that supervisor) weeks with entries to review, and weeks
  ready to sign: every entry reviewed, not yet signed, from that week's Friday
- `POST /api/signoffs` `{ student_id, week_number, comment }` (the student's own supervisor,
  once per week, only when no entry in the week is pending)
- `GET /api/signoffs/student/:studentId` (anyone who may view the student)

Needs `database/003_weekly_signoffs.sql`; until it is run these answer 503 and the dashboards
show no sign-offs.

## Admin and ITF dashboards

- `GET /api/admin/overview` the admin's institution: students placed, logging and behind (no
  entry for 3 or more working days), last week's sign-offs, students furthest behind and
  supervisors with the most work waiting
- `GET /api/admin/students?filter=all|behind|not_set_up|unsigned|waiting|no_supervisor`
- `GET /api/admin/supervisors` supervisors of the institution's students, counting only those
  students' entries
- `GET /api/itf/overview` the same figures for every institution
- `GET /api/itf/schools/:id/students?filter=...`

A student's own logbook is read through the existing `/api/students/:id`,
`/api/logs/student/:id` and `/api/signoffs/student/:id`.

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

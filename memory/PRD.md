# ClassSync - PRD

**Overview**: Modern private mobile app for a high-school class. The class representative is ADMIN, students consume/participate. Roles enforced server-side.

## Core (MVP)
- **Auth** JWT + bcrypt, register/login, first user + `POST /class/setup` atomic pattern that promotes them to ADMIN. Provisional-lock: while `has_class=false` and one user is already registered, further registrations are blocked (409) until setup completes. Subsequent registrations require a valid invite code and yield STUDENTE.
- **Class config** name, school, year, section, description, primary/secondary colors, logo path. Editable by ADMIN via `PATCH /class` (partial update). Invite code regeneration via `POST /class/invite/regenerate`.
- **Materials & subjects** seeded on class creation. Any user creates notes; ADMIN or author can edit/delete. Search + subject filter.
- **Calendar** events (verifica/interrogazione/compito/evento/consegna/gita/assemblea/altro), ADMIN writes.
- **Homework** ADMIN creates. Each student toggles a personal completion state.
- **Announcements** ADMIN posts, students react and mark read. Read counter visible.
- **Chat** with reply, pin (ADMIN), reactions, favorites, soft-delete.
- **Duck Jump minigame** with class leaderboard (server-side score clamp).
- **Admin panel** dashboard, invite-code regen, class-info editor, audit log, user moderation (mute/disable/role).
- **Profile & Settings** bio, password change, IT/EN language switch, dark mode follows device.
- **File upload** via Emergent Object Storage (JWT + class-ownership guarded downloads).

## Extras
- **Polls (`polls`)** admin question + 2–8 options; single-choice voting (changeable); inline progress bars with % and counts; admin can close and delete.
- **Board (`board`)** everyone (not muted) posts sticky-note style mini-avvisi with a color; author deletes own, admin deletes any.

## Backend
FastAPI + motor + bcrypt + PyJWT. All routes under `/api`. Access token 24h. Role checks via `require_admin` + resource-level author checks. Class-scoped queries by `class_id`.

## Frontend
Expo Router. Tabs = Home / Materiale / Calendario / Chat / Altro. More menu → Homework, Announcements, Members, Polls, Board, Profile, Settings, Duck Jump, Admin (admin-only). Theme tokens in `src/theme.ts` (light+dark), i18n in `src/i18n.tsx`.

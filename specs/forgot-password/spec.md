# Password Reset Technical Specification

Source of truth: `specs/forgot-password/forgot-password.feature` (approved).

## Context

`auth` issues JWTs and owns Redis session state (`revoked:sid:<sid>`, see `specs/logout/spec.md`). `account` owns users and password hashes (PostgreSQL, argon2). Reset needs both: a short-lived token (Redis, `auth`) and a way to change a password hash (`account`).

## Scope

### In Scope
- Two endpoints in `auth`: request a reset by email, set a new password with a token.
- Reset token storage, expiry, single use and replacement in Redis.
- Invalidating all existing sessions of the user on password change.
- In `account`: look up users by email, set a password.
- Local delivery of the token without an email provider.

### Out of Scope
- Sending real email.
- Revoking already issued access tokens (they stay valid until expiry, same decision as logout).
- Rate limiting, email normalization, account lockout, new password strength rules (reset uses the existing registration rules, unchanged).
- Fixing `PATCH /user/:id` with `password` (it writes a non-existent column and never hashes; not used by this feature).

## Current Behavior

- `account`: `UserService.create` hashes with argon2 and a random salt, stores `passwordHash` and `passwordSalt`. No endpoint changes a password. `GET /user` filters by `userIds`, `phones`, `login` only; `email` is stored but not searchable and not unique (no constraint, no index).
- `auth`: `login` signs `{ login, userId, sid }`; `refreshToken` rejects tokens without `sid` or with a revoked `sid`. No notion of "all sessions of a user".
- Registration password rules: `@IsString()` only (`CreateUserDto`). Decided: reset keeps exactly these rules.

## Proposed Behavior

- **Request:** `auth` looks up the account by email (unique). If found, it issues a random token valid for 15 minutes, replacing that user's previous unused token. The response is the same `204` for existing and unknown emails; unknown emails create nothing.
- **Reset:** `auth` consumes the token (single use), invalidates all sessions of the user, then asks `account` to set the new password.
- **Sessions:** a per-user counter (`epoch`) lives in Redis and is copied into every issued token. Reset increments it; `refreshToken` rejects tokens whose epoch differs from the current one, and tokens that carry no epoch at all.
- **Local delivery:** outside production, `auth` also writes the plain token to a Redis key readable by a developer or a test.

Mapping to scenarios:

| Scenario | Behavior |
|---|---|
| User requests a password reset | email matches → token stored, `204` |
| Unknown email | no match → nothing stored, same `204` |
| Valid token sets password | token consumed → `account` sets hash → `204` |
| Login with new / old password | `account` verification uses the new hash; old hash is gone |
| Token used twice | consumption is atomic (`GETDEL`), second use finds nothing → `400` |
| Expired / invalid token | Redis key expired or never existed → `400` |
| New request invalidates previous | request deletes the user's previous token key |
| Password rules | DTO validation runs before the token is consumed, so the token stays usable |
| Sessions invalidated | epoch increment → old refresh tokens rejected |
| No email provider | dev outbox key in Redis |
| Email is unique | DB unique constraint; duplicate on create/update → `409` |
| Login unchanged | same responses, one extra claim |

## Affected Components

`account`:
- `src/user/entities/user.entity.ts`: `unique: true` on `email`.
- `src/database/migrations/<timestamp>-AddUniqueEmailToUser.ts` + `migrations/index.ts`: unique constraint on `user.email`.
- `src/user/dto/get-user-filter.dto.ts`, `src/user/user.types.ts`, `src/user/user.repository.ts`: add optional `email` filter; `createUser` and `updateUser` map the unique violation (Postgres `23505`) to `ConflictException` (`409`).
- `src/user/user.service.ts`: extract the hashing from `create` into a private `hashPassword`; add `setPassword`.
- `src/user/user.controller.ts` + new `src/user/dto/set-password.dto.ts`: `PATCH /user/:id/password`.
- `README.md`: endpoint table.

`auth`:
- `src/internal/account/account.service.ts`, `account.types.ts`: `setPassword`; `email` in `GetUsersByFilterParams`.
- `src/auth.service.ts`: `requestPasswordReset`, `resetPassword`; epoch in `login` and `refreshToken`.
- `src/auth.controller.ts` + new `src/dto/password-reset.dto.ts`: two endpoints and DTOs.
- `src/auth.service.spec.ts`: new tests.
- `README.md`: endpoint table and the local token lookup.

No new module, dependency or infrastructure. One DB migration.

## Technical Design

1. **Email lookup (`account`).** `GET /user?email=` adds `andWhere(alias.email = :email)` in `UserRepository.qb`, like `login`. The unique constraint creates the index, so the lookup is indexed and returns at most one user.
   **Unique email.** `@Column('varchar', { unique: true })` on `email` plus a migration `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email")` (`down` drops it), registered in `migrations/index.ts`, following the existing migration files. The migration fails if duplicate emails already exist; they must be resolved by hand before deploy (no automatic merge or deletion). Matching stays exact (no case folding), so `A@x.com` and `a@x.com` count as different emails.
2. **Set password (`account`).** `PATCH /user/:id/password`, body `{ password }`. `setPassword` loads the user (`NotFoundException` if missing), hashes with the shared `hashPassword` (same argon2 + random salt as `create`) and calls `updateUser({ userId, passwordHash, passwordSalt })`. `account` has no authentication today; like `DELETE /user/:id` it is an internal-network endpoint.
3. **Redis keys (`auth`).**
   - `reset:token:<sha256(token)>` → `userId`, `EX 900`.
   - `reset:user:<userId>` → `sha256(token)` of the user's current token, `EX 900`.
   - `session:epoch:<userId>` → integer, no TTL (a TTL would reset the counter while tokens issued after the last reset are still valid; ponytail: one small key per user who ever reset).
   - `dev:reset-token:<userId>` → plain token, `EX 900`, written only when `NODE_ENV !== 'production'`.
   The token is `randomBytes(32).toString('hex')`; Redis stores only its hash, so a Redis read does not leak a usable token.
4. **Request (`auth`).** `requestPasswordReset({ email })`: `getUsersByFilter({ email })`; if `items[0]` exists, read `reset:user:<id>`, then in one `multi()`: delete the previous `reset:token:*`, set both new keys, set the dev key when not production. Return nothing.
5. **Reset (`auth`).** `resetPassword({ token, password })`:
   1. `userId = redis.getdel('reset:token:' + sha256(token))`; missing → `BadRequestException('Invalid or expired reset token')` (one message for expired, used, replaced and never-issued tokens).
   2. `redis.incr('session:epoch:' + userId)`.
   3. `internalAccountService.setPassword(userId, password)`.
   4. Best-effort cleanup: delete `reset:user:<userId>` (and the dev key).
   The order is deliberate: if step 3 fails, sessions were dropped needlessly but no password changed (fail-closed). The token is already spent and the user must request a new one.
6. **Epoch in sessions.** `login` reads `Number(await redis.get(epochKey(userId))) || 0` and adds `ep` to the payload of both tokens (always present, `0` when the user never reset). `verifyRefresh` (shared by `refreshToken` and `logout`) rejects a token with no `ep`, exactly like a token with no `sid`, so a token cannot dodge invalidation by omitting the claim. `refreshToken` then rejects when `jwtPayload.ep !== current` (before the account lookup) and copies `ep` into the new pair. `logout` does not compare epochs: logging out a session that a reset already ended is harmless and still succeeds.
7. **Validation.** `PasswordResetDto` = `{ token: string, password: string }` with `@IsString() @IsNotEmpty()` on `token` and `@IsString()` on `password` (the existing registration rule, unchanged). Runs in the global `ValidationPipe` before the service, so an invalid password never consumes the token.

## API / Integration Contracts

`POST /api/auth/password/forgot`
- Body: `{ "email": "<string>" }` (`@IsString() @IsNotEmpty()`).
- `204` always, for known and unknown emails. `400` only on a malformed body.

`POST /api/auth/password/reset`
- Body: `{ "token": "<string>", "password": "<string>" }`.
- `204` on success.
- `400` for an invalid, expired, used or replaced token, and for a body that fails validation.

`PATCH /api/account/user/:id/password` (internal)
- Body: `{ "password": "<string>" }`. `204`/`200` on success, `404` unknown user, `400` on validation.

`GET /api/account/user?email=<email>`: existing response shape, now filterable by email.

`POST /api/account/user` and `PATCH /api/account/user/:id`: additionally `409` when the email is already used.

`POST /api/auth/refresh/token` and `POST /api/auth/logout`: additionally `401` for a token without `ep`; refresh also `401` for a stale `ep`.

## Data / State Changes

- New Redis keys above. `passwordHash` and `passwordSalt` are replaced for the user.
- DB: unique constraint on `user.email` (migration).
- JWT payload gains `ep`.

## Error Handling

- Unknown email: indistinguishable `204`. Response timing may differ (no Redis writes); accepted for this iteration.
- `account` unavailable during request: error propagates as today (`InternalAccountService` maps it to an `HttpException`). During reset, see Technical Design step 5.
- Redis unavailable: error propagates as 500; refresh fails closed.

## Edge Cases

- **Two requests in a row:** the second deletes the first token; the first now returns `400`.
- **Concurrent requests for one user:** a narrow window where both tokens survive until expiry; accepted.
- **Concurrent use of one token:** `GETDEL` lets exactly one caller through.
- **Tokens issued before deploy (no `ep`):** rejected with `401` on refresh and logout; users must log in again (decided, same as the earlier `sid` decision).
- **Redis data loss:** the epoch counter returns to `0`, so tokens from before the loss that carry `ep: 0` would be accepted again, as would revoked sessions. Same ceiling as the logout revocation keys; accepted.
- **Duplicate email:** create or update with an email that already exists → `409`.
- **Reset while a login is in flight:** a login that read the old epoch just before the increment gets a session that the next refresh rejects. Acceptable.
- **Password equals old password:** allowed (no rule asked for it).
- **Reset of a deleted user:** token resolves to a missing user → `account` returns `404`, surfaced as `404`.

## Verification

Unit tests in `auth/src/auth.service.spec.ts` (mocked `redis` with `multi`, `getdel`, `incr`, `del`; mocked `internalAccountService`):
- Request with a matching email stores both keys with `EX 900`, deletes the previous token key, writes the dev key outside production and not in production.
- Request with no match writes nothing and still resolves.
- Reset with a valid token: `getdel`, `incr`, `setPassword` called in that order; unknown or consumed token → `BadRequestException` with no `incr` and no `setPassword`.
- `login` adds `ep` (`0` without a key, the counter value otherwise); `refreshToken` rejects a stale `ep` and a token with no `ep` (also for `logout`), accepts a matching `ep` (including `0`), and preserves `ep`.
- Existing tests in this file that mock `verify` payloads without `ep` are updated to include it.

E2E `auth/test/forgot-password.e2e-spec.ts` (live services, as in `logout.e2e-spec.ts`; the test reads the token from `dev:reset-token:<userId>` with `ioredis`):
- Request → token present; unknown email → `204`, no key.
- Reset → `204`; login with new password `201`, with old password `401`.
- Second use, replaced token, expired token (test deletes the Redis key to simulate expiry) and garbage token → `400`.
- Existing session: login, reset, refresh → `401`.
- Non-string password → `400`, then the same token still resets.
- Creating a second user with an existing email → `409`.

Run: `cd auth && npm run test`; `/e2e-backend forgot-password`.

`account`: no unit tests exist; the `409` and email filter are covered by the e2e above. The migration is checked by starting `account` (migrations run on start).

## Assumptions

- Email is matched exactly as stored (no case folding or trimming).
- Existing data has no duplicate emails; if it does, the migration fails and a human resolves them.
- "Registration password rules" means `@IsString()` only (decided); the scenario about rule violations therefore rejects a non-string password.
- Existing sessions are ended the way logout ends them: refresh is rejected, access tokens live until their expiry.
- `account` is reachable only from the internal network.
- Local delivery by a Redis key is enough for "available locally"; production delivery (email) will replace the dev key.

## Open Questions

None.

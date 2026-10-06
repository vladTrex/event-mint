# User Logout Technical Specification

Source of truth: `specs/logout/logout.feature` (approved).

## Context

`auth` issues stateless JWT access/refresh pairs (`auth/src/auth.service.ts`). There is no session concept: a refresh token stays usable until `JWT_REFRESH_EXP` (24h) and `refreshToken()` re-signs a new pair from the `userId` alone. To make "logout this session" possible, a session needs an identity and a server-side revocation record.

## Scope

### In Scope
- `POST /api/auth/logout` in `auth` service.
- Session identity (`sid`) in issued tokens.
- Revocation check in `refreshToken`.

### Out of Scope
- Revoking already issued access tokens (feature: they stay valid until expiry).
- Logout from all devices, session listing, RBAC, profile changes.
- Any change in `account` service.

## Current Behavior

- `login` verifies the password via `account`, signs `{ login, userId }` into access and refresh tokens.
- `refreshToken` verifies the refresh JWT, loads the user, signs a new pair. Old refresh tokens are not invalidated.
- Redis (`REDIS_TOKEN`) is injected in `AuthService` and only used as a login → userId cache.
- No guard or endpoint validates access tokens inside `auth`.

## Proposed Behavior

- Each `login` creates a session: a random `sid` is added to the payload of both tokens.
- `refreshToken` keeps the same `sid` in the new pair (a session survives token refresh) and rejects the request if the token has no `sid` or the session is revoked.
- `logout` takes the refresh token, verifies it, and marks its `sid` revoked in Redis until the refresh token would have expired anyway.

Mapping to scenarios:

| Scenario | Behavior |
|---|---|
| Authenticated user logs out | valid refresh → revoke `sid` → success |
| Session cannot be continued | `refreshToken` finds `sid` revoked → 401, no tokens |
| Access token stays valid | access tokens are not checked or touched |
| Logout without valid session credentials | missing/invalid/expired refresh → 401 |
| Logging out twice | revoke is idempotent (`SET`), success again |
| Other sessions unaffected | revocation is per `sid`; other sessions have different `sid` |
| Login after logout | `login` generates a fresh `sid` |
| Login / refresh unchanged | same responses (`JwtDto`), only an extra claim |

## Affected Components

- `auth/src/auth.service.ts` — `sid` generation in `login`, `sid` propagation and revocation check in `refreshToken`, new `logout`.
- `auth/src/auth.controller.ts` — new `POST logout`.
- `auth/src/dto/jwt.dto.ts` — reuse `RefreshJwtDto` as logout body (no new DTO).
- `auth/src/auth.service.spec.ts` — new tests.
- `auth/README.md` — endpoint table (line ~55).

No new module, dependency or infrastructure.

## Technical Design

1. **Session id.** In `login`: `const sid = randomUUID()` (`node:crypto`); payload becomes `{ login, userId, sid }`, signed into both tokens as today.
2. **Refresh.** In `refreshToken`, after verify: if `jwtPayload.sid` is missing or `await redis.exists(revokedKey(jwtPayload.sid))` → `UnauthorizedException`. Do the check before the account lookup. New payload reuses `jwtPayload.sid`.
3. **Logout.** Verify the refresh JWT exactly as `refreshToken` does (extract this verify into one private method used by both, to avoid duplication). Compute remaining lifetime from `exp`: `ttl = exp - now` seconds. `redis.set(revokedKey(sid), '1', 'EX', ttl)`. Return nothing.
4. **Key.** `revoked:sid:<sid>`. TTL equals the remaining refresh lifetime, so the key disappears when the token could no longer be refreshed anyway; no cleanup job.
5. **Rotation note.** Every refresh token of a session carries the same `sid`, so logging out with any of them (latest or an older still-unexpired one) ends the whole session.

## API / Integration Contracts

`POST /api/auth/logout`

- Body: `{ "refresh": "<jwt>" }` (`RefreshJwtDto`, validated by the existing global `ValidationPipe`).
- `204 No Content` on success, including repeated logout of the same session.
- `401 Unauthorized` if the refresh token is invalid, expired, or carries no `sid`.
- `400` on missing/non-string `refresh` (existing validation behavior).

`POST /api/auth/refresh/token`: contract unchanged; additionally `401` for a revoked session or a token without `sid`.

Redis: `SET revoked:sid:<sid> 1 EX <remaining seconds>`; `EXISTS revoked:sid:<sid>`.

## Data / State Changes

- New Redis keys `revoked:sid:*`, self-expiring. No DB migration, no `account` changes.
- JWT payload gains `sid`.

## Error Handling

- Verification failures → `UnauthorizedException`, same as `refreshToken`.
- Redis unavailable: `ioredis` error propagates as 500. For refresh this fails closed (no tokens issued), which is the safe direction. No special handling.

## Edge Cases

- **Double logout:** `SET` with the new TTL; same result, `204`.
- **Logout with an expired refresh token:** `401`; the session has already ended by expiry (assumption below).
- **Tokens issued before deploy (no `sid`):** rejected with `401` on refresh and logout; users must log in again (decided).
- **TTL ≤ 0:** cannot happen after a successful verify; `exp` is in the future.
- **Concurrent refresh and logout:** a refresh that passed the check just before logout may issue one last pair; its refresh token is still blocked afterwards since `sid` is the same. Acceptable.

## Verification

Unit tests in `auth/src/auth.service.spec.ts` (existing pattern: mocked `redis`, `jwtService`; extend the redis mock with `exists`). `jwtService.verify` is mocked there, so tests assert behavior on mocked payloads:

- `login` signs `sid` into both tokens; two logins produce different `sid`.
- `logout` with valid refresh sets `revoked:sid:<sid>` with positive `EX`; second call also succeeds.
- `logout` with failing verify or missing `sid` → `UnauthorizedException`, no redis write.
- `refreshToken` with revoked `sid` → `UnauthorizedException`, `getUsersByFilter` not called.
- `refreshToken` with a payload lacking `sid` → `UnauthorizedException`.
- `refreshToken` with non-revoked `sid` returns a pair and preserves `sid`.
- Another session's `sid` is unaffected by revoking one.

Manual check: extend `scripts/test-auth-login.sh` style flow — login, logout, refresh → `401`; login again → `201`.

Run: `cd auth && npm run test`.

## Assumptions

- A "session" is one `login` result; its identity is the `sid` claim.
- The refresh token is the session credential for logout (the feature does not require an access-token guard, and `auth` has none).
- `204` as the success status (existing endpoints return Nest's default `201` for POST; no project convention for logout).
- An expired refresh token means the session is already over, so logout with it is rejected with `401` (decided).
- Redis fail-closed behavior on refresh is acceptable.

## Open Questions

None.

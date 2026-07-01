# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NestJS backend for "eco-quest" with PostgreSQL (via Prisma). Currently implements signup/signin auth with JWT access + refresh tokens.

## Commands

```bash
# install
npm install

# run (dev, with watch)
npm run start:dev

# run (no watch) / production
npm run start
npm run start:prod

# build
npm run build

# lint (auto-fixes)
npm run lint

# format
npm run format

# tests
npm run test              # unit tests (*.spec.ts under src/)
npm run test:watch
npm run test:cov
npm run test:e2e          # e2e tests under test/, uses test/jest-e2e.json
npm run test:debug        # debug unit tests with --inspect-brk

# run a single unit test file
npx jest src/auth/auth.service.spec.ts

# run a single test by name
npx jest src/auth/auth.service.spec.ts -t "test name"
```

Note: `package.json`'s jest config sets `rootDir: "src"`, so `npm run test` only discovers `*.spec.ts` files inside `src/`. E2E specs in `test/` run separately via `test:e2e`.

### Database (Prisma)

```bash
npx prisma generate          # regenerate client (also runs in Docker build)
npx prisma migrate dev       # create + apply a migration in dev
npx prisma migrate deploy    # apply migrations in prod
```

Schema lives at [prisma/schema.prisma](prisma/schema.prisma); migrations in `prisma/migrations/`.

### Docker

```bash
docker-compose up
```

Spins up the `backend` service (port 3333) and a `postgres:15` service (port 5432, db `ecoquest`). Backend uses `.env.docker` for env vars and mounts the repo with an isolated `node_modules` volume.

## Environment variables

Required (validated via Joi in `AppModule`, see [src/app.module.ts](src/app.module.ts)):
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Also used: `DATABASE_URL` (Prisma), `PORT` (defaults to 3333).

## Architecture

Standard Nest module layout: `AppModule` wires `AuthModule`, `UsersModule`, `PrismaModule`, and global `ConfigModule`.

- **PrismaModule/PrismaService** ([src/prisma/prisma.service.ts](src/prisma/prisma.service.ts)) — thin wrapper extending `PrismaClient`, connects in `onModuleInit`. Exported for use by any module that needs DB access (currently only `UsersService`).

- **UsersModule/UsersService** ([src/users/users.service.ts](src/users/users.service.ts)) — CRUD over the `User` model (create, getUserByEmail, getUserBy(generic where), updateUser, getAllUsers). No business logic beyond Prisma calls; auth-related logic (hashing, token validation) lives in `AuthService`, not here.

- **AuthModule/AuthService** ([src/auth/auth.service.ts](src/auth/auth.service.ts)) — owns the JWT lifecycle:
  - `generateAccessToken`/`generateRefreshToken`/`generateJwts` sign tokens with separate secrets and expirations (`TokenExpiration.ACCESS = 15m`, `TokenExpiration.REFRESH = 7d`, see [src/auth/enums/token-expiration.ts](src/auth/enums/token-expiration.ts)).
  - `saveRefreshToken` stores a **bcrypt hash** of the refresh token on the user row (`User.tokenHash`), not the raw token.
  - `signIn`/`signUp` return a sanitized user DTO (via private `mapUserToResponse`, strips `password`/`tokenHash`).
  - `getUserById` fetches a user by id and returns the same sanitized DTO, throwing `NotFoundException` if missing — used by `refresh` to include the user in the response.
  - `signUp` catches Prisma's unique-constraint error (`P2002`) and rethrows as `ConflictException`.
  - `invalidateToken` clears `tokenHash` for a given `userId`.

- **AuthController** ([src/auth/auth.controller.ts](src/auth/auth.controller.ts)) — `POST /auth/signin`, `POST /auth/signup`, `POST /auth/refresh`, `POST /auth/logout` (guarded by `jwt-access`). Refresh tokens are set as an **httpOnly cookie** (`refreshToken`, scoped to path `/auth/refresh`, `sameSite: strict`, secure in production), while access tokens are returned in the JSON response body — refresh tokens are never sent in the body. `signin`/`signup`/`refresh` all return the sanitized user DTO plus `accessToken`; `logout` invalidates the stored token hash and clears the cookie.

- **Passport strategies** ([src/auth/strategies/jwt.strategy.ts](src/auth/strategies/jwt.strategy.ts)) — two distinct strategies:
  - `JwtAccessStrategy` (`'jwt-access'`) reads the bearer token from the `Authorization` header.
  - `JwtRefreshStrategy` (`'jwt-refresh'`) reads the refresh token from the `refreshToken` cookie via `passReqToCallback`, and returns both `userId` and the raw `refreshToken` on `req.user` (see `RequestWithUserAndRefreshToken`).
  - `JwtGuard` ([src/auth/guards/jwt.guard.ts](src/auth/guards/jwt.guard.ts)) wraps `AuthGuard('jwt')` — note this guard name doesn't match either registered strategy name (`jwt-access`/`jwt-refresh`); be aware of this when wiring up new protected routes.

- **RefreshTokenFilter** ([src/auth/filters/refresh-token.filter.ts](src/auth/filters/refresh-token.filter.ts)) — exception filter applied to `POST /auth/refresh`. On an `UnauthorizedException` (e.g. expired/invalid refresh token), it proactively invalidates the stored token hash and clears the cookie before responding 401 — treats a failed refresh as a sign that the token may be compromised.

- **Validation** — global `ValidationPipe` in [src/main.ts](src/main.ts) with `whitelist`, `forbidNonWhitelisted`, and `transform` all enabled; DTOs use `class-validator` decorators (see `CreateUserDto`, `SignInDto`). Password minimum length is centralized in `userConstants` ([src/users/constants.ts](src/users/constants.ts)) and shared between both DTOs.

- **Roles** — `UserRole` enum (`admin`, `moderator`, `participant`, `visitor`) is defined both in Prisma schema and mirrored in [src/users/enums/role.enum.ts](src/users/enums/role.enum.ts); defaults to `participant`.

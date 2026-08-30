# Username Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace public email login with globally unique username/password authentication, recovery codes, legacy-account migration, and shared multi-device access without changing user UUIDs or deleting business data.

**Architecture:** Next.js server actions normalize usernames and derive an invisible Supabase email identity with HMAC-SHA256. Supabase Auth continues to own passwords, sessions, and UUIDs; `profiles` and `account_recovery` enforce unique usernames and protect recovery state. Existing RLS policies keep all application data scoped by `auth.uid()`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/PostgreSQL/RLS, Node `crypto`, Vitest, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-30-username-auth-design.md`

## Global Constraints

- Usernames are 3–24 ASCII letters, digits, or underscores.
- Username uniqueness is case-insensitive; normalized values are lowercase.
- Public screens never request or display an email or phone number.
- Passwords are at least 8 characters.
- Recovery codes are plaintext only immediately after creation or rotation.
- Existing user UUIDs and business data are preserved.
- Multiple active device sessions remain allowed.
- Secrets remain server-only and untracked.
- Library, Document, Conversation, Storage, VikingDB, and HiAgent behavior remains unchanged.

---

## File Map

- Create `src/lib/auth/username.ts`: username validation and hidden identity derivation.
- Create `src/lib/auth/recovery.ts`: recovery code generation, digesting, and comparison.
- Create `src/lib/auth/config.ts`: server-only environment validation.
- Create `src/lib/supabase/admin.ts`: Supabase admin client.
- Create `supabase/migrations/202608300004_create_username_auth.sql`: profiles, recovery state, trigger, RLS, and indexes.
- Modify `src/app/login/actions.ts` and `src/app/login/page.tsx`: username registration/login.
- Create `src/app/account/recovery-code/page.tsx`: one-time recovery-code display.
- Create `src/app/account/recovery/`: password recovery.
- Create `src/app/account/setup/`: existing-account migration.
- Modify Dashboard, proxy, and header to require/display usernames.
- Add Vitest tests under `tests/auth/`.
- Update `.env.example`, `README.md`, and `docs/setup/supabase.md`.

---

### Task 1: Authentication primitives and test harness

**Files:**
- Create: `src/lib/auth/username.ts`
- Create: `src/lib/auth/recovery.ts`
- Create: `tests/auth/username.test.ts`
- Create: `tests/auth/recovery.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `normalizeUsername(value: unknown): string`
- Produces: `validateUsername(value: unknown): { ok: true; username: string } | { ok: false; error: string }`
- Produces: `deriveInternalEmail(username: string, secret: string): string`
- Produces: `generateRecoveryCode(): string`
- Produces: `digestRecoveryCode(code: string, secret: string): string`
- Produces: `recoveryCodeMatches(code: string, expectedDigest: string, secret: string): boolean`
- Produces: `sealRecoveryDelivery(code: string, secret: string): string`
- Produces: `openRecoveryDelivery(payload: string, secret: string): string | null`

- [ ] **Step 1: Install Vitest and add the test command**

Run `npm install --save-dev vitest`, then add `"test": "vitest run"` to package scripts.

- [ ] **Step 2: Write failing username tests**

```ts
import { describe, expect, it } from "vitest";
import { deriveInternalEmail, validateUsername } from "../../src/lib/auth/username";

describe("username authentication", () => {
  it("normalizes case and spaces", () => {
    expect(validateUsername("  SkyPulse_1 ")).toEqual({ ok: true, username: "skypulse_1" });
  });
  it.each(["ab", "a-b", "用户名", "a".repeat(25)])("rejects %s", (value) => {
    expect(validateUsername(value).ok).toBe(false);
  });
  it("derives one identity for equivalent names", () => {
    const secret = "s".repeat(32);
    expect(deriveInternalEmail("SkyPulse_1", secret)).toBe(deriveInternalEmail("skypulse_1", secret));
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm test -- tests/auth/username.test.ts`

Expected: FAIL because the username module does not exist.

- [ ] **Step 4: Implement username primitives**

```ts
import { createHmac } from "node:crypto";

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateUsername(value: unknown) {
  const username = normalizeUsername(value);
  return USERNAME_PATTERN.test(username)
    ? ({ ok: true, username } as const)
    : ({ ok: false, error: "用户名需为 3–24 位英文、数字或下划线。" } as const);
}

export function deriveInternalEmail(username: string, secret: string) {
  if (secret.length < 32) throw new Error("Username authentication is not configured.");
  const digest = createHmac("sha256", secret).update(normalizeUsername(username)).digest("hex");
  return `u_${digest}@auth.yuzheng.invalid`;
}
```

- [ ] **Step 5: Write recovery tests**

```ts
import { describe, expect, it } from "vitest";
import { digestRecoveryCode, generateRecoveryCode, recoveryCodeMatches } from "../../src/lib/auth/recovery";

describe("recovery codes", () => {
  it("generates four readable groups", () =>
    expect(generateRecoveryCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}$/));
  it("matches normalized input", () => {
    const secret = "r".repeat(32);
    const digest = digestRecoveryCode("ABCDE-FGHIJ-KLMNP-QRSTU", secret);
    expect(recoveryCodeMatches("abcde fghij klmnp qrstu", digest, secret)).toBe(true);
    expect(recoveryCodeMatches("XXXXX-FGHIJ-KLMNP-QRSTU", digest, secret)).toBe(false);
  });
});
```

- [ ] **Step 6: Implement recovery primitives and verify**

Use `randomBytes` with alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, format four groups of five, normalize spaces/dashes, digest with HMAC-SHA256, and compare equal-length buffers with `timingSafeEqual`. Add AES-256-GCM delivery helpers that derive a 32-byte key from the recovery secret, use a fresh 12-byte nonce, authenticate the payload, and return `null` when decryption or authentication fails. Add a round-trip test and a tampered-payload rejection test.

Run: `npm test`

Expected: all primitive tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json src/lib/auth tests/auth
git commit -m "test: add username auth primitives"
```

---

### Task 2: Non-destructive database schema

**Files:**
- Create: `supabase/migrations/202608300004_create_username_auth.sql`

**Interfaces:**
- Consumes: normalized `username` and `recovery_digest` from new-user metadata.
- Produces: `public.profiles` and `public.account_recovery`.

- [ ] **Step 1: Write the migration**

Use `create table if not exists`; never drop, truncate, or delete. Add a unique index on `profiles.username_normalized`, enable RLS, and add owner-only select policy for profiles. Do not add client policies for recovery rows.

Add an `after insert on auth.users` trigger that validates username metadata and inserts both rows in the signup transaction:

```sql
insert into public.profiles (id, username, username_normalized)
values (new.id, new.raw_user_meta_data ->> 'username', lower(new.raw_user_meta_data ->> 'username'));

insert into public.account_recovery (user_id, recovery_digest)
values (new.id, new.raw_user_meta_data ->> 'recovery_digest');
```

- [ ] **Step 2: Review migration safety**

Run: `rg -n "drop|truncate|delete from" supabase/migrations/202608300004_create_username_auth.sql`

Expected: no destructive statements.

- [ ] **Step 3: Apply and verify in Supabase**

Apply through SQL Editor. Verify both tables, the unique index, trigger, and RLS policies with read-only catalog queries.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/202608300004_create_username_auth.sql
git commit -m "feat: add username auth schema"
```

---

### Task 3: Server-only configuration

**Files:**
- Create: `src/lib/auth/config.ts`
- Create: `src/lib/supabase/admin.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getUsernameAuthConfig()`
- Produces: `createAdminClient()`

- [ ] **Step 1: Validate environment**

Require `SUPABASE_SECRET_KEY`, `USERNAME_AUTH_SECRET`, and `ACCOUNT_RECOVERY_SECRET`; both HMAC secrets must contain at least 32 characters. Errors must never include secret values.

- [ ] **Step 2: Add the admin client**

Use `@supabase/supabase-js` with `persistSession: false` and `autoRefreshToken: false`. Import `server-only` in both modules.

- [ ] **Step 3: Document empty variables and verify ignore rules**

```dotenv
SUPABASE_SECRET_KEY=
USERNAME_AUTH_SECRET=
ACCOUNT_RECOVERY_SECRET=
```

Run: `git check-ignore -v .env.local`

Expected: ignored.

- [ ] **Step 4: Commit**

```powershell
git add .env.example src/lib/auth/config.ts src/lib/supabase/admin.ts
git commit -m "feat: add server-only auth configuration"
```

---

### Task 4: Username registration and login

**Files:**
- Modify: `src/app/login/actions.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/password-field.tsx`
- Create: `src/app/account/recovery-code/page.tsx`

**Interfaces:**
- Produces: `signUpWithUsername(formData: FormData)`
- Produces: `signInWithUsername(formData: FormData)`

- [ ] **Step 1: Replace email credential parsing**

Read `username`, `password`, and `passwordConfirm`. Validate username, enforce 8-character passwords, and require matching registration passwords.

- [ ] **Step 2: Implement registration**

Generate a recovery code/digest, derive the internal email, and call:

```ts
await supabase.auth.signUp({
  email: deriveInternalEmail(username, config.usernameSecret),
  password,
  options: { data: { username, recovery_digest: digest } },
});
```

On success, place the plaintext recovery code in an encrypted, HTTP-only, same-site cookie that expires after 10 minutes and redirect to `/account/recovery-code`. Never put it in the URL.

- [ ] **Step 3: Implement login**

Derive the internal email and call `signInWithPassword`. Unknown username and incorrect password must return the same public error.

- [ ] **Step 4: Replace public form copy**

Remove all email fields and magic-link controls. Show username/password, matching password confirmation on registration, and a “忘记密码” link. Use correct autocomplete attributes.

- [ ] **Step 5: Build recovery-code acknowledgement**

Read and immediately clear the short-lived cookie. Show copy/download guidance. Direct access without the cookie redirects to login.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run lint && npm run build`

```powershell
git add src/app/login src/app/account/recovery-code
git commit -m "feat: add username registration and login"
```

---

### Task 5: Recovery-code password reset

**Files:**
- Create: `src/app/account/recovery/actions.ts`
- Create: `src/app/account/recovery/page.tsx`

**Interfaces:**
- Produces: `recoverAccount(formData: FormData)`

- [ ] **Step 1: Implement lookup and lock check**

Normalize username, query profile and recovery state with the admin client, and use identical public errors for unknown usernames and incorrect codes.

- [ ] **Step 2: Implement failed-attempt lockout**

Increment failures. At the fifth mismatch, set `locked_until` to 15 minutes from database time.

- [ ] **Step 3: Implement successful recovery**

Validate matching new passwords, update the Supabase Auth password, rotate the recovery digest, clear lock state, and show the new code through the acknowledgement cookie.

- [ ] **Step 4: Build the form**

Fields: username, recovery code, new password, confirmation. Explain that successful recovery rotates the code and link back to login.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run build`

```powershell
git add src/app/account/recovery
git commit -m "feat: add recovery-code password reset"
```

---

### Task 6: Existing-account migration

**Files:**
- Create: `src/app/account/setup/actions.ts`
- Create: `src/app/account/setup/page.tsx`
- Modify: `src/lib/supabase/proxy.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/app-header.tsx`

**Interfaces:**
- Produces: `setupUsernameForCurrentUser(formData: FormData)`

- [ ] **Step 1: Detect legacy accounts**

Authenticated users without a profile go to `/account/setup`; exempt setup routes from loops.

- [ ] **Step 2: Implement idempotent migration**

Verify current session, validate unique username and matching password, generate recovery state, then update the existing Auth user with internal email, password, confirmed state, and username metadata. Insert profile/recovery rows using the same UUID.

- [ ] **Step 3: Preserve partial state**

If a public-table insert fails, never delete the user or business rows. Re-running completes missing rows while retaining the same UUID.

- [ ] **Step 4: Display usernames**

Dashboard/header show `@username`; no component renders `claims.email`.

- [ ] **Step 5: Verify UUID preservation and commit**

Compare the Auth UUID and owned library/document/conversation counts before and after migration.

```powershell
git add src/app/account/setup src/lib/supabase/proxy.ts src/app/dashboard/page.tsx src/components/app-header.tsx
git commit -m "feat: migrate legacy accounts to usernames"
```

---

### Task 7: Security and multi-device acceptance

**Files:**
- Modify: `README.md`
- Modify: `docs/setup/supabase.md`

**Interfaces:**
- Validates all interfaces from Tasks 1–6.

- [ ] **Step 1: Verify authentication behavior**

Test registration, case-insensitive duplicates, incorrect/correct login, lockout, successful recovery, and recovery-code rotation. Confirm URLs and responses contain no secrets or internal email.

- [ ] **Step 2: Verify two-device sharing**

Log one username into two isolated browser contexts. Create a library in the first and confirm it appears in the second with the same owner UUID. Upload a test PDF in one and confirm it appears in the other.

- [ ] **Step 3: Verify RLS isolation**

A second username must not read or mutate the first user’s libraries, documents, conversations, messages, storage objects, profile, or recovery row.

- [ ] **Step 4: Run final checks**

```powershell
npm test
npm run lint
npm run build
npm audit --omit=dev
git diff --check
```

Expected: tests/lint/build pass, production audit reports zero vulnerabilities, and diff check reports no whitespace errors.

- [ ] **Step 5: Document operations and commit**

Document disabled email confirmation, enabled multiple sessions, and the three server-only variables without recording values.

```powershell
git add README.md docs/setup/supabase.md
git commit -m "docs: document username authentication operations"
git push origin main
```

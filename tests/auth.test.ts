import test from "node:test";
import assert from "node:assert/strict";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isAdmin, requireAdmin } from "../lib/auth-server";
process.env.ADMIN_EMAILS = "acttion543@gmail.com";
const user = (email: string, verified = true) =>
  ({ email, email_verified: verified }) as DecodedIdToken;
test("only configured verified Google email receives admin role", () => {
  assert.equal(isAdmin(user("acttion543@gmail.com")), true);
  assert.equal(isAdmin(user("ACTTION543@gmail.com")), true);
  assert.equal(isAdmin(user("other@gmail.com")), false);
  assert.equal(isAdmin(user("acttion543@gmail.com", false)), false);
});
test("unconfigured admin list denies access, never promotes first user", () => {
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdmin(user("acttion543@gmail.com")), false);
  process.env.ADMIN_EMAILS = "acttion543@gmail.com";
});
test("participant calling admin operation receives 403", () => {
  assert.throws(() => requireAdmin(user("participant@gmail.com")), {
    status: 403,
  });
});

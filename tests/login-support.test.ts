import test from "node:test";
import assert from "node:assert/strict";
import {
  embeddedBrowserName,
  shouldUseRedirectLogin,
  loginRecoveryLink,
  loginErrorMessage,
} from "../lib/login-support";
import config from "../next.config";

const domain = "quizpop-sandy.vercel.app";
const safari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";

test("LINE and other embedded browsers get external-browser help", () => {
  assert.equal(embeddedBrowserName("Mozilla iPhone Line/15.0"), "LINE");
  assert.equal(embeddedBrowserName("Android [FBAN/FB4A;FBAV/1]"), "Facebook");
  assert.equal(embeddedBrowserName("iPhone Instagram 360"), "Instagram");
  assert.equal(embeddedBrowserName(safari), null);
});

test("iPhone, Android and iPad desktop-mode use same-origin redirects", () => {
  for (const [ua, touches] of [["iPhone Safari", 1], ["Android Chrome", 1], [safari, 5]] as const) {
    assert.equal(shouldUseRedirectLogin(ua, touches, domain, domain), true);
  }
  assert.equal(shouldUseRedirectLogin(safari, 0, domain, domain), false);
});

test("redirects never start across origins or inside detected embedded browsers", () => {
  assert.equal(shouldUseRedirectLogin("iPhone", 1, domain, "project.firebaseapp.com"), false);
  assert.equal(shouldUseRedirectLogin("iPhone Line/15.0", 1, domain, domain), false);
  assert.equal(shouldUseRedirectLogin("iPhone", 1, "localhost", undefined), false);
});

test("recovery links preserve room invitations and admin destination without auth parameters", () => {
  assert.equal(loginRecoveryLink(`https://${domain}/?join=123456&code=secret#token`), `https://${domain}/?join=123456`);
  assert.equal(loginRecoveryLink(`https://${domain}/admin?code=secret`), `https://${domain}/admin`);
  assert.equal(loginRecoveryLink(`https://${domain}/?join=invalid`), `https://${domain}/`);
});

test("auth errors give actionable guidance without exposing provider details", () => {
  assert.match(loginErrorMessage({ code: "auth/missing-initial-state" }), /Safari/);
  assert.match(loginErrorMessage({ code: "auth/popup-blocked" }), /แท็บนี้/);
  assert.match(loginErrorMessage({ code: "auth/unauthorized-domain" }), /โดเมน/);
  assert.doesNotMatch(loginErrorMessage(new Error("sensitive details")), /sensitive/);
});

test("Firebase helper is proxied, not redirected, and can be framed only on our origin", async () => {
  const rewrites = await config.rewrites!();
  assert.deepEqual(rewrites, [{
    source: "/__/auth/:path*",
    destination: "https://quizpop-543-261121.firebaseapp.com/__/auth/:path*",
  }]);
  const headers = await config.headers!();
  const app = headers.find((rule) => rule.source === "/:path*")!;
  const helper = headers.find((rule) => rule.source === "/__/auth/:path*")!;
  assert.equal(app.headers.find((h) => h.key === "X-Frame-Options")?.value, "DENY");
  assert.equal(helper.headers.find((h) => h.key === "X-Frame-Options")?.value, "SAMEORIGIN");
  assert.match(helper.headers.find((h) => h.key === "Cache-Control")!.value, /no-store/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { isSchoolUserRole } from "./schoolUserGuard.ts";

test("identifies school_user as restricted from landing browse", () => {
  assert.equal(isSchoolUserRole("school_user"), true);
});

test("allows guests (undefined/null) to browse", () => {
  assert.equal(isSchoolUserRole(undefined), false);
  assert.equal(isSchoolUserRole(null), false);
});

test("does not restrict admin or super_admin", () => {
  assert.equal(isSchoolUserRole("admin"), false);
  assert.equal(isSchoolUserRole("super_admin"), false);
});

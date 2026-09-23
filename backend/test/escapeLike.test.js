const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeLike } = require("../src/utils/escapeLike");

test("escapes LIKE wildcards and the escape character", () => {
  assert.equal(escapeLike("%"), "\\%");
  assert.equal(escapeLike("_"), "\\_");
  assert.equal(escapeLike("\\"), "\\\\");
  assert.equal(escapeLike("co_rg"), "co\\_rg");
  assert.equal(escapeLike("100%_\\x"), "100\\%\\_\\\\x");
});

test("leaves ordinary text unchanged (no double escaping)", () => {
  for (const s of ["coorg", "south", "must-visit", "café", "a.b*c?", ""]) {
    assert.equal(escapeLike(s), s);
  }
});

test("escaping is applied once per call, not cumulatively", () => {
  assert.equal(escapeLike(escapeLike("%")), "\\\\\\%");
});

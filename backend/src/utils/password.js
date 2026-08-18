const bcrypt = require("bcrypt");

// Ported from the Next.js app's lib/auth/password.js — same contract.

const SALT_ROUNDS = 12;

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// A real bcrypt hash of a value nobody will ever type, computed once and
// cached. Login compares against this when no admin matches the given
// email, so a bcrypt.compare() of comparable cost still runs either way —
// keeps "no such email" and "wrong password" from being distinguishable by
// response time, not just by response body.
let dummyHashPromise;
function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("explorenbite-timing-safety-placeholder");
  }
  return dummyHashPromise;
}

module.exports = { hashPassword, comparePassword, getDummyHash };

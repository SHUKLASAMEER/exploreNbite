import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// A real bcrypt hash of a value nobody will ever type, computed once and
// cached. Login compares against this when no admin matches the given
// email, so a bcrypt.compare() of comparable cost still runs either way —
// keeps "no such email" and "wrong password" from being distinguishable by
// response time, not just by response body.
let dummyHashPromise;
export function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("explorenbite-timing-safety-placeholder");
  }
  return dummyHashPromise;
}

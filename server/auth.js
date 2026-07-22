import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !String(storedHash).includes(":")) return false;
  const [salt, hash] = String(storedHash).split(":");
  const testHash = scryptSync(String(password), salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

/** Bump version when emails/passwords change — triggers re-sync in live databases. */
export const CREDENTIAL_VERSION = 2;

export const managedUserIds = ["stu-steven", "stu-anna", "usr-philip"];

export const demoCredentials = {
  "stu-jayden": { email: "jayden@edusg.sg", password: "edusg123", version: 1 },
  "stu-emma": { email: "emma@edusg.sg", password: "edusg123", version: 1 },
  "stu-steven": { email: "stevenpham@edusg.sg", password: "Steven@123", version: CREDENTIAL_VERSION },
  "stu-anna": { email: "annapham@edusg.sg", password: "Anna@123", version: CREDENTIAL_VERSION },
  "par-mum": { email: "mum@edusg.sg", password: "edusg123", version: 1 },
  "usr-philip": { email: "tphuongcdc@edusg.sg", password: "tphuongcdc@123", version: CREDENTIAL_VERSION },
  "admin-content": { email: "admin@edusg.sg", password: "edusg123", version: 1 }
};

let legacyDemoPasswordHash = null;

function getLegacyDemoPasswordHash() {
  if (!legacyDemoPasswordHash) legacyDemoPasswordHash = hashPassword("edusg123");
  return legacyDemoPasswordHash;
}

export function applyManagedUserCredentials(user, seedUser) {
  const creds = demoCredentials[user.id];
  if (!creds || !managedUserIds.includes(user.id)) return false;

  let changed = false;
  if (seedUser?.email && user.email !== seedUser.email) {
    user.email = seedUser.email;
    changed = true;
  }
  if (seedUser?.name && user.name !== seedUser.name) {
    user.name = seedUser.name;
    changed = true;
  }
  const targetVersion = creds.version || CREDENTIAL_VERSION;
  if ((user.credentialVersion || 0) < targetVersion) {
    user.passwordHash = hashPassword(creds.password);
    user.credentialVersion = targetVersion;
    changed = true;
  }
  return changed;
}

export function ensureUserAuthFields(user) {
  const defaults = demoCredentials[user.id];
  if (!user.email && defaults) user.email = defaults.email;
  if (!user.passwordHash && defaults) {
    user.passwordHash = hashPassword(defaults.password);
    user.credentialVersion = defaults.version || 1;
  } else if (!user.passwordHash && !defaults) {
    user.passwordHash = getLegacyDemoPasswordHash();
  }
  if (!user.registeredAt) user.registeredAt = new Date().toISOString();
  if (user.loginCount === undefined) user.loginCount = 0;
  if (!user.lastLoginAt) user.lastLoginAt = null;
  return user;
}

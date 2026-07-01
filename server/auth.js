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

export const demoCredentials = {
  "stu-jayden": { email: "jayden@edusg.sg", password: "edusg123" },
  "stu-emma": { email: "emma@edusg.sg", password: "edusg123" },
  "stu-steven": { email: "steven@edusg.sg", password: "edusg123" },
  "stu-anna": { email: "anna@edusg.sg", password: "edusg123" },
  "par-mum": { email: "mum@edusg.sg", password: "edusg123" },
  "usr-philip": { email: "philip@edusg.sg", password: "edusg123" },
  "admin-content": { email: "admin@edusg.sg", password: "edusg123" }
};

let demoPasswordHash = null;

function getDemoPasswordHash() {
  if (!demoPasswordHash) demoPasswordHash = hashPassword("edusg123");
  return demoPasswordHash;
}

export function ensureUserAuthFields(user) {
  const defaults = demoCredentials[user.id];
  if (!user.email && defaults) user.email = defaults.email;
  if (!user.passwordHash && defaults) user.passwordHash = getDemoPasswordHash();
  if (!user.registeredAt) user.registeredAt = new Date().toISOString();
  if (user.loginCount === undefined) user.loginCount = 0;
  if (!user.lastLoginAt) user.lastLoginAt = null;
  return user;
}

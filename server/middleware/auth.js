export function getUserId(req) {
  return String(req.headers["x-user-id"] || req.query.userId || "").trim();
}

export async function loadUser(req, readDb) {
  const userId = getUserId(req);
  if (!userId) return null;
  const db = await readDb();
  const user = db.users.find((entry) => entry.id === userId);
  return user ? { db, user } : null;
}

export function requireAuth(readDb) {
  return async (req, res, next) => {
    const loaded = await loadUser(req, readDb);
    if (!loaded) return res.status(401).json({ error: "Authentication required" });
    req.db = loaded.db;
    req.user = loaded.user;
    next();
  };
}

export function getUserRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  return user.role ? [user.role] : [];
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = getUserRoles(req.user);
    if (!req.user || !roles.some((role) => userRoles.includes(role))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function getLinkedStudentIds(user) {
  const ids =
    Array.isArray(user.linkedStudentIds) && user.linkedStudentIds.length
      ? user.linkedStudentIds
      : user.linkedStudentId
        ? [user.linkedStudentId]
        : [];
  if (!ids.length) return [];
  const roles = getUserRoles(user);
  if (roles.includes("parent")) return ids;
  return [];
}

export function requireParentOf(childId) {
  return (req, res, next) => {
    if (req.user.role === "admin") return next();
    if (req.user.role !== "parent") {
      return res.status(403).json({ error: "Parent access required" });
    }
    const ids = getLinkedStudentIds(req.user);
    if (!ids.includes(childId) && !ids.includes(req.params.childId)) {
      return res.status(403).json({ error: "Not linked to this student" });
    }
    next();
  };
}

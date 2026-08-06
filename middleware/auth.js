// Auth guards + a small middleware that exposes the logged-in user to every
// EJS view as `sessionUser`, so header.ejs can switch Login/Signup vs
// Dashboard/Logout without every route having to pass it in manually.

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== "admin") {
    return res.redirect("/login");
  }
  next();
}

function attachUser(req, res, next) {
  res.locals.sessionUser = req.session && req.session.userId
    ? { id: req.session.userId, name: req.session.name, role: req.session.role }
    : null;
  next();
}

module.exports = { requireLogin, requireAdmin, attachUser };

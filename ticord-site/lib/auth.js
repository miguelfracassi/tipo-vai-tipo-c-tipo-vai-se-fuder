const crypto = require("crypto");
const { db } = require("./db");

const COOKIE = "ticord_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

function checkPassword(pw, stored) {
  const parts = String(stored).split(":");
  if (parts.length !== 2) return false;
  const expected = Buffer.from(parts[1], "hex");
  const calc = crypto.scryptSync(pw, Buffer.from(parts[0], "hex"), 64);
  return calc.length === expected.length && crypto.timingSafeEqual(calc, expected);
}

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

function readToken(req) {
  const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + COOKIE + "=([a-f0-9]+)"));
  return m ? m[1] : null;
}

function cookie(value, maxAge) {
  return COOKIE + "=" + value + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + maxAge;
}

async function createSession(res, userId) {
  const sql = await db();
  const token = crypto.randomBytes(32).toString("hex");
  await sql`delete from sessions where expires_at < now()`;
  await sql`insert into sessions (token_hash, user_id, expires_at)
            values (${sha(token)}, ${userId}, now() + interval '30 days')`;
  res.setHeader("Set-Cookie", cookie(token, MAX_AGE));
}

async function getUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const sql = await db();
  const rows = await sql`select u.id, u.first_name, u.last_name, u.email, u.is_client
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha(token)} and s.expires_at > now()`;
  return rows[0] || null;
}

async function destroySession(req, res) {
  const token = readToken(req);
  if (token) {
    const sql = await db();
    await sql`delete from sessions where token_hash = ${sha(token)}`;
  }
  res.setHeader("Set-Cookie", cookie("", 0));
}

function send(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
}

const publicUser = (u) => ({
  first_name: u.first_name, last_name: u.last_name, email: u.email, is_client: u.is_client
});

module.exports = { hashPassword, checkPassword, createSession, getUser, destroySession, send, publicUser };

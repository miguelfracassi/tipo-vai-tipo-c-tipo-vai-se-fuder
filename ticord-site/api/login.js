const { db } = require("../lib/db");
const A = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return A.send(res, 405, { error: "Método não permitido." });
  try {
    const b = req.body || {};
    const email = String(b.email || "").trim().toLowerCase();
    const pw = String(b.password || "");
    if (!email || !pw || pw.length > 100) return A.send(res, 400, { error: "Informe email e senha." });

    const sql = await db();
    const rows = await sql`select id, first_name, last_name, email, is_client, password_hash
      from users where email = ${email}`;
    const u = rows[0];
    if (!u || !A.checkPassword(pw, u.password_hash))
      return A.send(res, 401, { error: "Email ou senha incorretos." });

    await A.createSession(res, u.id);
    A.send(res, 200, { user: A.publicUser(u) });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor. Tente novamente." });
  }
};

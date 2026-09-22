const { db } = require("../lib/db");
const A = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return A.send(res, 405, { error: "Método não permitido." });
  try {
    const b = req.body || {};
    const first = String(b.first_name || "").trim();
    const last = String(b.last_name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const pw = String(b.password || "");

    if (!first || !last || first.length > 60 || last.length > 60)
      return A.send(res, 400, { error: "Informe o primeiro nome e o sobrenome." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return A.send(res, 400, { error: "Digite um email válido." });
    if (pw.length < 8 || pw.length > 100)
      return A.send(res, 400, { error: "A senha precisa ter entre 8 e 100 caracteres." });

    const sql = await db();
    const rows = await sql`insert into users (first_name, last_name, email, password_hash)
      values (${first}, ${last}, ${email}, ${A.hashPassword(pw)})
      on conflict (email) do nothing
      returning id, first_name, last_name, email, is_client`;
    if (!rows.length) return A.send(res, 409, { error: "Já existe uma conta com esse email. Tente entrar." });

    await A.createSession(res, rows[0].id);
    A.send(res, 200, { user: A.publicUser(rows[0]) });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor. Tente novamente." });
  }
};

const { db } = require("../lib/db");
const A = require("../lib/auth");
const { sync } = require("../lib/mp");

module.exports = async (req, res) => {
  try {
    const user = await A.getUser(req);
    if (!user) return A.send(res, 401, { error: "Faça login." });
    const sql = await db();
    const rows = await sql`select id, mp_id, status from payments where user_id = ${user.id} order by id desc limit 1`;
    let r = rows[0];
    if (!r) return A.send(res, 200, { status: "none" });
    if (r.status === "pending" && r.mp_id) {
      await sync(r.mp_id);
      r = (await sql`select status from payments where id = ${r.id}`)[0];
    }
    A.send(res, 200, { status: r.status });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor." });
  }
};

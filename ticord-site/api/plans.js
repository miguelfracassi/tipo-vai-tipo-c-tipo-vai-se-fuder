const { db } = require("../lib/db");
const A = require("../lib/auth");
const { PLANS } = require("../lib/mp");

module.exports = async (req, res) => {
  try {
    const u = await A.getUser(req);
    if (!u) return A.send(res, 401, { error: "Faça login." });
    const sql = await db();
    const plans = await sql`select plan_key, name, started_at, expires_at, (now() >= expires_at) as can_renew
      from plans where user_id = ${u.id} order by id`;
    A.send(res, 200, { plans: plans.map((p) => Object.assign({}, p, { page: (PLANS[p.plan_key] || {}).page })) });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor." });
  }
};

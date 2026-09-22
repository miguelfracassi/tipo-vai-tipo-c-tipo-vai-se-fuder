const { db } = require("../lib/db");
const A = require("../lib/auth");
const { PLANS, mp } = require("../lib/mp");

module.exports = async (req, res) => {
  if (req.method !== "POST") return A.send(res, 405, { error: "Método não permitido." });
  let sql, row;
  try {
    const user = await A.getUser(req);
    if (!user) return A.send(res, 401, { error: "Faça login para continuar." });
    const b = req.body || {};
    const key = String(b.plan || "anual");
    const PLAN = PLANS[key];
    if (!PLAN) return A.send(res, 400, { error: "Plano inválido." });
    const renew = !!b.renew;
    sql = await db();

    const plans = await sql`select id, (now() >= expires_at) as can_renew from plans where user_id = ${user.id} and plan_key = ${key} order by id limit 1`;
    const plan = plans[0];
    let planId = null;
    if (renew) {
      if (!plan) return A.send(res, 400, { error: "Você ainda não tem um plano para renovar." });
      if (!plan.can_renew) return A.send(res, 403, { error: "A renovação só fica disponível um ano após o pagamento." });
      planId = plan.id;
    } else if (plan) {
      return A.send(res, 409, { error: "Você já tem esse plano." });
    }

    // Reaproveita um Pix ainda válido, para não gerar cobranças repetidas
    const pend = await sql`select qr_code, qr_base64 from payments
      where user_id = ${user.id} and plan_key = ${key} and status = 'pending' and mp_id is not null
        and created_at > now() - interval '23 hours' and plan_id is not distinct from ${planId}::int
      order by id desc limit 1`;
    if (pend[0]) return A.send(res, 200, { qr_code: pend[0].qr_code, qr_base64: pend[0].qr_base64 });

    row = (await sql`insert into payments (user_id, plan_id, plan_key, amount) values (${user.id}, ${planId}::int, ${key}, ${PLAN.amount}) returning id`)[0];
    const host = process.env.SITE_URL || "https://" + req.headers.host;
    const p = await mp("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": "ticord-pay-" + row.id },
      body: JSON.stringify({
        transaction_amount: PLAN.amount,
        description: "Plano " + PLAN.name + " - andfopportunity.com",
        payment_method_id: "pix",
        payer: { email: user.email, first_name: user.first_name, last_name: user.last_name },
        external_reference: String(row.id),
        notification_url: host + "/api/mp-webhook"
      })
    });
    const td = p.point_of_interaction.transaction_data;
    await sql`update payments set mp_id = ${String(p.id)}, qr_code = ${td.qr_code}, qr_base64 = ${td.qr_base64} where id = ${row.id}`;
    A.send(res, 200, { qr_code: td.qr_code, qr_base64: td.qr_base64 });
  } catch (e) {
    console.error(e);
    if (sql && row) await sql`update payments set status = 'failed' where id = ${row.id} and mp_id is null`.catch(() => {});
    A.send(res, 500, { error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." });
  }
};

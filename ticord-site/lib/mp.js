const { db } = require("./db");

// Planos vendidos (preço e duração definidos aqui, no servidor — o navegador não decide valor)
// page = endereço da página escondida de cada plano
const PLANS = {
  anual:  { name: "Anual",  amount: 60, interval: "1 year", page: "andfopportunity" },
  diario: { name: "Diário", amount: 1,  interval: "1 day",  page: "andfopportunity-diario" }
};
const MP = "https://api.mercadopago.com";

async function mp(path, opt) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurada");
  opt = opt || {};
  const r = await fetch(MP + path, Object.assign({}, opt, {
    headers: Object.assign({ Authorization: "Bearer " + token, "Content-Type": "application/json" }, opt.headers)
  }));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Mercado Pago " + r.status + ": " + JSON.stringify(data));
  return data;
}

// Aprova o pagamento UMA única vez, de forma atômica:
// marca como pago, vira cliente e cria o plano (ou estende 1 ano na renovação)
const APPROVE_SQL = `
with p as (
  update payments set status = 'approved', paid_at = now()
  where id = $1 and status <> 'approved'
  returning id, user_id, plan_id, plan_key
),
u as (
  update users set is_client = true where id in (select user_id from p) returning id
),
n as (
  insert into plans (user_id, plan_key, name, started_at, expires_at, payment_id)
  select user_id, plan_key, $3::text, now(), now() + $2::interval, id from p where plan_id is null
  returning id
),
r as (
  update plans set expires_at = greatest(expires_at, now()) + $2::interval
  where id in (select plan_id from p where plan_id is not null)
  returning id
)
select count(*)::int as changed from p`;

// Consulta o pagamento direto no Mercado Pago (nunca confia no navegador nem no corpo do webhook)
async function sync(mpId) {
  const p = await mp("/v1/payments/" + encodeURIComponent(mpId));
  const ref = parseInt(p.external_reference, 10);
  if (!ref) return p.status;
  const sql = await db();
  const rows = await sql`select id, amount, plan_key from payments where id = ${ref} and mp_id = ${String(p.id)}`;
  const row = rows[0];
  if (!row) return p.status;
  const plan = PLANS[row.plan_key];
  if (plan && p.status === "approved" && Number(p.transaction_amount) === Number(row.amount)) {
    await sql(APPROVE_SQL, [row.id, plan.interval, plan.name]);
  } else if (["cancelled", "rejected", "expired"].indexOf(p.status) > -1) {
    await sql`update payments set status = ${p.status} where id = ${row.id} and status = 'pending'`;
  }
  return p.status;
}

module.exports = { PLANS, mp, sync, APPROVE_SQL };

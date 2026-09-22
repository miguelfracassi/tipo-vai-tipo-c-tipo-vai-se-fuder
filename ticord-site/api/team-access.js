const A = require("../lib/auth");
const { hubId, keyOk } = require("../lib/hub");

// Limite simples de tentativas erradas por IP (fica na memória de cada instância,
// então serve para frear tentativa em massa, não como bloqueio absoluto).
const fails = new Map();
const MAX_FAILS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "desconhecido";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return A.send(res, 405, { error: "Método não permitido." });
  try {
    const ip = clientIp(req);
    const now = Date.now();
    if (fails.size > 2000) fails.clear();
    let rec = fails.get(ip);
    if (!rec || now - rec.t > WINDOW_MS) rec = { n: 0, t: now };

    if (rec.n >= MAX_FAILS)
      return A.send(res, 429, { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });

    const key = String((req.body || {}).key || "").slice(0, 100);
    if (!keyOk(key)) {
      rec.n += 1;
      fails.set(ip, rec);
      return A.send(res, 401, { error: "Chave de acesso incorreta." });
    }

    fails.delete(ip);
    A.send(res, 200, { hub: hubId() });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor. Tente novamente." });
  }
};

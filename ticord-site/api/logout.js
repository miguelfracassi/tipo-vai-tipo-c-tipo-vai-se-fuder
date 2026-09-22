const A = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return A.send(res, 405, { error: "Método não permitido." });
  try {
    await A.destroySession(req, res);
    A.send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor." });
  }
};

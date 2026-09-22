const A = require("../lib/auth");
const { hubId } = require("../lib/hub");

// Só quem está logado recebe o endereço do chat de suporte.
module.exports = async (req, res) => {
  try {
    const u = await A.getUser(req);
    if (!u) return A.send(res, 401, { error: "Entre na sua conta para pedir suporte." });
    A.send(res, 200, { hub: hubId() });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor. Tente novamente." });
  }
};

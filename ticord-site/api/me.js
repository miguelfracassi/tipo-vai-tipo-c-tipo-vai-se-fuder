const A = require("../lib/auth");

module.exports = async (req, res) => {
  try {
    const u = await A.getUser(req);
    A.send(res, 200, { user: u ? A.publicUser(u) : null });
  } catch (e) {
    console.error(e);
    A.send(res, 500, { error: "Erro no servidor." });
  }
};

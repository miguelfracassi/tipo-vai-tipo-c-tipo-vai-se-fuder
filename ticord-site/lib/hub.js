const crypto = require("crypto");

// Chave de acesso do painel /chatteam.
// Para trocar: variável de ambiente TEAM_KEY na Vercel (padrão: 9999).
const teamKey = () => String(process.env.TEAM_KEY || "9999");

// ID do "ponto de encontro" do chat. Ele não fica escrito no JavaScript do site:
// é gerado aqui no servidor e só é entregue a quem estiver logado (cliente)
// ou a quem souber a chave (equipe).
function hubId() {
  const secret = process.env.HUB_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "ticord-support";
  return "ticord-" + crypto.createHmac("sha256", secret).update("hub:" + teamKey()).digest("hex").slice(0, 24);
}

function keyOk(input) {
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(teamKey()).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { hubId, keyOk };

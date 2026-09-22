const { sync } = require("../lib/mp");

// O Mercado Pago avisa aqui quando um Pix é pago. O status é sempre reconferido na API deles.
module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const b = req.body || {};
    const id = (b.data && b.data.id) || q["data.id"] || q.id;
    const type = b.type || q.type || q.topic;
    if (id && (!type || type === "payment")) await sync(id);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};

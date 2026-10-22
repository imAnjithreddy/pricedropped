// Price Dropped view counter. Written by render.py in the deals bot: edit it there, not here.
// Needs Upstash Redis connected to the Vercel project (Storage), which sets the env vars below.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const OK = /^(deal|price)\/[a-z0-9-]{1,160}$/;

async function redis(cmd) {
  const r = await fetch(URL_, {method: "POST", headers: {Authorization: "Bearer " + TOKEN}, body: JSON.stringify(cmd)});
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" || !URL_ || !TOKEN) return res.status(200).json({views: {}});
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const ids = (Array.isArray(body.ids) ? body.ids : []).filter(k => typeof k === "string" && OK.test(k)).slice(0, 300);
  try {
    if (typeof body.hit === "string" && OK.test(body.hit)) await redis(["INCR", "views:" + body.hit]);
    const vals = ids.length ? await redis(["MGET", ...ids.map(k => "views:" + k)]) : [];
    const views = {};
    ids.forEach((k, i) => { if (vals[i]) views[k] = Number(vals[i]); });
    res.status(200).json({views});
  } catch (e) {
    res.status(200).json({views: {}});
  }
};

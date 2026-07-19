// Vercel Serverless Function — wraps Express server routes
// All /api/* requests are handled here via serverless-http

const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tolzqxflecqbjdefohom.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: { headers: { "User-Agent": "invergrow-vercel" } }
});

// ── Estado en memoria (se reinicia entre invocaciones frías) ──────────────
// El estado real viene de Supabase
const STATE_KEY = "invergrow_state";

const defaultState = {
  balance: 0,
  investedCapital: 0,
  totalWithdrawals: 0,
  reinvestmentFund: 0,
  netGains: 0,
  collaborators: [],
  transactions: [],
  webhookLogs: [],
  aiWorkers: [
    { id:"ai-1", name:"SEO Copywriter Pro", role:"Generación de artículos SEO", status:"ACTIVE", level:1, model:"gemini-2.0-flash", baseIncomeRate:0.45, unlocked:true, costToUnlock:0, costToUpgrade:200, totalGenerated:1240.50, icon:"PenTool" },
    { id:"ai-2", name:"Micro-SaaS API Gateway", role:"Atención de peticiones API de terceros", status:"ACTIVE", level:1, model:"gemini-2.0-flash", baseIncomeRate:0.28, unlocked:true, costToUnlock:0, costToUpgrade:250, totalGenerated:890.30, icon:"Cpu" },
    { id:"ai-3", name:"Digital Infoproduct Maker", role:"Auto-publicación de e-books en marketplaces", status:"IDLE", level:0, model:"gemini-2.0-flash-lite", baseIncomeRate:0.65, unlocked:false, costToUnlock:500, costToUpgrade:400, totalGenerated:0, icon:"BookOpen" },
    { id:"ai-4", name:"Batch Content Translator", role:"Traducción de catálogos y posts en lote", status:"IDLE", level:0, model:"gemini-2.0-flash-lite", baseIncomeRate:1.15, unlocked:false, costToUnlock:1100, costToUpgrade:850, totalGenerated:0, icon:"Globe" }
  ],
  aiLogs: [],
  apiConfig: {
    geminiConnected: !!process.env.GEMINI_API_KEY,
    distributionWebhook: "",
    targetMarket: "WordPress CMS y Tiendas Digitales",
    payoutModel: "SPLIT_70_30"
  }
};

async function loadState() {
  if (!SUPABASE_KEY) return JSON.parse(JSON.stringify(defaultState));
  try {
    const { data } = await supabase.from("apps").select("description").eq("id", STATE_KEY).single();
    if (data?.description) {
      const s = JSON.parse(data.description);
      s.apiConfig.geminiConnected = !!process.env.GEMINI_API_KEY;
      return s;
    }
  } catch {}
  return JSON.parse(JSON.stringify(defaultState));
}

async function saveState(state) {
  if (!SUPABASE_KEY) return;
  try {
    await supabase.from("apps").upsert({
      id: STATE_KEY,
      user_id: "admin-joan",
      user_email: "joanlazaro83@gmail.com",
      name: "InverGrow State",
      description: JSON.stringify(state)
    }, { onConflict: "id" });
  } catch (e) {
    console.warn("saveState error:", e.message);
  }
}

function logWebhook(state, type, status, payload, message) {
  const log = {
    id: `web-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    timestamp: new Date().toLocaleTimeString("es-ES",{hour12:false}) + " " + new Date().toLocaleDateString("es-ES"),
    type, status, payload, message
  };
  state.webhookLogs.unshift(log);
  if (state.webhookLogs.length > 50) state.webhookLogs.pop();
}

// ── Handler principal Vercel ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const url = req.url || "";
  const method = req.method || "GET";

  // Parsear body
  let body = {};
  if (method === "POST" || method === "PUT") {
    body = req.body || {};
  }

  const ADMIN_CODE = process.env.ADMIN_CODE || "joan123";

  // ── GET /api/data ──────────────────────────────────────────────────────
  if (url === "/api/data" || url === "/api" && method === "GET") {
    const state = await loadState();
    return res.status(200).json(state);
  }

  // ── POST /api/reset ────────────────────────────────────────────────────
  if (url === "/api/reset" && method === "POST") {
    const fresh = JSON.parse(JSON.stringify(defaultState));
    await saveState(fresh);
    return res.status(200).json({ success: true, data: fresh });
  }

  // ── POST /api/owner/verify ─────────────────────────────────────────────
  if (url === "/api/owner/verify" && method === "POST") {
    if (body.adminCode === ADMIN_CODE) {
      return res.status(200).json({ success: true });
    }
    return res.status(403).json({ success: false, error: "Código incorrecto." });
  }

  // ── POST /api/owner/history ────────────────────────────────────────────
  if (url === "/api/owner/history" && method === "POST") {
    if (body.adminCode !== ADMIN_CODE) return res.status(403).json({ success: false });
    try {
      const { data } = await supabase.from("withdrawals").select("*")
        .eq("user_id","admin-joan").order("created_at",{ascending:false}).limit(30);
      return res.status(200).json({ success: true, withdrawals: data || [] });
    } catch {
      return res.status(200).json({ success: true, withdrawals: [] });
    }
  }

  // ── POST /api/owner/withdraw ───────────────────────────────────────────
  if (url === "/api/owner/withdraw" && method === "POST") {
    const { adminCode, amount, method: withdrawMethod, note, paypalEmail } = body;
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: "Acceso denegado." });

    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) return res.status(400).json({ error: "Importe inválido." });

    const state = await loadState();
    const total = state.balance + state.netGains;
    if (amtNum > total) return res.status(400).json({ error: `Fondos insuficientes. Máximo: €${total.toFixed(2)}` });

    // Descontar
    let remaining = amtNum;
    if (state.netGains >= remaining) {
      state.netGains = Number((state.netGains - remaining).toFixed(2));
    } else {
      remaining -= state.netGains;
      state.netGains = 0;
      state.balance = Number((state.balance - remaining).toFixed(2));
    }
    state.totalWithdrawals = Number((state.totalWithdrawals + amtNum).toFixed(2));

    const txId = `tx-owner-${Date.now()}`;
    const statusMsg = `Retiro de €${amtNum.toFixed(2)} vía ${withdrawMethod || "paypal"} registrado. PayPal: ${paypalEmail || "joanlazaro83@gmail.com"}`;

    // Guardar en Supabase withdrawals
    try {
      await supabase.from("withdrawals").insert({
        id: txId,
        user_id: "admin-joan",
        user_email: "joanlazaro83@gmail.com",
        amount: amtNum,
        status: "pending",
        note: (note || "") + " | metodo:" + (withdrawMethod || "paypal") + " | destino:" + (paypalEmail || "joanlazaro83@gmail.com")
      });
    } catch (e) {
      console.warn("withdrawals insert error:", e.message);
    }

    // Registrar transacción en estado
    state.transactions.unshift({
      id: txId,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount: amtNum,
      date: new Date().toISOString().split("T")[0],
      reference: `OWNER-${Date.now().toString().slice(-6)}`,
      description: `[PROPIETARIO] ${statusMsg}`,
      gateway: "CUSTOM"
    });
    logWebhook(state, "OWNER_WITHDRAWAL", "SUCCESS", { amount: amtNum }, statusMsg);
    await saveState(state);

    return res.status(200).json({ success: true, message: statusMsg, data: state });
  }

  // ── POST /api/ai/generate ──────────────────────────────────────────────
  if (url === "/api/ai/generate" && method === "POST") {
    const { prompt, workerId, topic } = body;
    if (!prompt) return res.status(400).json({ error: "Falta la instrucción." });
    const state = await loadState();
    const worker = state.aiWorkers?.find(w => w.id === workerId) || state.aiWorkers?.[0];

    try {
      let resultText = "";
      if (process.env.GEMINI_API_KEY) {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Eres un agente IA de monetización. Nombre: ${worker.name}. Especialización: ${worker.role}. Nivel ${worker.level}.\nTema: "${topic || "Finanzas Personales"}".\nInstrucciones: "${prompt}".\nGenera un activo digital de alto valor listo para monetizar en Markdown.`
        });
        resultText = response.text || "Respuesta vacía.";
      } else {
        resultText = `### 🚀 ${worker.name} — Activo generado\n**Tema:** ${topic}\n*(Conecta GEMINI_API_KEY para generación real)*`;
      }

      const reward = Number((18 + Math.random() * 22).toFixed(2));
      const model = state.apiConfig?.payoutModel || "SPLIT_70_30";
      const toReinvest = model === "100_REINVEST" ? reward : model === "100_WITHDRAW" ? 0 : Number((reward * 0.7).toFixed(2));
      const toNet = model === "100_WITHDRAW" ? reward : model === "100_REINVEST" ? 0 : Number((reward * 0.3).toFixed(2));

      state.reinvestmentFund = Number((state.reinvestmentFund + toReinvest).toFixed(2));
      state.netGains = Number((state.netGains + toNet).toFixed(2));
      worker.totalGenerated = Number((worker.totalGenerated + reward).toFixed(2));

      if (!state.aiLogs) state.aiLogs = [];
      state.aiLogs.unshift({
        id: `ai-l-manual-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour12: false }),
        workerName: worker.name,
        action: "Generación Manual",
        revenue: reward,
        details: `Activo sobre '${topic}' monetizado por €${reward.toFixed(2)}.`
      });

      await saveState(state);
      return res.status(200).json({ success: true, text: resultText, revenue: reward, data: state });
    } catch (err) {
      return res.status(500).json({ error: "Error IA: " + err.message });
    }
  }

  // ── GET /api/data (fallback) ───────────────────────────────────────────
  if (method === "GET") {
    const state = await loadState();
    return res.status(200).json(state);
  }

  return res.status(404).json({ error: "Ruta no encontrada." });
};

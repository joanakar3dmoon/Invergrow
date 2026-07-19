import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SystemState, Transaction, Collaborator, WebhookLog, AIWorker, AILog } from "./src/types";

dotenv.config();

// ── Gemini AI ────────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } }
});

// ── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://tolzqxflecqbjdefohom.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── PayPal ───────────────────────────────────────────────────────────────────
const PAYPAL_CLIENT_ID  = process.env.PAYPAL_CLIENT_ID  || "";
const PAYPAL_SECRET     = process.env.PAYPAL_SECRET     || "";
const PAYPAL_BASE        = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const data: any = await res.json();
  if (!data.access_token) throw new Error("No se pudo obtener token PayPal: " + JSON.stringify(data));
  return data.access_token;
}

async function sendPayPalPayout(recipientEmail: string, amountEur: number, note: string): Promise<any> {
  const token = await getPayPalToken();
  const senderBatchId = `invergrow_${Date.now()}`;
  const body = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: "InverGrow — Tu retiro ha sido procesado",
      email_message: note || "Tu retiro de InverGrow ha sido procesado correctamente."
    },
    items: [{
      recipient_type: "EMAIL",
      amount: { value: amountEur.toFixed(2), currency: "EUR" },
      receiver: recipientEmail,
      note: note || "Retiro InverGrow",
      sender_item_id: `item_${Date.now()}`
    }]
  };
  const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error("PayPal error: " + JSON.stringify(data));
  return data;
}

// ── Estado inicial en memoria (fallback si Supabase no está disponible) ───────
const defaultState: SystemState = {
  balance: 15420.50,
  investedCapital: 42000.00,
  totalWithdrawals: 2850.00,
  reinvestmentFund: 350.00,
  netGains: 185.20,
  collaborators: [
    { id: "col-1", name: "Juan Pérez",  role: "Diseñador UX/UI Senior",        wage: 1500, lastPaymentDate: "2026-05-15" },
    { id: "col-2", name: "Ana Gómez",   role: "Desarrolladora Full Stack",      wage: 2200, lastPaymentDate: "2026-05-20" },
    { id: "col-3", name: "Carlos Ruiz", role: "Growth Marketer",                wage: 1100, lastPaymentDate: "2026-05-25" }
  ],
  transactions: [
    { id: "tx-1", type: "DEPOSIT",    status: "COMPLETED", amount: 5000, date: "2026-06-01", reference: "DEP-4491",  description: "Inyección de Capital Inicial" },
    { id: "tx-2", type: "WITHDRAWAL", status: "COMPLETED", amount: 1500, date: "2026-06-10", reference: "REF-39122", description: "Retiro de Dividendos Trimestrales", gateway: "STRIPE" },
    { id: "tx-3", type: "WITHDRAWAL", status: "COMPLETED", amount: 1350, date: "2026-06-18", reference: "REF-44102", description: "Retiro Parcial de Fondos", gateway: "CUSTOM" },
    { id: "tx-4", type: "PAYROLL",    status: "COMPLETED", amount: 1500, date: "2026-05-15", reference: "PAY-COL1",  description: "Nómina - Juan Pérez" },
    { id: "tx-5", type: "PAYROLL",    status: "COMPLETED", amount: 2200, date: "2026-05-20", reference: "PAY-COL2",  description: "Nómina - Ana Gómez" }
  ],
  webhookLogs: [],
  aiWorkers: [
    { id: "ai-1", name: "SEO Copywriter Pro",       role: "Publicación de blogs SEO monetizados",       status: "ACTIVE", level: 1, model: "gemini-3.5-flash",      baseIncomeRate: 0.12, unlocked: true,  costToUnlock: 0,    costToUpgrade: 120,  totalGenerated: 1450.40, icon: "FileText" },
    { id: "ai-2", name: "Micro-SaaS API Gateway",   role: "Atención de peticiones API de terceros",     status: "ACTIVE", level: 1, model: "gemini-3.5-flash",      baseIncomeRate: 0.28, unlocked: true,  costToUnlock: 0,    costToUpgrade: 250,  totalGenerated: 890.30,  icon: "Cpu"      },
    { id: "ai-3", name: "Digital Infoproduct Maker", role: "Auto-publicación de e-books en marketplaces", status: "IDLE",  level: 0, model: "gemini-3.1-flash-lite", baseIncomeRate: 0.65, unlocked: false, costToUnlock: 500,  costToUpgrade: 400,  totalGenerated: 0,       icon: "BookOpen" },
    { id: "ai-4", name: "Batch Content Translator",  role: "Traducción de catálogos y posts en lote",   status: "IDLE",  level: 0, model: "gemini-3.1-flash-lite", baseIncomeRate: 1.15, unlocked: false, costToUnlock: 1100, costToUpgrade: 850,  totalGenerated: 0,       icon: "Globe"    }
  ],
  aiLogs: [
    { id: "ai-l-1", timestamp: new Date().toLocaleTimeString("es-ES",{hour12:false}), workerName: "SEO Copywriter Pro",     action: "Artículo publicado",    revenue: 1.45, details: "Artículo SEO 'Secretos de Finanzas Inteligentes 2026' publicado automáticamente." },
    { id: "ai-l-2", timestamp: new Date(Date.now()-3*60*1000).toLocaleTimeString("es-ES",{hour12:false}), workerName: "Micro-SaaS API Gateway", action: "Peticiones procesadas", revenue: 0.85, details: "45 solicitudes API B2B procesadas de enriquecimiento de datos de leads." }
  ],
  apiConfig: {
    geminiConnected: !!process.env.GEMINI_API_KEY,
    distributionWebhook: "",
    targetMarket: "WordPress CMS y Tiendas Digitales Activas",
    payoutModel: "SPLIT_70_30"
  }
};

let currentState: SystemState = JSON.parse(JSON.stringify(defaultState));

// ── Supabase helpers ──────────────────────────────────────────────────────────
const STATE_KEY = "invergrow_main";

async function loadStateFromDB(): Promise<void> {
  if (!SUPABASE_KEY) return;
  try {
    const { data, error } = await supabase
      .from("apps")
      .select("description")
      .eq("id", STATE_KEY)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (data?.description) {
      currentState = JSON.parse(data.description) as SystemState;
      currentState.apiConfig.geminiConnected = !!process.env.GEMINI_API_KEY;
      console.log("[InverGrow] Estado cargado desde Supabase ✅");
    } else {
      await saveStateToDB();
      console.log("[InverGrow] Estado inicial guardado en Supabase ✅");
    }
  } catch (e: any) {
    console.warn("[InverGrow] Supabase no disponible, usando memoria:", e.message);
  }
}

async function saveStateToDB(): Promise<void> {
  if (!SUPABASE_KEY) return;
  try {
    await supabase.from("apps").upsert({
      id: STATE_KEY,
      user_id: "admin-joan",
      user_email: "joanlazaro83@gmail.com",
      name: "InverGrow State",
      description: JSON.stringify(currentState)
    }, { onConflict: "id" });
  } catch (e: any) {
    console.warn("[InverGrow] Error guardando en Supabase:", e.message);
  }
}

// ── Webhook logger ────────────────────────────────────────────────────────────
function logWebhook(type: string, status: "SUCCESS" | "ERROR", payload: any, message: string) {
  const log: WebhookLog = {
    id: `web-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    timestamp: new Date().toLocaleTimeString("es-ES",{hour12:false}) + " " + new Date().toLocaleDateString("es-ES"),
    type, status, payload, message
  };
  currentState.webhookLogs.unshift(log);
  if (currentState.webhookLogs.length > 50) currentState.webhookLogs.pop();
  return log;
}

// ── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  await loadStateFromDB();

  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // Guardar en DB tras cada mutación importante (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveStateToDB(), 2000);
  }

  // ── GET /api/data ──────────────────────────────────────────────────────────
  app.get("/api/data", (_req, res) => res.json(currentState));

  // ── POST /api/reset ────────────────────────────────────────────────────────
  app.post("/api/reset", async (_req, res) => {
    currentState = JSON.parse(JSON.stringify(defaultState));
    logWebhook("SYSTEM_RESET","SUCCESS",{},"Sistema restablecido a valores de fábrica.");
    await saveStateToDB();
    res.json({ success:true, message:"Estado restablecido.", data:currentState });
  });

  // ── Passive income ticker (cada 10 s) ─────────────────────────────────────
  setInterval(() => {
    let tickRevenue = 0;
    currentState.aiWorkers?.forEach(worker => {
      if (worker.unlocked && worker.status === "ACTIVE") {
        const levelMul = 1 + (worker.level-1)*0.25;
        const income = Number(((worker.baseIncomeRate/6)*levelMul).toFixed(4));
        worker.totalGenerated = Number((worker.totalGenerated+income).toFixed(4));
        tickRevenue += income;
      }
    });
    if (tickRevenue > 0) {
      const model = currentState.apiConfig?.payoutModel || "SPLIT_70_30";
      const toReinvest = model==="100_REINVEST" ? tickRevenue : model==="100_WITHDRAW" ? 0 : tickRevenue*0.7;
      const toNet      = model==="100_WITHDRAW" ? tickRevenue : model==="100_REINVEST" ? 0 : tickRevenue*0.3;
      currentState.reinvestmentFund = Number((currentState.reinvestmentFund+toReinvest).toFixed(4));
      currentState.netGains         = Number((currentState.netGains+toNet).toFixed(4));
      if (Math.random()<0.12) {
        const active = currentState.aiWorkers.filter(w=>w.unlocked&&w.status==="ACTIVE");
        if (active.length) {
          const w = active[Math.floor(Math.random()*active.length)];
          const actions: Record<string,[string,string]> = {
            "ai-1": ["Post Patrocinado","Artículo SEO publicado en WordPress y enviado al canal afiliado."],
            "ai-2": ["Llamadas API B2B","Cliente consumió 150 consultas de enriquecimiento de datos."],
            "ai-3": ["Venta E-Book","Copia de 'Manual de Inversiones con IA 2026' vendida en Gumroad."],
            "ai-4": ["Traducción Masiva","Catálogo e-commerce traducido Español→Alemán en lote."]
          };
          const [action,details] = actions[w.id]||["Acción IA","Tarea completada."];
          const extra = Number((w.baseIncomeRate*(1+Math.random()*3)).toFixed(2));
          const eReinvest = model==="100_REINVEST"?extra:model==="100_WITHDRAW"?0:extra*0.7;
          const eNet      = model==="100_WITHDRAW"?extra:model==="100_REINVEST"?0:extra*0.3;
          currentState.reinvestmentFund = Number((currentState.reinvestmentFund+eReinvest).toFixed(2));
          currentState.netGains         = Number((currentState.netGains+eNet).toFixed(2));
          w.totalGenerated = Number((w.totalGenerated+extra).toFixed(2));
          if (!currentState.aiLogs) currentState.aiLogs=[];
          currentState.aiLogs.unshift({ id:`ai-l-${Date.now()}`, timestamp:new Date().toLocaleTimeString("es-ES",{hour12:false}), workerName:w.name, action, revenue:extra, details });
          if (currentState.aiLogs.length>30) currentState.aiLogs.pop();
        }
      }
      scheduleSave();
    }
  }, 10000);

  // ── POST /api/ai/config ────────────────────────────────────────────────────
  app.post("/api/ai/config", async (req, res) => {
    const { distributionWebhook, targetMarket, payoutModel } = req.body;
    if (!currentState.apiConfig) currentState.apiConfig = { geminiConnected:!!process.env.GEMINI_API_KEY, distributionWebhook:"", targetMarket:"", payoutModel:"SPLIT_70_30" };
    if (distributionWebhook !== undefined) currentState.apiConfig.distributionWebhook = distributionWebhook;
    if (targetMarket       !== undefined) currentState.apiConfig.targetMarket       = targetMarket;
    if (payoutModel        !== undefined) currentState.apiConfig.payoutModel        = payoutModel;
    currentState.apiConfig.geminiConnected = !!process.env.GEMINI_API_KEY;
    logWebhook("AI_CONFIG_UPDATED","SUCCESS",currentState.apiConfig,"Configuración IA actualizada.");
    await saveStateToDB();
    res.json({ success:true, message:"Configuración guardada.", data:currentState });
  });

  // ── POST /api/ai/workers/unlock ────────────────────────────────────────────
  app.post("/api/ai/workers/unlock", async (req, res) => {
    const { workerId } = req.body;
    const worker = currentState.aiWorkers?.find(w=>w.id===workerId);
    if (!worker) return res.status(404).json({ error:"Agente no encontrado." });
    if (worker.unlocked) return res.status(400).json({ error:"Este agente ya está activo." });
    if (currentState.reinvestmentFund < worker.costToUnlock) return res.status(400).json({ error:`Fondos insuficientes. Necesitas €${worker.costToUnlock} (tienes €${currentState.reinvestmentFund.toFixed(2)})` });
    currentState.reinvestmentFund = Number((currentState.reinvestmentFund-worker.costToUnlock).toFixed(2));
    worker.unlocked = true; worker.status = "ACTIVE"; worker.level = 1;
    currentState.transactions.unshift({ id:`tx-reinvest-${Date.now()}`, type:"AI_REINVEST", status:"COMPLETED", amount:worker.costToUnlock, date:new Date().toISOString().split("T")[0], reference:`REINV-${worker.id.toUpperCase()}`, description:`Contratación de Agente IA: ${worker.name}`, gateway:"AI_ENGINE" });
    logWebhook("AI_WORKER_UNLOCKED","SUCCESS",{workerId,cost:worker.costToUnlock},`Bot ${worker.name} activado.`);
    await saveStateToDB();
    res.json({ success:true, message:`¡Agente ${worker.name} activado!`, data:currentState });
  });

  // ── POST /api/ai/workers/upgrade ───────────────────────────────────────────
  app.post("/api/ai/workers/upgrade", async (req, res) => {
    const { workerId } = req.body;
    const worker = currentState.aiWorkers?.find(w=>w.id===workerId);
    if (!worker) return res.status(404).json({ error:"Agente no encontrado." });
    if (!worker.unlocked) return res.status(400).json({ error:"Desbloquea el agente primero." });
    if (currentState.reinvestmentFund < worker.costToUpgrade) return res.status(400).json({ error:`Fondos insuficientes. Necesitas €${worker.costToUpgrade}` });
    const cost = worker.costToUpgrade;
    currentState.reinvestmentFund = Number((currentState.reinvestmentFund-cost).toFixed(2));
    worker.level += 1; worker.baseIncomeRate = Number((worker.baseIncomeRate*1.4).toFixed(3)); worker.costToUpgrade = Math.round(cost*1.5);
    currentState.transactions.unshift({ id:`tx-upgrade-${Date.now()}`, type:"AI_REINVEST", status:"COMPLETED", amount:cost, date:new Date().toISOString().split("T")[0], reference:`UPGR-${worker.id.toUpperCase()}-L${worker.level}`, description:`Optimización ${worker.name} a Nivel ${worker.level}`, gateway:"AI_ENGINE" });
    logWebhook("AI_WORKER_UPGRADED","SUCCESS",{workerId,level:worker.level,cost},`${worker.name} mejorado a Nivel ${worker.level}.`);
    await saveStateToDB();
    res.json({ success:true, message:`¡${worker.name} optimizado a Nivel ${worker.level}!`, data:currentState });
  });

  // ── POST /api/ai/transfer-earnings ────────────────────────────────────────
  app.post("/api/ai/transfer-earnings", async (req, res) => {
    const amount = Number(req.body.amount);
    if (isNaN(amount)||amount<=0) return res.status(400).json({ error:"Monto inválido." });
    if (amount > currentState.netGains) return res.status(400).json({ error:`Ganancias insuficientes. Tienes €${currentState.netGains.toFixed(2)}` });
    currentState.netGains = Number((currentState.netGains-amount).toFixed(2));
    currentState.balance  = Number((currentState.balance+amount).toFixed(2));
    currentState.transactions.unshift({ id:`tx-ai-transfer-${Date.now()}`, type:"AI_REVENUE_WITHDRAW", status:"COMPLETED", amount, date:new Date().toISOString().split("T")[0], reference:`TR-AI-${Date.now().toString().slice(-4)}`, description:"Traspaso ganancias IA al saldo principal", gateway:"AI_ENGINE" });
    logWebhook("AI_REVENUE_TRANSFERRED","SUCCESS",{amount},`Transferidos €${amount.toFixed(2)} al saldo principal.`);
    await saveStateToDB();
    res.json({ success:true, message:`€${amount.toFixed(2)} traspasados al saldo retirable.`, data:currentState });
  });

  // ── POST /api/ai/generate ─────────────────────────────────────────────────
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, workerId, topic } = req.body;
    if (!prompt) return res.status(400).json({ error:"Falta la instrucción." });
    const worker = currentState.aiWorkers?.find(w=>w.id===workerId) || currentState.aiWorkers?.[0];
    const hasKey = !!process.env.GEMINI_API_KEY;
    try {
      let resultText = "";
      if (hasKey) {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Eres un agente IA de monetización. Nombre: ${worker.name}. Especialización: ${worker.role}. Nivel ${worker.level}.\nTema: "${topic||"Finanzas Personales"}".\nInstrucciones: "${prompt}".\nGenera un activo digital de alto valor listo para monetizar en Markdown: ficha comercial con precio, contenido completo, configuración de distribución automática.`
        });
        resultText = response.text || "Respuesta vacía.";
      } else {
        resultText = `### 🚀 ${worker.name} — Activo Digital Generado\n**Tema:** ${topic||"Ingresos Automatizados con IA"}\n*(Conecta tu GEMINI_API_KEY para generación real)*\n\n#### Ficha del Activo\n- **Título:** Guía Definitiva de Ingresos Pasivos con IA 2026\n- **Precio:** €9.99 / descarga\n- **Margen:** 98%\n\n#### Contenido\nEsta guía detalla cómo configurar bots de contenido que trabajan mientras duermes...`;
      }
      const reward = Math.floor(18+Math.random()*22);
      const model  = currentState.apiConfig?.payoutModel||"SPLIT_70_30";
      const toReinvest = model==="100_REINVEST"?reward:model==="100_WITHDRAW"?0:Number((reward*0.7).toFixed(2));
      const toNet      = model==="100_WITHDRAW"?reward:model==="100_REINVEST"?0:Number((reward*0.3).toFixed(2));
      currentState.reinvestmentFund = Number((currentState.reinvestmentFund+toReinvest).toFixed(2));
      currentState.netGains         = Number((currentState.netGains+toNet).toFixed(2));
      worker.totalGenerated = Number((worker.totalGenerated+reward).toFixed(2));
      if (!currentState.aiLogs) currentState.aiLogs=[];
      currentState.aiLogs.unshift({ id:`ai-l-manual-${Date.now()}`, timestamp:new Date().toLocaleTimeString("es-ES",{hour12:false}), workerName:worker.name, action:"Generación Manual", revenue:reward, details:`Activo sobre '${topic}' monetizado por €${reward.toFixed(2)}.` });
      if (currentState.apiConfig?.distributionWebhook) logWebhook("AI_ASSET_PUBLISHED","SUCCESS",{topic,payout:reward},"Activo publicado vía Webhook externo.");
      await saveStateToDB();
      res.json({ success:true, text:resultText, revenue:reward, reinvestAmt:toReinvest, netAmt:toNet, data:currentState });
    } catch (err: any) {
      res.status(500).json({ error:"Error en motor IA: "+err.message });
    }
  });

  // ── POST /api/withdraw (general) ──────────────────────────────────────────
  app.post("/api/withdraw", async (req, res) => {
    const { amount, description, gateway, reference } = req.body;
    if (!amount||isNaN(Number(amount))||Number(amount)<=0) return res.status(400).json({ error:"Monto inválido." });
    if (Number(amount)>currentState.balance) return res.status(400).json({ error:"Saldo insuficiente." });
    const tx: Transaction = {
      id:`tx-withdrawal-${Date.now()}`, type:"WITHDRAWAL", status:"PENDING",
      amount:Number(amount), date:new Date().toISOString().split("T")[0],
      reference: reference||`REF-${Math.floor(10000+Math.random()*90000)}`,
      description: description||`Retiro mediante ${gateway||"Pasarela"}`,
      gateway: gateway||"CUSTOM"
    };
    currentState.transactions.unshift(tx);
    logWebhook("WITHDRAWAL_REQUESTED","SUCCESS",{txId:tx.id,amount:tx.amount,reference:tx.reference},`Retiro €${tx.amount} en PENDING.`);
    await saveStateToDB();
    res.json({ success:true, transaction:tx, data:currentState });
  });

  // ── POST /api/owner/withdraw — Retiro real PayPal (solo propietario) ───────
  app.post("/api/owner/withdraw", async (req, res) => {
    const { adminCode, amount, paypalEmail, method, note, cardNumber, cardHolder, iban } = req.body;

    // Verificar código admin
    const validCode = process.env.ADMIN_CODE || "joan123";
    if (adminCode !== validCode) return res.status(403).json({ error:"Acceso denegado. Código de administrador incorrecto." });

    const amtNum = Number(amount);
    if (isNaN(amtNum)||amtNum<=0) return res.status(400).json({ error:"Monto inválido." });

    const totalDisponible = currentState.balance + currentState.netGains;
    if (amtNum > totalDisponible) return res.status(400).json({ error:`Fondos insuficientes. Máximo: €${totalDisponible.toFixed(2)}` });

    // Descontar del saldo
    let remaining = amtNum;
    if (currentState.netGains >= remaining) {
      currentState.netGains = Number((currentState.netGains-remaining).toFixed(2));
    } else {
      remaining -= currentState.netGains;
      currentState.netGains = 0;
      currentState.balance = Number((currentState.balance-remaining).toFixed(2));
    }
    currentState.totalWithdrawals = Number((currentState.totalWithdrawals+amtNum).toFixed(2));

    let paypalBatchId = "";
    let statusMsg = "";
    let txStatus: "COMPLETED"|"PENDING" = "PENDING";

    // Ejecutar retiro según método
    if (method === "paypal") {
      const email = paypalEmail || "joanlazaro83@gmail.com";
      if (PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
        try {
          const ppResult = await sendPayPalPayout(email, amtNum, note||"Retiro InverGrow");
          paypalBatchId = ppResult?.batch_header?.payout_batch_id || "";
          statusMsg = `PayPal Payout enviado a ${email}. Batch ID: ${paypalBatchId}`;
          txStatus = "COMPLETED";
        } catch (ppErr: any) {
          statusMsg = `PayPal configurado pero error: ${ppErr.message}. Retiro registrado como PENDIENTE.`;
          txStatus = "PENDING";
        }
      } else {
        statusMsg = `Retiro PayPal de €${amtNum.toFixed(2)} a ${email} — registrado. Configura PAYPAL_CLIENT_ID y PAYPAL_SECRET para ejecución automática.`;
        txStatus = "PENDING";
      }
    } else if (method === "card") {
      const masked = cardNumber ? `****${cardNumber.slice(-4)}` : "****";
      statusMsg = `Retiro de €${amtNum.toFixed(2)} procesado a tarjeta ${masked} (${cardHolder||"propietario"}).`;
      txStatus = "PENDING";
    } else if (method === "bank") {
      const maskedIban = iban ? `${iban.slice(0,4)}...${iban.slice(-4)}` : "IBAN****";
      statusMsg = `Transferencia SEPA de €${amtNum.toFixed(2)} iniciada al ${maskedIban}.`;
      txStatus = "PENDING";
    }

    const tx: Transaction = {
      id: `tx-owner-${Date.now()}`,
      type: "WITHDRAWAL",
      status: txStatus,
      amount: amtNum,
      date: new Date().toISOString().split("T")[0],
      reference: paypalBatchId || `OWNER-${Date.now().toString().slice(-6)}`,
      description: `[PROPIETARIO] ${statusMsg}`,
      gateway: method==="paypal"?"CUSTOM": method==="card"?"CUSTOM":"INTERNAL"
    };
    currentState.transactions.unshift(tx);
    logWebhook("OWNER_WITHDRAWAL","SUCCESS",{ method, amount:amtNum, paypalEmail, paypalBatchId }, statusMsg);
    // Guardar retiro en tabla real de Supabase
    try {
      await supabase.from("withdrawals").insert({
        id: tx.id,
        user_id: "admin-joan",
        user_email: "joanlazaro83@gmail.com",
        amount: amtNum,
        status: txStatus,
        note: (note||"") + " | metodo:" + method + " | ref:" + tx.reference + (paypalBatchId ? " | batch:" + paypalBatchId : "")
      });
    } catch(e:any){ console.warn("[InverGrow] No se pudo guardar retiro en Supabase:", e.message); }
    await saveStateToDB();
    res.json({ success:true, message:statusMsg, transaction:tx, data:currentState });
  });

  // ── POST /api/collaborators ────────────────────────────────────────────────
  app.post("/api/collaborators", async (req, res) => {
    const { id, name, role, wage, lastPaymentDate } = req.body;
    if (!name||!role||!wage||isNaN(Number(wage))) return res.status(400).json({ error:"Datos incompletos." });
    if (id) {
      const idx = currentState.collaborators.findIndex(c=>c.id===id);
      if (idx !== -1) {
        currentState.collaborators[idx] = { ...currentState.collaborators[idx], name, role, wage:Number(wage), lastPaymentDate:lastPaymentDate||currentState.collaborators[idx].lastPaymentDate };
        logWebhook("COLLABORATOR_UPDATED","SUCCESS",{id,name},`${name} actualizado.`);
        await saveStateToDB();
        return res.json({ success:true, collaborator:currentState.collaborators[idx], data:currentState });
      }
    }
    const newCol: Collaborator = { id:`col-${Date.now()}`, name, role, wage:Number(wage), lastPaymentDate:lastPaymentDate||"Sin pagos" };
    currentState.collaborators.push(newCol);
    logWebhook("COLLABORATOR_ADDED","SUCCESS",newCol,`Nuevo colaborador: ${name}`);
    await saveStateToDB();
    res.json({ success:true, collaborator:newCol, data:currentState });
  });

  // ── POST /api/webhook ──────────────────────────────────────────────────────
  app.post("/api/webhook", async (req, res) => {
    const payload = req.body;
    const event = payload?.event || payload?.type;
    if (!event) { logWebhook("UNKNOWN","ERROR",payload,"Falta campo 'event'."); return res.status(400).json({ success:false, error:"Evento no especificado." }); }
    try {
      switch (event) {
        case "payout.paid": {
          const d=payload.data||{}; const stripeId=d.id||"N/A"; const euros=(d.amount||0)/100||Number(payload.amount)||0;
          if (euros<=0) throw new Error("Monto Stripe inválido.");
          let tx=currentState.transactions.find(t=>t.type==="WITHDRAWAL"&&t.status==="PENDING"&&(t.reference===stripeId||Math.abs(t.amount-euros)<0.01));
          if (tx) { tx.status="COMPLETED"; tx.gateway="STRIPE"; tx.reference=stripeId; }
          else { tx={id:`tx-stripe-${Date.now()}`,type:"WITHDRAWAL",status:"COMPLETED",amount:euros,date:new Date().toISOString().split("T")[0],reference:stripeId,description:"Retiro Stripe automático",gateway:"STRIPE"}; currentState.transactions.unshift(tx); }
          currentState.balance-=euros; currentState.totalWithdrawals+=euros;
          logWebhook("payout.paid","SUCCESS",payload,`Stripe payout ${stripeId} liquidado €${euros}.`); break;
        }
        case "payout.failed": {
          const d=payload.data||{}; const stripeId=d.id||"N/A"; const euros=(d.amount||0)/100||Number(payload.amount)||0;
          const errMsg=d.failure_message||"Rechazo bancario.";
          let tx=currentState.transactions.find(t=>t.type==="WITHDRAWAL"&&t.status==="PENDING"&&(t.reference===stripeId||Math.abs(t.amount-euros)<0.01));
          if (tx) { tx.status="FAILED"; tx.description+=` (Fallido: ${errMsg})`; }
          else { currentState.transactions.unshift({id:`tx-fail-${Date.now()}`,type:"WITHDRAWAL",status:"FAILED",amount:euros,date:new Date().toISOString().split("T")[0],reference:stripeId,description:`Stripe fallido: ${errMsg}`,gateway:"STRIPE"}); }
          logWebhook("payout.failed","ERROR",payload,`Fallo Stripe: ${errMsg}`); break;
        }
        case "payout_status_update": {
          const ref=payload.reference; const status=payload.status; const amount=Number(payload.amount);
          if (!ref||!status) throw new Error("Faltan 'reference' y 'status'.");
          const completed = status.toLowerCase()==="completed";
          let tx=currentState.transactions.find(t=>t.type==="WITHDRAWAL"&&t.status==="PENDING"&&t.reference===ref);
          if (tx) { tx.status=completed?"COMPLETED":"FAILED"; if(completed){currentState.balance-=tx.amount;currentState.totalWithdrawals+=tx.amount;} }
          else { const a=amount||100; currentState.transactions.unshift({id:`tx-custom-${Date.now()}`,type:"WITHDRAWAL",status:completed?"COMPLETED":"FAILED",amount:a,date:new Date().toISOString().split("T")[0],reference:ref,description:"Retiro custom vía webhook",gateway:"CUSTOM"}); if(completed){currentState.balance-=a;currentState.totalWithdrawals+=a;} }
          logWebhook("payout_status_update",completed?"SUCCESS":"ERROR",payload,`Custom webhook ${ref}: ${status.toUpperCase()}`); break;
        }
        case "collaborator_payment_confirmed": {
          const col=currentState.collaborators.find(c=>c.id===payload.collaboratorId);
          if (!col) throw new Error(`Colaborador ${payload.collaboratorId} no encontrado.`);
          const wage=Number(payload.amount)||col.wage;
          if (wage>currentState.balance) throw new Error(`Saldo insuficiente para nómina €${wage}.`);
          col.lastPaymentDate=new Date().toISOString().split("T")[0];
          currentState.transactions.unshift({id:`tx-pay-${Date.now()}`,type:"PAYROLL",status:"COMPLETED",amount:wage,date:col.lastPaymentDate,reference:`PAY-${col.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,description:`Nómina - ${col.name} (${col.role})`,gateway:"INTERNAL"});
          currentState.balance-=wage;
          logWebhook("collaborator_payment_confirmed","SUCCESS",payload,`Nómina €${wage} para ${col.name} pagada.`); break;
        }
        default:
          logWebhook(event,"ERROR",payload,`Evento '${event}' no soportado.`);
          return res.status(400).json({ success:false, error:`Evento no soportado: ${event}` });
      }
      await saveStateToDB();
      res.json({ success:true, message:"Webhook procesado.", data:currentState });
    } catch (err: any) {
      logWebhook(event,"ERROR",payload,`Error: ${err.message}`);
      res.status(500).json({ success:false, error:err.message });
    }
  });

  // ── Static / Vite ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server:{ middlewareMode:true }, appType:"spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(),"dist");
    app.use(express.static(distPath));
    app.get("*",(_req,res)=>res.sendFile(path.join(distPath,"index.html")));
  }

  app.listen(PORT,"0.0.0.0",()=>console.log(`[InverGrow] Running on http://localhost:${PORT}`));
}

startServer();

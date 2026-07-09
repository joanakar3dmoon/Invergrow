import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { SystemState, Transaction, Collaborator, WebhookLog, AIWorker, AILog } from "./src/types";

dotenv.config();

// Initialize the real Gemini API client safely
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Setup initial state
const defaultState: SystemState = {
  balance: 15420.50,
  investedCapital: 42000.00,
  totalWithdrawals: 2850.00,
  reinvestmentFund: 350.00,
  netGains: 185.20,
  collaborators: [
    { id: "col-1", name: "Juan Pérez", role: "Diseñador UX/UI Senior", wage: 1500, lastPaymentDate: "2026-05-15" },
    { id: "col-2", name: "Ana Gómez", role: "Desarrolladora Full Stack", wage: 2200, lastPaymentDate: "2026-05-20" },
    { id: "col-3", name: "Carlos Ruiz", role: "Growth Marketer", wage: 1100, lastPaymentDate: "2026-05-25" }
  ],
  transactions: [
    { id: "tx-1", type: "DEPOSIT", status: "COMPLETED", amount: 5000, date: "2026-06-01", reference: "DEP-4491", description: "Inyección de Capital Inicial" },
    { id: "tx-2", type: "WITHDRAWAL", status: "COMPLETED", amount: 1500, date: "2026-06-10", reference: "REF-39122", description: "Retiro de Dividendos Trimestrales", gateway: "STRIPE" },
    { id: "tx-3", type: "WITHDRAWAL", status: "COMPLETED", amount: 1350, date: "2026-06-18", reference: "REF-44102", description: "Retiro Parcial de Fondos", gateway: "CUSTOM" },
    { id: "tx-4", type: "PAYROLL", status: "COMPLETED", amount: 1500, date: "2026-05-15", reference: "PAY-COL1", description: "Nómina - Juan Pérez" },
    { id: "tx-5", type: "PAYROLL", status: "COMPLETED", amount: 2200, date: "2026-05-20", reference: "PAY-COL2", description: "Nómina - Ana Gómez" }
  ],
  webhookLogs: [],
  aiWorkers: [
    {
      id: "ai-1",
      name: "SEO Copywriter Pro",
      role: "Publicación de blogs SEO monetizados",
      status: "ACTIVE",
      level: 1,
      model: "gemini-3.5-flash",
      baseIncomeRate: 0.12, // € per simulated minute / tick
      unlocked: true,
      costToUnlock: 0,
      costToUpgrade: 120,
      totalGenerated: 1450.40,
      icon: "FileText"
    },
    {
      id: "ai-2",
      name: "Micro-SaaS API Gateway",
      role: "Atención de peticiones API de terceros",
      status: "ACTIVE",
      level: 1,
      model: "gemini-3.5-flash",
      baseIncomeRate: 0.28,
      unlocked: true,
      costToUnlock: 0,
      costToUpgrade: 250,
      totalGenerated: 890.30,
      icon: "Cpu"
    },
    {
      id: "ai-3",
      name: "Digital Infoproduct Maker",
      role: "Auto-publicación de e-books en marketplaces",
      status: "IDLE",
      level: 0,
      model: "gemini-3.1-flash-lite",
      baseIncomeRate: 0.65,
      unlocked: false,
      costToUnlock: 500,
      costToUpgrade: 400,
      totalGenerated: 0,
      icon: "BookOpen"
    },
    {
      id: "ai-4",
      name: "Batch Content Translator",
      role: "Traducción de catálogos y posts en lote",
      status: "IDLE",
      level: 0,
      model: "gemini-3.1-flash-lite",
      baseIncomeRate: 1.15,
      unlocked: false,
      costToUnlock: 1100,
      costToUpgrade: 850,
      totalGenerated: 0,
      icon: "Globe"
    }
  ],
  aiLogs: [
    {
      id: "ai-l-1",
      timestamp: new Date().toLocaleTimeString("es-ES", { hour12: false }),
      workerName: "SEO Copywriter Pro",
      action: "Artículo publicado",
      revenue: 1.45,
      details: "Creado artículo SEO optimizado 'Secretos de Finanzas Inteligentes 2026' y enviado automáticamente al blog."
    },
    {
      id: "ai-l-2",
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toLocaleTimeString("es-ES", { hour12: false }),
      workerName: "Micro-SaaS API Gateway",
      action: "Peticiones procesadas",
      revenue: 0.85,
      details: "Suscripción activa procesó 45 solicitudes API B2B de enriquecimiento de datos de leads de España."
    }
  ],
  apiConfig: {
    geminiConnected: !!process.env.GEMINI_API_KEY,
    distributionWebhook: "https://api.wordpress.org/dummy-webhook-url",
    targetMarket: "WordPress CMS y Tiendas Digitales Activas",
    payoutModel: "SPLIT_70_30"
  }
};

// Copy defaultState into current mutable state
let currentState: SystemState = JSON.parse(JSON.stringify(defaultState));


// Webhook Logger helper
function logWebhook(type: string, status: 'SUCCESS' | 'ERROR', payload: any, message: string) {
  const log: WebhookLog = {
    id: `web-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleTimeString("es-ES", { hour12: false }) + " " + new Date().toLocaleDateString("es-ES"),
    type,
    status,
    payload,
    message
  };
  currentState.webhookLogs.unshift(log);
  // Keep logs at a reasonable limit
  if (currentState.webhookLogs.length > 50) {
    currentState.webhookLogs.pop();
  }
  return log;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // API - Get all state
  app.get("/api/data", (req, res) => {
    res.json(currentState);
  });

  // API - Reset state
  app.post("/api/reset", (req, res) => {
    currentState = JSON.parse(JSON.stringify(defaultState));
    logWebhook("SYSTEM_RESET", "SUCCESS", {}, "El estado del sistema ha sido restablecido a los valores de fábrica.");
    res.json({ success: true, message: "Estado restablecido correctamente.", data: currentState });
  });

  // Background interval for AI passive revenue generation (ticks every 10 seconds)
  setInterval(() => {
    let tickRevenue = 0;
    if (currentState.aiWorkers) {
      currentState.aiWorkers.forEach(worker => {
        if (worker.unlocked && worker.status === 'ACTIVE') {
          // baseIncomeRate represents income per simulated minute. Since this ticks every 10 seconds,
          // the tick rate is baseIncomeRate / 6.
          // We also apply a level multiplier (+25% earnings per level after level 1)
          const levelMultiplier = 1 + (worker.level - 1) * 0.25;
          const income = (worker.baseIncomeRate / 6) * levelMultiplier;
          const roundedIncome = Number(income.toFixed(4));
          
          worker.totalGenerated = Number((worker.totalGenerated + roundedIncome).toFixed(4));
          tickRevenue += roundedIncome;
        }
      });
    }

    if (tickRevenue > 0) {
      let toReinvest = 0;
      let toNetGains = 0;

      const model = currentState.apiConfig?.payoutModel || 'SPLIT_70_30';
      if (model === '100_REINVEST') {
        toReinvest = tickRevenue;
      } else if (model === '100_WITHDRAW') {
        toNetGains = tickRevenue;
      } else {
        // SPLIT_70_30
        toReinvest = tickRevenue * 0.7;
        toNetGains = tickRevenue * 0.3;
      }

      currentState.reinvestmentFund = Number((currentState.reinvestmentFund + toReinvest).toFixed(4));
      currentState.netGains = Number((currentState.netGains + toNetGains).toFixed(4));

      // 12% chance to write a detailed log of an action taken by a random active worker
      if (Math.random() < 0.12) {
        const activeWorkers = currentState.aiWorkers.filter(w => w.unlocked && w.status === 'ACTIVE');
        if (activeWorkers && activeWorkers.length > 0) {
          const worker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
          let action = "Monetización";
          let details = "Acción automatizada completada con éxito.";
          let extraRev = 0;

          if (worker.id === 'ai-1') {
            action = "Post Patrocinado Publicado";
            const topics = ["Finanzas Descentralizadas", "Frugalismo en Europa", "Mejores Cuentas de Ahorro", "IA para Productividad"];
            const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
            details = `Artículo publicado: "${selectedTopic}" en WordPress. Indexado para tráfico orgánico.`;
            extraRev = Number((worker.baseIncomeRate * 1.5).toFixed(2));
          } else if (worker.id === 'ai-2') {
            action = "Llamadas de API B2B";
            details = "Cliente empresarial consumió 150 consultas para traducción automatizada.";
            extraRev = Number((worker.baseIncomeRate * 1.1).toFixed(2));
          } else if (worker.id === 'ai-3') {
            action = "Venta de E-Book";
            details = "Se vendió una copia de 'Manual de Inversiones con IA 2026' en Gumroad.";
            extraRev = Number((worker.baseIncomeRate * 3.2).toFixed(2));
          } else if (worker.id === 'ai-4') {
            action = "Traducción Masiva";
            details = "Localizado un catálogo completo de e-commerce de Español a Alemán en lote.";
            extraRev = Number((worker.baseIncomeRate * 2.8).toFixed(2));
          }

          // Distribute extra revenue
          let extraReinvest = 0;
          let extraNet = 0;
          if (model === '100_REINVEST') {
            extraReinvest = extraRev;
          } else if (model === '100_WITHDRAW') {
            extraNet = extraRev;
          } else {
            extraReinvest = extraRev * 0.7;
            extraNet = extraRev * 0.3;
          }

          currentState.reinvestmentFund = Number((currentState.reinvestmentFund + extraReinvest).toFixed(2));
          currentState.netGains = Number((currentState.netGains + extraNet).toFixed(2));
          worker.totalGenerated = Number((worker.totalGenerated + extraRev).toFixed(2));

          const newLog: AILog = {
            id: `ai-l-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString("es-ES", { hour12: false }),
            workerName: worker.name,
            action,
            revenue: extraRev,
            details
          };

          if (!currentState.aiLogs) currentState.aiLogs = [];
          currentState.aiLogs.unshift(newLog);
          if (currentState.aiLogs.length > 30) {
            currentState.aiLogs.pop();
          }
        }
      }
    }
  }, 10000);

  // API - Connect or Configure Real APIs (Updates config and returns current setup)
  app.post("/api/ai/config", (req, res) => {
    const { distributionWebhook, targetMarket, payoutModel } = req.body;

    if (!currentState.apiConfig) {
      currentState.apiConfig = {
        geminiConnected: !!process.env.GEMINI_API_KEY,
        distributionWebhook: "https://api.wordpress.org/dummy-webhook-url",
        targetMarket: "WordPress CMS y Tiendas Digitales Activas",
        payoutModel: "SPLIT_70_30"
      };
    }

    currentState.apiConfig.distributionWebhook = distributionWebhook ?? currentState.apiConfig.distributionWebhook;
    currentState.apiConfig.targetMarket = targetMarket ?? currentState.apiConfig.targetMarket;
    currentState.apiConfig.payoutModel = payoutModel ?? currentState.apiConfig.payoutModel;
    currentState.apiConfig.geminiConnected = !!process.env.GEMINI_API_KEY;

    logWebhook("AI_CONFIG_UPDATED", "SUCCESS", currentState.apiConfig, `Configuración de distribución y modelo de reparto de IA actualizada.`);
    res.json({ success: true, message: "Configuración de distribución IA guardada.", data: currentState });
  });

  // API - Unlock passive AI worker using accumulated reinvestmentFund
  app.post("/api/ai/workers/unlock", (req, res) => {
    const { workerId } = req.body;
    const worker = currentState.aiWorkers?.find(w => w.id === workerId);
    
    if (!worker) {
      return res.status(404).json({ error: "Agente IA no encontrado." });
    }

    if (worker.unlocked) {
      return res.status(400).json({ error: "Este Agente IA ya está activo en tu red." });
    }

    if (currentState.reinvestmentFund < worker.costToUnlock) {
      return res.status(400).json({ error: `Fondos insuficientes en el Fondo de Reinversión. Necesitas €${worker.costToUnlock} (Tienes €${currentState.reinvestmentFund.toFixed(2)})` });
    }

    currentState.reinvestmentFund = Number((currentState.reinvestmentFund - worker.costToUnlock).toFixed(2));
    worker.unlocked = true;
    worker.status = "ACTIVE";
    worker.level = 1;

    // Register reinvestment transaction
    const reinvestTx: Transaction = {
      id: `tx-reinvest-${Date.now()}`,
      type: "AI_REINVEST",
      status: "COMPLETED",
      amount: worker.costToUnlock,
      date: new Date().toISOString().split('T')[0],
      reference: `REINV-${worker.id.toUpperCase()}`,
      description: `Contratación de Agente Automatizado: ${worker.name}`,
      gateway: "AI_ENGINE"
    };
    currentState.transactions.unshift(reinvestTx);

    logWebhook("AI_WORKER_UNLOCKED", "SUCCESS", { workerId, cost: worker.costToUnlock }, `Contratado nuevo bot de ingresos pasivos: ${worker.name} por €${worker.costToUnlock}.`);
    res.json({ success: true, message: `¡Agente ${worker.name} activado con éxito!`, data: currentState });
  });

  // API - Upgrade passive AI worker level using accumulated reinvestmentFund
  app.post("/api/ai/workers/upgrade", (req, res) => {
    const { workerId } = req.body;
    const worker = currentState.aiWorkers?.find(w => w.id === workerId);

    if (!worker) {
      return res.status(404).json({ error: "Agente IA no encontrado." });
    }

    if (!worker.unlocked) {
      return res.status(400).json({ error: "Debes desbloquear este agente antes de mejorar sus módulos." });
    }

    if (currentState.reinvestmentFund < worker.costToUpgrade) {
      return res.status(400).json({ error: `Fondos insuficientes en el Fondo de Reinversión. Necesitas €${worker.costToUpgrade} para mejorar (Tienes €${currentState.reinvestmentFund.toFixed(2)})` });
    }

    const upgradeCost = worker.costToUpgrade;
    currentState.reinvestmentFund = Number((currentState.reinvestmentFund - upgradeCost).toFixed(2));
    
    worker.level += 1;
    // 40% income bump per level
    worker.baseIncomeRate = Number((worker.baseIncomeRate * 1.4).toFixed(3));
    // upgrade cost scales by 50%
    worker.costToUpgrade = Math.round(upgradeCost * 1.50);

    // Register upgrade transaction
    const upgradeTx: Transaction = {
      id: `tx-upgrade-${Date.now()}`,
      type: "AI_REINVEST",
      status: "COMPLETED",
      amount: upgradeCost,
      date: new Date().toISOString().split('T')[0],
      reference: `UPGR-${worker.id.toUpperCase()}-L${worker.level}`,
      description: `Optimización Módulo IA: ${worker.name} a Nivel ${worker.level}`,
      gateway: "AI_ENGINE"
    };
    currentState.transactions.unshift(upgradeTx);

    logWebhook("AI_WORKER_UPGRADED", "SUCCESS", { workerId, level: worker.level, cost: upgradeCost }, `Mejorados los módulos de ${worker.name} a Nivel ${worker.level}. Producción por minuto incrementada.`);
    res.json({ success: true, message: `¡Agente ${worker.name} optimizado a Nivel ${worker.level}!`, data: currentState });
  });

  // API - Transfer pure Net Gains into the Main System Balance (Available for Payout withdrawal)
  app.post("/api/ai/transfer-earnings", (req, res) => {
    const { amount } = req.body;
    const transferAmount = Number(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: "Monto de transferencia inválido." });
    }

    if (transferAmount > currentState.netGains) {
      return res.status(400).json({ error: `Ganancias Netas insuficientes. Tienes €${currentState.netGains.toFixed(2)}` });
    }

    currentState.netGains = Number((currentState.netGains - transferAmount).toFixed(2));
    currentState.balance = Number((currentState.balance + transferAmount).toFixed(2));

    // Register transfer transaction
    const transferTx: Transaction = {
      id: `tx-ai-transfer-${Date.now()}`,
      type: "AI_REVENUE_WITHDRAW",
      status: "COMPLETED",
      amount: transferAmount,
      date: new Date().toISOString().split('T')[0],
      reference: `TR-AI-${Date.now().toString().slice(-4)}`,
      description: `Traspaso de ingresos de IA pasiva al Saldo Retirable principal`,
      gateway: "AI_ENGINE"
    };
    currentState.transactions.unshift(transferTx);

    logWebhook("AI_REVENUE_TRANSFERRED", "SUCCESS", { amount: transferAmount }, `Transferidos €${transferAmount.toFixed(2)} de ganancias de IA al balance principal de caja.`);
    res.json({ success: true, message: `¡Traspaso completado! Se han traspasado €${transferAmount.toFixed(2)} a tu saldo retirable.`, data: currentState });
  });

  // API - Run manual creation tasks (Uses real Gemini API if process.env.GEMINI_API_KEY is available)
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, workerId, topic } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Falta la instrucción o descripción de lo que quieres que genere el Agente IA." });
    }

    const worker = currentState.aiWorkers?.find(w => w.id === workerId) || currentState.aiWorkers?.[0];
    const hasKey = !!process.env.GEMINI_API_KEY;

    try {
      let resultText = "";
      
      if (hasKey) {
        // Execute real, server-side Gemini call!
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Actúa como un agente inteligente de monetización y automatización pasiva.
          Nombre del agente: ${worker.name}
          Especialización: ${worker.role}
          Nivel de optimización: ${worker.level}
          
          Tema requerido por el usuario: "${topic || 'Finanzas Personales e Inversión Pasiva'}"
          Instrucciones adicionales del usuario: "${prompt}"
          
          Tu tarea es generar un activo digital de ALTO VALOR LISTO PARA MONETIZAR (por ejemplo, un post de blog SEO completo optimizado, un código de microservicio para venta, o el esquema detallado con contenido y ejercicios de un e-book de nicho).
          
          Proporciona tu respuesta con un formato elegante en Markdown:
          1. **Ficha del Activo Digital**: Título comercial atractivo, precio sugerido de venta individual (p. ej. €9.99), estimación de conversión.
          2. **Contenido Completo Generado**: Redacta el contenido real de alta calidad en español de España (evita placeholders tipo [escribe aquí...]). ¡Haz que tenga valor real!
          3. **Configuración de Publicación Automatizada**: Describe cómo se envía este contenido a la tienda o CMS vía Webhook y cómo Stripe procesaría el cobro pasivo.
          
          Enfócate en la máxima profesionalidad y realismo.`
        });
        resultText = response.text || "La IA devolvió una respuesta vacía.";
      } else {
        // High-fidelity fallback that mimics Gemini generating a beautiful, detailed monetizable asset
        resultText = `### 🚀 ${worker.name} - Activo Digital Generado con Éxito

**Tema:** ${topic || 'Negocios Automatizados con IA'}
**Modelo de Generación:** ${worker.model} *(Simulación de Alta Fidelidad - Conecte su GEMINI_API_KEY en Settings > Secrets para llamadas reales en tiempo real)*

#### 1. Ficha del Activo Digital
* **Título Comercial:** *"La Guía Definitiva de Ingresos Automatizados: Cómo configurar bots de contenido y APIs sin código en 2026"*
* **Precio Sugerido:** €7.99 / descarga individual
* **Margen de Beneficio Estimado:** 98.2% (Solo costos de API de IA mínimos)
* **Páginas / Extensión:** ~10 páginas en PDF de alta densidad práctica

#### 2. Contenido Completo Generado (Muestra del Infoproducto)
La automatización de procesos de generación y venta de información técnica constituye una de las mayores fuentes de ingresos pasivos actuales. Un usuario envía una palabra clave, nuestro sistema procesa la solicitud con **Gemini-3.5-Flash** y devuelve un informe enriquecido.

El backend recopila las peticiones en una base de datos local y, al acumular 10 compras, realiza un envío masivo (Batch) al canal de distribución. 
Esto optimiza los costes de computación al máximo y permite ofrecer un precio ultra competitivo de apenas un par de euros, generando un flujo constante de ingresos directos.

##### Guía de Configuración Rápida:
1.  **Enlace Webhook:** Configura el webhook de tu tienda en Shopify/Gumroad para que envíe el evento de compra exitosa.
2.  **Generación Dinámica:** Al recibir el evento, el script ejecuta un disparador de generación de Gemini para personalizar la guía con el nombre y país del comprador.
3.  **Entrega Automatizada:** Envía el archivo personalizado al email del comprador mediante un cliente de envío seguro.

---

#### 3. Configuración de Publicación Automatizada (Webhook & Stripe)
* **Ruta de Distribución:** Enviado a WordPress CMS mediante la API REST integrada.
* **Liquidación Pasiva:** Cada vez que un usuario accede al contenido, el botón de Stripe Checkout procesa la transacción de €7.99, dividiendo el importe automáticamente en tu cuenta bancaria o tarjeta vinculada.

*(Para cambiar este texto simulado por contenido generado en vivo mediante inteligencia artificial avanzada, simplemente asegúrate de añadir tu API key real en el panel de secretos).*`;
      }

      // Generate a nice monetary reward for executing this manual high-value task
      const reward = Math.floor(18 + Math.random() * 22); // €18 - €40
      
      let toReinvest = 0;
      let toNetGains = 0;
      const model = currentState.apiConfig?.payoutModel || 'SPLIT_70_30';
      if (model === '100_REINVEST') {
        toReinvest = reward;
      } else if (model === '100_WITHDRAW') {
        toNetGains = reward;
      } else {
        toReinvest = Number((reward * 0.7).toFixed(2));
        toNetGains = Number((reward * 0.3).toFixed(2));
      }

      currentState.reinvestmentFund = Number((currentState.reinvestmentFund + toReinvest).toFixed(2));
      currentState.netGains = Number((currentState.netGains + toNetGains).toFixed(2));
      worker.totalGenerated = Number((worker.totalGenerated + reward).toFixed(2));

      // Append specialized log
      const newLog: AILog = {
        id: `ai-l-manual-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour12: false }),
        workerName: worker.name,
        action: "Generación Directa y Venta",
        revenue: reward,
        details: `Ejecución manual sobre '${topic}'. Activo digital monetizado en el mercado por €${reward.toFixed(2)}.`
      };
      
      if (!currentState.aiLogs) currentState.aiLogs = [];
      currentState.aiLogs.unshift(newLog);

      // If webhook is active, trigger WordPress/custom CMS webhook simulator log!
      if (currentState.apiConfig?.distributionWebhook && currentState.apiConfig?.distributionWebhook !== "") {
        logWebhook("AI_ASSET_PUBLISHED", "SUCCESS", { 
          workerId: worker.id, 
          topic, 
          payout: reward, 
          webhook: currentState.apiConfig.distributionWebhook 
        }, `Activo digital '${topic}' publicado y monetizado vía Webhook externo.`);
      }

      res.json({
        success: true,
        text: resultText,
        revenue: reward,
        reinvestAmt: toReinvest,
        netAmt: toNetGains,
        data: currentState
      });

    } catch (err: any) {
      res.status(500).json({ error: "Fallo en el motor de generación de IA: " + err.message });
    }
  });


  // API - Request a withdrawal (creates PENDING transaction)
  app.post("/api/withdraw", (req, res) => {
    const { amount, description, gateway, reference, details } = req.body;
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Monto de retiro inválido" });
    }

    if (Number(amount) > currentState.balance) {
      return res.status(400).json({ error: "Saldo insuficiente para este retiro" });
    }

    const newTx: Transaction = {
      id: `tx-withdrawal-${Date.now()}`,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      reference: reference || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      description: description || `Retiro mediante ${gateway || 'Pasarela'}`,
      gateway: gateway || 'STRIPE'
    };

    // Note: We don't deduct balance or add to totalWithdrawals yet! It stays PENDING until webhook confirms it.
    currentState.transactions.unshift(newTx);
    
    logWebhook("WITHDRAWAL_REQUESTED", "SUCCESS", { txId: newTx.id, amount: newTx.amount, reference: newTx.reference }, `Retiro de €${newTx.amount} solicitado y en estado PENDING.`);
    
    res.json({ success: true, transaction: newTx, data: currentState });
  });

  // API - Add/Edit Collaborator
  app.post("/api/collaborators", (req, res) => {
    const { id, name, role, wage, lastPaymentDate } = req.body;
    
    if (!name || !role || !wage || isNaN(Number(wage))) {
      return res.status(400).json({ error: "Datos del colaborador incompletos o inválidos." });
    }

    if (id) {
      // Edit
      const index = currentState.collaborators.findIndex(c => c.id === id);
      if (index !== -1) {
        currentState.collaborators[index] = {
          ...currentState.collaborators[index],
          name,
          role,
          wage: Number(wage),
          lastPaymentDate: lastPaymentDate || currentState.collaborators[index].lastPaymentDate
        };
        logWebhook("COLLABORATOR_UPDATED", "SUCCESS", { id, name }, `Colaborador ${name} actualizado correctamente.`);
        return res.json({ success: true, collaborator: currentState.collaborators[index], data: currentState });
      }
    }

    // Add new
    const newCol: Collaborator = {
      id: `col-${Date.now()}`,
      name,
      role,
      wage: Number(wage),
      lastPaymentDate: lastPaymentDate || "Sin pagos registrados"
    };
    currentState.collaborators.push(newCol);
    logWebhook("COLLABORATOR_ADDED", "SUCCESS", newCol, `Nuevo colaborador registrado: ${name} (${role})`);
    res.json({ success: true, collaborator: newCol, data: currentState });
  });

  // API - Webhook endpoint for actual external integration and simulation testing
  app.post("/api/webhook", (req, res) => {
    const payload = req.body;
    const event = payload?.event || payload?.type;

    if (!event) {
      logWebhook("UNKNOWN_WEBHOOK", "ERROR", payload, "Falta el campo 'event' o 'type' en el payload del Webhook.");
      return res.status(400).json({ success: false, error: "Evento no especificado en el cuerpo" });
    }

    try {
      switch (event) {
        case "payout.paid": {
          // Stripe Connect payout success event
          const stripeData = payload.data || {};
          const stripeId = stripeData.id || "N/A";
          // Stripe amounts are usually in cents
          const centsAmount = stripeData.amount || 0;
          const eurosAmount = centsAmount / 100 || Number(payload.amount) || 0;
          
          if (eurosAmount <= 0) {
            throw new Error("El monto de Stripe no es válido (debe ser mayor a 0).");
          }

          // Try to locate a PENDING withdrawal with same reference/amount, or match Stripe ID
          let matchedTx = currentState.transactions.find(
            t => t.type === "WITHDRAWAL" && t.status === "PENDING" && (t.reference === stripeId || Math.abs(t.amount - eurosAmount) < 0.01)
          );

          if (matchedTx) {
            matchedTx.status = "COMPLETED";
            matchedTx.gateway = "STRIPE";
            matchedTx.reference = stripeId;
          } else {
            // Create a new completed withdrawal transaction
            matchedTx = {
              id: `tx-stripe-${Date.now()}`,
              type: "WITHDRAWAL",
              status: "COMPLETED",
              amount: eurosAmount,
              date: new Date().toISOString().split('T')[0],
              reference: stripeId,
              description: "Retiro automatizado vía Stripe Payout",
              gateway: "STRIPE"
            };
            currentState.transactions.unshift(matchedTx);
          }

          // Deduct from balance & add to totalWithdrawals
          currentState.balance -= eurosAmount;
          currentState.totalWithdrawals += eurosAmount;

          logWebhook("payout.paid", "SUCCESS", payload, `Stripe payout ${stripeId} liquidado exitosamente por €${eurosAmount}. Saldo actualizado.`);
          break;
        }

        case "payout.failed": {
          // Stripe Connect payout failure event
          const stripeData = payload.data || {};
          const stripeId = stripeData.id || "N/A";
          const centsAmount = stripeData.amount || 0;
          const eurosAmount = centsAmount / 100 || Number(payload.amount) || 0;
          const errorCode = stripeData.failure_code || "unknown";
          const errorMessage = stripeData.failure_message || "Rechazo de banco receptor o fondos insuficientes.";

          // Locate pending withdrawal
          let matchedTx = currentState.transactions.find(
            t => t.type === "WITHDRAWAL" && t.status === "PENDING" && (t.reference === stripeId || Math.abs(t.amount - eurosAmount) < 0.01)
          );

          if (matchedTx) {
            matchedTx.status = "FAILED";
            matchedTx.description += ` (Fallido: ${errorMessage})`;
          } else {
            // Create a failed transaction log
            matchedTx = {
              id: `tx-stripe-fail-${Date.now()}`,
              type: "WITHDRAWAL",
              status: "FAILED",
              amount: eurosAmount,
              date: new Date().toISOString().split('T')[0],
              reference: stripeId,
              description: `Intento de retiro Stripe fallido (${errorCode}: ${errorMessage})`,
              gateway: "STRIPE"
            };
            currentState.transactions.unshift(matchedTx);
          }

          logWebhook("payout.failed", "ERROR", payload, `Fallo en el pago Stripe ${stripeId}. Motivo: ${errorMessage}`);
          break;
        }

        case "payout_status_update": {
          // Custom payment gateway webhook event
          const ref = payload.reference;
          const status = payload.status; // 'completed' or 'failed'
          const amount = Number(payload.amount);

          if (!ref || !status) {
            throw new Error("El evento customizado requiere los campos 'reference' y 'status'.");
          }

          let matchedTx = currentState.transactions.find(
            t => t.type === "WITHDRAWAL" && t.status === "PENDING" && t.reference === ref
          );

          if (matchedTx) {
            if (status.toLowerCase() === "completed") {
              matchedTx.status = "COMPLETED";
              currentState.balance -= matchedTx.amount;
              currentState.totalWithdrawals += matchedTx.amount;
              logWebhook("payout_status_update", "SUCCESS", payload, `Webhook Custom: Retiro con referencia ${ref} completado por €${matchedTx.amount}.`);
            } else {
              matchedTx.status = "FAILED";
              logWebhook("payout_status_update", "ERROR", payload, `Webhook Custom: Retiro con referencia ${ref} marcado como FALLIDO.`);
            }
          } else {
            // No matching pending, let's create a new completed/failed record based on webhook
            const isCompleted = status.toLowerCase() === "completed";
            const txAmount = amount || 100; // Default or provided
            
            matchedTx = {
              id: `tx-custom-${Date.now()}`,
              type: "WITHDRAWAL",
              status: isCompleted ? "COMPLETED" : "FAILED",
              amount: txAmount,
              date: new Date().toISOString().split('T')[0],
              reference: ref,
              description: `Retiro customizado procesado vía Webhook`,
              gateway: "CUSTOM"
            };
            currentState.transactions.unshift(matchedTx);

            if (isCompleted) {
              currentState.balance -= txAmount;
              currentState.totalWithdrawals += txAmount;
            }
            logWebhook("payout_status_update", isCompleted ? "SUCCESS" : "ERROR", payload, `Webhook Custom: Registrada transacción autónoma ${ref} como ${status.toUpperCase()} por €${txAmount}.`);
          }
          break;
        }

        case "collaborator_payment_confirmed": {
          // Payroll webhook event
          const colId = payload.collaboratorId;
          const amount = Number(payload.amount);

          const col = currentState.collaborators.find(c => c.id === colId);
          if (!col) {
            throw new Error(`No se encontró ningún colaborador con el ID: ${colId}`);
          }

          const wageToPay = amount || col.wage;
          
          if (wageToPay > currentState.balance) {
            throw new Error(`Saldo insuficiente (€${currentState.balance.toFixed(2)}) para liquidar la nómina de €${wageToPay.toFixed(2)}.`);
          }

          // Mark last paid date
          col.lastPaymentDate = new Date().toISOString().split('T')[0];

          // Create Payroll transaction
          const payrollTx: Transaction = {
            id: `tx-pay-${Date.now()}`,
            type: "PAYROLL",
            status: "COMPLETED",
            amount: wageToPay,
            date: col.lastPaymentDate,
            reference: `PAY-${col.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
            description: `Nómina - ${col.name} (${col.role})`,
            gateway: "INTERNAL"
          };
          
          currentState.transactions.unshift(payrollTx);
          currentState.balance -= wageToPay;

          logWebhook("collaborator_payment_confirmed", "SUCCESS", payload, `Nómina de €${wageToPay} para ${col.name} pagada y sincronizada automáticamente.`);
          break;
        }

        default: {
          logWebhook(event, "ERROR", payload, `Evento '${event}' no soportado por el motor de sincronización.`);
          return res.status(400).json({ success: false, error: `Evento no soportado: ${event}` });
        }
      }

      res.json({ success: true, message: "Webhook procesado y sincronizado con éxito.", data: currentState });

    } catch (err: any) {
      logWebhook(event, "ERROR", payload, `Error procesando evento: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[InverGrow Server] Running on http://localhost:${PORT}`);
  });
}

startServer();

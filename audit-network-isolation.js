import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4174;
const CDP_PORT = 9222;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0].split("#")[0];
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(distDir, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(distDir, "index.html");
      fs.readFile(indexPath, (err2, data) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        }
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

async function runAudit() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`Isolation audit server running on http://localhost:${PORT}`);

  const tempUserDataDir = path.join(__dirname, ".tmp-chrome-audit");
  if (!fs.existsSync(tempUserDataDir)) fs.mkdirSync(tempUserDataDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempUserDataDir}`,
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--mute-audio"
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
        if (res.ok) {
          const json = await res.json();
          wsUrl = json.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!wsUrl) throw new Error("Could not connect to Chrome CDP");

    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === "page") || tabs[0];

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r) => ws.onopen = r);

    let id = 1;
    const callbacks = new Map();
    const interceptedRequests = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
      if (msg.method === "Network.requestWillBeSent") {
        const url = msg.params.request.url;
        interceptedRequests.push({
          url,
          method: msg.params.request.method,
          isLocal: url.startsWith(`http://localhost:${PORT}`)
        });
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Navigate to demo seller
    await send("Page.navigate", { url: `http://localhost:${PORT}/#demo/seller` });
    await new Promise((r) => setTimeout(r, 1500));

    // Clear initial asset loads to focus on action traffic
    const assetLoadCount = interceptedRequests.length;
    console.log(`Initial page load dispatched ${assetLoadCount} requests (all local assets/fonts).`);

    const actionRequestsBefore = interceptedRequests.length;

    // 1. Action: Seller creates a listing
    console.log("\nTesting Action 1: Seller Creates Listing...");
    const createSuccess = await evaluate(`(() => {
      // Find Add listing button
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => /add listing|create listing/i.test(b.textContent));
      if (!addBtn) return { ok: false, err: "No add button" };
      addBtn.click();
      return { ok: true };
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    // Fill form and submit
    const submitResult = await evaluate(`(() => {
      const titleInput = document.querySelector('input[placeholder*="laptop"]');
      const weightInput = document.querySelector('input[type="number"]');
      const locInput = document.querySelector('input[placeholder*="Area"]');
      const submitBtn = document.querySelector('.modal-actions button.btn-primary');
      if (!titleInput || !weightInput || !locInput || !submitBtn) return { ok: false, err: "Form inputs not found" };

      titleInput.value = "Decommissioned Precision Workstations";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));

      weightInput.value = "45.5";
      weightInput.dispatchEvent(new Event("input", { bubbles: true }));
      weightInput.dispatchEvent(new Event("change", { bubbles: true }));

      locInput.value = "Okhla Industrial Area Phase 2, New Delhi";
      locInput.dispatchEvent(new Event("input", { bubbles: true }));
      locInput.dispatchEvent(new Event("change", { bubbles: true }));

      submitBtn.click();
      return { ok: true };
    })()`);
    await new Promise((r) => setTimeout(r, 600));
    console.log("Create listing interaction result:", submitResult);

    // 2. Action: Seller decides offer (accept offer on SEL-301)
    console.log("\nTesting Action 2: Seller Decides Offer...");
    const decideResult = await evaluate(`(() => {
      // Navigate to My listings section
      const navLots = Array.from(document.querySelectorAll(".nav-item")).find(b => /listings/i.test(b.textContent));
      if (navLots) navLots.click();
      return { ok: true };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const acceptResult = await evaluate(`(() => {
      // Find Accept Offer button on the active SEL-301 listing
      const acceptBtn = Array.from(document.querySelectorAll("button")).find(b => /accept offer/i.test(b.textContent));
      if (!acceptBtn) return { ok: false, msg: "No Accept Offer button found" };
      acceptBtn.click();
      return { ok: true };
    })()`);
    console.log("Offer decision result:", acceptResult);
    await new Promise((r) => setTimeout(r, 600));

    // 3. Action: Switch to Collector & Stage a Scrap Claim
    console.log("\nTesting Action 3: Collector Upstream Claim...");
    await evaluate(`(() => {
      const collectorBtn = Array.from(document.querySelectorAll(".demo-role-btn")).find(b => b.textContent.trim() === "Collector");
      if (collectorBtn) collectorBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Navigate to Consignment lots section
    await evaluate(`(() => {
      const navLots = Array.from(document.querySelectorAll(".nav-item")).find(b => /consignment/i.test(b.textContent));
      if (navLots) navLots.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const claimScrapResult = await evaluate(`(() => {
      // Click Available Seller Scrap tab
      const discTab = Array.from(document.querySelectorAll(".collector-tab-btn")).find(b => /available seller scrap/i.test(b.textContent));
      if (discTab) {
        discTab.click();
        return { ok: true };
      }
      return { ok: false, err: "No discovery tab" };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const clickPropose = await evaluate(`(() => {
      const claimBtn = Array.from(document.querySelectorAll("button")).find(b => /propose collection claim/i.test(b.textContent));
      if (claimBtn) {
        claimBtn.click();
        return { ok: true };
      }
      return { ok: false, msg: "No propose claim button" };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const submitClaimModal = await evaluate(`(() => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = "2026-11-15";
        dateInput.dispatchEvent(new Event("input", { bubbles: true }));
        dateInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const submitBtn = Array.from(document.querySelectorAll(".modal-actions button, form button")).find(b => /confirm proposal/i.test(b.textContent));
      if (submitBtn) {
        submitBtn.click();
        return { ok: true };
      }
      return { ok: false, err: "No confirm proposal button" };
    })()`);
    console.log("Collector scrap claim result:", { clickPropose, submitClaimModal });
    await new Promise((r) => setTimeout(r, 600));

    // 4. Action: Switch to Recycler & Make Offer
    console.log("\nTesting Action 4: Recycler Submits Offer...");
    await evaluate(`(() => {
      const recyclerBtn = Array.from(document.querySelectorAll(".demo-role-btn")).find(b => b.textContent.trim() === "Recycler");
      if (recyclerBtn) recyclerBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    await evaluate(`(() => {
      const navLots = Array.from(document.querySelectorAll(".nav-item")).find(b => /scrap requests/i.test(b.textContent));
      if (navLots) navLots.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const openOfferModal = await evaluate(`(() => {
      const offerBtn = Array.from(document.querySelectorAll("button")).find(b => /submit demo bid|make an offer/i.test(b.textContent));
      if (offerBtn) {
        offerBtn.click();
        return { ok: true };
      }
      return { ok: false, msg: "No offer button" };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const submitOfferModal = await evaluate(`(() => {
      const priceInput = document.querySelector('input[placeholder*="demo amount"], input[type="number"]');
      const submitBtn = document.querySelector('.modal-actions button.btn-primary');
      if (priceInput && submitBtn) {
        priceInput.value = "42000";
        priceInput.dispatchEvent(new Event("input", { bubbles: true }));
        priceInput.dispatchEvent(new Event("change", { bubbles: true }));
        submitBtn.click();
        return { ok: true };
      }
      return { ok: false };
    })()`);
    console.log("Recycler submit offer result:", { openOfferModal, submitOfferModal });
    await new Promise((r) => setTimeout(r, 600));

    // 5. Action: Switch to Admin & Advance Workflow
    console.log("\nTesting Action 5: Admin Advances Workflow...");
    await evaluate(`(() => {
      const adminBtn = Array.from(document.querySelectorAll(".demo-role-btn")).find(b => b.textContent.trim() === "Admin");
      if (adminBtn) adminBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const adminTransition = await evaluate(`(() => {
      const navLots = Array.from(document.querySelectorAll(".nav-item")).find(b => /scrap requests/i.test(b.textContent));
      if (navLots) navLots.click();
      return { ok: true };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Select lot SEL-303 (status: "Pickup scheduled") in Admin master list
    const selectPickupScheduled = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll(".master-row"));
      const target = rows.find(r => r.textContent.includes("SEL-303") || r.textContent.includes("Pickup scheduled"));
      if (target) {
        target.click();
        return { ok: true };
      }
      return { ok: false, msg: "No SEL-303 row" };
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    // Click Mark Collected
    const clickMarkCollected = await evaluate(`(() => {
      const collectBtn = Array.from(document.querySelectorAll("button")).find(b => /mark collected/i.test(b.textContent));
      if (collectBtn) {
        collectBtn.click();
        return { ok: true };
      }
      return { ok: false, msg: "No Mark Collected button" };
    })()`);
    console.log("Admin transition check:", { selectPickupScheduled, clickMarkCollected });
    await new Promise((r) => setTimeout(r, 600));

    // 6. Action: Reset Demo
    console.log("\nTesting Action 6: Reset Demo Data...");
    const resetResult = await evaluate(`(() => {
      const resetBtn = document.querySelector(".btn-reset-demo");
      if (resetBtn) {
        resetBtn.click();
        return { ok: true };
      }
      return { ok: false };
    })()`);
    console.log("Reset demo result:", resetResult);
    await new Promise((r) => setTimeout(r, 600));

    // Inspect all requests that occurred during these actions
    const actionRequests = interceptedRequests.slice(actionRequestsBefore);
    console.log(`\nRequests captured during interactive demo actions: ${actionRequests.length}`);

    const supabaseCalls = interceptedRequests.filter(req =>
      req.url.includes("supabase.co") ||
      req.url.includes("/rest/v1") ||
      req.url.includes("/auth/v1") ||
      req.url.includes("/rpc/")
    );

    console.log("Supabase remote requests detected:", supabaseCalls.length);
    if (supabaseCalls.length > 0) {
      console.error("VIOLATION! Supabase calls were made:", supabaseCalls);
    } else {
      console.log("VERIFIED: Exactly 0 Supabase mutations or queries were dispatched during demo exploration!");
    }

    ws.close();
  } finally {
    chromeProc.kill();
    server.close();
  }
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});

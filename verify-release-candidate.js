import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4176;
const CDP_PORT = 9227;

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
    const contentType = MIME[ext] || "application/octet-stream";

    const range = req.headers.range;
    if (range && ext === ".mp4") {
      const total = stats.size;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType
      });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, { "Content-Type": contentType, "Content-Length": stats.size });
    fs.createReadStream(filePath).pipe(res);
  });
});

async function runVerification() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`Release candidate verification server on http://localhost:${PORT}`);

  const tempUserDataDir = path.join(__dirname, ".tmp-chrome-rc");
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
    const tab1 = tabs.find(t => t.type === "page") || tabs[0];

    const ws1 = new WebSocket(tab1.webSocketDebuggerUrl);
    await new Promise((r) => ws1.onopen = r);

    let id1 = 1;
    const callbacks1 = new Map();
    const consoleErrors = [];

    ws1.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks1.has(msg.id)) {
        callbacks1.get(msg.id)(msg);
        callbacks1.delete(msg.id);
      }
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(" "));
      }
    };

    function send1(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id1++;
        callbacks1.set(msgId, resolve);
        ws1.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    async function evaluate1(expression) {
      const res = await send1("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }

    await send1("Page.enable");
    await send1("Runtime.enable");
    await send1("DOM.enable");

    console.log("\n=======================================================");
    console.log("TEST 1: MULTI-TAB DEMO STORAGE ISOLATION & PERSISTENCE");
    console.log("=======================================================");

    // Navigate Tab 1 to Seller Demo
    await send1("Page.navigate", { url: `http://localhost:${PORT}/#demo/seller` });
    await new Promise((r) => setTimeout(r, 1200));

    // Create a new listing in Tab 1
    console.log("Creating new listing in Tab 1...");
    await evaluate1(`(() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => /add listing|create listing/i.test(b.textContent));
      if (addBtn) addBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    await evaluate1(`(() => {
      function setNativeValue(el, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const titleInput = document.querySelector('input[placeholder*="laptop"]');
      const weightInput = document.querySelector('input[type="number"]');
      const locInput = document.querySelector('input[placeholder*="Area"]');
      const submitBtn = document.querySelector('.modal-actions button.btn-primary');
      if (titleInput && weightInput && locInput && submitBtn) {
        setNativeValue(titleInput, "Tab 1 Isolated Test Lot");
        setNativeValue(weightInput, "77.5");
        setNativeValue(locInput, "Sector 62, Electronic City, Noida");
        submitBtn.click();
      }
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    // Verify Tab 1 has the new listing in memory and sessionStorage
    const tab1LotCount = await evaluate1(`(() => {
      const sessionRaw = sessionStorage.getItem("scarap_yukti_demo_state_v2");
      const parsed = sessionRaw ? JSON.parse(sessionRaw) : null;
      const lots = parsed ? parsed.lots : [];
      const hasNewLot = lots.some(l => l.title === "Tab 1 Isolated Test Lot");
      return { totalLots: lots.length, hasNewLot };
    })()`);
    console.log("Tab 1 storage state after creation:", tab1LotCount);

    // Test Tab 1 Reload Persistence
    console.log("Reloading Tab 1 to verify persistence across page refresh...");
    await send1("Page.reload");
    await new Promise((r) => setTimeout(r, 1200));

    const tab1AfterReload = await evaluate1(`(() => {
      const sessionRaw = sessionStorage.getItem("scarap_yukti_demo_state_v2");
      const parsed = sessionRaw ? JSON.parse(sessionRaw) : null;
      const lots = parsed ? parsed.lots : [];
      const hasNewLot = lots.some(l => l.title === "Tab 1 Isolated Test Lot");
      const demoRole = sessionStorage.getItem("scarap_demo_role");
      return { totalLots: lots.length, hasNewLot, demoRole };
    })()`);
    console.log("Tab 1 state after reload:", tab1AfterReload);

    // Now open a second browser target (Tab 2)
    console.log("\nOpening Tab 2 to verify tab isolation...");
    const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?http://localhost:${PORT}/`, { method: "PUT" });
    const tab2Json = await newTabRes.json();
    const ws2 = new WebSocket(tab2Json.webSocketDebuggerUrl);
    await new Promise((r) => ws2.onopen = r);

    let id2 = 1;
    const callbacks2 = new Map();
    ws2.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks2.has(msg.id)) {
        callbacks2.get(msg.id)(msg);
        callbacks2.delete(msg.id);
      }
    };
    function send2(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id2++;
        callbacks2.set(msgId, resolve);
        ws2.send(JSON.stringify({ id: msgId, method, params }));
      });
    }
    async function evaluate2(expression) {
      const res = await send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }
    await send2("Page.enable");
    await send2("Runtime.enable");
    await new Promise((r) => setTimeout(r, 1200));

    const tab2State = await evaluate2(`(() => {
      const isLanding = Boolean(document.querySelector(".landing-hero"));
      const isDemoActive = sessionStorage.getItem("scarap_demo_active");
      const sessionRaw = sessionStorage.getItem("scarap_yukti_demo_state_v2");
      const parsed = sessionRaw ? JSON.parse(sessionRaw) : null;
      const hasTab1Lot = parsed?.lots?.some(l => l.title === "Tab 1 Isolated Test Lot");
      return { isLanding, isDemoActive, hasTab1Lot };
    })()`);
    console.log("Tab 2 State (Should be completely pristine):", tab2State);

    ws2.close();

    console.log("\n=======================================================");
    console.log("TEST 2: ACCESSIBILITY FOCUS RESTORATION & ARROW KEYS");
    console.log("=======================================================");

    // Focus the RoleSwitcherDropdown trigger first
    await evaluate1(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      if (trigger) trigger.focus();
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Open RoleSwitcherDropdown via keyboard ArrowDown
    console.log("Opening RoleSwitcherDropdown via keyboard ArrowDown...");
    await send1("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 40,
      key: "ArrowDown",
      code: "ArrowDown"
    });
    await send1("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: 40,
      key: "ArrowDown",
      code: "ArrowDown"
    });
    await new Promise((r) => setTimeout(r, 400));

    const focusedAfterArrowDown = await evaluate1(`(() => {
      const active = document.activeElement;
      return {
        activeId: active ? active.id : null,
        activeRole: active ? active.getAttribute("role") : null,
        activeText: active ? active.textContent.trim().slice(0, 30) : null
      };
    })()`);
    console.log("Focused element after ArrowDown:", focusedAfterArrowDown);

    // Test Escape Key Closes and Restores Focus to Trigger
    console.log("Pressing Escape key to test focus restoration...");
    await send1("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 27,
      key: "Escape",
      code: "Escape"
    });
    await send1("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: 27,
      key: "Escape",
      code: "Escape"
    });
    await new Promise((r) => setTimeout(r, 400));

    const focusedAfterEscape = await evaluate1(`(() => {
      const active = document.activeElement;
      const isTrigger = active && active.classList.contains("role-dropdown-trigger");
      const listbox = document.querySelector(".role-dropdown-listbox");
      return {
        isTriggerFocused: isTrigger,
        activeClass: active ? active.className : null,
        listboxExists: Boolean(listbox)
      };
    })()`);
    console.log("Focus restoration after Escape:", focusedAfterEscape);

    console.log("\n=======================================================");
    console.log("TEST 3: VIEWPORT OVERFLOW AUDIT ACROSS 5 BREAKPOINTS");
    console.log("=======================================================");

    const breakpoints = [1440, 1024, 768, 390, 360];
    const views = [
      { name: "Landing", url: `http://localhost:${PORT}/` },
      { name: "Login", url: `http://localhost:${PORT}/#login` },
      { name: "Seller Workspace", url: `http://localhost:${PORT}/#demo/seller` },
      { name: "Collector Workspace", url: `http://localhost:${PORT}/#demo/collector` },
      { name: "Recycler Workspace", url: `http://localhost:${PORT}/#demo/recycler` },
      { name: "Admin Workspace", url: `http://localhost:${PORT}/#demo/admin` }
    ];

    for (const view of views) {
      console.log(`\nAuditing View: ${view.name}`);
      await send1("Page.navigate", { url: view.url });
      await new Promise((r) => setTimeout(r, 800));

      for (const width of breakpoints) {
        await send1("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 768
        });
        await new Promise((r) => setTimeout(r, 300));

        const overflowCheck = await evaluate1(`(() => {
          const docScroll = document.documentElement.scrollWidth;
          const docClient = document.documentElement.clientWidth;
          const bodyScroll = document.body.scrollWidth;
          const bodyClient = document.body.clientWidth;
          const hasOverflow = docScroll > docClient || bodyScroll > bodyClient;

          // Find overflowing elements if any
          let overflowingElements = [];
          if (hasOverflow) {
            const all = Array.from(document.querySelectorAll("*"));
            for (const el of all) {
              const rect = el.getBoundingClientRect();
              if (rect.right > docClient + 1) {
                overflowingElements.push({
                  tag: el.tagName,
                  className: el.className,
                  right: rect.right
                });
                if (overflowingElements.length >= 3) break;
              }
            }
          }

          return {
            docScroll,
            docClient,
            bodyScroll,
            bodyClient,
            hasOverflow,
            overflowingElements
          };
        })()`);

        if (overflowCheck.hasOverflow) {
          console.error(`  FAIL at ${width}px: scrollWidth ${overflowCheck.docScroll} > clientWidth ${overflowCheck.docClient}`, overflowCheck.overflowingElements);
        } else {
          console.log(`  PASS at ${width}px: scrollWidth = clientWidth = ${overflowCheck.docClient}px (0px overflow)`);
        }
      }
    }

    console.log("\n=======================================================");
    console.log("TEST 4: ASSET DELIVERY & CONSOLE ERRORS");
    console.log("=======================================================");

    const videoHead = await fetch(`http://localhost:${PORT}/videos/scarap-hero.mp4`, { method: "HEAD" });
    const posterHead = await fetch(`http://localhost:${PORT}/videos/scarap-hero-poster.webp`, { method: "HEAD" });

    console.log(`Video status: ${videoHead.status} (${videoHead.headers.get("content-type")}, length: ${videoHead.headers.get("content-length")} bytes)`);
    console.log(`Poster status: ${posterHead.status} (${posterHead.headers.get("content-type")}, length: ${posterHead.headers.get("content-length")} bytes)`);

    console.log(`\nTotal console errors captured across all runs: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors logged:", consoleErrors);
    }

    ws1.close();
  } finally {
    chromeProc.kill();
    server.close();
  }
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

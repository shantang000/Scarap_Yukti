import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
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

// 1. Static file server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0].split("#")[0];
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(distDir, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback
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

    // Handle range requests for video
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

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on http://localhost:${PORT}`);

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--mute-audio"
  ]);

  try {
    // Wait for CDP to be ready
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
        if (res.ok) {
          const json = await res.json();
          wsUrl = json.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!wsUrl) throw new Error("Could not connect to Chrome CDP");
    console.log("Connected to Chrome CDP");

    // Pick existing page tab
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === "page") || tabs[0];
    const pageWsUrl = tab.webSocketDebuggerUrl;

    const ws = new WebSocket(pageWsUrl);
    await new Promise((resolve) => ws.onopen = resolve);

    let id = 1;
    const callbacks = new Map();
    const consoleLogs = [];
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
      if (msg.method === "Runtime.consoleAPICalled") {
        const text = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(" ");
        if (msg.params.type === "error") consoleErrors.push(text);
        else consoleLogs.push(text);
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
    await send("DOM.enable");
    await send("CSS.enable");

    // Navigate to page
    await send("Page.navigate", { url: `http://localhost:${PORT}` });

    // Wait for page load
    await new Promise((r) => setTimeout(r, 1500));

    console.log("\n--- VERIFICATION 1: HERO VIDEO & ASSETS ---");
    const videoInfo = await evaluate(`(() => {
      const video = document.querySelector(".hero-background-video");
      const poster = document.querySelector(".hero-video-container");
      const overlay = document.querySelector(".hero-video-overlay");
      if (!video) return { found: false };
      const comp = window.getComputedStyle(video);
      return {
        found: true,
        src: video.currentSrc || video.src,
        opacity: comp.opacity,
        filter: comp.filter,
        display: comp.display,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        readyState: video.readyState,
        hasPoster: Boolean(video.poster || comp.backgroundImage)
      };
    })()`);
    console.log("Hero Video Check:", videoInfo);

    console.log("\n--- VERIFICATION 2: THEME SWITCHER (DARK / LIGHT) ---");
    const initialTheme = await evaluate(`document.documentElement.getAttribute("data-theme") || "dark"`);
    const initialBg = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
    console.log("Initial Theme:", initialTheme, "Initial Body BG:", initialBg);

    // Click theme toggle
    await evaluate(`(() => {
      const btn = document.querySelector(".theme-toggle-btn");
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const toggledTheme = await evaluate(`document.documentElement.getAttribute("data-theme")`);
    const toggledBg = await evaluate(`window.getComputedStyle(document.body).backgroundColor`);
    const savedTheme = await evaluate(`localStorage.getItem("scarap_theme")`);
    console.log("Toggled Theme:", toggledTheme, "Toggled Body BG:", toggledBg, "Saved in localStorage:", savedTheme);

    // Toggle back to dark
    await evaluate(`(() => {
      const btn = document.querySelector(".theme-toggle-btn");
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    const restoredTheme = await evaluate(`document.documentElement.getAttribute("data-theme")`);
    console.log("Restored Theme:", restoredTheme);

    console.log("\n--- VERIFICATION 3: DEMO LAUNCH & ROLE SWITCHING ---");
    // Launch demo from landing page
    await evaluate(`(() => {
      const btn = document.querySelector(".hero-role-card");
      if (btn) btn.click();
      else {
        const cta = document.querySelector(".btn-hero");
        if (cta) cta.click();
      }
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const inDemo = await evaluate(`(() => {
      const banner = document.querySelector(".demo-notification-banner");
      const title = document.querySelector(".welcome-row h1")?.textContent;
      const rolePill = document.querySelector(".demo-banner-badge")?.textContent;
      const roleButtons = Array.from(document.querySelectorAll(".demo-role-btn")).map(b => b.textContent.trim());
      return {
        hasBanner: Boolean(banner),
        title,
        rolePill,
        roleButtons,
        hash: window.location.hash
      };
    })()`);
    console.log("Demo Entry State:", inDemo);

    // Switch across roles and inspect master lists in lots section
    for (const targetRole of ["Seller", "Collector", "Recycler", "Admin"]) {
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll(".demo-role-btn")).find(b => b.textContent.trim() === "${targetRole}");
        if (btn) btn.click();
        const navLotsBtn = Array.from(document.querySelectorAll(".nav-item")).find(b =>
          /listings|lots|requests/i.test(b.textContent)
        );
        if (navLotsBtn) navLotsBtn.click();
      })()`);
      await new Promise((r) => setTimeout(r, 500));

      const roleCheck = await evaluate(`(() => {
        const title = document.querySelector(".welcome-row h1")?.textContent;
        const activeBtn = document.querySelector(".demo-role-btn.active")?.textContent.trim();
        const masterRows = document.querySelectorAll(".master-row").length;
        const firstRowTitle = document.querySelector(".master-row-title")?.textContent;
        return { activeBtn, title, masterRows, firstRowTitle };
      })()`);
      console.log(`Role '${targetRole}' in Lots View:`, roleCheck);
    }

    console.log("\n--- VERIFICATION 4: RESET DEMO DATA ---");
    const resetResult = await evaluate(`(() => {
      const resetBtn = document.querySelector(".btn-reset-demo");
      if (resetBtn) resetBtn.click();
      return Boolean(resetBtn);
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    const toast = await evaluate(`document.querySelector(".toast")?.textContent`);
    console.log("Reset Demo Button Clicked:", resetResult, "Toast notice:", toast);

    console.log("\n--- VERIFICATION 5: ACCESSIBLE DROPDOWNS & ESCAPE / OUTSIDE CLICK ---");
    // Open role dropdown in topbar
    await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      if (trigger) trigger.click();
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const dropdownOpen = await evaluate(`Boolean(document.querySelector(".role-dropdown-listbox"))`);
    console.log("Role Dropdown Opened:", dropdownOpen);

    // Press Escape
    await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await new Promise((r) => setTimeout(r, 200));
    const dropdownClosedOnEscape = await evaluate(`Boolean(document.querySelector(".role-dropdown-listbox"))`);
    console.log("Role Dropdown Closed on Escape:", !dropdownClosedOnEscape);

    // Open again and click outside
    await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      if (trigger) trigger.click();
    })()`);
    await new Promise((r) => setTimeout(r, 200));
    await evaluate(`document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await new Promise((r) => setTimeout(r, 200));
    const dropdownClosedOnOutside = await evaluate(`Boolean(document.querySelector(".role-dropdown-listbox"))`);
    console.log("Role Dropdown Closed on Outside Click:", !dropdownClosedOnOutside);

    console.log("\n--- VERIFICATION 6: VIEWPORT OVERFLOW AUDIT ---");
    const viewports = [1440, 1024, 768, 390, 360];
    const overflowResults = [];
    for (const width of viewports) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: width <= 768
      });
      await new Promise((r) => setTimeout(r, 200));

      const measurement = await evaluate(`(() => {
        const docScroll = document.documentElement.scrollWidth;
        const docClient = document.documentElement.clientWidth;
        const bodyScroll = document.body.scrollWidth;
        const overflowingEls = [];
        document.querySelectorAll("*").forEach(el => {
          if (el.scrollWidth > docClient + 2 || el.getBoundingClientRect().right > docClient + 2) {
            overflowingEls.push({
              tag: el.tagName,
              cls: el.className,
              id: el.id,
              scrollW: el.scrollWidth,
              right: el.getBoundingClientRect().right
            });
          }
        });
        return {
          viewport: ${width},
          docScroll,
          docClient,
          bodyScroll,
          hasOverflow: docScroll > docClient || bodyScroll > docClient,
          topOverflowing: overflowingEls.slice(0, 5)
        };
      })()`);
      overflowResults.push(measurement);
    }
    console.log("Overflow Audit Table:", JSON.stringify(overflowResults, null, 2));

    console.log("\n--- VERIFICATION 7: CONSOLE HEALTH ---");
    console.log("Console Errors Count:", consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error("Errors logged:", consoleErrors);
    }

    ws.close();
  } finally {
    chromeProc.kill();
    server.close();
  }
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

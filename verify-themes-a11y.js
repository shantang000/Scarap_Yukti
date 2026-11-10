import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4175;
const CDP_PORT = 9226;

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

async function runTests() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`Theme & A11y test server running on http://localhost:${PORT}`);

  const tempUserDataDir = path.join(__dirname, ".tmp-chrome-theme");
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
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
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

    console.log("\n=== 1. AUDITING THEME ON LANDING PAGE ===");
    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 1200));

    // Clear session and storage to verify pristine fresh visitor experience
    await evaluate(`(() => {
      sessionStorage.clear();
      localStorage.removeItem("scarap_theme");
      window.location.hash = "";
    })()`);
    await send("Page.reload");
    await new Promise((r) => setTimeout(r, 1200));

    const landingInitial = await evaluate(`(() => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const stored = localStorage.getItem("scarap_theme");
      return { themeAttr, bodyBg, stored };
    })()`);
    console.log("Landing Initial Theme:", landingInitial);

    // Toggle theme to dark / light
    const clickToggle1 = await evaluate(`(() => {
      const toggleBtn = document.querySelector(".theme-toggle-btn");
      if (!toggleBtn) return { ok: false, err: "No theme toggle found" };
      toggleBtn.click();
      return { ok: true };
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const landingAfterToggle1 = await evaluate(`(() => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const stored = localStorage.getItem("scarap_theme");
      return { themeAttr, bodyBg, stored };
    })()`);
    console.log("Landing After First Toggle:", landingAfterToggle1);

    // Test Reload Persistence
    console.log("\n=== 2. AUDITING THEME RELOAD PERSISTENCE ===");
    await send("Page.reload");
    await new Promise((r) => setTimeout(r, 1200));

    const landingAfterReload = await evaluate(`(() => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const stored = localStorage.getItem("scarap_theme");
      return { themeAttr, bodyBg, stored };
    })()`);
    console.log("Landing After Reload (Must preserve chosen theme):", landingAfterReload);

    // Explicitly set to dark and test reload
    await evaluate(`(() => {
      const current = localStorage.getItem("scarap_theme");
      if (current !== "dark") {
        const toggleBtn = document.querySelector(".theme-toggle-btn");
        if (toggleBtn) toggleBtn.click();
      }
    })()`);
    await new Promise((r) => setTimeout(r, 400));
    const landingSetDark = await evaluate(`(() => {
      return {
        themeAttr: document.documentElement.getAttribute("data-theme"),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        stored: localStorage.getItem("scarap_theme")
      };
    })()`);
    console.log("Landing Explicitly Set to Dark:", landingSetDark);

    // 3. Login gate theme
    console.log("\n=== 3. AUDITING THEME ON LOGIN VIEW ===");
    await send("Page.navigate", { url: `http://localhost:${PORT}/#login` });
    await new Promise((r) => setTimeout(r, 800));
    const loginThemeDark = await evaluate(`(() => {
      const card = document.querySelector(".auth-card, .auth-login-card");
      const cardBg = card ? window.getComputedStyle(card).backgroundColor : null;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return { bodyBg, cardBg };
    })()`);

    // Toggle theme on login
    await evaluate(`(() => {
      const btn = document.querySelector(".theme-toggle-btn");
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const loginThemeLight = await evaluate(`(() => {
      const card = document.querySelector(".auth-card, .auth-login-card");
      const cardBg = card ? window.getComputedStyle(card).backgroundColor : null;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return { bodyBg, cardBg };
    })()`);

    console.log("Login Gate Theme Details:", { dark: loginThemeDark, light: loginThemeLight });

    // 4. Four workspaces theme & contrast audit
    console.log("\n=== 4. AUDITING THEMES ACROSS ALL 4 WORKSPACES ===");
    const roles = ["seller", "collector", "recycler", "admin"];
    for (const r of roles) {
      await send("Page.navigate", { url: `http://localhost:${PORT}/#demo/${r}` });
      await new Promise((res) => setTimeout(res, 800));

      // Make sure it's dark
      await evaluate(`(() => {
        if (localStorage.getItem("scarap_theme") !== "dark") {
          const btn = document.querySelector(".theme-toggle-btn");
          if (btn) btn.click();
        }
      })()`);
      await new Promise((res) => setTimeout(res, 300));

      const darkDetails = await evaluate(`(() => {
        const panel = document.querySelector(".panel, .dashboard-panel");
        const sidebar = document.querySelector(".sidebar");
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const panelBg = panel ? window.getComputedStyle(panel).backgroundColor : null;
        const sidebarBg = sidebar ? window.getComputedStyle(sidebar).backgroundColor : null;
        return { bodyBg, panelBg, sidebarBg };
      })()`);

      // Switch to light
      await evaluate(`(() => {
        const btn = document.querySelector(".theme-toggle-btn");
        if (btn) btn.click();
      })()`);
      await new Promise((res) => setTimeout(res, 300));

      const lightDetails = await evaluate(`(() => {
        const panel = document.querySelector(".panel, .dashboard-panel");
        const sidebar = document.querySelector(".sidebar");
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const panelBg = panel ? window.getComputedStyle(panel).backgroundColor : null;
        const sidebarBg = sidebar ? window.getComputedStyle(sidebar).backgroundColor : null;
        return { bodyBg, panelBg, sidebarBg };
      })()`);

      // Switch back to dark
      await evaluate(`(() => {
        const btn = document.querySelector(".theme-toggle-btn");
        if (btn) btn.click();
      })()`);
      await new Promise((res) => setTimeout(res, 300));

      console.log(`Role ${r.toUpperCase()}:`, { dark: darkDetails, light: lightDetails });
    }

    // 5. Accessible Dropdowns & Keyboard Operation
    console.log("\n=== 5. AUDITING ACCESSIBLE MENUS & KEYBOARD INTERACTIONS ===");
    await send("Page.navigate", { url: `http://localhost:${PORT}/#demo/seller` });
    await new Promise((r) => setTimeout(r, 800));

    const initialTriggerState = await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      if (!trigger) return { ok: false, err: "No role dropdown trigger" };
      return {
        ok: true,
        initialExpanded: trigger.getAttribute("aria-expanded"),
        hasPopup: trigger.getAttribute("aria-haspopup")
      };
    })()`);
    console.log("Initial Trigger State:", initialTriggerState);

    // Click to open dropdown
    await evaluate(`document.querySelector(".role-dropdown-trigger").click()`);
    await new Promise((r) => setTimeout(r, 300)); // allow React to re-render

    const openedTriggerState = await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      const listbox = document.querySelector(".role-dropdown-listbox");
      const options = listbox ? Array.from(listbox.querySelectorAll('[role="option"]')).map(o => ({
        text: o.textContent.trim().replace(/\\s+/g, " "),
        selected: o.getAttribute("aria-selected")
      })) : [];

      return {
        openedExpanded: trigger ? trigger.getAttribute("aria-expanded") : null,
        listboxRole: listbox ? listbox.getAttribute("role") : null,
        optionsCount: options.length,
        options
      };
    })()`);
    console.log("Opened Dropdown State:", openedTriggerState);

    // Test Escape key closes dropdown
    console.log("Testing Escape key operation...");
    await send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 27,
      key: "Escape",
      code: "Escape"
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: 27,
      key: "Escape",
      code: "Escape"
    });
    await new Promise((r) => setTimeout(r, 400));

    const checkAfterEscape = await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      const listbox = document.querySelector(".role-dropdown-listbox");
      return {
        expanded: trigger ? trigger.getAttribute("aria-expanded") : null,
        listboxExists: Boolean(listbox)
      };
    })()`);
    console.log("State after pressing Escape key (should be closed):", checkAfterEscape);

    // Test Outside Click closes dropdown
    console.log("Testing Outside Click operation...");
    await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      if (trigger) trigger.click();
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    await evaluate(`(() => {
      const h1 = document.querySelector("h1, .welcome-row h1");
      if (h1) h1.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const checkAfterOutsideClick = await evaluate(`(() => {
      const trigger = document.querySelector(".role-dropdown-trigger");
      const listbox = document.querySelector(".role-dropdown-listbox");
      return {
        expanded: trigger ? trigger.getAttribute("aria-expanded") : null,
        listboxExists: Boolean(listbox)
      };
    })()`);
    console.log("State after clicking outside (should be closed):", checkAfterOutsideClick);

    // 6. Reduced Motion & Video Behavior on Landing Page
    console.log("\n=== 6. AUDITING HERO VIDEO & REDUCED MOTION ===");
    // Click Exit Demo or clear hash to return cleanly to landing page
    await send("Page.navigate", { url: `http://localhost:${PORT}/#` });
    await new Promise((r) => setTimeout(r, 500));
    await evaluate(`(() => {
      sessionStorage.clear();
      window.location.hash = "";
    })()`);
    await send("Page.reload");
    await new Promise((r) => setTimeout(r, 1500));

    // Standard video state
    const standardVideo = await evaluate(`(() => {
      const video = document.querySelector(".hero-background-video");
      const container = document.querySelector(".hero-video-container");
      return {
        videoFound: Boolean(video),
        videoSrc: video ? (video.currentSrc || video.querySelector("source")?.src) : null,
        videoDisplay: video ? window.getComputedStyle(video).display : null,
        videoOpacity: video ? window.getComputedStyle(video).opacity : null,
        videoPoster: video ? video.getAttribute("poster") : null,
        containerFound: Boolean(container)
      };
    })()`);
    console.log("Standard Motion Video State:", standardVideo);

    // Emulate reduced motion
    await send("Emulation.setEmulatedMedia", {
      media: "",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    await new Promise((r) => setTimeout(r, 500));

    const reducedMotionState = await evaluate(`(() => {
      const matchesMedia = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const video = document.querySelector(".hero-background-video");
      return {
        matchesMedia,
        videoDisplay: video ? window.getComputedStyle(video).display : null
      };
    })()`);
    console.log("Reduced Motion State:", reducedMotionState);

    ws.close();
  } finally {
    chromeProc.kill();
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

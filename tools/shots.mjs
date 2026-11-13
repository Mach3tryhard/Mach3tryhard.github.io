import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};

const url = flag("url", "http://127.0.0.1:4173/");
const outDir = flag("out", "preview");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  const list = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
  const page = list.find((target) => target.type === "page");
  if (!page) throw new Error("No page target found");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve(message);
    }
    if (message.method === "Runtime.exceptionThrown") {
      console.error("EXCEPTION:", JSON.stringify(message.params.exceptionDetails).slice(0, 1200));
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      console.error("CONSOLE:", message.params.args.map((a) => a.value ?? a.description).join(" "));
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      console.error("LOG:", message.params.entry.text);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
  });

  const send = (method, params = {}) => {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => pending.set(id, resolve));
  };

  return { send, close: () => socket.close() };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { send, close } = await connect();

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url });

  const evaluate = async (expression, awaitPromise = false) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    });
    if (result.result?.exceptionDetails) {
      console.error("EVAL ERROR:", JSON.stringify(result.result.exceptionDetails).slice(0, 800));
    }
    return result.result?.result?.value;
  };

  let ready = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    ready = await evaluate("Boolean(window.__MUSEUM__)");
    if (ready) break;
    await wait(250);
  }
  if (!ready) throw new Error("__MUSEUM__ never appeared");

  const scenesFile = flag("scenes-file", "tools/scenes.json");
  const scenes = JSON.parse(
    argv.includes("--scenes")
      ? flag("scenes", "[]")
      : (await import("node:fs"))
          .readFileSync(scenesFile, "utf8")
          .replace(/^\uFEFF/, "")
  );
  const capture = async (name) => {
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const path = `${outDir}/${name}.png`;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(shot.result.data, "base64"));
    console.log("wrote", path);
  };

  for (const scene of scenes) {
    const viewport = scene.viewport ?? { width: 1440, height: 1000, mobile: false };
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: Boolean(viewport.mobile),
    });
    await wait(350);

    if (scene.reload) {
      await send("Page.navigate", { url });
      for (let attempt = 0; attempt < 160; attempt += 1) {
        if (await evaluate("Boolean(window.__MUSEUM__)")) break;
        await wait(250);
      }
      await wait(scene.wait ?? 1500);
      await capture(scene.name);
      continue;
    }

    if (scene.cv) {
      await evaluate(`document.querySelector('[data-cv-panel="${scene.cv}"]').click()`);
      if (scene.scroll) {
        await evaluate(`document.querySelector('#reader-scroll').scrollTop = ${scene.scroll}`);
      }
      await wait(scene.wait ?? 900);
      await capture(scene.name);
      if (scene.close) {
        await evaluate("document.querySelector('#reader-close').click()");
        await wait(300);
      }
      continue;
    }

    if (scene.view) {
      await evaluate(`window.__MUSEUM__.view(${JSON.stringify(scene.view)})`);
      await wait(scene.wait ?? 2600);
      await capture(scene.name);
      continue;
    }

    await wait(scene.wait ?? 800);
    await capture(scene.name);
  }

  close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

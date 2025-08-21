const FEED_URL = "https://www.dealerhub.net/workspace/zaexports/autoslmcustomstockfeed/autoslmcustomstockfeedXquisiteUmhlanga.xml";

const qs = (s, el=document) => el.querySelector(s);
const ce = (t, props={}) => Object.assign(document.createElement(t), props);

const landing = qs("#landing");
const listView = qs("#listView");
const detailView = qs("#detailView");
const cards = qs("#cards");
const backBtn = qs("#backBtn");

let vehicles = [];
let deferredPrompt = null;

function show(section) {
  landing.style.display = section === "landing" ? "" : "none";
  listView.style.display = section === "list" ? "" : "none";
  detailView.style.display = section === "detail" ? "" : "none";
  backBtn.style.display = section === "detail" ? "" : (section === "list" ? "" : "none");
  history.pushState({section}, "", "");
}

window.addEventListener("popstate", (ev) => {
  const s = ev.state?.section || "landing";
  landing.style.display = s === "landing" ? "" : "none";
  listView.style.display = s === "list" ? "" : "none";
  detailView.style.display = s === "detail" ? "" : "none";
  backBtn.style.display = s === "detail" ? "" : (s === "list" ? "" : "none");
});

qs("#openStock").addEventListener("click", async () => {
  show("list");
  await loadFeed();
});

backBtn.addEventListener("click", () => {
  if (detailView.style.display !== "none") {
    show("list");
  } else {
    show("landing");
  }
});

async function loadFeed() {
  cards.innerHTML = `<div class="center">Loading latest stock…</div>`;
  try {
    const res = await fetch(FEED_URL, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    // Heuristic: treat any element that contains a <TITLE> as a vehicle node.
    const allElems = Array.from(xml.getElementsByTagName("*"));
    const vehicleCandidates = allElems.filter(el => el.getElementsByTagName("TITLE").length > 0);

    // Deduplicate parents (avoid nested matches) by preferring the element that directly has TITLE as a child
    const uniq = [];
    for (const el of vehicleCandidates) {
      const hasDirectTitleChild = Array.from(el.children).some(c => c.tagName === "TITLE");
      if (hasDirectTitleChild) uniq.push(el);
    }

    vehicles = uniq.map((node, idx) => normalizeVehicle(node, idx));
    renderList(vehicles);
  } catch (err) {
    console.error(err);
    cards.innerHTML = `<div class="center">
      Could not load feed directly from the browser (CORS or network).<br/>
      Please add a simple reverse-proxy on your server for:<br>
      <code>${FEED_URL}</code>
    </div>`;
  }
}

function normalizeVehicle(node, idx) {
  const data = {};
  // Collect all children as key/value
  for (const child of Array.from(node.children)) {
    const key = child.tagName;
    const val = child.textContent?.trim() ?? "";
    data[key] = val;
  }
  // Title
  const title = data.TITLE || data.Title || data.name || `Vehicle #${idx+1}`;

  // Gather images: any child whose tag starts with IMAGE (IMAGE1, IMAGE_1, IMAGE, etc.)
  const imageKeys = Object.keys(data).filter(k => /^IMAGE(_?\d+)?$/i.test(k) || /^IMAGE\d+$/i.test(k) || k.toUpperCase().startsWith("IMAGE"));
  const images = imageKeys.map(k => data[k]).filter(Boolean);

  // fallback thumb
  const thumb = images[0] || "assets/icon-512.png";

  return { id: idx, title, images, raw: data };
}

function renderList(items) {
  if (!items.length) {
    cards.innerHTML = `<div class="center">No vehicles found in the feed.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(v => {
    const card = ce("article", { className: "card" });
    const img = ce("img", { className: "thumb", alt: v.title, loading: "lazy" });
    img.src = v.images[0] || "assets/icon-512.png";
    const pad = ce("div", { className: "pad" });
    const h3 = ce("h3", { textContent: v.title });
    const meta = ce("div", { className: "meta", textContent: v.raw?.PRICE ? `Price: ${v.raw.PRICE}` : "" });

    const open = () => openDetail(v);
    img.addEventListener("click", open);
    h3.addEventListener("click", open);

    pad.appendChild(h3);
    pad.appendChild(meta);
    card.appendChild(img);
    card.appendChild(pad);
    frag.appendChild(card);
  });
  cards.innerHTML = "";
  cards.appendChild(frag);
}

function openDetail(v) {
  const wrap = ce("div", { className: "details" });
  const title = ce("h2", { textContent: v.title });
  wrap.appendChild(title);

  // Gallery
  const gallery = ce("div", { className: "gallery" });
  (v.images.length ? v.images : ["assets/icon-512.png"]).forEach(src => {
    const img = ce("img", { src, alt: v.title, loading: "lazy" });
    gallery.appendChild(img);
  });
  wrap.appendChild(gallery);

  // Key/Value list for everything
  const kv = ce("div", { className: "kv" });
  const sortedKeys = Object.keys(v.raw).sort((a,b)=> a.localeCompare(b));
  sortedKeys.forEach(k => {
    const label = ce("div", { className: "label", textContent: k });
    const val = ce("div", { textContent: v.raw[k] });
    kv.appendChild(label);
    kv.appendChild(val);
  });
  wrap.appendChild(kv);

  const container = document.getElementById("detail");
  container.innerHTML = "";
  container.appendChild(wrap);
  show("detail");
}

// --- PWA install prompt handling ---
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("installBtn");
  btn.style.display = "inline-block";
  btn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  };
});

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.error);
  });
}
/* ── STATE ── */
let currentPlatform = "tiktok";

/* ── DOM ── */
const tabTiktok   = document.getElementById("tab-tiktok");
const tabYoutube  = document.getElementById("tab-youtube");
const urlInput    = document.getElementById("url-input");
const grabBtn     = document.getElementById("grab-btn");
const clearBtn    = document.getElementById("clear-btn");
const inputHint   = document.getElementById("input-hint");
const loadingEl   = document.getElementById("loading");
const errorBox    = document.getElementById("error-box");
const errorMsgEl  = document.getElementById("error-msg");
const errorDismiss= document.getElementById("error-dismiss");
const resultCard  = document.getElementById("result-card");

/* ── PLATFORM TOGGLE ── */
function setPlatform(platform) {
  currentPlatform = platform;
  tabTiktok.classList.toggle("active", platform === "tiktok");
  tabTiktok.setAttribute("aria-selected", platform === "tiktok");
  tabYoutube.classList.toggle("active", platform === "youtube");
  tabYoutube.setAttribute("aria-selected", platform === "youtube");

  if (platform === "tiktok") {
    urlInput.placeholder = "Paste link TikTok di sini...";
    inputHint.textContent = "Mendukung: TikTok & TikTok Lite · Paste URL lalu tekan Download";
  } else {
    urlInput.placeholder = "Paste link YouTube di sini...";
    inputHint.textContent = "Mendukung: YouTube & YouTube Shorts · Paste URL lalu tekan Download";
  }

  hideAll();
  urlInput.value = "";
  updateClearBtn();
  urlInput.focus();
}

tabTiktok.addEventListener("click",  () => setPlatform("tiktok"));
tabYoutube.addEventListener("click", () => setPlatform("youtube"));

/* ── CLEAR BTN ── */
function updateClearBtn() {
  clearBtn.classList.toggle("visible", urlInput.value.length > 0);
}
urlInput.addEventListener("input", updateClearBtn);
clearBtn.addEventListener("click", () => {
  urlInput.value = "";
  updateClearBtn();
  hideAll();
  urlInput.focus();
});
errorDismiss.addEventListener("click", () => errorBox.classList.remove("visible"));

/* ── AUTO-DETECT PLATFORM ── */
urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    const v = urlInput.value.trim();
    if (/tiktok\.com|vm\.tiktok/i.test(v) && currentPlatform !== "tiktok") setPlatform("tiktok");
    else if (/youtube\.com|youtu\.be/i.test(v) && currentPlatform !== "youtube") setPlatform("youtube");
    updateClearBtn();
  }, 60);
});

/* ── UI HELPERS ── */
function hideAll() {
  loadingEl.classList.remove("visible");
  errorBox.classList.remove("visible");
  resultCard.classList.remove("visible");
}
function showLoading() { hideAll(); loadingEl.classList.add("visible"); }
function showError(msg) {
  hideAll();
  errorMsgEl.textContent = msg;
  errorBox.classList.add("visible");
}

function fmtCount(n) {
  if (!n) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function fmtDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── DOWNLOAD BUTTON FACTORY ── */
function makeDlBtn(label, sublabel, url, badge, extraClass) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = `dl-btn ${extraClass || ""}`.trim();
  a.innerHTML = `
    <div class="dl-btn-info">
      <span class="dl-btn-label">${label}</span>
      ${sublabel ? `<span class="dl-btn-sub">${sublabel}</span>` : ""}
    </div>
    ${badge ? `<span class="dl-badge">${badge}</span>` : ""}
    <svg class="dl-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  `;
  return a;
}

/* ── RENDER TIKTOK ── */
function renderTikTok(data) {
  document.getElementById("result-badge").textContent = "TikTok";
  document.getElementById("result-badge").classList.remove("yt");

  const thumb = document.getElementById("result-thumbnail");
  const frame = document.getElementById("thumb-frame");
  thumb.src = data.cover || "";
  frame.classList.remove("landscape");

  const dur = fmtDuration(data.duration);
  document.getElementById("result-duration").textContent = dur || "";
  document.getElementById("result-duration").style.display = dur ? "" : "none";

  document.getElementById("result-author").textContent =
    data.author?.username ? `@${data.author.username}` : (data.author?.name || "");
  document.getElementById("result-title").textContent = data.title || "TikTok Video";

  const statsRow = document.getElementById("result-stats");
  const chips = [
    { icon: "▶", v: data.stats?.plays,    l: "plays" },
    { icon: "♥", v: data.stats?.likes,    l: "likes" },
    { icon: "💬", v: data.stats?.comments, l: "comments" },
  ].filter(c => c.v);
  statsRow.innerHTML = chips.map(c =>
    `<span class="stat-chip">${c.icon} ${fmtCount(c.v)} ${c.l}</span>`
  ).join("");

  const dlGrid = document.getElementById("dl-buttons");
  dlGrid.innerHTML = "";

  if (data.downloads?.no_watermark_hd)
    dlGrid.appendChild(makeDlBtn("Video HD", "Tanpa watermark · kualitas tinggi", data.downloads.no_watermark_hd, "HD", "primary"));
  if (data.downloads?.no_watermark)
    dlGrid.appendChild(makeDlBtn("Video SD", "Tanpa watermark · ukuran lebih kecil", data.downloads.no_watermark, "SD", ""));
  if (data.downloads?.watermark)
    dlGrid.appendChild(makeDlBtn("Video", "Dengan watermark TikTok", data.downloads.watermark, "WM", ""));
  if (data.downloads?.audio)
    dlGrid.appendChild(makeDlBtn("Audio / Musik", "Ekstrak audio saja", data.downloads.audio, "MP3", "audio"));

  resultCard.classList.add("visible");
}

/* ── RENDER YOUTUBE ── */
function renderYouTube(data) {
  const badge = document.getElementById("result-badge");
  badge.textContent = "YouTube";
  badge.classList.add("yt");

  const thumb = document.getElementById("result-thumbnail");
  const frame = document.getElementById("thumb-frame");
  thumb.src = data.thumbnail || `https://img.youtube.com/vi/${data.id}/maxresdefault.jpg`;
  frame.classList.add("landscape");

  const dur = fmtDuration(data.duration);
  document.getElementById("result-duration").textContent = dur || "";
  document.getElementById("result-duration").style.display = dur ? "" : "none";

  document.getElementById("result-author").textContent = data.channel ? `📺 ${data.channel}` : "";
  document.getElementById("result-title").textContent = data.title || "YouTube Video";
  document.getElementById("result-stats").innerHTML = "";

  const dlGrid = document.getElementById("dl-buttons");
  dlGrid.innerHTML = "";
  const downloads = data.downloads || {};

  const qualities = [
    { key: "1080", label: "Video Full HD", sub: "1080p · MP4", badge: "1080p", cls: "primary" },
    { key: "720",  label: "Video HD",       sub: "720p · MP4",  badge: "720p",  cls: "" },
    { key: "480",  label: "Video SD",        sub: "480p · MP4",  badge: "480p",  cls: "" },
    { key: "360",  label: "Video Low",       sub: "360p · MP4",  badge: "360p",  cls: "" },
  ];

  let added = false;
  for (const q of qualities) {
    if (downloads[q.key]) {
      dlGrid.appendChild(makeDlBtn(q.label, q.sub, downloads[q.key], q.badge, q.cls));
      added = true;
    }
  }
  if (downloads["mp3"])
    dlGrid.appendChild(makeDlBtn("Audio MP3", "Hanya audio · kualitas tinggi", downloads["mp3"], "MP3", "audio"));

  if (!added && !downloads["mp3"]) {
    dlGrid.innerHTML = `<p style="font-size:13px;color:var(--text3);padding:8px 0">Format tidak tersedia. Coba lagi.</p>`;
  }

  resultCard.classList.add("visible");
}

/* ── FETCH ── */
async function fetchVideo() {
  const url = urlInput.value.trim();
  if (!url) { showError("URL tidak boleh kosong. Paste link video dulu!"); return; }
  if (!url.startsWith("http")) { showError("URL tidak valid. Pastikan dimulai dengan https://"); return; }

  showLoading();
  grabBtn.disabled = true;

  try {
    const endpoint = currentPlatform === "tiktok"
      ? `/api/tiktok?url=${encodeURIComponent(url)}`
      : `/api/youtube?url=${encodeURIComponent(url)}`;

    const res  = await fetch(endpoint);
    const json = await res.json();

    if (!json.success) { showError(json.error || "Gagal memproses video. Coba lagi."); return; }

    hideAll();
    if (currentPlatform === "tiktok") renderTikTok(json.data);
    else renderYouTube(json.data);

    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    console.error(err);
    showError("Gagal terhubung ke server. Pastikan server berjalan di localhost:3000");
  } finally {
    grabBtn.disabled = false;
  }
}

grabBtn.addEventListener("click", fetchVideo);
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchVideo(); });

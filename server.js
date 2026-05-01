const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── TikTok Endpoint ────────────────────────────────────────────────────────
app.get("/api/tiktok", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  const tiktokRegex =
    /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i;
  if (!tiktokRegex.test(url)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid TikTok URL" });
  }

  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      return res
        .status(400)
        .json({ success: false, error: data.msg || "Failed to fetch video" });
    }

    const video = data.data;

    return res.json({
      success: true,
      platform: "tiktok",
      data: {
        id: video.id,
        title: video.title || "TikTok Video",
        cover: video.cover,
        duration: video.duration,
        author: {
          name: video.author?.nickname || "Unknown",
          avatar: video.author?.avatar,
          username: video.author?.unique_id,
        },
        stats: {
          plays: video.play_count,
          likes: video.digg_count,
          comments: video.comment_count,
          shares: video.share_count,
        },
        downloads: {
          no_watermark: video.play,
          no_watermark_hd: video.hdplay || video.play,
          watermark: video.wmplay,
          audio: video.music,
        },
      },
    });
  } catch (err) {
    console.error("[TikTok Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to process TikTok URL. Please try again.",
    });
  }
});

// ─── YouTube Endpoint ───────────────────────────────────────────────────────
app.get("/api/youtube", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  const youtubeRegex =
    /https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/i;
  if (!youtubeRegex.test(url)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid YouTube URL" });
  }

  try {
    // Step 1: Get crypto key from savetube
    const cryptoRes = await fetch("https://media.savetube.me/api/random-crypto", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://savetube.me/",
        Origin: "https://savetube.me",
      },
    });

    if (!cryptoRes.ok) throw new Error("Failed to get crypto key");
    const cryptoData = await cryptoRes.json();
    const key = cryptoData.data?.key;
    if (!key) throw new Error("No crypto key received");

    // Step 2: Fetch video info
    const infoRes = await fetch("https://media.savetube.me/api/info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://savetube.me/",
        Origin: "https://savetube.me",
      },
      body: JSON.stringify({ url, key }),
    });

    if (!infoRes.ok) throw new Error(`Info API responded ${infoRes.status}`);
    const infoData = await infoRes.json();

    if (!infoData.data) {
      return res.status(400).json({
        success: false,
        error: infoData.message || "Could not fetch YouTube video info",
      });
    }

    const info = infoData.data;

    // Step 3: Get download links for common qualities
    const qualities = ["1080", "720", "480", "360", "mp3"];
    const downloadLinks = {};

    for (const quality of qualities) {
      try {
        const dlRes = await fetch("https://media.savetube.me/api/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://savetube.me/",
            Origin: "https://savetube.me",
          },
          body: JSON.stringify({
            id: info.videoId || info.id,
            key,
            quality,
            downloadType: quality === "mp3" ? "audio" : "video",
          }),
        });

        if (dlRes.ok) {
          const dlData = await dlRes.json();
          if (dlData.data?.url || dlData.data?.downloadUrl) {
            downloadLinks[quality] = dlData.data.url || dlData.data.downloadUrl;
          }
        }
      } catch (_) {
        // Skip unavailable qualities
      }
    }

    return res.json({
      success: true,
      platform: "youtube",
      data: {
        id: info.videoId || info.id,
        title: info.title || "YouTube Video",
        thumbnail: info.thumbnail || `https://img.youtube.com/vi/${info.videoId || info.id}/maxresdefault.jpg`,
        duration: info.duration,
        channel: info.channel || info.author || "Unknown",
        downloads: downloadLinks,
      },
    });
  } catch (err) {
    console.error("[YouTube Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to process YouTube URL. Please try again.",
    });
  }
});

// ─── Root ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Video Downloader running at http://localhost:${PORT}\n`);
});

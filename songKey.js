// NAME: Song Key
// AUTHOR: you
// DESCRIPTION: Shows the musical key (and Camelot code / BPM) of the current song under the track info in the now-playing bar. Click the badge to switch between standard and Camelot notation.

(function songKey() {
  if (!(window.Spicetify && Spicetify.Player && Spicetify.Player.data !== undefined && Spicetify.CosmosAsync && Spicetify.URI)) {
    setTimeout(songKey, 300);
    return;
  }

  const NOTES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const CAMELOT_MAJOR = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
  const CAMELOT_MINOR = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];
  const PREF_KEY = "songKey:camelot";
  const cache = new Map();

  let useCamelot = false;
  try { useCamelot = localStorage.getItem(PREF_KEY) === "1"; } catch (_) {}

  // ---------- styles ----------
  const style = document.createElement("style");
  style.textContent = `
    .song-key-badge {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 4px; padding: 1px 8px; width: fit-content;
      border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 18px;
      color: var(--spice-text, #fff);
      background: rgba(var(--spice-rgb-text, 255,255,255), 0.1);
      cursor: pointer; user-select: none; white-space: nowrap;
    }
    .song-key-badge:hover { background: rgba(var(--spice-rgb-text, 255,255,255), 0.18); }
    .song-key-badge .song-key-bpm { opacity: 0.65; font-weight: 500; }
    .song-key-badge.song-key-loading { opacity: 0.5; }
  `;
  document.head.appendChild(style);

  // ---------- badge ----------
  const badge = document.createElement("div");
  badge.className = "song-key-badge";
  badge.addEventListener("click", () => {
    useCamelot = !useCamelot;
    try { localStorage.setItem(PREF_KEY, useCamelot ? "1" : "0"); } catch (_) {}
    render(currentInfo);
  });

  const TARGETS = [
    ".main-nowPlayingWidget-trackInfo",
    "[data-testid='now-playing-widget'] .main-trackInfo-container",
    ".main-nowPlayingBar-left .main-trackInfo-container",
    ".main-trackInfo-container",
  ];

  function attach() {
    if (badge.isConnected) return;
    for (const sel of TARGETS) {
      const el = document.querySelector(sel);
      if (el) { el.appendChild(badge); return; }
    }
  }
  // React re-renders can drop the badge; keep it attached.
  setInterval(attach, 1000);

  // ---------- data ----------
  function trackId(uri) {
    try {
      const parsed = Spicetify.URI.fromString(uri);
      return parsed.type === Spicetify.URI.Type.TRACK ? (parsed.id || parsed._base62Id) : null;
    } catch (_) { return null; }
  }

  function normalize(obj) {
    if (!obj || typeof obj.key !== "number") return null;
    return { key: obj.key, mode: obj.mode, tempo: obj.tempo };
  }

  async function fetchKey(uri) {
    if (cache.has(uri)) return cache.get(uri);
    const id = trackId(uri);
    if (!id) return null;

    const attempts = [
      // 1. Spicetify helper (internal audio analysis)
      async () => {
        if (!Spicetify.getAudioData) return null;
        const d = await Spicetify.getAudioData(uri);
        return normalize(d && d.track);
      },
      // 2. Web API audio-features with the client's own token
      async () => normalize(await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/audio-features/${id}`)),
      // 3. Internal spclient audio-attributes endpoint
      async () => {
        const d = await Spicetify.CosmosAsync.get(`https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/${id}?format=json`);
        return normalize(d && d.track);
      },
    ];

    for (const attempt of attempts) {
      try {
        const res = await attempt();
        if (res) { cache.set(uri, res); return res; }
      } catch (_) { /* try next source */ }
    }
    return null;
  }

  // ---------- render ----------
  let currentInfo = null;

  function render(info) {
    badge.classList.remove("song-key-loading");
    if (info === "loading") {
      badge.classList.add("song-key-loading");
      badge.textContent = "♪ …";
      badge.title = "Looking up key";
      return;
    }
    if (!info || info.key < 0) {
      badge.textContent = "♪ Key unknown";
      badge.title = "No key data for this track";
      return;
    }
    const minor = info.mode === 0;
    const standard = `${NOTES[info.key]} ${minor ? "minor" : "major"}`;
    const camelot = (minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[info.key];
    const label = useCamelot ? camelot : standard;
    const bpm = typeof info.tempo === "number" && info.tempo > 0 ? `${Math.round(info.tempo)} BPM` : "";

    badge.innerHTML = "";
    badge.append(`♪ ${label}`);
    if (bpm) {
      const span = document.createElement("span");
      span.className = "song-key-bpm";
      span.textContent = bpm;
      badge.append(span);
    }
    badge.title = `${standard} · Camelot ${camelot}${bpm ? " · " + bpm : ""}\nClick to toggle notation`;
  }

  let requestToken = 0;
  async function update() {
    attach();
    const uri = Spicetify.Player.data?.item?.uri || Spicetify.Player.data?.track?.uri;
    const token = ++requestToken;
    if (!uri || !trackId(uri)) {
      currentInfo = null;
      badge.style.display = "none";
      return;
    }
    badge.style.display = "";
    if (!cache.has(uri)) render("loading");
    const info = await fetchKey(uri);
    if (token !== requestToken) return; // song changed mid-fetch
    currentInfo = info;
    render(info);
  }

  Spicetify.Player.addEventListener("songchange", update);
  update();
})();

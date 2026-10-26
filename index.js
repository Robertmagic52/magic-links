const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Prevent Safari / browser caching
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

const DATA_FILE = path.join(__dirname, 'data.json');

const defaultData = {
  masterRedirect: 'https://gooqlc.com/111z',
  links: [
    { id: '1', title: 'Google', url: 'https://google.com' },
    { id: '2', title: 'Predict and Peek', url: 'https://www.icloud.com/shortcuts/' },
    { id: '3', title: 'Inject', url: 'https://example.com' },
    { id: '4', title: 'Contact Peek', url: 'https://example.com' }
  ]
};

function getPortalData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Migration: merge top & custom if legacy format exists
    if (!raw.links && (raw.top || raw.custom)) {
      raw.links = [...(raw.top || []), ...(raw.custom || [])];
      delete raw.top;
      delete raw.custom;
      delete raw.dividerTitle;
      fs.writeFileSync(DATA_FILE, JSON.stringify(raw, null, 2));
    }
    return raw;
  } catch (err) {
    return defaultData;
  }
}

function savePortalData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 1. Spectator Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Standalone Controller Web App (Mobile Optimized)
app.get('/app', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Portal Admin" />
  <title>Portal Control</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #000000;
      color: #f2f2f7;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      padding: env(safe-area-inset-top, 24px) 16px env(safe-area-inset-bottom, 32px);
      max-width: 480px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0 20px;
    }
    h1 { font-size: 24px; font-weight: 700; }
    .status-badge {
      font-size: 11px;
      background: #1c1c1e;
      padding: 6px 12px;
      border-radius: 20px;
      color: #30d158;
      font-weight: 600;
    }
    .section-label {
      font-size: 13px;
      color: #8e8e93;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 8px 4px;
      font-weight: 600;
    }
    .card {
      background-color: #1c1c1e;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 12px;
    }
    label {
      font-size: 12px;
      color: #8e8e93;
      display: block;
      margin-bottom: 4px;
    }
    input {
      width: 100%;
      background: #2c2c2e;
      border: 1px solid #3a3a3c;
      border-radius: 8px;
      color: #ffffff;
      padding: 12px;
      font-size: 15px;
      margin-bottom: 12px;
      outline: none;
    }
    input:focus { border-color: #0a84ff; }
    .btn-delete {
      background: #3a1515;
      color: #ff453a;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      float: right;
      cursor: pointer;
    }
    .btn-add {
      width: 100%;
      background: #1c1c1e;
      color: #0a84ff;
      border: 1px dashed #3a3a3c;
      border-radius: 14px;
      padding: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
    }
    .btn-save {
      position: sticky;
      bottom: calc(env(safe-area-inset-bottom, 16px) + 12px);
      width: 100%;
      background: #0a84ff;
      color: #fff;
      border: none;
      border-radius: 14px;
      padding: 16px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 24px;
      box-shadow: 0 4px 20px rgba(10, 132, 255, 0.4);
    }
    .btn-save:active { background: #0071e3; }
  </style>
</head>
<body>

  <header>
    <h1>Portal App</h1>
    <div class="status-badge" id="statusBadge">Live</div>
  </header>

  <div class="section-label">Master Decoy Redirect</div>
  <div class="card">
    <label>URL when spectator clicks off or taps back</label>
    <input type="text" id="masterRedirect" />
  </div>

  <div class="section-label">Active Portal Buttons</div>
  <div id="linksList"></div>

  <button class="btn-add" onclick="addLink()">+ Add New Button</button>
  <button class="btn-save" onclick="saveData()">Save All Updates</button>

  <script>
    let links = [];

    async function loadData() {
      const res = await fetch('/api/portal');
      const data = await res.json();
      document.getElementById('masterRedirect').value = data.masterRedirect || '';
      links = data.links || [];
      render();
    }

    function render() {
      const container = document.getElementById('linksList');
      container.innerHTML = '';
      links.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = \`
          <button class="btn-delete" onclick="removeLink(\${index})">Delete</button>
          <div style="font-size:11px; color:#636366; margin-bottom:6px;">BUTTON #\${index + 1}</div>
          <label>Title</label>
          <input type="text" value="\${item.title}" oninput="links[\${index}].title = this.value" />
          <label>Target URL</label>
          <input type="text" value="\${item.url}" oninput="links[\${index}].url = this.value" />
        \`;
        container.appendChild(div);
      });
    }

    function addLink() {
      links.push({ id: String(Date.now()).slice(-4), title: 'New Link', url: 'https://' });
      render();
    }

    function removeLink(index) {
      links.splice(index, 1);
      render();
    }

    async function saveData() {
      const payload = {
        masterRedirect: document.getElementById('masterRedirect').value.trim(),
        links: links
      };

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const badge = document.getElementById('statusBadge');
      if (res.ok) {
        badge.textContent = 'Saved!';
        badge.style.color = '#30d158';
        setTimeout(() => { badge.textContent = 'Live'; }, 2000);
      }
    }

    loadData();
  </script>
</body>
</html>`);
});

// 3. API Endpoints
app.get('/api/portal', (req, res) => {
  res.status(200).json({ success: true, ...getPortalData() });
});

app.post('/api/save', (req, res) => {
  const { masterRedirect, links } = req.body;
  const current = getPortalData();
  const updated = {
    masterRedirect: masterRedirect || current.masterRedirect,
    links: Array.isArray(links) ? links : current.links
  };
  savePortalData(updated);
  return res.status(200).json({ success: true, data: updated });
});

app.all('/api/set-redirect', (req, res) => {
  const newUrl = req.body?.url || req.query?.url;
  if (!newUrl) return res.status(400).json({ success: false, error: 'Missing url' });
  const data = getPortalData();
  data.masterRedirect = newUrl;
  savePortalData(data);
  return res.status(200).json({ success: true, masterRedirect: data.masterRedirect });
});

app.all('/api/update-link', (req, res) => {
  const id = req.body?.id || req.query?.id;
  const newTitle = req.body?.title || req.query?.title;
  const newUrl = req.body?.url || req.query?.url;
  if (!id) return res.status(400).json({ success: false, error: 'Missing id' });

  const data = getPortalData();
  const target = (data.links || []).find(item => item.id === String(id));
  if (!target) return res.status(404).json({ success: false, error: 'Not found' });

  if (newTitle) target.title = newTitle;
  if (newUrl) target.url = newUrl;
  savePortalData(data);
  return res.status(200).json({ success: true, updated: target });
});

app.all('/api/delete-link', (req, res) => {
  const id = req.body?.id || req.query?.id;
  if (!id) return res.status(400).json({ success: false, error: 'Missing id' });
  const data = getPortalData();
  data.links = (data.links || []).filter(item => item.id !== String(id));
  savePortalData(data);
  return res.status(200).json({ success: true, message: `Deleted ${id}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

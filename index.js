const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Disable all caching
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
    { id: '2', title: 'Predict and Peek', url: 'https://www.icloud.com/shortcuts/' }
  ]
};

function getPortalData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Auto-migrate legacy top/custom format to links
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

// 1. Spectator View
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Controller App
app.get('/app', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>Portal App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #000000;
      color: #f2f2f7;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      padding: 30px 16px 40px;
      max-width: 480px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; }
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
    label { font-size: 12px; color: #8e8e93; display: block; margin-bottom: 4px; }
    input {
      width: 100%;
      background: #2c2c2e;
      border: 1px solid #3a3a3c;
      border-radius: 8px;
      color: #ffffff;
      padding: 12px;
      font-size: 15px;
      margin-bottom: 10px;
      outline: none;
    }
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
    }
  </style>
</head>
<body>
  <h1>Portal Controller</h1>

  <div class="section-label">Master Decoy Redirect</div>
  <div class="card">
    <label>Redirect Target URL</label>
    <input type="text" id="masterRedirect" />
  </div>

  <div class="section-label">Buttons</div>
  <div id="linksList"></div>

  <button class="btn-add" type="button" onclick="addLink()">+ Add Button</button>
  <button class="btn-save" type="button" onclick="saveData()">Save All Changes</button>

  <script>
    let links = [];

    async function loadData() {
      try {
        const res = await fetch('/api/portal?t=' + Date.now());
        const data = await res.json();
        document.getElementById('masterRedirect').value = data.masterRedirect || '';
        links = data.links || [];
        render();
      } catch (err) {
        alert('Failed to load data: ' + err.message);
      }
    }

    function render() {
      const container = document.getElementById('linksList');
      container.innerHTML = '';
      links.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = \`
          <button class="btn-delete" type="button" onclick="removeLink(\${index})">Delete</button>
          <div style="font-size:11px; color:#636366; margin-bottom:6px;">BUTTON #\${index + 1}</div>
          <label>Title</label>
          <input type="text" class="link-title" value="\${item.title}" />
          <label>Target URL</label>
          <input type="text" class="link-url" value="\${item.url}" />
        \`;
        container.appendChild(div);
      });
    }

    function addLink() {
      syncInputs();
      links.push({ id: String(Date.now()).slice(-4), title: 'New Link', url: 'https://' });
      render();
    }

    function removeLink(index) {
      syncInputs();
      links.splice(index, 1);
      render();
    }

    function syncInputs() {
      const cards = document.querySelectorAll('#linksList .card');
      cards.forEach((card, i) => {
        if (links[i]) {
          links[i].title = card.querySelector('.link-title').value;
          links[i].url = card.querySelector('.link-url').value;
        }
      });
    }

    async function saveData() {
      syncInputs();
      const payload = {
        masterRedirect: document.getElementById('masterRedirect').value.trim(),
        links: links
      };

      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert('Saved! Portal is updated.');
        } else {
          alert('Save failed on server: ' + JSON.stringify(result));
        }
      } catch (err) {
        alert('Save failed to send: ' + err.message);
      }
    }

    loadData();
  </script>
</body>
</html>`);
});

// 3. API Routes (Handles both 'links' and legacy 'top'/'custom')
app.get('/api/portal', (req, res) => {
  res.status(200).json({ success: true, ...getPortalData() });
});

app.post('/api/save', (req, res) => {
  const { masterRedirect, links, top, custom } = req.body;
  const current = getPortalData();

  let mergedLinks = current.links || [];
  if (Array.isArray(links)) {
    mergedLinks = links;
  } else if (Array.isArray(top) || Array.isArray(custom)) {
    mergedLinks = [...(top || []), ...(custom || [])];
  }

  const updated = {
    masterRedirect: masterRedirect || current.masterRedirect,
    links: mergedLinks
  };

  savePortalData(updated);
  return res.status(200).json({ success: true, data: updated });
});

app.all('/api/set-redirect', (req, res) => {
  const newUrl = req.body?.url || req.query?.url;
  if (!newUrl) return res.status(400).json({ success: false, error: 'Missing url' });
  const data = getPortalData();

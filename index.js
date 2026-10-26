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
  dividerTitle: 'CUSTOM LINKS',
  top: [
    { id: '1', title: 'Google', url: 'https://google.com' },
    { id: '2', title: 'Predict and Peek', url: 'https://www.icloud.com/shortcuts/' }
  ],
  custom: [
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
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return defaultData;
  }
}

function savePortalData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 1. Spectator Route (Serves index.html from root)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Admin Dashboard (Inlined directly so no extra file is needed)
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Portal Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #121212; color: #e0e0e0; font-family: -apple-system, sans-serif; padding: 24px 16px; max-width: 600px; margin: 0 auto; }
    h2 { margin-bottom: 20px; font-size: 20px; color: #fff; }
    h3 { margin: 18px 0 10px; font-size: 14px; text-transform: uppercase; color: #888; }
    label { font-size: 12px; color: #aaa; display: block; margin-bottom: 4px; }
    input { width: 100%; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; color: #fff; padding: 10px 12px; margin-bottom: 12px; font-size: 14px; }
    .link-row { background: #181818; border: 1px solid #282828; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    button { cursor: pointer; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; font-size: 13px; }
    .btn-add { background: #242424; color: #fff; border: 1px solid #3a3a3a; width: 100%; margin-bottom: 16px; }
    .btn-delete { background: #3a1515; color: #ff6b6b; padding: 6px 12px; font-size: 11px; float: right; }
    .btn-save { background: #0070f3; color: #fff; width: 100%; padding: 14px; font-size: 16px; margin-top: 24px; position: sticky; bottom: 16px; }
    #status { text-align: center; font-size: 13px; margin-top: 10px; height: 18px; color: #4ade80; }
  </style>
</head>
<body>
  <h2>Portal Link Manager</h2>
  <label>Screen Tap / Click-off Redirect URL</label>
  <input type="text" id="masterRedirect" />
  <label>Divider Title</label>
  <input type="text" id="dividerTitle" />
  <h3>Top Section Links</h3>
  <div id="topList"></div>
  <button class="btn-add" onclick="addLink('top')">+ Add Top Link</button>
  <h3>Custom Section Links</h3>
  <div id="customList"></div>
  <button class="btn-add" onclick="addLink('custom')">+ Add Custom Link</button>
  <button class="btn-save" onclick="saveData()">Save All Changes</button>
  <div id="status"></div>
  <script>
    let currentData = { top: [], custom: [] };
    async function loadData() {
      const res = await fetch('/api/portal');
      const data = await res.json();
      currentData = data;
      document.getElementById('masterRedirect').value = data.masterRedirect || '';
      document.getElementById('dividerTitle').value = data.dividerTitle || '';
      renderList('topList', data.top, 'top');
      renderList('customList', data.custom, 'custom');
    }
    function renderList(containerId, items, section) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      (items || []).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'link-row';
        div.innerHTML = \`
          <button class="btn-delete" onclick="removeLink('\${section}', \${index})">Delete</button>
          <div style="font-size:11px; color:#666; margin-bottom:6px;">ID: \${item.id}</div>
          <label>Button Name</label>
          <input type="text" value="\${item.title}" oninput="updateItem('\${section}', \${index}, 'title', this.value)" />
          <label>Target URL</label>
          <input type="text" value="\${item.url}" oninput="updateItem('\${section}', \${index}, 'url', this.value)" />
        \`;
        container.appendChild(div);
      });
    }
    function updateItem(section, index, key, value) { currentData[section][index][key] = value; }
    function removeLink(section, index) {
      currentData[section].splice(index, 1);
      renderList(section === 'top' ? 'topList' : 'customList', currentData[section], section);
    }
    function addLink(section) {
      const newId = String(Date.now()).slice(-4);
      currentData[section].push({ id: newId, title: 'New Link', url: 'https://' });
      renderList(section === 'top' ? 'topList' : 'customList', currentData[section], section);
    }
    async function saveData() {
      const payload = {
        masterRedirect: document.getElementById('masterRedirect').value.trim(),
        dividerTitle: document.getElementById('dividerTitle').value.trim(),
        top: currentData.top,
        custom: currentData.custom
      };
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      const status = document.getElementById('status');
      if (result.success) {
        status.textContent = 'Saved successfully!';
        setTimeout(() => { status.textContent = ''; }, 2500);
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
  const { masterRedirect, dividerTitle, top, custom } = req.body;
  const current = getPortalData();
  const updated = {
    masterRedirect: masterRedirect || current.masterRedirect,
    dividerTitle: dividerTitle !== undefined ? dividerTitle : current.dividerTitle,
    top: Array.isArray(top) ? top : current.top,
    custom: Array.isArray(custom) ? custom : current.custom
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
  const target = [...data.top, ...data.custom].find(item => item.id === String(id));
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
  data.top = data.top.filter(item => item.id !== String(id));
  data.custom = data.custom.filter(item => item.id !== String(id));
  savePortalData(data);
  return res.status(200).json({ success: true, message: `Deleted ${id}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

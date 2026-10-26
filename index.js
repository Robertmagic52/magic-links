const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Initial template if data.json doesn't exist yet
const defaultData = {
  masterRedirect: 'https://www.apple.com',
  dividerTitle: 'CUSTOM LINKS',
  top: [
    { id: '1', title: 'Peek', url: 'https://www.icloud.com/shortcuts/' },
    { id: '2', title: 'Predict and Peek', url: 'https://www.icloud.com/shortcuts/' }
  ],
  custom: [
    { id: '3', title: 'Inject', url: 'https://example.com' },
    { id: '4', title: 'Contact Peek', url: 'https://example.com' }
  ]
};

// Helper: Read saved data
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

// Helper: Save data permanently
function savePortalData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Spectator Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Settings Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// API: Get current config
app.get('/api/portal', (req, res) => {
  res.status(200).json({ success: true, ...getPortalData() });
});

// API: Save entire configuration from the Admin Panel
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

// API: Fast single-link update (for Apple Shortcuts)
app.all('/api/update-link', (req, res) => {
  const id = req.body?.id || req.query?.id;
  const newTitle = req.body?.title || req.query?.title;
  const newUrl = req.body?.url || req.query?.url;

  const data = getPortalData();
  const target = [...data.top, ...data.custom].find(item => item.id === String(id));

  if (!target) {
    return res.status(404).json({ success: false, error: 'Link ID not found' });
  }

  if (newTitle) target.title = newTitle;
  if (newUrl) target.url = newUrl;

  savePortalData(data);
  return res.status(200).json({ success: true, updated: target });
});

// API: Fast master redirect update (for Apple Shortcuts)
app.all('/api/set-redirect', (req, res) => {
  const newUrl = req.body?.url || req.query?.url;
  if (!newUrl) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  const data = getPortalData();
  data.masterRedirect = newUrl;
  savePortalData(data);

  return res.status(200).json({ success: true, masterRedirect: data.masterRedirect });
});

app.get('/go', (req, res) => {
  const data = getPortalData();
  res.redirect(302, data.masterRedirect);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

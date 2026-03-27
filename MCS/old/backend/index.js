const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Create a file path (safe, cross-platform)
const dataFilePath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
// Root route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// READ file (fs.readFileSync)
app.get('/read', (req, res) => {
  try {
    // If file doesn't exist, create it first
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, 'Initial content\n');
    }

    
    res.send(data);
  } catch (err) {
    res.status(500).send('Error reading file');
  }
});

// WRITE file (fs.writeFileSync)
app.post('/write', (req, res) => {
  try {
    const content = req.body.content || 'Default content\n';

    fs.writeFileSync(dataFilePath, content + '\n');
    res.send('File written successfully');
  } catch (err) {
    res.status(500).send('Error writing file');
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
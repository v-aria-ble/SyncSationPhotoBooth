const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' }); // For temporary file storage

// Endpoint to capture and forward image
app.post('/capture-image', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));

    // Forward image to Flask for processing
    const flaskResponse = await fetch('http://localhost:5000/process-image', {
      method: 'POST',
      body: formData,
    });

    // Check if Flask responded successfully
    if (!flaskResponse.ok) {
      throw new Error(`Flask server error: ${flaskResponse.statusText}`);
    }

    // Send Flask's response (processed image) back to the frontend
    const buffer = await flaskResponse.buffer();
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing image');
  } finally {
    // Cleanup the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  }
});

app.listen(3000, () => {
  console.log('Node.js server running on http://localhost:3000');
});

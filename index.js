const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const app = express();
const port = 3000;

app.use(express.json());

// Configure multer for image uploads
console.log('Configuring multer storage...');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (req.path.includes('/site-content/')) {
      uploadPath = path.join(__dirname, 'website/img');
    } else {
      uploadPath = path.join(__dirname, 'website/img/units');
    }
    console.log('Upload destination:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    let filename;
    
    if (req.path.includes('/site-content/')) {
      // For site content images, use specific names
      const imageType = req.path.split('/').pop(); // hero, about1, about2
      filename = `${imageType}${ext}`;
    } else {
      // For unit images, use existing naming
      const timestamp = req.path.includes('gallery') ? `-${Date.now()}` : '';
      filename = `${req.params.name}${timestamp}${ext}`;
    }
    
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Received file:', file);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('File accepted - is an allowed image type');
      cb(null, true);
    } else {
      console.log('File rejected - not an allowed image type');
      cb(new Error('Only JPG, PNG, and WebP files are allowed'));
    }
  }
});


// Debug endpoint to check database state
app.get('/debug/db-state', (req, res) => {
  console.log('GET /debug/db-state - Checking database state');
  
  // Get table schemas
  db.all(`SELECT sql FROM sqlite_master WHERE type='table'`, (err, schemas) => {
    if (err) {
      console.error('Error getting schemas:', err);
      return res.status(500).json({ error: err.message });
    }

    // Get units data
    db.all(`SELECT * FROM units`, (err, units) => {
      if (err) {
        console.error('Error getting units:', err);
        return res.status(500).json({ error: err.message });
      }

      // Get gallery photos
      db.all(`SELECT * FROM gallery_photos`, (err, photos) => {
        if (err) {
          console.error('Error getting gallery photos:', err);
          return res.status(500).json({ error: err.message });
        }

        res.json({
          schemas: schemas,
          units: units,
          gallery_photos: photos
        });
      });
    });
  });
});

// API endpoints

// Get all units with their information and gallery photos
app.get('/units', (req, res) => {
  console.log('GET /units - Fetching all units');
  db.all(`
    SELECT u.*, 
           json_group_array(
             json_object(
               'id', gp.id,
               'photo_path', gp.photo_path
             )
           ) as gallery_photos
    FROM units u
    LEFT JOIN gallery_photos gp ON u.name = gp.unit_name
    GROUP BY u.name
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching units:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    // Parse the gallery_photos JSON string for each unit
    rows = rows.map(row => ({
      ...row,
      gallery_photos: JSON.parse(row.gallery_photos).filter(photo => photo.id !== null)
    }));
    
    console.log('Units fetched:', rows);
    res.json(rows);
  });
});

// Update unit information
app.put('/units/:name', (req, res) => {
  console.log('PUT /units/:name - Updating unit:', req.params.name);
  console.log('Request body:', req.body);
  
  const { name } = req.params;
  const { description, daily_rate, weekly_rate, monthly_rate } = req.body;
  
  if (!description || !daily_rate || !weekly_rate || !monthly_rate) {
    console.error('Missing parameters in request');
    return res.status(400).json({ error: 'Missing parameters' });
  }

  db.run(
    `UPDATE units 
     SET description = ?, daily_rate = ?, weekly_rate = ?, monthly_rate = ?
     WHERE name = ?`,
    [description, daily_rate, weekly_rate, monthly_rate, name],
    function(err) {
      if (err) {
        console.error('Error updating unit:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        console.error('Unit not found:', name);
        return res.status(404).json({ error: 'Unit not found' });
      }
      console.log('Unit updated successfully:', name);
      res.json({ message: 'Unit information updated successfully' });
    }
  );
});

// Upload primary photo for a unit
app.post('/units/:name/photo', upload.single('photo'), (req, res) => {
  console.log('POST /units/:name/photo - Uploading photo for unit:', req.params.name);
  const { name } = req.params;
  
  if (!req.file) {
    console.error('No file uploaded for unit:', name);
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File uploaded:', req.file);
  const photoPath = `/img/units/${req.file.filename}`;
  console.log('Photo path to store:', photoPath);
  
  db.run(
    `UPDATE units SET primary_photo = ? WHERE name = ?`,
    [photoPath, name],
    function(err) {
      if (err) {
        console.error('Error updating primary photo:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        console.error('Unit not found for photo update:', name);
        return res.status(404).json({ error: 'Unit not found' });
      }
      console.log('Primary photo updated successfully for unit:', name);
      res.json({ 
        message: 'Primary photo updated successfully',
        path: photoPath
      });
    }
  );
});

// Upload gallery photo for a unit
app.post('/units/:name/gallery', upload.single('photo'), (req, res) => {
  console.log('POST /units/:name/gallery - Uploading gallery photo for unit:', req.params.name);
  const { name } = req.params;
  
  if (!req.file) {
    console.error('No file uploaded for unit gallery:', name);
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File uploaded:', req.file);
  const photoPath = `/img/units/${req.file.filename}`;
  console.log('Photo path to store:', photoPath);
  
  db.run(
    `INSERT INTO gallery_photos (unit_name, photo_path) VALUES (?, ?)`,
    [name, photoPath],
    function(err) {
      if (err) {
        console.error('Error adding gallery photo:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Gallery photo added successfully for unit:', name);
      res.json({ 
        message: 'Gallery photo added successfully',
        id: this.lastID,
        path: photoPath
      });
    }
  );
});

// Delete gallery photo
app.delete('/units/:name/gallery/:photoId', (req, res) => {
  console.log('DELETE /units/:name/gallery/:photoId - Deleting gallery photo');
  const { name, photoId } = req.params;
  
  db.run(
    `DELETE FROM gallery_photos WHERE id = ? AND unit_name = ?`,
    [photoId, name],
    function(err) {
      if (err) {
        console.error('Error deleting gallery photo:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        console.error('Gallery photo not found:', photoId);
        return res.status(404).json({ error: 'Gallery photo not found' });
      }
      console.log('Gallery photo deleted successfully');
      res.json({ message: 'Gallery photo deleted successfully' });
    }
  );
});

// Get gallery photos for a unit
app.get('/units/:name/gallery', (req, res) => {
  console.log('GET /units/:name/gallery - Fetching gallery photos for unit:', req.params.name);
  const { name } = req.params;
  
  db.all(
    `SELECT * FROM gallery_photos WHERE unit_name = ?`,
    [name],
    (err, rows) => {
      if (err) {
        console.error('Error fetching gallery photos:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Gallery photos fetched:', rows);
      res.json(rows);
    }
  );
});

// Check availability - now considers both pending and approved bookings
app.get('/availability', (req, res) => {
  console.log('GET /availability - Checking availability');
  console.log('Query params:', req.query);
  
  const { unit, start_time, end_time } = req.query;
  if (!unit || !start_time || !end_time) {
    console.error('Missing parameters in availability check');
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  // Check for any overlapping bookings (both pending and approved)
  db.all(
    `SELECT * FROM reservations 
     WHERE unit = ? 
     AND status IN ('pending', 'approved')
     AND (
       (start_time <= ? AND end_time > ?) OR  -- Existing booking overlaps with start
       (start_time < ? AND end_time >= ?) OR  -- Existing booking overlaps with end
       (start_time >= ? AND end_time <= ?)    -- New booking completely contains existing
     )`,
    [unit, end_time, start_time, end_time, start_time, start_time, end_time],
    (err, rows) => {
      if (err) {
        console.error('Error checking availability:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Availability check result:', { available: rows.length === 0 });
      res.json({ available: rows.length === 0 });
    }
  );
});

// Create reservation - now checks availability before creating
app.post('/reservations', (req, res) => {
  console.log('POST /reservations - Creating new reservation');
  console.log('Request body:', req.body);
  
  const { unit, start_time, end_time, name, email, phone, group_size, notes } = req.body;
  if (!unit || !start_time || !end_time) {
    console.error('Missing parameters in reservation creation');
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // First check if dates are available
  db.all(
    `SELECT * FROM reservations 
     WHERE unit = ? 
     AND status IN ('pending', 'approved')
     AND (
       (start_time <= ? AND end_time > ?) OR
       (start_time < ? AND end_time >= ?) OR
       (start_time >= ? AND end_time <= ?)
     )`,
    [unit, end_time, start_time, end_time, start_time, start_time, end_time],
    (err, rows) => {
      if (err) {
        console.error('Error checking availability for new reservation:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (rows.length > 0) {
        console.log('Dates not available for reservation');
        return res.status(400).json({ error: 'Selected dates are not available' });
      }

      // If available, create the reservation
      console.log('Dates available, creating reservation');
      db.run(
        `INSERT INTO reservations (unit, start_time, end_time, name, email, phone, group_size, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [unit, start_time, end_time, name, email, phone, group_size, notes],
        function (err) {
          if (err) {
            console.error('Error creating reservation:', err.message);
            return res.status(500).json({ error: err.message });
          }
          console.log('Reservation created successfully, ID:', this.lastID);
          res.json({ id: this.lastID, message: 'Reservation created' });
        }
      );
    }
  );
});

// Update reservation
app.put('/reservations/:id', (req, res) => {
  console.log('PUT /reservations/:id - Updating reservation:', req.params.id);
  console.log('Request body:', req.body);
  
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    console.error('Missing status parameter');
    return res.status(400).json({ error: 'Missing parameters' });
  }
  db.run(
    `UPDATE reservations SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) {
        console.error('Error updating reservation:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Reservation updated successfully');
      res.json({ message: 'Reservation updated', changes: this.changes });
    }
  );
});

// Delete reservation
app.delete('/reservations/:id', (req, res) => {
  console.log('DELETE /reservations/:id - Deleting reservation:', req.params.id);
  const { id } = req.params;
  db.run(`DELETE FROM reservations WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Error deleting reservation:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Reservation deleted successfully');
    res.json({ message: 'Reservation deleted', changes: this.changes });
  });
});

// Get all reservations
app.get('/reservations', (req, res) => {
  console.log('GET /reservations - Fetching all reservations');
  db.all(`SELECT * FROM reservations`, (err, rows) => {
    if (err) {
      console.error('Error fetching reservations:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Reservations fetched:', rows.length);
    res.json(rows);
  });
});

// Get site content
app.get('/site-content', (req, res) => {
  console.log('GET /site-content - Fetching site content');
  db.get('SELECT * FROM site_content WHERE id = 1', (err, row) => {
    if (err) {
      console.error('Error fetching site content:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Site content fetched:', row);
    // Return empty object if no row found to prevent null response
    res.json(row || {
      id: 1,
      hero_image: null,
      about_text: '',
      about_image1: null,
      about_image2: null
    });
  });
});

// Update site content text
app.put('/site-content', (req, res) => {
  console.log('PUT /site-content - Updating site content');
  const { about_text } = req.body;
  
  if (!about_text) {
    console.error('Missing about_text parameter');
    return res.status(400).json({ error: 'Missing about_text parameter' });
  }

  db.run(
    'UPDATE site_content SET about_text = ? WHERE id = 1',
    [about_text],
    function(err) {
      if (err) {
        console.error('Error updating site content:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Site content updated successfully');
      res.json({ message: 'Site content updated successfully' });
    }
  );
});

// Upload site content images
app.post('/site-content/:type', upload.single('image'), (req, res) => {
  console.log('POST /site-content/:type - Uploading site content image');
  const { type } = req.params;
  
  if (!['hero', 'about1', 'about2'].includes(type)) {
    console.error('Invalid image type:', type);
    return res.status(400).json({ error: 'Invalid image type' });
  }

  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const photoPath = `/img/${req.file.filename}`;
  console.log('Photo path to store:', photoPath);

  // Map the type parameter to database column
  const columnMap = {
    'hero': 'hero_image',
    'about1': 'about_image1',
    'about2': 'about_image2'
  };

  db.run(
    `UPDATE site_content SET ${columnMap[type]} = ? WHERE id = 1`,
    [photoPath],
    function(err) {
      if (err) {
        console.error('Error updating site content image:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Site content image updated successfully');
      res.json({
        message: 'Site content image updated successfully',
        path: photoPath
      });
    }
  );
});

// Serve the main page
app.use('/', express.static(path.join(__dirname, 'website')));

// Serve the back office page
app.use('/backoffice', express.static(path.join(__dirname, 'backoffice')));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
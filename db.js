const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./reservations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    throw err;
  }
  console.log('Connected to the reservations database.');
  
  // Create tables if they don't exist
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        name TEXT,
        email TEXT,
        phone TEXT,
        group_size INTEGER,
        notes TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reservations table:', err.message);
        throw err;
      }
      console.log('Reservations table created or already exists.');
    });

    // Create the units table with primary_photo column
    db.run(`
      CREATE TABLE IF NOT EXISTS units (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        daily_rate DECIMAL(10,2) NOT NULL,
        weekly_rate DECIMAL(10,2) NOT NULL,
        monthly_rate DECIMAL(10,2) NOT NULL,
        primary_photo TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating units table:', err.message);
        throw err;
      }
      console.log('Units table created with primary_photo column');

      // Create gallery_photos table
      db.run(`
        CREATE TABLE IF NOT EXISTS gallery_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unit_name TEXT NOT NULL,
          photo_path TEXT NOT NULL,
          FOREIGN KEY (unit_name) REFERENCES units(name)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating gallery_photos table:', err.message);
          throw err;
        }
        console.log('Gallery photos table created');
      });

      // Insert default unit information
      db.run(`
        INSERT INTO units (name, description, daily_rate, weekly_rate, monthly_rate)
        VALUES (
          'Casa Frida',
          'Spacious 1 bedroom apartment with a terrace overlooking the garden.',
          900.00,
          5000.00,
          18000.00
        )
      `, (err) => {
        if (err) console.error('Error inserting Casa Frida:', err.message);
        else console.log('Inserted Casa Frida data');
      });

      db.run(`
        INSERT INTO units (name, description, daily_rate, weekly_rate, monthly_rate)
        VALUES (
          'La Casita',
          'Cozy 1 bedroom loft with a sunny terrace and spacious kitchen.',
          700.00,
          4000.00,
          15000.00
        )
      `, (err) => {
        if (err) console.error('Error inserting La Casita:', err.message);
        else console.log('Inserted La Casita data');
      });

      // Create site_content table
      db.run(`
        CREATE TABLE IF NOT EXISTS site_content (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          hero_image TEXT,
          about_text TEXT,
          about_image1 TEXT,
          about_image2 TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating site_content table:', err.message);
          throw err;
        }
        console.log('Site content table created');

        // Insert default content
        db.run(`
          INSERT INTO site_content (id, hero_image, about_text, about_image1, about_image2)
          VALUES (
            1,
            '/img/hero.webp',
            'Welcome to Casa Blues, your home away from home in the heart of Mexico City.',
            '/img/garden.webp',
            NULL
          )
        `, (err) => {
          if (err) console.error('Error inserting default site content:', err.message);
          else console.log('Inserted default site content');
        });
      });
    });
  });
});

module.exports = db;
#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to the SQLite database
const db = new sqlite3.Database('./reservations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to the reservations database.');
});

// Prompt for confirmation
rl.question('WARNING: This will permanently delete all booking records. Are you sure? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    // Clear the reservations table
    db.run('DELETE FROM reservations', (err) => {
      if (err) {
        console.error('Error clearing reservations:', err.message);
        process.exit(1);
      }
      console.log('Successfully cleared all booking records.');
      
      // Reset the autoincrement counter
      db.run('DELETE FROM sqlite_sequence WHERE name = "reservations"', (err) => {
        if (err) {
          console.error('Error resetting autoincrement:', err.message);
        } else {
          console.log('Reset reservation ID counter.');
        }
        
        // Close database connection and readline interface
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          }
          rl.close();
        });
      });
    });
  } else {
    console.log('Operation cancelled.');
    rl.close();
    db.close();
  }
});
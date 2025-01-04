# Casa Blues App

A reservation and chat system for Casa Blues.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/samrahimi/casa-blues-app.git
cd casa-blues-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure API keys:
   - Copy `config.sample.js` to `config.js`
   - Add your OpenAI API key to `config.js`

4. Start the server:
```bash
npm start
```

## Features

- Reservation system for multiple units
- Chat interface with AI assistance
- Backoffice management portal
- Image management for units

## Project Structure

- `/website` - Frontend website and chat interface
- `/backoffice` - Admin management interface
- `/db.js` - Database operations
- `/index.js` - Main server file
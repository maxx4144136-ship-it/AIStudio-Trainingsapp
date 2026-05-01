import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as GarminLib from 'garmin-connect';
const GarminConnect = GarminLib.GarminConnect || (GarminLib as any).default?.GarminConnect;
import cors from 'cors';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.post('/api/garmin/sync', async (req, res) => {
    let { username, password, dates } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    username = username.trim();
    password = password.trim();

    try {
      const GCClient = new GarminConnect({ username, password });
      await GCClient.login();

      let targetDates = [];
      if (Array.isArray(dates) && dates.length > 0) {
          targetDates = dates;
      } else {
          // Default to today
          const todayIso = new Date().toISOString().split('T')[0];
          targetDates = [todayIso];
      }

      // Limit to max 5 days to prevent timeout/rate limit (Garmin throws 429 easily)
      targetDates = targetDates.slice(0, 5);

      const results: any = {};
      
      for (const dateStr of targetDates) {
          try {
              const d = new Date(dateStr);
              const steps = await GCClient.getSteps(d);
              let weight = null;
              try {
                 weight = await GCClient.getDailyWeightData(d); 
              } catch (e) {
                  // Ignore weight error
              }
              results[dateStr] = { steps, weight };
              
              // Sleep 1.5s to avoid 429 Too Many Requests
              await new Promise(r => setTimeout(r, 1500));
          } catch(err: any) {
              console.error(`Error fetching garmin for date ${dateStr}`, err);
              if (err?.response?.status === 429 || err?.message?.includes('429')) {
                  throw new Error('Garmin hat die Anfragen blockiert (429 Too Many Requests). Bitte warte ein paar Minuten.');
              }
          }
      }

      const activities = await GCClient.getActivities(0, 5);
      
      res.json({
        success: true,
        data: results,
        activities
      });

    } catch (error: any) {
      console.error('Garmin Sync Error', error);
      
      let errMsg = error.message || 'Unbekannter Fehler';
      if (error.response?.data) {
        let details = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (details.includes('exact pattern')) {
          errMsg = 'E-Mail Adresse prüfen: Format falsch. (Oder Garmin erfordert Bestätigung).';
        } else if (details.includes('Invalid credentials') || error.response.status === 401 || error.response.status === 403) {
           errMsg = 'Falsche E-Mail oder falsches Passwort.';
        } else {
           errMsg += " | Details: " + details;
        }
      } else if (errMsg.includes('exact pattern')) {
        errMsg = 'E-Mail Adresse prüfen: Format falsch.';
      }
      
      res.status(500).json({ error: errMsg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import * as functions from "firebase-functions";
import cors = require("cors");

const corsHandler = cors({origin: true});

// Dit is jouw eigen razendsnelle proxy-server in TypeScript!
export const wbscProxy = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // In TypeScript moeten we expliciet aangeven dat de URL een string is
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
      res.status(400).send("Geen URL opgegeven");
      return;
    }

    try {
      // Haal de HTML direct op bij de bond, maar doe alsof we een échte webbrowser zijn!
      // Dit voorkomt dat de website van de bond ons blokkeert als 'robot'.
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      // Als de bond toch een foutcode geeft, laat het ons dan weten
      if (!response.ok) {
        res.status(response.status).send(`WBSC server gaf foutcode: ${response.status}`);
        return;
      }

      const html = await response.text();
      res.status(200).send(html);
    } catch (error) {
      console.error("Fout bij ophalen WBSC data:", error);
      res.status(500).send("Kon de data niet ophalen");
    }
  });
});
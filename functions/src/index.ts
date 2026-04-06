import * as functions from "firebase-functions";
import * as corsLib from "cors";

const cors = corsLib({ origin: true });

// Dit is jouw eigen razendsnelle proxy-server in TypeScript!
export const wbscProxy = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // In TypeScript moeten we expliciet aangeven dat de URL een string is
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
      res.status(400).send("Geen URL opgegeven");
      return;
    }

    try {
      // Haal de HTML direct op bij de bond
      const response = await fetch(targetUrl);
      const html = await response.text();
      res.status(200).send(html);
    } catch (error) {
      console.error("Fout bij ophalen WBSC data:", error);
      res.status(500).send("Kon de data niet ophalen");
    }
  });
});
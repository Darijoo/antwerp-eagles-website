const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

// Dit is jouw eigen razendsnelle proxy-server!
exports.wbscProxy = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).send("Geen URL opgegeven");
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
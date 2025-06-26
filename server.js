const express = require("express");
const axios = require("axios");
const app = express();
const path = require("path");

// Serve static files from the Angular build output directory
app.use(express.static(path.join(__dirname, "/dist/spectra-frontend/browser")));

// Specific API/proxy routes should come BEFORE the wildcard SPA route

// Status endpoint
app.get("/status", function (req, res) {
  res.json({ status: "UP" });
});

// Proxy endpoint for images
app.get("/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send("Missing url query parameter");
  }

  try {
    const response = await axios({
      method: "get",
      url: imageUrl,
      responseType: "stream",
    });

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error in /proxy-image for ${imageUrl}:`, error);
    res.status(500).send("Proxy encountered an error");
  }
});

// Wildcard route for the Angular SPA - This MUST be AFTER specific API routes
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "/dist/spectra-frontend/browser/index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

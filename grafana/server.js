import express from "express";

const app = express();

app.use(express.json())

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});

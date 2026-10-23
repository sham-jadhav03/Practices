import express from "express";
const app = express();

app.get("/", (req, res) => {
  const data = [
    { id: 1, name: "Bob" },
    { id: 2, name: "alice" },
  ];

  res.status(200).json({
    data,
    message: "Server is runing.",
  });
});

export default app;
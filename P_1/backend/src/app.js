import express from "express";
import authROuter from "./routes/auth.routes.js";
const app = express();

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.use("/api/auth", authROuter);

export default app;
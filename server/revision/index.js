import express from "express";

const app = express()

const checkName = (req, res, next) => {
    const name = req.query.name;
    if(!name) return res.status(400).send("name is required")
    next();
}

app.use((req, res, next) => {
    console.log(`${req.method}${req.url}`);
    next()
})

app.get("/hello", checkName, (req, res) => {
    res.send(`HELLO ${req.query.name}`);
})

app.get("/", (req, res) => {
    res.send("hello world")
})

app.listen(4000, () => {
    console.log("Server is running on port 4000");
})
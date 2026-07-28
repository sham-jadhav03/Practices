import express, { Request, Response } from "express";
import cors from "cors"
import morgan from "morgan";

const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(morgan("dev"))
app.use(cors())

app.get("/", async(req: Request, res: Response): Promise<any> =>{
    const {owner, repo, branch} = req.query;

    if(!owner || !repo || !branch){
        return res.status(400).json({message:"Missing required parameters"});
    }

    
    
})

export default app;
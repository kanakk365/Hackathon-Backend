import express, { Request, Response } from 'express';
import multer from "multer"
import csvParser from "csv-parser";
import fs from "fs"
import cors from "cors"
import { connectToDatabase } from "./db";
import { Db, Collection } from "@datastax/astra-db-ts";
import uploadRouter from './routes/upload';
import queryRouter from './routes/query';



const app = express()


const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use("/api/v1/upload" , uploadRouter )
app.use("/api/v1/search" , queryRouter )


const main = async ()=>{
    await connectToDatabase()
    app.listen(PORT ,()=>{
        console.log(`Server is running on ${PORT} at http://localhost:3000`)
    })
}

main()

export default app
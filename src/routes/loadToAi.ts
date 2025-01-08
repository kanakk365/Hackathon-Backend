import { connectToDatabase } from "../db";
import { Db, Collection } from "@datastax/astra-db-ts";
import fs from "fs";
import express, { Request, Response } from "express";


const loadRouter = express.Router();


const run = async ()=> {
  const database = connectToDatabase();
  const collection = database.collection("post");

  const allPostsCursor = await collection.find({});
  const allPosts = await allPostsCursor.toArray();
  // console.log(allPostsCursor)
  // console.log(allPosts)
  return { allPosts}
  
};

loadRouter.post("/ai", async (req: Request, res: Response): Promise<any> => {
    console.log("i")
    const data = await run()
  
  
    if (!data) {
      return res.status(400).send("Invalid or missing query parameter.");
    }
  
   
    async function initiateFlowRun(value: any): Promise<any> {
      const url =
        "https://api.langflow.astra.datastax.com/lf/ccf6615b-7615-419c-8f3c-d4d14fe37c89/api/v1/run/b85ae7f4-4897-4669-8708-9c4e7b56192c?stream=false";
  
      const headers = {
        "Content-Type": "application/json",
        Authorization:
          "Bearer AstraCS:ANqtFSyLsgeRgdSmmEueoJiM:c652af616bbfdcd6adad6d3f1afbe3c5f4feaefcc2eeada6367fd974fa8f4c6b",
      };
  
      const body = {
        input_value: value,
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-2dFP4": {},
          "Prompt-sSYWc": {},
          "ChatOutput-42H9e": {},
          "GoogleGenerativeAIModel-HzlwC": {},
        },
      };
  
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
  
        if (!response.ok) {
          console.error(`Langflow API error: ${response.status} - ${response.statusText}`);
          return null;
        }
  
        const data = await response.json();
        const message = data.outputs?.[0]?.outputs?.[0]?.artifacts?.message;
  
        if (!message) {
          console.error("No message returned from Langflow API.");
          return null;
        }
  
        return message;
      } catch (error) {
        console.error("Error initiating Langflow API flow run:", error);
        return null;
      }
    }
  
  
    try {
        const finalData = JSON.stringify(data)
      const result = await initiateFlowRun(finalData);
  
      if (!result) {
        return res.status(500).send("Failed to process query through Langflow API.");
      }
  
      return res.status(200).json({ message: result });
    } catch (error) {
      console.error("Error in query route:", error);
      return res.status(500).send("An error occurred while processing the query.");
    }
  })

  export default loadRouter

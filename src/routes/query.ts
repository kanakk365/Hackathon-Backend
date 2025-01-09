import express, { Request, Response } from "express";
import { connectToDatabase } from "../db";

const queryRouter = express.Router();

const run = async ()=> {
  const database = connectToDatabase();
  const collection = database.collection("post");

  const allPostsCursor = await collection.find({});
  const allPosts = await allPostsCursor.toArray();
  // console.log(allPostsCursor)
  // console.log(allPosts)
  return { allPosts}
  
};


queryRouter.post("/query", async (req: Request, res: Response): Promise<any> => {
  console.log("hello")
  console.log(req.body)
  const { search } = req.body;
  console.log(search)
  const data= await run()

  const final={
    databaseData: data,
    question:search
  }


  if (!search || typeof search !== "string") {
    return res.status(400).send("Invalid or missing query parameter.");
  }

 
  async function initiateFlowRun(value: string): Promise<string | null> {
    const url =
      "https://api.langflow.astra.datastax.com/lf/ccf6615b-7615-419c-8f3c-d4d14fe37c89/api/v1/run/bf26d86b-78aa-40c6-ad28-b3742d2ad3a4?stream=false";

    const headers = {
      "Content-Type": "application/json",
      Authorization:
        "Bearer AstraCS:MSKTLwMOKEQQJMkYZZubDgbp:8c7d5f7823cb764ac5ca61a1d76451e591c864eb479cf21950e2b1c94181a9f1",
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

  const finalV2= JSON.stringify(final)

  try {
    const result = await initiateFlowRun(finalV2);

    if (!result) {
      return res.status(500).send("Failed to process query through Langflow API.");
    }

    return res.status(200).json({ message: result });
  } catch (error) {
    console.error("Error in query route:", error);
    return res.status(500).send("An error occurred while processing the query.");
  }
});

export default queryRouter;

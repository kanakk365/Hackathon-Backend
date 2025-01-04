import express, { Request, Response } from "express";

const queryRouter = express.Router();


queryRouter.post("/query", async (req: Request, res: Response): Promise<any> => {
  const { search } = req.body;


  if (!search || typeof search !== "string") {
    return res.status(400).send("Invalid or missing query parameter.");
  }

 
  async function initiateFlowRun(value: string): Promise<string | null> {
    const url =
      "https://api.langflow.astra.datastax.com/lf/ccf6615b-7615-419c-8f3c-d4d14fe37c89/api/v1/run/583f96d7-37df-4b76-9dd7-e4d367394dd5?stream=false";

    const headers = {
      "Content-Type": "application/json",
      Authorization:
        "Bearer AstraCS:ivwdBeNJYhUJiPPeTSaXQwPW:5b395ce3dcf4eb6a563d36736c98519c54f58b63daf1bd7cbc042c6a25312794",
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
    const result = await initiateFlowRun(search);

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

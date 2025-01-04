import express, { Request, Response } from "express";
import fs from "fs";
import csvParser from "csv-parser";
import {  Collection } from "@datastax/astra-db-ts";


const uploadRouter = express.Router();

interface Post {
  title: string;
  content: string;
  date: string;
  $vectorize?: string;
}


uploadRouter.post("/", async (req: Request, res: Response) : Promise<any> => {
  const { filePath, fileType, embeddingStringCreator, collection } = req.body;

  if (!filePath || !fileType || !embeddingStringCreator || !collection) {
    return res.status(400).send("Missing required fields in request body.");
  }

  try {
    if (fileType === "json") {
      await processJsonFile(collection, filePath, embeddingStringCreator);
    } else if (fileType === "csv") {
      await processCsvFile(collection, filePath, embeddingStringCreator);
    } else {
      return res.status(400).send("Unsupported file type. Please upload JSON or CSV.");
    }

    res.status(200).send("File uploaded and data inserted successfully.");
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).send("An error occurred while uploading the file.");
  }
});


async function processJsonFile(
  collection: Collection<Post>,
  filePath: string,
  embeddingStringCreator: (data: Record<string, any>) => string
): Promise<void> {
  const rawData = fs.readFileSync(filePath, "utf8");
  const jsonData = JSON.parse(rawData);

  const documents: Post[] = jsonData.map((data: any) => ({
    ...data,
    $vectorize: embeddingStringCreator(data),
  }));

  const inserted = await collection.insertMany(documents);
  console.log(`Inserted ${inserted.insertedCount} items.`);
}


async function processCsvFile(
  collection: Collection<Post>,
  filePath: string,
  embeddingStringCreator: (data: Record<string, any>) => string
): Promise<void> {
  const documents: Post[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data: any) => {
        documents.push({
          ...data,
          $vectorize: embeddingStringCreator(data),
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const inserted = await collection.insertMany(documents);
  console.log(`Inserted ${inserted.insertedCount} items.`);
}

export default uploadRouter;

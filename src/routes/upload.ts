import express, { Request, Response } from "express";
import fs from "fs";
import csvParser from "csv-parser";
import { Collection, Db } from "@datastax/astra-db-ts";
import { connectToDatabase } from "../db";


const uploadRouter = express.Router();

interface Post {
  title: string;
  content: string;
  date: string;
  $vectorize?: string;
}

async function getOrCreateCollection(
  database: Db,
  collectionName: string,
): Promise<Collection<Post>> {
  try {

    const collection = await database.collection<Post>(collectionName);
    console.log(`Using existing collection ${collection.keyspace}.${collection.collectionName}`);
    return collection;
  } catch (error: any) {
    if (error.message.includes("not found")) {

      console.log(`Collection ${collectionName} does not exist. Creating it...`);
      const newCollection = await database.createCollection<Post>(collectionName, {
        vector: {
          service: {
            provider: "nvidia",
            modelName: "NV-Embed-QA",
          },
        },
      });
      console.log(
        `Created collection ${newCollection.keyspace}.${newCollection.collectionName}`
      );
      return newCollection;
    } else {
      throw new Error(`Error retrieving or creating collection: ${error.message}`);
    }
  }
}

uploadRouter.post("/file", async (req: Request, res: Response): Promise<any> => {
  const { filePath } = req.body;
  const  fileType  = "csv";
  const database = connectToDatabase()
  const collection = await getOrCreateCollection(database, "PostsTesting");

  if (!filePath || !fileType || !collection) {
    return res.status(400).send("Missing required fields in request body.");
  }

  try {
    if (fileType === "json") {
      await processJsonFile(collection, filePath, (data) => {
        return `done`
      });
    } else if (fileType === "csv") {
      await processCsvFile(collection, filePath, (data) => {
        return `done`
      });
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

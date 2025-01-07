import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import csvParser from "csv-parser";
import { Collection, Db } from "@datastax/astra-db-ts";
import { connectToDatabase } from "../db";
import path from "path";

const uploadRouter = express.Router();
const upload = multer({ dest: "uploads/" }); // Configure Multer to save files to 'uploads/' directory

interface Post {
  title: string;
  content: string;
  date: string;
  $vectorize?: string;
}

async function getOrCreateCollection(
  database: Db,
  collectionName: string
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
      console.log(`Created collection ${newCollection.keyspace}.${newCollection.collectionName}`);
      return newCollection;
    } else {
      throw new Error(`Error retrieving or creating collection: ${error.message}`);
    }
  }
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

uploadRouter.post("/file", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).send("No file uploaded.");
    return;
  }
  
  const filePath = path.resolve(req.file.path);

  try {
    const database = connectToDatabase();
    const collection = await getOrCreateCollection(database, "post");

    await processCsvFile(collection, filePath, (data) => "done");
    res.status(200).send("File processed successfully.");
  } catch (error: any) {
    console.error(error);
    res.status(500).send(`Error processing file: ${error.message}`);
  }
});

export default uploadRouter;

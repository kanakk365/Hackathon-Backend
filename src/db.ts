import { DataAPIClient, Db, VectorizeDoc } from "@datastax/astra-db-ts";
import dotenv from "dotenv";


dotenv.config()

let dbInstance :any;

export function connectToDatabase(): Db {
  if (dbInstance) {
    return dbInstance;
  }

  const { ASTRA_DB_API_ENDPOINT: endpoint, ASTRA_DB_APPLICATION_TOKEN: token } = process.env;

  if (!token || !endpoint) {
    throw new Error(
      "Environment variables ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN must be defined.",
    );
  }

  const client = new DataAPIClient(token);
  dbInstance = client.db(endpoint);

  console.log(`Connected to database ${dbInstance.id}`);

  return dbInstance;
}


export interface Post extends VectorizeDoc {
  post_type: string;
  likes: number;
  shares: number;
  comments: number;
}
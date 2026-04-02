import "./config/env.js";
import { connectDB } from "./config/db.js";
import { startDeletedPostPurgeLoop } from "./services/postDeletion.js";
import { server } from "./server.js";

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";

await connectDB();
startDeletedPostPurgeLoop();

server.listen({ port: PORT, host: HOST }).then(({ url }) => {
  console.log(`🚀 Material Crate GraphQL running at ${url}`);
});

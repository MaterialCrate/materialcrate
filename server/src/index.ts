import "./config/env";
import { connectDB } from "./config/db";
import { startDeletedPostPurgeLoop } from "./services/postDeletion";
import { server } from "./server";

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";

await connectDB();
startDeletedPostPurgeLoop();

server.listen({ port: PORT, host: HOST }).then(({ url }) => {
  console.log(`🚀 Material Crate GraphQL running at ${url}`);
});

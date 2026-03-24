import "./config/env";
import { connectDB } from "./config/db";
import { startDeletedPostPurgeLoop } from "./services/postDeletion";
import { server } from "./server";

const PORT = process.env.PORT || 4000;

await connectDB();
startDeletedPostPurgeLoop();

server.listen({ port: PORT }).then(({ url }) => {
  console.log(`🚀 Material Crate GraphQL running at ${url}`);
});

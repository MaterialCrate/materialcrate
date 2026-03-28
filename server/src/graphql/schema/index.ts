import { readFileSync } from "fs";
import { join } from "path";

export const typeDefs = [
  readFileSync(join("src/graphql/schema/user.graphql"), "utf8"),
  readFileSync(join("src/graphql/schema/post.graphql"), "utf8"),
  readFileSync(join("src/graphql/schema/archive.graphql"), "utf8"),
  readFileSync(join("src/graphql/schema/workspace.graphql"), "utf8"),
  readFileSync(join("src/graphql/schema/notification.graphql"), "utf8"),
];

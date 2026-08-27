import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "fs";
import { resolvers } from "./graphql/resolvers";

const typeDefs = readFileSync(new URL("./graphql/schema.graphql", import.meta.url), "utf-8");

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
});

Bun.serve({
  port: 4000,
  fetch: yoga.fetch,
});

console.log("Server running on http://localhost:4000/graphql");
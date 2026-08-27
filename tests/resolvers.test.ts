import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { prisma } from "../src/db/client";
import { resolvers } from "../src/graphql/resolvers";
import { GraphQLError } from "graphql";

let collectionId: string;

beforeAll(async () => {
  const c = await prisma.collection.create({
    data: { name: "Test Collection", slug: `test-${Date.now()}` },
  });
  collectionId = c.id;
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { collectionId } });
  await prisma.collection.delete({ where: { id: collectionId } });
  await prisma.$disconnect();
});

describe("createDocument", () => {
  it("creates a document with valid input", async () => {
    const doc = await resolvers.Mutation.createDocument(null, {
      title: "Hello",
      content: "World",
      collectionId,
    });
    expect(doc.title).toBe("Hello");
    expect(doc.content).toBe("World");
  });

  it("rejects empty title", async () => {
    expect(() =>
      resolvers.Mutation.createDocument(null, {
        title: "   ",
        content: "World",
        collectionId,
      })
    ).toThrow(GraphQLError);
  });

  it("rejects empty content", async () => {
    expect(() =>
      resolvers.Mutation.createDocument(null, {
        title: "Hello",
        content: "",
        collectionId,
      })
    ).toThrow(GraphQLError);
  });
});

describe("documents query (search + pagination)", () => {
  it("finds document by search substring", async () => {
    await resolvers.Mutation.createDocument(null, {
      title: "Searchable Title",
      content: "unique content xyz",
      collectionId,
    });
    const result = await resolvers.Query.documents(null, {
      collectionId,
      search: "xyz",
    });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("paginates with take", async () => {
    for (let i = 0; i < 3; i++) {
      await resolvers.Mutation.createDocument(null, {
        title: `Doc ${i}`,
        content: `Content ${i}`,
        collectionId,
      });
    }
    const result = await resolvers.Query.documents(null, {
      collectionId,
      take: 2,
    });
    expect(result.items.length).toBe(2);
    expect(result.nextCursor).not.toBeNull();
  });
});

describe("moveDocument", () => {
  it("moves document to another collection", async () => {
    const other = await prisma.collection.create({
      data: { name: "Other", slug: `other-${Date.now()}` },
    });
    const doc = await resolvers.Mutation.createDocument(null, {
      title: "MoveMe",
      content: "Body",
      collectionId,
    });
    const moved = await resolvers.Mutation.moveDocument(null, {
      id: doc.id,
      collectionId: other.id,
    });
    expect(moved.collectionId).toBe(other.id);
    await prisma.document.delete({ where: { id: doc.id } });
    await prisma.collection.delete({ where: { id: other.id } });
  });
});
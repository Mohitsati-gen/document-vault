import { prisma } from "../db/client";
import { GraphQLError } from "graphql";

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

export const resolvers = {
  Query: {
    collections: () => prisma.collection.findMany(),

    collection: (_: unknown, args: { id: string }) =>
      prisma.collection.findUnique({
        where: { id: args.id },
        include: { documents: true },
      }),

    documents: async (
      _: unknown,
      args: {
        collectionId?: string;
        search?: string;
        isArchived?: boolean;
        take?: number;
        cursor?: string;
      }
    ) => {
      const take = args.take ?? 20;
      const where: Record<string, unknown> = {};
      if (args.collectionId) where.collectionId = args.collectionId;
      if (args.isArchived !== undefined) where.isArchived = args.isArchived;
      if (args.search) {
        where.OR = [
          { title: { contains: args.search, mode: "insensitive" } },
          { content: { contains: args.search, mode: "insensitive" } },
        ];
      }

      const items = await prisma.document.findMany({
        where,
        take: take + 1,
        ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
      });

      const hasMore = items.length > take;
      const page = hasMore ? items.slice(0, take) : items;
      const nextCursor = hasMore ? page[page.length - 1].id : null;

      return { items: page, nextCursor };
    },
  },

  Mutation: {
    createCollection: (_: unknown, args: { name: string; slug: string }) => {
      if (!args.name.trim()) badInput("name cannot be empty");
      if (!args.slug.trim()) badInput("slug cannot be empty");
      return prisma.collection.create({ data: { name: args.name, slug: args.slug } });
    },

    createDocument: (
      _: unknown,
      args: { title: string; content: string; collectionId: string; tags?: string[] }
    ) => {
      if (!args.title.trim()) badInput("title cannot be empty");
      if (!args.content.trim()) badInput("content cannot be empty");
      return prisma.document.create({
        data: {
          title: args.title,
          content: args.content,
          collectionId: args.collectionId,
          tags: args.tags ?? [],
        },
      });
    },

    updateDocument: async (
      _: unknown,
      args: { id: string; title?: string; content?: string; tags?: string[]; isArchived?: boolean }
    ) => {
      if (args.title !== undefined && !args.title.trim()) badInput("title cannot be empty");
      if (args.content !== undefined && !args.content.trim()) badInput("content cannot be empty");
      return prisma.document.update({
        where: { id: args.id },
        data: {
          ...(args.title !== undefined ? { title: args.title } : {}),
          ...(args.content !== undefined ? { content: args.content } : {}),
          ...(args.tags !== undefined ? { tags: args.tags } : {}),
          ...(args.isArchived !== undefined ? { isArchived: args.isArchived } : {}),
        },
      });
    },

    deleteDocument: async (_: unknown, args: { id: string }) => {
      await prisma.document.delete({ where: { id: args.id } });
      return true;
    },

    moveDocument: (_: unknown, args: { id: string; collectionId: string }) =>
      prisma.document.update({
        where: { id: args.id },
        data: { collectionId: args.collectionId },
      }),
  },
};
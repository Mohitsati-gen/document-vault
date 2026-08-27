# Document Vault — GraphQL API

Backend API for organizing documents into collections. Built with Bun, TypeScript, GraphQL Yoga, PostgreSQL, and Prisma.

## Setup

\`\`\`bash
docker compose up -d && bun install && bun run generate && bun run dev
\`\`\`

Server runs at http://localhost:4000/graphql

## Design notes

- Cursor-based pagination on `documents` query (take/cursor)
- Search is substring match (case-insensitive) on title or content
- Validation rejects empty title/content via GraphQL errors, not 500s
- `moveDocument` reassigns `collectionId` directly

## Extending

- Add auth via context 
- Add full-text search index instead of `contains` for larger datasets
- Add DataLoader if nested collection→documents queries need batching at scale
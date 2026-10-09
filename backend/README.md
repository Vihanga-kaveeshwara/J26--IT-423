# Backend

# Backend

Express and TypeScript API using PostgreSQL through Prisma ORM.

Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string:

```text
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/project_database
```

Install dependencies and generate Prisma Client:

```powershell
npm install
npm run prisma:generate
```

Create a development migration after changing `prisma/schema.prisma`:

```powershell
npm run prisma:migrate -- --name initial
```

Apply committed migrations in deployment environments:

```powershell
npm run prisma:deploy
```

Start the backend with `npm run dev`. The API remains available at `http://localhost:5000`.

# Real Estate App

A rental platform where tenants search for properties and apply, and managers list properties and handle applications. Next.js frontend, Express and PostgreSQL backend, deployed on AWS.

## Features

**Tenants**
- Search properties by location, price, beds, baths, type and amenities
- Switch between grid and list view, with all results shown on a map
- Save favorites and apply to a property
- Track applications and view current residences with lease and payment history

**Managers**
- Create listings with photos and address
- View their properties and the tenants in each one
- Approve or deny applications. Approving one creates the lease

## Tech stack

| Part | Tools |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui, Redux Toolkit, RTK Query, React Hook Form, Zod, Mapbox GL |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL with PostGIS |
| Auth | AWS Cognito through Amplify |
| Storage | AWS S3 for property photos |
| Hosting | AWS EC2 with pm2 |

## Project structure

```
client/   Next.js app (pages, components, state, types)
server/   Express API (controllers, routes, auth middleware, Prisma schema and seed data)
```

## Running locally

You need Node.js 18 or later and a PostgreSQL database with the PostGIS extension.

### 1. Server

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=3002
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/realestate?schema=public
AWS_REGION=your-region
S3_BUCKET_NAME=your-bucket
```

Set up the database and start the API:

```bash
npx prisma migrate dev
npm run prisma:generate
npm run seed
npm run dev
```

The API runs on `http://localhost:3002`.

### 2. Client

```bash
cd client
npm install
```

Create `client/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

Then start it:

```bash
npm run dev
```

Open `http://localhost:3000`.

## API routes

| Route | Access | Purpose |
|---|---|---|
| `/properties` | Public, create needs manager | List, view and create properties |
| `/applications` | Tenant creates, manager updates | Create, list and update applications |
| `/leases` | Tenant or manager | Leases and their payments |
| `/tenants` | Tenant role | Profile, residences and favorites |
| `/managers` | Manager role | Profile and managed properties |

## Deployment

The server runs on an EC2 instance with pm2. Setup steps are in [`server/aws-ec2-instructions.md`](server/aws-ec2-instructions.md).

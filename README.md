# Life Management App

A local-first personal productivity and life management system. It combines Trello-like Kanban task boards with day-view calendar scheduling and atomic habit tracking. Built using modern Next.js 16 and Prisma 7, the app is modularly structured to grow local-first toward mobile and cloud backends.

---

## Features

- **Trello-Style Kanban Boards**: Manage tasks across customizable boards and categories. Create, update, archive, and prioritize tasks seamlessly.
- **Day-View Calendar Scheduling**: Schedule tasks using precise time blocks. Features include custom `TimePicker` inputs, "fixed" calendar events, and visual overlap prevention.
- **Advanced Recurrence Engine**: Set tasks to recur daily, weekly on specific days, or custom durations. The scheduler automatically projects "virtual schedules" for future dates.
- **Atomic Habit Tracker**: Log habit tasks with customized measurement units (e.g., liters, miles, pages). View streak analytics (current and longest streaks) and visual metrics.
- **Contribution Graph**: Track your productivity and habit logs with a GitHub-style heat map visualizer.
- **Subtasks & Comments**: Add checklists (actions) to tasks. Action completions automatically log system audit comments, and custom comments support text editing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS v4 (PostCSS Plugin Setup) |
| **ORM** | Prisma v7 (generated ES client) |
| **Database** | SQLite via `better-sqlite3` |
| **DB Adapter** | `@prisma/adapter-better-sqlite3` |
| **Development Utility** | `jiti` (for script/seed compilation) |

---

## Getting Started

### 1. Prerequisites
- **Node.js** (LTS version recommended)
- **npm** (comes with Node.js)

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Initialize Database
Migrate the database to create the local SQLite db (`prisma/dev.db`):
```bash
npx prisma migrate dev
```

### 4. Running the Development Server
Start the local Next.js development server:
```bash
npm run dev
```

Once running, navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Seeding Sample Data
To load mock boards, tasks, categories, and schedules for demo purposes:
- **Via UI**: Navigate to the **Settings** tab and click **Reset & Load Sample Data**.
- **Via API**: Run the seed route:
  ```bash
  curl -X POST http://localhost:3000/api/seed
  ```

---

## Developer Documentation

Detailed architectural and implementation notes can be found in the `docs/` folder:

- [Architecture Overview](docs/architecture.md) — Tech stack decisions, state management design, and future roadmap.
- [API Reference](docs/api.md) — Route-handler API endpoints (Boards, Categories, Tasks, Checklist Actions, Comments, Schedules, Seeds).
- [Data Model & Types](docs/data-model.md) — Prisma database schema, cascade deletion rules, and TypeScript type mappings.
- [Component Guide](docs/components.md) — Props definitions and state-ownership hierarchy.
- [Development Guide](docs/development.md) — Environment variables, npm scripts, and Prisma v7 quirks.

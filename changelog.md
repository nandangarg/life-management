# Changelog

All notable changes to the Life Management App will be documented in this file.

## [Unreleased]

### Added
- Created `changelog.md` to track project evolution.
- Updated `docs/data-model.md` and `docs/api.md` to reflect the updated database models, TypeScript interfaces, and new REST endpoints.
- Updated `README.md` to include detailed description, current tech stack, features, and database migration steps.

## [1.2.0] - 2026-08-24
### Added
- **Habit Tracker Module**: Integrated habits tracking via the UI (`HabitsView`). Users can configure tasks as habits with specific target units (e.g., liters, miles).
- **Streaks & Analytics**: Automatic calculation of current/longest completion streaks and average metrics based on task schedules. Includes a GitHub-style contribution calendar graph.
- **Custom TimePicker**: Integrated a customized, user-friendly `TimePicker` component to select hours and minutes easily for task schedules.
- **Infinite Render Loop Fix**: Resolved an infinite loop crash in `TaskForm` when creating or modifying tasks.
- **Lint Warning Resolutions**: Fixed `react-hooks` compile-time lint warnings across the codebase.

## [1.1.0] - 2026-08-12
### Added
- **Recurrence & Planner System**: Integrated daily planning features and task-level recurrence scheduling options.
- **Advanced Recurrence Options**: Added recurrence rules (e.g., daily, weekly on specific days), `isFixed` status for blocking calendar hours, scheduler break management, and side-by-side event rendering in the Calendar.
- **"Save & Edit" Workflow**: Added a direct "Save & Edit" flow to the task creation form.
- **UX Improvements**: Randomized category colors, fixed text contrasts, added page-back navigation buttons, and preserved active tab state during list filtering.

## [1.0.0] - 2026-08-08
### Added
- **Core Task Boards & Calendar**: Initial task boards, categories, and calendar view scheduling implementation.
- **SQLite Database Support**: Integrated SQLite via `better-sqlite3` and `@prisma/adapter-better-sqlite3` for Prisma client compatibility.
- **Prisma Seed Routing**: Implemented seeding via an API endpoint `/api/seed` to circumvent ESM module loading issues during CLI seeding.

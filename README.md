# LibraryOS — Local Library Management System

A modern, responsive library management system built with **Vite + React + TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## Features

| Feature | Member | Librarian |
|---|---|---|
| Browse & search books | ✅ | ✅ |
| View book details | ✅ | ✅ |
| View borrow history | ✅ | ✅ |
| View reservations | ✅ | ✅ |
| Bell notifications | ✅ | ✅ |
| Add / Edit / Delete books | ❌ | ✅ |
| Assign book borrows | ❌ | ✅ |
| Mark books as returned | ❌ | ✅ |
| Reserve books for members | ❌ | ✅ |
| Notify members on availability | ❌ | ✅ |
| View all members | ❌ | ✅ |
| View member borrow & reservation history | ❌ | ✅ |

---

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS v3 + custom design tokens
- **UI Primitives**: Radix UI (Dialog, Select, DropdownMenu, Tabs, Avatar…)
- **Routing**: React Router v6
- **Backend / DB**: Supabase (Auth + PostgreSQL + RLS)
- **Notifications**: Sonner toast
- **Date utils**: date-fns

---

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Primitive UI: Button, Input, Badge, Card, Dialog, Select…
│   ├── molecules/      # Composed: SearchBar, FormField, BookCard, StatCard, EmptyState…
│   ├── organisms/      # Complex: Sidebar, Header, NotificationBell
│   └── templates/      # Page shell: DashboardLayout
├── context/
│   └── AuthContext.tsx # Global auth state + profile + role
├── hooks/              # useBooks, useMembers, useBorrows, useReservations
├── lib/
│   ├── supabase.ts     # Supabase client init
│   └── utils.ts        # cn(), date helpers, etc.
├── pages/
│   ├── auth/           # LoginPage, RegisterPage
│   ├── books/          # BooksPage, BookDetailPage, BookFormPage
│   ├── borrowing/      # BorrowingPage (librarian), MyBorrowsPage (member)
│   ├── dashboard/      # DashboardPage
│   ├── members/        # MembersPage, MemberDetailPage
│   └── reservations/   # ReservationsPage (librarian), MyReservationsPage (member)
├── services/           # bookService, borrowService, memberService, notificationService, reservationService
└── types/              # TypeScript types for all DB entities
supabase/
└── migrations/
    ├── 001_initial_schema.sql   # All tables + RLS policies + triggers
    ├── 002_seed_genres.sql      # 25 book genre seed data
    └── 003_rpc_functions.sql    # Atomic borrow/return RPC functions
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Clone & install

```bash
git clone <your-repo>
cd library-management-system
npm install
```

### 3. Environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase dashboard under **Project Settings → API**.

### 4. Run database migrations

In your **Supabase SQL Editor** (or via Supabase CLI), run the migrations in order:

```
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_seed_genres.sql
3. supabase/migrations/003_rpc_functions.sql
```

**Or** if you're using the Supabase CLI:

```bash
supabase db push
```

### 5. Configure Supabase Auth

In your Supabase dashboard:
1. Go to **Authentication → Providers**
2. Make sure **Email** provider is enabled
3. For development, you can disable email confirmation under **Authentication → Email Templates → Confirm signup** → turn off "Enable email confirmations"

### 6. Start the dev server

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

---

## Roles & Permissions

| Role | How to get it |
|---|---|
| **Member** | Default role — everyone who registers |
| **Librarian** | Manually update in Supabase Dashboard |

### Promoting a user to Librarian

1. Go to Supabase Dashboard → **Table Editor → profiles**
2. Find the user row
3. Change the `role` column value from `member` to `librarian`
4. Save

The user will see the librarian interface on their next page load (or after sign out/in).

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `profiles` | Extends `auth.users` with role, name, contact info |
| `genres` | Book genre categories (seeded with 25 genres) |
| `books` | Book catalogue with availability tracking |
| `borrow_records` | Tracks who borrowed what book and when |
| `reservations` | Waitlist reservations for unavailable books |
| `notifications` | In-app notification feed (read/unread) |

### Row Level Security

All tables have RLS enabled:

- **profiles**: Users see only their own; librarians see all
- **books / genres**: All authenticated users can read; librarians can write
- **borrow_records**: Members see their own; librarians see and manage all
- **reservations**: Members see their own; librarians manage all
- **notifications**: Users see and mark read only their own; librarians can insert

### RPC Functions

| Function | Purpose |
|---|---|
| `borrow_book(p_book_id)` | Atomically decrements `available_copies` |
| `return_book(p_book_id)` | Atomically increments `available_copies` |

---

## Key Workflows

### Librarian: Lending a book
1. Go to **Borrow & Return**
2. Click **Assign Borrow**
3. Select the book and member → set loan duration → confirm
4. The book's available count decreases automatically

### Librarian: Processing a return
1. Go to **Borrow & Return → Active**
2. Find the record → click **Mark Returned**
3. The book's available count increases automatically

### Librarian: Reserving a book for a member
1. Go to **Waitlists**
2. Click **Add Reservation** → select book and member
3. When the book becomes available, click **Notify** on the reservation
4. The member receives an in-app notification (bell icon)

### Member: Checking availability
1. Go to **Browse Books**
2. Filter by genre or use search
3. Green badge = copies available, Red = unavailable
4. Notifications for reservations appear in the bell icon

---

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## License

MIT

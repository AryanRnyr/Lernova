# Lernova - Online Learning Platform

A modern, full-featured online learning platform built with React, TypeScript, and Supabase. Lernova enables instructors to create and sell courses while providing students with a seamless learning experience.

![Lernova](https://img.shields.io/badge/Lernova-Learning%20Platform-blue)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## 🚀 Features

### For Students
- 📚 Browse and search course catalog
- 🛒 Shopping cart functionality
- 💳 Secure payments via **eSewa** and **Khalti**
- 📖 Access enrolled courses
- 📜 Course completion certificates
- ⭐ Rate and review courses
- 👤 User profile management

### For Instructors
- 📝 Create and manage courses
- 📊 Dashboard with analytics
- 💰 Track earnings and payouts
- 📈 View student enrollments

### For Admins
- 👥 User management
- 📋 Course approval system
- 💵 Sales and payout management
- 📧 Contact message handling

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS
- **Shadcn/UI** - Component library
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching & caching
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Edge Functions (Deno)
  - Real-time subscriptions

### Payment Gateways
- **eSewa** - Nepal's leading digital wallet
- **Khalti** - Digital payment gateway

## 📁 Project Structure

```
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── admin/        # Admin-specific components
│   │   ├── auth/         # Authentication components
│   │   ├── catalog/      # Course catalog components
│   │   ├── instructor/   # Instructor components
│   │   ├── layout/       # Layout components
│   │   └── ui/           # Shadcn UI components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Third-party integrations
│   ├── lib/              # Utility functions
│   └── pages/            # Page components
│       ├── admin/        # Admin pages
│       ├── instructor/   # Instructor pages
│       └── student/      # Student pages
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── initiate-esewa-payment/
│   │   ├── initiate-khalti-payment/
│   │   ├── verify-payment/
│   │   ├── send-email/
│   │   └── send-otp/
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or bun
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lernova
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:8080`

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 💳 Payment Integration

### eSewa Setup
- Uses eSewa's sandbox for testing
- Signature-based verification with HMAC-SHA256
- Automatic order status updates

### Khalti Setup
- Integrated with Khalti's e-Payment API v2
- Real-time payment verification via lookup API
- Supports test and live environments

## 🔐 Authentication

- Email/password authentication
- OTP verification for password reset
- Role-based access control (Student, Instructor, Admin)
- Protected routes with auth guards

## 📊 Database Schema

Key tables:
- `profiles` - User profiles
- `courses` - Course information
- `enrollments` - Student enrollments
- `orders` - Payment orders
- `reviews` - Course reviews
- `cart_items` - Shopping cart

## 🚀 Deployment

The project is configured for deployment on:
- **Frontend**: Vercel, Netlify, or any static host
- **Backend**: Supabase (managed)
- **Edge Functions**: Supabase Edge Functions (Deno Deploy)

## 📝 License

This project is private and proprietary.

## 👨‍💻 Author

Built with ❤️

---

**Note:** This is a production-ready application. Ensure all environment variables are properly configured before deployment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS


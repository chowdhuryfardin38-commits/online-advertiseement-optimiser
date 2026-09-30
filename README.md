# AdOptimize Pro — Online Advertisement Optimiser

An AI-powered advertising campaign management and optimization platform.

## GitHub Repository
[https://github.com/chowdhuryfardin38-commits/online-advertiseement-optimiser](https://github.com/chowdhuryfardin38-commits/online-advertiseement-optimiser)

## Features
- **Campaign Management**: Create, edit, schedule, and track advertising campaigns.
- **AI Performance Insights**: Intelligent budget allocation, keyword recommendations, and ROI estimation.
- **Admin Management Portal**: Platform-wide user, campaign, and ticket moderation.
- **Analytics & Reporting**: Detailed impressions, click-through-rates (CTR), and conversion tracking.

## Getting Started

### Prerequisites
- Node.js (v18+)

### Running Locally
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Authentication Setup (Clerk)
- Integrated with Clerk SDK for secure authentication and user management.
- Configure environment variables in `.env`:
  ```env
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
  ```
- Backend credentials configured in `backend/.env`:
  ```env
  CLERK_SECRET_KEY=sk_test_...
  CLERK_FRONTEND_API_URL=https://<your-app>.clerk.accounts.dev
  ```

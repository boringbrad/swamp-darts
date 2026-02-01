# Admin Dashboard Setup Guide

## Overview
Your admin dashboard is now ready! It provides comprehensive analytics about user activity, game statistics, and guest player insights.

## Setup Steps

### 1. Apply Database Migration
Run the admin flag migration in your Supabase SQL Editor:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/05_add_admin_flag.sql`
5. Click **Run**

### 2. Grant Yourself Admin Access
In the Supabase SQL Editor, run this command (replace with your email):

```sql
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'your-email@example.com'
);
```

### 3. Access the Dashboard
1. Log into your app
2. Go to the home screen
3. You'll see a new purple **ADMIN** button
4. Click it to access your admin dashboard

## Dashboard Features

### 📊 User Activity Section
- **Total Users** - All registered users
- **Active Users (7/30 Days)** - Users who played recently
- **Top Users Table** - Shows:
  - User name and email
  - Total matches played
  - Cricket vs Golf breakdown
  - Number of guests added
  - Last activity date

### 🎮 Game Analytics Section
- **Total Matches** - All games played across the platform
- **Recent Activity** - Matches in last 7/30 days
- **Average Players per Game** - Social engagement metric
- **Cricket Mode Breakdown** - Popular cricket variants
- **Golf Mode Breakdown** - Popular golf variants

### 👥 Guest Player Insights Section
- **Total Guests** - All guests added by users
- **Active Guests** - Guests who have actually played
- **Most Active Guests** - Top guests by match count
- **Users with Most Guests** - Which users add the most guests

## How Data is Collected

All data is automatically synced from the app:

1. **Guest Players** - Synced when users add guests during game setup
2. **Cricket Matches** - Synced when cricket games complete
3. **Golf Matches** - Synced when golf games complete
4. **User Profiles** - Synced when users sign up or update profiles

## Analytics Views

The dashboard uses pre-built SQL views for efficient querying:

- `user_activity_analytics` - Aggregated user engagement data
- `guest_player_analytics` - Guest usage patterns

## Security

- Only users with `is_admin = true` can access `/admin`
- Non-admin users are automatically redirected
- Row Level Security (RLS) ensures users can only modify their own data
- Admin analytics views aggregate public data for insights

## Refresh Data

Click the **REFRESH DATA** button in the top right to reload all analytics in real-time.

## Need More Analytics?

The analytics functions in `app/lib/adminAnalytics.ts` can be easily extended to add:
- Time-series charts (matches over time)
- User retention metrics
- Course popularity rankings
- Tournament tracking
- Social network analysis (who plays with whom)

Just let me know what insights you'd like to see!

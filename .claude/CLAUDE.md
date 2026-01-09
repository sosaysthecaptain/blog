# Blog Project - Resume Point

## Project Goal
Personal website/blog built with:
- **Next.js** (React + SSR/SSG for crawlability)
- **Firebase** (Hosting, Firestore for posts, Storage for images, Auth for admin)
- **Custom CMS** - simple admin UI at /admin for creating posts

## Architecture
```
/blog/[slug]  → Static pages (SSG at build)
/admin        → Private CMS UI (Firebase Auth protected)
/experiments  → Future dynamic experiments
```

## Progress
- [x] Moved old HTML site to `/OLD_SITE/`
- [x] Created Next.js project with TypeScript + Tailwind
- [x] Install Firebase SDK (`npm install firebase`)
- [x] Create Firebase config file (`/src/lib/firebase.ts`)
- [x] Create basic page routes (home, blog, admin)
- [x] Set up admin CMS components (basic form)
- [ ] Wire up Firestore for posts (read/write)
- [ ] Add Firebase Auth to admin
- [ ] Add image upload to Storage
- [ ] Style polish

## Current State
Routes working:
- `/` - Home with blog list (placeholder data)
- `/blog/[slug]` - Individual posts (SSG)
- `/admin` - CMS form (not yet connected to Firebase)

## Next Steps
1. Wire up Firestore - create `posts` collection, fetch on home, save from admin
2. Add Firebase Auth - protect admin route
3. Add image upload to Firebase Storage
4. Style improvements based on your screenshots

## Notes
- User wants aesthetic polish (will provide screenshots)
- Photo-heavy content - need good image handling
- Keep toolchain simple
- "Vibecoding > signing up for random products"

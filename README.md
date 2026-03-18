# Retlify — Retail Technology SaaS Platform

> India's platform connecting offline retailers with online customers 🇮🇳

---

## 📁 Project Structure

```
retlify-app/
│
├── frontend/
│   ├── login.html          ← Login page (split-screen, animated floating cards, email + phone tabs)
│   ├── signup.html         ← Signup page (role selector, password strength meter, benefits grid)
│   └── dashboard.html      ← Full SaaS dashboard (SPA — all 6 pages inside one file)
│
├── backend/
│   ├── server.js           ← Express API (auth, survey, contact, email)
│   ├── package.json        ← NPM dependencies
│   ├── .env.example        ← Copy to .env and fill your values
│   └── .gitignore
│
└── README.md
```

---

## ✨ Features

### 🖥️ Frontend — 3 HTML files, zero build step

| Page | File | Features |
|------|------|---------|
| Login | `login.html` | Split-screen layout, floating retail cards (animated), Email + Phone tabs, Google OAuth simulation, localStorage auth |
| Sign Up | `signup.html` | Role selector (Shopkeeper / Customer), Password strength meter, Google OAuth, Animated benefits list |
| Dashboard | `dashboard.html` | Full SPA with 6 sub-pages, dark/light theme, responsive sidebar, profile dropdown, modals, toast notifications |

### Dashboard Sub-Pages

| Page | What's inside |
|------|--------------|
| 🏠 Home | Welcome greeting, 4 stat cards, animated bar chart, activity feed, inventory table (with badges) |
| ⭐ Benefits | Hero banner, 7 shopkeeper benefits + 6 customer benefits in hover cards |
| 📋 Survey | 5-question interactive survey with progress bar, single & multi-select options, success modal |
| 📱 App | Coming Soon with animated emoji, CTA buttons |
| ✉️ Contact | LinkedIn + Instagram + Email cards, contact form with validation, success modal |
| ⚙️ Settings | 4 tabs — Profile edit, Notification toggles, Theme switcher (light/dark), Full Privacy Policy |

### 🔧 Backend — Node.js + Express

| Feature | Details |
|---------|---------|
| Auth | JWT signup, login, get-me, update-profile, change-password |
| Database | MongoDB via Mongoose — User, Survey, Contact models |
| Email | Nodemailer — welcome email on signup, admin alerts on survey + contact |
| Security | bcrypt passwords, JWT expiry, input sanitization, CORS |
| Health | `GET /api/health` endpoint |

---

## 🚀 Quick Start

### Frontend (open directly in browser)

```bash
# Option 1 — just open in browser (all data embedded, including logo)
open frontend/login.html

# Option 2 — serve locally (required for page links to work)
cd frontend
npx serve .
# Visit http://localhost:3000/login.html
```

> **Note:** The Retlify logo is embedded as a base64 data URI in all HTML files, so no external image files are needed.

### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
# Edit .env — add MongoDB URI and Gmail App Password

# Development (with auto-restart)
npm run dev

# Production
npm start
```

#### Gmail App Password Setup (for email)
1. Go to your Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Generate for "Mail" → "Other"
4. Copy the 16-character password into `EMAIL_PASS` in `.env`

---

## 🔑 API Reference

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| `POST` | `/api/auth/signup` | No | Create account |
| `POST` | `/api/auth/login` | No | Login |
| `GET` | `/api/auth/me` | ✅ Bearer | Get current user |
| `PUT` | `/api/auth/profile` | ✅ Bearer | Update name/phone |
| `PUT` | `/api/auth/change-password` | ✅ Bearer | Change password |
| `POST` | `/api/survey` | No | Submit survey response |
| `GET` | `/api/survey/stats` | No | Survey analytics |
| `POST` | `/api/contact` | No | Send contact message |
| `GET` | `/api/health` | No | Health check |

#### Auth Token Usage
```
Authorization: Bearer <jwt_token>
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Brand Yellow | `#FFD23F` | Buttons, highlights, brand |
| Brand Dark | `#C99B00` | Hover states, active nav |
| Charcoal | `#1F2937` | Dark backgrounds |
| Midnight | `#111827` | Deepest backgrounds |
| Radius | `12px` / `18px` | Cards, inputs |
| Font | DM Sans + Syne | Body + Headings |

---

## 🗃️ Database Models

### User
```js
{ name, email, password (hashed), phone, role (shopkeeper|customer), avatar, isActive, timestamps }
```

### Survey
```js
{ userId, q1_shopping_habit, q2_offline_problems[], q3_retlify_usefulness, q4_most_useful_feature, q5_shopkeeper_interest, ipAddress, timestamps }
```

### Contact
```js
{ name, email, message, type (contact|feedback), ipAddress, timestamps }
```

---

## 🌐 SEO

All pages include:
- `<title>`, `<meta name="description">`, `<meta name="keywords">`
- Keywords: `retlify`, `retlify startup`, `retlify saas`, `retlify india`, `utkarsh verma retlify`
- Open Graph tags (`og:title`, `og:description`, `og:type`)

---

## 🔒 Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT tokens expire in **7 days**
- CORS restricted to configured frontend URL
- Input sanitization on all API routes
- `.env` file excluded from version control

---

## 📞 Contact

| Channel | Link |
|---------|------|
| 📧 Email | [retlifyy@gmail.com](mailto:retlifyy@gmail.com) |
| 📸 Instagram | [@retlifyy](https://instagram.com/retlifyy) |
| 💼 LinkedIn | [Retlify on LinkedIn](https://www.linkedin.com/posts/retlify-startupindia-retailtech-share-7439434019982798848-lPSl) |

---

*Built with ❤️ in India — by Utkarsh Verma & the Retlify Team*

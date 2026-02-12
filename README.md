# 📝 dssconfessions

**Untold words, sent through the song.**

An anonymous confession platform built specifically for the **DSSC Student Community**. Inspired by the emotional resonance of _SendTheSong_, this version focuses on secure cloud architecture, high-performance data retrieval, and a minimalist "Neo-Brutalism" UI/UX design.

## 🚀 Live Demo

- **Frontend:** [https://dssconfessions.vercel.app/](https://dssconfessions.vercel.app/)
- **Backend API:** [https://dssconfessions.onrender.com/](https://dssconfessions.onrender.com/)

---

## ✨ Features

- **Anonymous Confessions:** Post messages without the need for an account, ensuring 100% privacy.
- **Spotify Integration:** Search for and attach specific songs to your messages via the Spotify API.
- **Neo-Brutalist UI:** A bold, high-contrast design with responsive "Vibe-based" dynamic gradients.
- **Fuzzy Search:** Case-insensitive search functionality to find confessions easily.
- **Responsive Navigation:** Mobile-ready burger menu and stacked live preview for all devices.

---

## 🛠️ Tech Stack

| Layer          | Technology                 | Purpose                               |
| :------------- | :------------------------- | :------------------------------------ |
| **Frontend**   | React + Tailwind CSS       | UI/UX & State Management              |
| **Backend**    | Node.js + Express          | API Logic & Spotify Proxy             |
| **Database**   | Supabase (PostgreSQL)      | Cloud Data Storage                    |
| **Security**   | RLS + Helmet + XSS-Filters | Secure Data Layer & Header Protection |
| **Deployment** | Vercel & Render            | Continuous Integration / Deployment   |

---

## 🔒 Security Architecture

As an IT capstone-level project, security was a primary focus:

- **Row Level Security (RLS):** Enabled on Supabase to prevent unauthorized public access. Data is strictly accessible via the backend's Service Role master key.
- **Rate Limiting:** Implemented `express-rate-limit` to prevent spamming and API abuse.
- **Data Sanitization:** All user inputs are sanitized using `xss-filters` before being committed to the database.
- **Reverse Proxy Trust:** Configured `trust proxy` for Render's infrastructure to ensure accurate IP identification.

---

## ⚙️ Local Setup

To run this project locally, create a `.env` file:

### Backend (.env)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
PORT=5000
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 👨‍💻 Author

**Snowi Wu** _4th-year BS Information Technology Student_ _Focusing on UI/UX Design, Machine Learning, and System Architecture._

---

## 📜 License

This project is for educational purposes and inspired by the SendTheSong platform.
EOF

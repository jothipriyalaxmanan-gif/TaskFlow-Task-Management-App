# Task Management Application

A full-stack Task Management Application built with **HTML, CSS, JavaScript (Vanilla)** on the frontend, **Node.js & Express.js** on the backend, and **MongoDB Atlas** as the cloud database with **JWT (JSON Web Token)** authentication and authorization.

---

## 🌟 Key Features

- **User Authentication**: User Registration and Login with encrypted passwords (`bcryptjs`) and secure JWT sessions.
- **User Authorization**: Complete data isolation—users can only view, create, edit, and delete their own tasks.
- **Task Management (Full CRUD)**:
  - Create new tasks with title, description, deadline, priority, and status.
  - View all tasks in a responsive card grid.
  - Quick status toggle between **Pending** and **Completed** with instant visual feedback.
  - Edit existing tasks via an intuitive modal.
  - Delete tasks with confirmation modal.
- **Deadline Tracking**: Due date badge with automatic **Overdue** highlighting for pending tasks past their deadline.
- **Progress Tracking & Metrics**: Real-time completed tasks counter, total, pending, and overdue counters, plus an animated progress percentage bar.
- **Search, Filter & Sort**:
  - Live search by task title or description keywords.
  - Filter by status (**All**, **Pending**, **Completed**, **Overdue**).
  - Filter by priority (**Low**, **Medium**, **High**).
  - Sort by **Newest First**, **Oldest First**, or **Due Date**.
- **Modern Responsive Design**: Mobile, tablet, and desktop-friendly layout with glassmorphism touches and smooth micro-interactions.

---

## 📁 Project Structure

```
Task-Management-App/
├── frontend/
│   ├── index.html         # Login and Registration page
│   ├── dashboard.html     # Main Task Management Dashboard
│   ├── style.css          # Modern responsive CSS design system
│   └── script.js          # Client-side API interactions & UI logic
├── models/
│   ├── User.js            # Mongoose User schema (bcrypt hashing)
│   └── Task.js            # Mongoose Task schema (user ref, status, deadline)
├── routes/
│   ├── auth.js            # Registration, Login, and User profile endpoints
│   └── tasks.js           # Protected Task CRUD and status endpoints
├── middleware/
│   └── auth.js            # JWT verification & route protection middleware
├── .env                   # Environment variables (PORT, MONGODB_URI, JWT_SECRET)
├── .env.example           # Example environment template
├── package.json           # Node.js dependencies & scripts
├── server.js              # Express app entry point & MongoDB Atlas connection
└── README.md              # Project documentation & setup instructions
```

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Cloud Database) via Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs

---

## 🚀 Getting Started & Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- npm (comes bundled with Node.js)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account

---

### 2. Configure MongoDB Atlas

If you don't already have a MongoDB Atlas connection string, follow these quick steps:

1. **Sign in** to [MongoDB Atlas](https://cloud.mongodb.com).
2. **Create a Cluster** (The free M0 tier is sufficient).
3. **Set up Database Access (User)**:
   - In the left sidebar, navigate to **Security** > **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication, enter a username (e.g., `admin`) and secure password, then click **Add User**.
4. **Set up Network Access (IP Whitelist)**:
   - In the left sidebar, navigate to **Security** > **Network Access**.
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) for development, then click **Confirm**.
5. **Get Connection String**:
   - Go to **Database** (or **Clusters**) in the sidebar.
   - Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the connection string, which looks like:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

---

### 3. Setup Environment Variables

In the root of the project (`Task-Management-App`), edit the `.env` file to choose either **Local MongoDB** or **MongoDB Atlas**:

#### Option A: Use Local MongoDB (Default Fallback)
If you have MongoDB installed locally on your computer:
```env
PORT=5000
USE_LOCAL_DB=true
MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/taskmanager
MONGODB_URI=
JWT_SECRET=taskmanager_super_secret_jwt_key_2026_change_in_production
```
Make sure the MongoDB service is running:
- **Windows Command Prompt / PowerShell (Run as Administrator)**:
  ```powershell
  net start MongoDB
  ```
  *(Or launch `mongod` from your MongoDB installation directory)*

#### Option B: Use MongoDB Atlas (Cloud Database - Recommended)
When you have created your MongoDB Atlas cluster:
```env
PORT=5000
USE_LOCAL_DB=false
MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/taskmanager
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/taskmanager?retryWrites=true&w=majority
JWT_SECRET=taskmanager_super_secret_jwt_key_2026_change_in_production
```
> **Note**: Replace `<username>`, `<password>`, and `cluster0.xxxxx.mongodb.net` with your actual MongoDB Atlas cluster details. Ensure your IP address is whitelisted in MongoDB Atlas under **Network Access** (`0.0.0.0/0` for development).

---

### 4. Install Dependencies

Open your terminal or command prompt in the project folder:

```bash
cd Task-Management-App
npm install
```

---

### 5. Start the Server

Start the application:

```bash
npm start
```

Or run with automatic reload during development:

```bash
npm run dev
```

Once started, the console will confirm:
```
🚀 Task Management Application is running!
📍 Web Interface: http://localhost:5000
📡 API Health Check: http://localhost:5000/api/health
📋 Dashboard: http://localhost:5000/dashboard
✅ Connected successfully to MongoDB Atlas database.
```

---

### 6. Open in Browser

- Open `http://localhost:5000` in your web browser.
- **Register** a new account.
- You will be automatically redirected to your personal **Dashboard** where you can create, organize, and complete tasks!

---

## 📡 API Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Login with `email` & `password` to receive JWT |
| `GET` | `/api/auth/me` | Private | Get authenticated user profile |

### Task Routes (`/api/tasks`)
*All task routes require the `Authorization: Bearer <token>` header.*

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Private | Get all user tasks (supports `?status=`, `?priority=`, `?search=`, `?sortBy=`) |
| `POST` | `/api/tasks` | Private | Create task (`title`, `description`, `deadline`, `priority`) |
| `GET` | `/api/tasks/:id` | Private | Get a single task by ID |
| `PUT` | `/api/tasks/:id` | Private | Update an existing task |
| `PATCH`| `/api/tasks/:id/status` | Private | Toggle or set task status (`pending`/`completed`) |
| `DELETE`| `/api/tasks/:id` | Private | Delete a task |

---

## 🔒 Security Best Practices Implemented

- Passwords are salted and hashed with `bcryptjs` before persisting to MongoDB.
- User passwords are automatically excluded from API responses (`toJSON` transform).
- JWT tokens expire after 7 days.
- User tasks are strictly scoped by user ID (`req.user._id`), preventing horizontal privilege escalation.
- Cross-Site Scripting (XSS) prevention on frontend user input rendering.

# 🚆 RailFood - Cloud-Based Station-to-Seat Railway Food Delivery Portal

A full-stack, cloud-native station-to-seat railway food delivery and live tracking platform built with **FastAPI (Python 3.12+)**, **React.js (Vite)**, **Tailwind CSS (Pale Orange / Peach Aesthetic)**, **PostgreSQL (SQLAlchemy ORM)**, **AWS S3 (SSE-S3 AES-256)**, **AWS SES**, and **Nginx** reverse proxy direct hosting (no Docker required).

---

## 🌟 Key Features

### 🚆 Station-to-Seat Ordering & Train Journey Tracking:
- **PNR & Berth Targeted Delivery**: Passengers order meals directly to their specific train coach (e.g., `B2`) and seat/berth number (e.g., `42`) with real-time station routing.
- **Dynamic Platform Menu Catalog**: High-speed filtering by upcoming railway station (NDLS, BCT, MAS, HWH, SBC, PNBE), cuisine type, and dietary preferences (Pure Veg 🟢, Non-Veg 🔴, Beverages ☕).
- **Visual 4-Stage Step Tracker**: Real-time progress monitoring from order placement to berth handoff:  
  $$\text{Ordered} \longrightarrow \text{Kitchen Preparing} \longrightarrow \text{Out for Seat Delivery} \longrightarrow \text{Delivered to Berth}$$
- **Automated Tax Invoices**: Downloadable tax-compliant PDF invoices generated on the fly via ReportLab (`/api/orders/{id}/invoice.pdf`).

### 👨‍🍳 Vendor Kitchen Management & Platform Delivery Queue:
- **Live Kitchen Order Queue**: Platform restaurants receive real-time incoming orders with train number, coach, berth, and passenger contact details.
- **One-Click Order Status Updates**: Kitchen staff update orders through live lifecycle states (`preparing` ➔ `out_for_delivery` ➔ `delivered`), automatically triggering AWS SES email notifications to passengers.
- **Catalog Management & S3 Direct Uploads**: Add and modify food dishes with direct-to-S3 presigned PUT URL uploads with **SSE-S3 AES-256** encryption.

### 🛡️ Role-Based Authentication & Security:
- **Multi-Role Authorization**: Native Role-Based Access Control (`require_role`) isolating `passenger`, `vendor`, and `admin` scopes.
- **Native Bcrypt Password Hashing**: Cryptographic password protection with auto-generated salts and 72-byte safe boundary truncation.
- **JWT Bearer Token Sessions**: Stateless, tamper-proof JSON Web Tokens authorizing all protected backend routes.
- **1-Click Instant Demo Login**: Built-in instant demo login buttons for Passenger, Vendor, and Admin personas for immediate evaluation.

### ☁️ Cloud Infrastructure, AWS S3 & SES Invoicing:
- **AWS Free Tier Optimized (Bare-Metal / No Docker)**: Engineered for t2.micro/t3.micro EC2 instances with Python `venv`, Systemd daemon (`railfood.service`), and Nginx reverse proxy.
- **AWS S3 Cloud Storage**: Food dish photography and vendor FSSAI KYC documents encrypted at rest via **SSE-S3 (AES-256)** with presigned access.
- **AWS SES Transactional Emails**: Automated email dispatch of itemized digital invoices and real-time berth delivery progress updates.
- **Automated CI/CD Pipeline**: GitHub Actions workflow running tests and automated SSH deployment to EC2 on git push to `main`.

### 🎨 Pale Orange / Peach Aesthetic UI:
- **Warm Peach Theme**: Meticulously designed with `bg-orange-50/50`, pure white headers, warm amber/peach accents, and custom peach scrollbars.
- **Zero Dark Blue / Green Dominance**: Clean, inviting warm design system using Lucide-react icons and Plus Jakarta Sans typography.
- **Responsive Seat Cart Drawer**: Live bill calculations, 5% GST breakdown, free berth delivery tag, and checkout modal.

### 📊 Admin Analytics & Concurrency Load Benchmarking:
- **Real-Time Revenue Analytics**: Aggregated platform revenue, completed orders, active customers, and registered vendors.
- **Station Delivery Leaderboard**: Track order volume and sales across major Indian Railways junction stations.
- **Locust Load Testing Suite**: Script simulating 100 to 1,000 concurrent passengers during burst platform arrival windows.

---

## 📂 Project Structure

```
Train-food-tracking-/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline: Test & SSH deployment to EC2
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings, JWT secrets & AWS configs
│   │   │   ├── database.py         # SQLAlchemy engine & resilient SQLite/Postgres fallback
│   │   │   ├── dependencies.py     # OAuth2 bearer token dependencies
│   │   │   └── security.py         # Bcrypt hashing, JWT encode/decode & require_role RBAC
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── models.py           # User, Train, Station, FoodMenu, Order, OrderItem
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py          # Pydantic request & response validation schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # User registration & JWT login
│   │   │   ├── trains.py           # Train schedules & delivery stations directory
│   │   │   ├── menu.py             # Station food catalog & vendor item registration
│   │   │   ├── orders.py           # Seat order placement, status updates & PDF invoice
│   │   │   ├── documents.py        # AWS S3 presigned PUT URL generation
│   │   │   └── admin.py            # Platform revenue & station sales analytics
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── s3_service.py       # AWS S3 client with SSE-S3 AES-256 encryption
│   │   │   └── email.py            # AWS SES digital invoice & order status dispatcher
│   │   ├── __init__.py
│   │   └── main.py                 # FastAPI application, CORS, routers & startup auto-seed
│   ├── tests/
│   │   └── test_api.py             # 13-step full integration and database test suite
│   ├── .env.example                # Sample backend environment template
│   └── requirements.txt            # Python dependencies (FastAPI, SQLAlchemy, Boto3, ReportLab)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Axios client with Bearer Token interceptor & endpoints
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state, login/register & 1-click role switcher
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Warm peach header with navigation & seat cart trigger
│   │   │   └── CartDrawer.jsx      # Seat delivery cart with coach/seat breakdown & checkout
│   │   ├── views/
│   │   │   ├── AuthView.jsx        # Login & registration portal with role selector
│   │   │   ├── OrderFoodView.jsx   # Train/Station selector, dietary filter & food catalog
│   │   │   ├── MyOrdersView.jsx    # Active orders, 4-step progress tracker & invoice PDF
│   │   │   ├── VendorPanelView.jsx # Live kitchen order queue & menu manager with S3 upload
│   │   │   └── AdminAnalyticsView.jsx # Platform metrics cards & station sales leaderboard
│   │   ├── App.jsx                 # Root component, view routing & order confirmed modal
│   │   ├── index.css               # Warm peach design tokens & custom scrollbars
│   │   └── main.jsx                # React DOM entrypoint
│   ├── index.html                  # HTML template with Plus Jakarta Sans typography
│   ├── package.json                # Frontend dependencies (React 18, Vite, Tailwind CSS)
│   ├── postcss.config.js
│   ├── tailwind.config.js          # Extended pale orange & peach color tokens
│   └── vite.config.js              # Vite server & /api proxy configuration
├── scripts/
│   ├── railfood.service            # Systemd service daemon unit file for Uvicorn
│   ├── nginx.conf                  # Nginx reverse proxy configuration (Port 80 -> React & :8000)
│   ├── setup_ec2.sh                # Automated EC2 Ubuntu bootstrap & swap setup script
│   └── deploy.sh                   # Zero-downtime deployment script with health check
├── docs/
│   └── aws_infrastructure_blueprint.md # Complete AWS ALB, ASG, S3 & CloudWatch setup guide
├── locustfile.py                   # Locust load testing script (100–1,000 concurrent users)
├── .gitignore                      # Git ignore rules for node_modules, venv, secrets & DBs
├── LICENSE                         # MIT License
└── README.md                       # Master project documentation
```

---

## 💻 Installation & Setup

### Prerequisites
- **Python**: v3.10+ (v3.12+ recommended) installed.
- **Node.js**: v18.0.0+ (v20+ LTS recommended) and `npm`.
- **Database**: PostgreSQL v14+ (or use the built-in automatic SQLite fallback for instant offline testing).

---

### 1. Clone Repository
```bash
git clone https://github.com/shyamsundarmd19-hub/Train-food-tracking-.git
cd Train-food-tracking-
```

---

### 2. Backend Setup
Navigate into the `backend/` directory, create a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

---

### 3. Configure Environment Variables
Create a `.env` file in the `backend/` directory from the sample template:

```bash
cp .env.example .env
```

Verify or configure your settings in `backend/.env`:
```ini
ENVIRONMENT=development
SECRET_KEY=railfood_super_secret_jwt_key_2026_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# PostgreSQL (AWS RDS or Local). If unreachable locally, automatically falls back to SQLite
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/railfood_db

# AWS Cloud Services (Optional for local testing; IAM Role on EC2 handles this in production)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=railfood-production-assets
SES_REGION=ap-south-1
SES_SENDER_EMAIL=orders@railfood.app
```

---

### 4. Database Setup & Automated Seeding
The backend automatically creates all required tables and seeds default stations (NDLS, BCT, MAS, HWH, SBC, PNBE), express trains, demo users, and meal items upon initial startup:

```bash
# Run the automated 13-step integration test suite to verify database & API functionality:
python -m tests.test_api
```

---

### 5. Frontend Setup
In a new terminal window, navigate into the `frontend/` directory and install npm packages:

```bash
cd frontend
npm install
```

---

### 6. Run the Application

#### Start Backend API (FastAPI + Uvicorn):
```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`
- Health check endpoint: `http://127.0.0.1:8000/health`

#### Start Frontend Client (React + Vite):
```bash
cd frontend
npm run dev
```
Open your browser and visit: **`http://localhost:5173`**

---

## 🌐 Live Demo & Repository Access

- **GitHub Repository**: [https://github.com/shyamsundarmd19-hub/Train-food-tracking-.git](https://github.com/shyamsundarmd19-hub/Train-food-tracking-.git)
- **Local Application URL**: [http://localhost:5173](http://localhost:5173/)
- **Interactive API Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔑 Default Accounts & Sample Tracking Data (Created Automatically)

| Role / Entity | Identifier / Email | Default Password | Features Accessible |
| :--- | :--- | :--- | :--- |
| **Passenger Account** | `amit.sharma@example.com` | `Password123!` | PNR Seat ordering, Cart Drawer, 4-stage live order tracker, PDF tax invoices. |
| **Vendor Restaurant** | `vendor@railfood.app` | `VendorPass123!` | Live kitchen order queue, 1-click status updater, menu manager with S3 photo upload. |
| **Administrator** | `admin@railfood.app` | `AdminPass123!` | Platform revenue metrics, station sales leaderboard, train and station management. |
| **Custom Registration**| Any valid email & phone | User-defined | Creates isolated passenger, vendor, or admin credentials. |
| **Pre-Seeded Stations**| NDLS, BCT, MAS, HWH, SBC, PNBE | Auto-seeded | Major Indian Railways junction stations available for seat delivery. |
| **Pre-Seeded Trains** | 12301, 12951, 22436, 12622 | Auto-seeded | Rajdhani Express, Vande Bharat Express, and Tamil Nadu Express. |

> **Pro Tip:** In the frontend navbar, use the **1-Click Quick Role Switcher** (`Passenger` | `Vendor` | `Admin`) to switch between personas instantly without manual typing.

---

## 🔒 Security Best Practices Implemented

- **SSE-S3 Server-Side Encryption (AES-256)**: All dish images and vendor KYC license documents uploaded to S3 enforce `ServerSideEncryption='AES256'`.
- **Pre-Signed URL Direct Upload Architecture**: Frontend clients upload directly to AWS S3 via temporary presigned PUT URLs, preventing file upload memory spikes on the EC2 host.
- **Native Bcrypt Password Hashing**: Master user passwords are salted and hashed using standard bcrypt algorithms with 72-byte safe boundary truncation.
- **JWT Role-Based Access Control (RBAC)**: All sensitive routes verify signed JWT tokens and enforce strict role boundaries via the `require_role(...)` dependency.
- **SQL Injection Prevention**: Full SQLAlchemy ORM parameterization across all database queries prevents SQL injection vulnerabilities.
- **CORS & Security Headers**: Strict origin policies configured in FastAPI and Nginx security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`).

---

## 📈 Concurrency Load Testing & Performance Benchmarking

RailFood includes a dedicated Locust load testing harness ([`locustfile.py`](file:///d:/projects/railway%20food/locustfile.py)) simulating passenger traffic spikes when express trains arrive at platform stations:

```bash
# 1. Install Locust
pip install locust

# 2. Simulate 100 Concurrent Passengers (10 users/sec spawn rate):
locust -f locustfile.py --headless \
    --users 100 \
    --spawn-rate 10 \
    --run-time 1m \
    --host http://127.0.0.1:8000 \
    --html railfood_load_report_100_users.html

# 3. Simulate 500 Peak Passengers (Junction Arrival Window):
locust -f locustfile.py --headless \
    --users 500 \
    --spawn-rate 50 \
    --run-time 2m \
    --host http://127.0.0.1:8000 \
    --html railfood_load_report_500_users.html

# 4. Interactive Graphical Web Dashboard:
locust -f locustfile.py --host http://127.0.0.1:8000
# Open http://localhost:8089 in your browser to inspect real-time latency percentiles (p50, p95, p99).
```

---

## 📄 License

Distributed under the MIT License. See [LICENSE](file:///d:/projects/railway%20food/LICENSE) for more information.

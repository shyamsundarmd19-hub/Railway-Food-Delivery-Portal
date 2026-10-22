# ☁️ RailFood AWS Infrastructure Blueprint & Cloud Architecture Guide
### High-Availability, Auto-Scaling & Security Setup (No Docker)

This blueprint documents the production-grade AWS architecture for **RailFood**, specifically engineered to handle massive burst traffic during **Train Platform Arrival Windows** (when 500–1,200 passengers per express train place orders within a 15–20 minute station stopover) while minimizing costs using AWS Free Tier and scalable EC2 primitives.

---

## 🏗️ 1. High-Availability Architecture Overview

```
                                  [ Internet Traffic: Train Passengers ]
                                                    │
                                                    ▼ (HTTPS: 443 / HTTP: 80)
                                     ┌─────────────────────────────┐
                                     │  AWS Route 53 (DNS / CDN)   │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │ Application Load Balancer(ALB)│
                                    │ (SSL Termination & Balancing) │
                                    └───────────────┬───────────────┘
                                                    │
                           ┌────────────────────────┴────────────────────────┐
                           ▼                                                 ▼
             ┌───────────────────────────┐                     ┌───────────────────────────┐
             │ EC2 Instance (AZ-1a)      │                     │ EC2 Instance (AZ-1b)      │
             │ Nginx + FastAPI (:8000)   │                     │ Nginx + FastAPI (:8000)   │
             │ /var/www/railfood (React) │                     │ /var/www/railfood (React) │
             └─────────────┬─────────────┘                     └─────────────┬─────────────┘
                           │                                                 │
                           └────────────────────────┬────────────────────────┘
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   ▼                                ▼                                ▼
       ┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
       │ AWS RDS (PostgreSQL)   │       │     AWS S3 Bucket      │       │        AWS SES         │
       │ Multi-AZ Read Replica  │       │ (SSE-S3 AES-256 Rest)  │       │ (Digital Tax Invoices  │
       │ Connection Pooling     │       │ Presigned Direct Upload│       │ & OTP PIN Delivery)    │
       └────────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

---

## ⚡ 2. EC2 Launch Template, ALB & Auto Scaling Group (ASG)

During train arrivals at major junction stations (e.g., New Delhi NDLS or Mumbai Central BCT), passenger traffic spikes exponentially. An Auto Scaling Group (ASG) behind an Application Load Balancer (ALB) dynamically scales EC2 compute instances horizontally without Docker.

### A. EC2 Launch Template Configuration
- **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
- **Instance Type**: `t3.micro` (Free Tier eligible) or `t3.small` / `c6i.large` in high-throughput production
- **Key Pair**: Production SSH Key
- **IAM Instance Profile**: `RailFood-EC2-Production-Role` (grants S3 + SES permissions)
- **User Data Script** (Automates provisioning on launch):

```bash
#!/usr/bin/env bash
set -e

# Update & install dependencies
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx python3 python3-venv python3-pip git curl

# Enable 2GB swap space for t3.micro memory safety
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Clone repository & run setup
mkdir -p /home/ubuntu
cd /home/ubuntu
git clone https://github.com/your-org/railfood.git railfood
chown -R ubuntu:ubuntu /home/ubuntu/railfood
cd /home/ubuntu/railfood

# Run automated deployment
sudo bash scripts/setup_ec2.sh
```

### B. Application Load Balancer (ALB) Setup
1. **Target Group (`railfood-tg-80`)**:
   - Target Type: `Instance`
   - Protocol: `HTTP` on Port `80`
   - Health Check Path: `/health` (FastAPI health route returns `HTTP 200 OK`)
   - Healthy threshold: `2` | Unhealthy threshold: `3` | Timeout: `5s` | Interval: `15s`
2. **Listener Rules**:
   - Port 80: Forward to `railfood-tg-80` (or redirect to 443 HTTPS).
   - Port 443: SSL Certificate via AWS Certificate Manager (ACM).

### C. Auto Scaling Group (ASG) Policies
- **Group Size**:
  - Minimum Capacity: `1`
  - Desired Capacity: `2`
  - Maximum Capacity: `6` (scaled during train arrival peaks)
- **Target Tracking Scaling Policy**:
  - Metric: `ASGAverageCPUUtilization`
  - Target Value: `65%`
  - Warmup Time: `120 seconds`
- **Station Peak Scheduled Scaling (Optional)**:
  - Add scheduled actions for scheduled express train arrival rush hours (e.g. 07:00–09:00 and 18:00–21:00).

---

## 🪣 3. AWS S3 Bucket Security & SSE-S3 Encryption Policy

RailFood stores high-resolution food dish photos and vendor KYC licenses in AWS S3. All data at rest is enforced with **SSE-S3 (AES-256)** encryption, and direct public access is blocked in favor of **Presigned URLs**.

### A. S3 Public Access Block Configuration
Ensure all 4 public access blocks are enabled in the S3 console:
- `BlockPublicAcls`: **TRUE**
- `IgnorePublicAcls`: **TRUE**
- `BlockPublicPolicy`: **TRUE**
- `RestrictPublicBuckets`: **TRUE**

### B. S3 Bucket Policy (Enforce HTTPS & SSE-S3 AES-256)
Replace `railfood-production-assets` with your S3 bucket name:

```json
{
  "Version": "2012-10-17",
  "Id": "RailFoodS3SecurityPolicy",
  "Statement": [
    {
      "Sid": "EnforceTLSRequestsOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::railfood-production-assets",
        "arn:aws:s3:::railfood-production-assets/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "EnforceServerSideEncryptionAES256",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::railfood-production-assets/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### C. CORS Configuration for Direct S3 Presigned Uploads
Allows the React frontend client to execute direct `PUT` uploads via Presigned URLs:

```json
[
  {
    "AllowedHeaders": [
      "Content-Type",
      "x-amz-server-side-encryption",
      "Authorization"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://railfood.app",
      "http://localhost:5173",
      "http://localhost"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🔑 4. IAM Least-Privilege Role Policies

Instead of hardcoding AWS secret keys in `.env`, the EC2 instances attach an **IAM Instance Profile** (`RailFood-EC2-Production-Role`).

### A. S3 Least-Privilege Policy (`RailFood-S3-Policy`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3RailfoodBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::railfood-production-assets/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::railfood-production-assets"
    }
  ]
}
```

### B. SES Least-Privilege Policy (`RailFood-SES-Policy`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESEmailSending",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "orders@railfood.app"
        }
      }
    }
  ]
}
```

---

## 🚨 5. AWS CloudWatch Alarms & Monitoring

To maintain 99.9% uptime during railway peak catering intervals, configure the following CloudWatch Alarms:

### Alarm 1: EC2 High CPU Utilization (> 80%)
Triggers immediate notifications if instance CPU stays above 80% for 3 consecutive minutes:
- **Metric**: `AWS/EC2 -> CPUUtilization`
- **Threshold**: `>= 80%`
- **Period**: `1 minute` (3 evaluation periods)
- **Action**: Send SNS Alert to `arn:aws:sns:ap-south-1:123456789012:railfood-devops-alerts` and trigger Auto Scaling Out (+1 instance).

### Alarm 2: Application Load Balancer 5xx Error Rate
Alerts when backend FastAPI instances return HTTP 500/502/503 responses:
- **Metric**: `AWS/ApplicationELB -> HTTPCode_Target_5XX_Count`
- **Threshold**: `>= 15`
- **Period**: `1 minute` (2 evaluation periods)
- **Action**: Send High Priority PagerDuty / SNS Alert.

### CloudWatch Alarm Setup via AWS CLI:
```bash
# 1. Create High CPU Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "RailFood-EC2-HighCPU-Alert" \
    --alarm-description "Alert when RailFood EC2 instance CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 60 \
    --threshold 80 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 3 \
    --alarm-actions arn:aws:sns:ap-south-1:123456789012:railfood-devops-alerts

# 2. Create 5xx Error Rate Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "RailFood-ALB-Target-5XX-Alarm" \
    --alarm-description "Alert on excessive backend 5xx errors" \
    --metric-name HTTPCode_Target_5XX_Count \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 60 \
    --threshold 15 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:ap-south-1:123456789012:railfood-devops-alerts
```

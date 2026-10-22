import random
import uuid
from locust import HttpUser, task, between, events


class RailFoodPassengerUser(HttpUser):
    """
    Simulates a passenger on a train approaching an upcoming railway station.
    Simulates browsing the platform menu, selecting meals, ordering food to their coach berth,
    and monitoring live preparation & delivery status.
    """

    # Passengers wait between 1 to 3 seconds between actions (realistic burst behavior)
    wait_time = between(1, 3)

    def on_start(self):
        """Register or login as a passenger user and obtain a JWT bearer token."""
        self.user_email = f"passenger_{uuid.uuid4().hex[:8]}@railtest.com"
        self.password = "Pass123456!"
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        self.my_orders = []

        # 1. Register Passenger
        register_payload = {
            "name": f"Passenger {random.randint(100, 999)}",
            "email": self.user_email,
            "phone": f"+9198{random.randint(10000000, 99999999)}",
            "password": self.password,
            "role": "passenger",
        }
        with self.client.post("/api/auth/register", json=register_payload, catch_response=True) as resp:
            if resp.status_code in [200, 201]:
                resp.success()
            elif resp.status_code == 400:
                resp.success()  # User exists, proceed to login

        # 2. Login to get JWT Bearer Token
        login_payload = {"email": self.user_email, "password": self.password}
        with self.client.post("/api/auth/login", json=login_payload, catch_response=True) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                self.headers["Authorization"] = f"Bearer {self.token}"
                resp.success()
            else:
                resp.failure(f"Login failed with HTTP {resp.status_code}")

    @task(5)
    def browse_trains_and_stations(self):
        """Simulates browsing trains and identifying upcoming delivery station stops."""
        with self.client.get("/api/trains/", headers=self.headers, name="1. Browse Trains & Stations") as resp:
            if resp.status_code == 200:
                resp.success()

    @task(4)
    def view_station_menu(self):
        """Simulates browsing available meals for upcoming station (e.g. Station ID 1: NDLS)."""
        station_id = random.choice([1, 2, 3])
        category = random.choice(["veg", "non-veg", "beverages", None])
        url = f"/api/menu/?station_id={station_id}"
        if category:
            url += f"&category={category}"

        with self.client.get(url, headers=self.headers, name="2. View Station Food Menu") as resp:
            if resp.status_code == 200:
                resp.success()

    @task(3)
    def place_seat_order(self):
        """Simulates passenger placing a meal delivery order directly to coach & berth."""
        if not self.token:
            return

        # Fetch menu to pick a valid item
        menu_resp = self.client.get("/api/menu/?station_id=1", headers=self.headers)
        if menu_resp.status_code == 200 and menu_resp.json():
            items = menu_resp.json()
            chosen_item = random.choice(items)

            coach_list = ["B1", "B2", "B3", "A1", "S2", "S4"]
            order_payload = {
                "vendor_id": chosen_item["vendor_id"],
                "train_number": random.choice(["12301", "12951", "22436"]),
                "coach_number": random.choice(coach_list),
                "seat_number": str(random.randint(1, 72)),
                "station_id": chosen_item["station_id"],
                "items": [
                    {"menu_id": chosen_item["id"], "quantity": random.randint(1, 2)}
                ],
            }

            with self.client.post("/api/orders/", json=order_payload, headers=self.headers, name="3. Place Station-to-Seat Order") as resp:
                if resp.status_code in [200, 201]:
                    order_data = resp.json()
                    self.my_orders.append(order_data["id"])
                    resp.success()
                else:
                    resp.failure(f"Place order failed: {resp.text}")

    @task(2)
    def track_order_history(self):
        """Simulates passenger tracking their active order status."""
        if not self.token:
            return

        with self.client.get("/api/orders/", headers=self.headers, name="4. Track Passenger Orders") as resp:
            if resp.status_code == 200:
                resp.success()

    @task(1)
    def download_tax_invoice(self):
        """Simulates passenger downloading PDF delivery invoice."""
        if not self.token or not self.my_orders:
            return

        order_id = random.choice(self.my_orders)
        url = f"/api/orders/{order_id}/invoice.pdf"
        with self.client.get(url, headers=self.headers, name="5. Stream PDF Tax Invoice") as resp:
            if resp.status_code == 200 and resp.headers.get("content-type") == "application/pdf":
                resp.success()


# Custom CLI execution documentation
"""
================================================================================
How to Run RailFood Concurrency Load Tests (100 to 1,000 Concurrent Passengers):
================================================================================

1. Install Locust:
   pip install locust

2. Run in Headless CLI Mode (Simulating 100 Passengers, 10 spawn rate, 1 minute):
   locust -f locustfile.py --headless \
       --users 100 \
       --spawn-rate 10 \
       --run-time 1m \
       --host http://127.0.0.1:8000 \
       --html railfood_load_report_100_users.html \
       --csv railfood_stats_100

3. Run Burst Concurrency Test (Simulating 500 Peak Passengers on Platform Arrival):
   locust -f locustfile.py --headless \
       --users 500 \
       --spawn-rate 50 \
       --run-time 2m \
       --host http://<EC2-PUBLIC-IP> \
       --html railfood_load_report_500_users.html \
       --csv railfood_stats_500

4. Run Maximum Stress Test (1,000 Concurrent Passengers across Junction Station):
   locust -f locustfile.py --headless \
       --users 1000 \
       --spawn-rate 100 \
       --run-time 3m \
       --host http://<ALB-OR-EC2-PUBLIC-IP> \
       --html railfood_load_report_1000_users.html \
       --csv railfood_stats_1000

5. Run with Interactive Web UI Dashboard:
   locust -f locustfile.py --host http://127.0.0.1:8000
   Open browser at: http://localhost:8089 to start/stop tests and inspect real-time latency percentiles.
"""

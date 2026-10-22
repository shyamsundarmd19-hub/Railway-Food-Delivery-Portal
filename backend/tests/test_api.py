from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.main import seed_initial_data


def test_full_api_suite():
    # Explicitly ensure tables exist and seed data is populated for test environment
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    with TestClient(app) as client:
        # 1. Health and root
        res = client.get("/")
        assert res.status_code == 200
        assert res.json()["status"] == "online"

        res_health = client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "ok"

        # 2. Register Passenger
        passenger_payload = {
            "name": "Amit Sharma",
            "email": "amit.sharma@example.com",
            "phone": "+919876543210",
            "password": "Password123!",
            "role": "passenger"
        }
        reg_res = client.post("/api/auth/register", json=passenger_payload)
        if reg_res.status_code != 201:
            assert reg_res.status_code == 400

        # 3. Login Passenger
        login_res = client.post("/api/auth/login", json={
            "email": "amit.sharma@example.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token_data = login_res.json()
        passenger_token = token_data["access_token"]
        assert token_data["role"] == "passenger"

        # 4. Query Trains and Stations
        trains_res = client.get("/api/trains/")
        assert trains_res.status_code == 200
        trains = trains_res.json()
        assert len(trains) > 0
        first_train = trains[0]
        station_id = first_train["upcoming_stations"][0]["id"]

        # 5. Query Menu for Station
        menu_res = client.get(f"/api/menu/?station_id={station_id}")
        assert menu_res.status_code == 200
        menu_items = menu_res.json()
        assert len(menu_items) > 0
        first_item = menu_items[0]

        # 6. Place Food Order
        order_payload = {
            "vendor_id": first_item["vendor_id"],
            "train_number": first_train["train_number"],
            "coach_number": "B2",
            "seat_number": "42",
            "station_id": station_id,
            "items": [
                {"menu_id": first_item["id"], "quantity": 2}
            ]
        }
        order_res = client.post(
            "/api/orders/",
            json=order_payload,
            headers={"Authorization": f"Bearer {passenger_token}"}
        )
        assert order_res.status_code == 201
        order_data = order_res.json()
        order_id = order_data["id"]
        assert order_data["status"] == "ordered"
        assert order_data["total_amount"] == first_item["price"] * 2

        # 7. Passenger Order History
        history_res = client.get(
            "/api/orders/",
            headers={"Authorization": f"Bearer {passenger_token}"}
        )
        assert history_res.status_code == 200
        assert len(history_res.json()) >= 1

        # 8. Login as Vendor
        vendor_login = client.post("/api/auth/login", json={
            "email": "vendor@railfood.app",
            "password": "VendorPass123!"
        })
        assert vendor_login.status_code == 200
        vendor_token = vendor_login.json()["access_token"]

        # 9. Vendor Incoming Orders
        v_orders = client.get(
            "/api/orders/vendor",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert v_orders.status_code == 200
        assert len(v_orders.json()) >= 1

        # 10. Vendor Updates Status: preparing -> out_for_delivery -> delivered
        for next_status in ["preparing", "out_for_delivery", "delivered"]:
            status_res = client.put(
                f"/api/orders/{order_id}/status",
                json={"status": next_status},
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert status_res.status_code == 200
            assert status_res.json()["status"] == next_status

        # 11. Documents S3 Presigned URL
        doc_res = client.post(
            "/api/documents/upload-url",
            json={"filename": "thali_photo.jpg", "content_type": "image/jpeg", "folder": "menu-photos"},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert doc_res.status_code == 200
        assert "upload_url" in doc_res.json()
        assert "s3_key" in doc_res.json()

        # 12. Admin Login & Analytics
        admin_login = client.post("/api/auth/login", json={
            "email": "admin@railfood.app",
            "password": "AdminPass123!"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]

        analytics_res = client.get(
            "/api/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert analytics_res.status_code == 200
        analytics = analytics_res.json()
        assert analytics["total_orders"] >= 1
        assert analytics["completed_orders"] >= 1
        assert analytics["total_revenue"] > 0
        assert len(analytics["top_selling_stations"]) > 0

        # 13. Download PDF Invoice
        pdf_res = client.get(
            f"/api/orders/{order_id}/invoice.pdf",
            headers={"Authorization": f"Bearer {passenger_token}"}
        )
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert len(pdf_res.content) > 100

        print("\n========================================================")
        print("[PASS] ALL 13 RAILFOOD CORE BACKEND TESTS PASSED SUCCESSFULLY!")
        print("========================================================")


if __name__ == "__main__":
    test_full_api_suite()

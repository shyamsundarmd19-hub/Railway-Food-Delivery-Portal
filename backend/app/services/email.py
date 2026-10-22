import boto3
from botocore.exceptions import ClientError
from typing import List, Optional, Dict, Any
from app.core.config import settings


class EmailService:
    """
    AWS SES Notification & Digital Invoice Service.
    Optimized for AWS Free Tier (62,000 free outbound emails/month when invoked from EC2).
    """

    def __init__(self):
        self.region = settings.SES_REGION
        self.sender = settings.SES_SENDER_EMAIL
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                self._client = boto3.client(
                    "ses",
                    region_name=self.region,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
            else:
                # Default provider chain: IAM Role attached to EC2 instance
                self._client = boto3.client("ses", region_name=self.region)
        return self._client

    def send_order_placed_invoice(
        self,
        to_email: str,
        passenger_name: str,
        order_id: str,
        train_number: str,
        coach_number: str,
        seat_number: str,
        station_name: str,
        items: List[Dict[str, Any]],
        total_amount: float,
    ) -> bool:
        """Sends an itemized digital order confirmation & invoice to the passenger."""
        subject = f"RailFood Invoice: Order #{str(order_id)[:8]} Confirmed - Delivery to Berth {coach_number}/{seat_number}"

        items_rows_html = "".join([
            f"""
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">{item.get('name', 'Meal Item')}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">{item.get('quantity', 1)}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: right;">₹{item.get('unit_price', 0):.2f}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #047857; text-align: right;">₹{(item.get('quantity', 1) * item.get('unit_price', 0)):.2f}</td>
            </tr>
            """
            for item in items
        ])

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #bbf7d0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(16,185,129,0.12); }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 28px 24px; text-align: center; }}
            .logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }}
            .tagline {{ font-size: 13px; opacity: 0.9; margin-top: 4px; }}
            .content {{ padding: 24px; }}
            .pill {{ display: inline-block; background-color: #d1fae5; color: #065f46; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }}
            .details-box {{ background-color: #f7faf8; border: 1px solid #dcfce7; border-radius: 12px; padding: 16px; margin: 16px 0; }}
            .detail-line {{ display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }}
            .items-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
            .items-table th {{ background: #f0fdf4; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }}
            .total-box {{ background: #ecfdf5; border-radius: 10px; padding: 14px; margin-top: 16px; text-align: right; }}
            .footer {{ text-align: center; padding: 20px; font-size: 11px; color: #64748b; background: #fafafa; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚆 RailFood</div>
              <div class="tagline">Station-to-Seat Railway Catering &bull; AWS Free Tier Cloud</div>
            </div>
            <div class="content">
              <span class="pill">Order Confirmed &amp; Invoiced</span>
              <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 8px 0;">Hello {passenger_name},</h2>
              <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">
                Thank you for ordering with RailFood! Your meal order has been forwarded to our verified restaurant vendor. It will be freshly prepared and delivered straight to your train seat.
              </p>

              <div class="details-box">
                <div style="font-weight: 700; font-size: 13px; color: #047857; margin-bottom: 8px;">Train Berth Delivery Details</div>
                <div class="detail-line"><span>Order Reference:</span> <strong>#{str(order_id)[:8]}</strong></div>
                <div class="detail-line"><span>Train Number:</span> <strong>{train_number}</strong></div>
                <div class="detail-line"><span>Coach &amp; Seat:</span> <strong>Coach {coach_number}, Berth {seat_number}</strong></div>
                <div class="detail-line"><span>Boarding Platform Station:</span> <strong>{station_name}</strong></div>
              </div>

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items_rows_html}
                </tbody>
              </table>

              <div class="total-box">
                <span style="font-size: 13px; color: #047857; font-weight: 600;">Total Paid Amount:</span>
                <span style="font-size: 20px; color: #064e3b; font-weight: 800; margin-left: 8px;">₹{total_amount:.2f}</span>
              </div>
            </div>
            <div class="footer">
              RailFood Express Catering &bull; Direct Hosting (FastAPI, Nginx, PostgreSQL, S3 &amp; SES) &bull; Have a pleasant journey!
            </div>
          </div>
        </body>
        </html>
        """

        return self._send_email(to_email, subject, html_body)

    def send_order_status_update(
        self,
        to_email: str,
        passenger_name: str,
        order_id: str,
        new_status: str,
        train_number: str,
        coach_number: str,
        seat_number: str,
        station_name: str,
    ) -> bool:
        """Notifies passenger whenever vendor updates the order progress."""
        status_labels = {
            "ordered": ("Order Received", "#0284c7"),
            "preparing": ("Kitchen Is Preparing Your Fresh Meal", "#d97706"),
            "out_for_delivery": ("Delivery Executive Boarded Train at Platform", "#059669"),
            "delivered": ("Successfully Delivered to Berth", "#16a34a"),
            "cancelled": ("Order Cancelled", "#dc2626"),
        }

        label, color = status_labels.get(new_status.lower(), (new_status.title(), "#059669"))
        subject = f"RailFood Update: Order #{str(order_id)[:8]} is now {label}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 24px; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #bbf7d0; overflow: hidden; }}
            .header {{ background: #047857; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 24px; }}
            .status-banner {{ background: {color}; color: white; text-align: center; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 16px 0; }}
            .box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.6; color: #334155; }}
            .footer {{ text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; font-size: 20px;">🚆 RailFood Live Status</h2>
            </div>
            <div class="content">
              <p>Hi <strong>{passenger_name}</strong>,</p>
              <p style="font-size: 13px; color: #475569;">The status of your meal order has been updated:</p>

              <div class="status-banner">
                {label}
              </div>

              <div class="box">
                <div><strong>Order ID:</strong> #{str(order_id)[:8]}</div>
                <div><strong>Train:</strong> {train_number}</div>
                <div><strong>Delivery Berth:</strong> Coach {coach_number}, Seat {seat_number}</div>
                <div><strong>Station:</strong> {station_name}</div>
              </div>
            </div>
            <div class="footer">
              RailFood Cloud Services &bull; Powered by AWS SES Free Tier
            </div>
          </div>
        </body>
        </html>
        """

        return self._send_email(to_email, subject, html_body)

    def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Internal helper to dispatch email via AWS SES client with safe fallback."""
        try:
            self.client.send_email(
                Source=self.sender,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
                },
            )
            return True
        except ClientError as e:
            # Non-blocking log: SES Sandbox or missing credentials
            print(f"[AWS SES Note] Could not dispatch email to {to_email}: {e.response['Error']['Message']}")
            return False
        except Exception as ex:
            print(f"[AWS SES Note] Unexpected email dispatch error: {ex}")
            return False


email_service = EmailService()

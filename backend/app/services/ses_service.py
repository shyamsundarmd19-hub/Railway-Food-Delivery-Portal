import boto3
from botocore.exceptions import ClientError
from typing import Optional, List
from app.core.config import settings


class SESService:
    def __init__(self):
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.ses_client = boto3.client(
                "ses",
                region_name=settings.SES_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        else:
            self.ses_client = boto3.client("ses", region_name=settings.SES_REGION)
        self.sender = settings.SES_SENDER_EMAIL

    def send_order_confirmation(
        self,
        to_email: str,
        passenger_name: str,
        order_id: str,
        train_number: str,
        coach: str,
        seat: str,
        station_name: str,
        delivery_pin: str,
        total_amount: float,
    ) -> bool:
        """Send seat delivery order confirmation with delivery verification OTP/PIN."""
        subject = f"RailFood Order Confirmed #{order_id} - Delivery to Seat {coach}/{seat}"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px; }}
            .card {{ max-width: 580px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #dcfce7; }}
            .header {{ text-align: center; border-bottom: 2px solid #bbf7d0; padding-bottom: 16px; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #059669; }}
            .badge {{ display: inline-block; background-color: #10b981; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-top: 8px; }}
            .pin-box {{ background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 10px; text-align: center; padding: 14px; margin: 20px 0; }}
            .pin {{ font-size: 28px; letter-spacing: 4px; font-weight: 800; color: #065f46; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }}
            .footer {{ text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">🚆 RailFood</div>
              <p style="color: #047857; margin: 4px 0 0 0;">Station-to-Seat Express Catering</p>
              <div class="badge">Order Confirmed</div>
            </div>
            
            <p>Dear <strong>{passenger_name}</strong>,</p>
            <p>Your meal order has been sent to our verified restaurant vendor at <strong>{station_name}</strong>. It will be freshly delivered right to your train berth!</p>

            <div class="pin-box">
              <div style="font-size: 13px; color: #047857; font-weight: 600;">YOUR DELIVERY VERIFICATION PIN</div>
              <div class="pin">{delivery_pin}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">Share this PIN with delivery executive upon receiving food</div>
            </div>

            <div style="margin-top: 16px;">
              <div class="detail-row"><span>Train No / Name:</span> <strong>{train_number}</strong></div>
              <div class="detail-row"><span>Coach & Seat:</span> <strong>{coach} - Berth {seat}</strong></div>
              <div class="detail-row"><span>Delivery Station:</span> <strong>{station_name}</strong></div>
              <div class="detail-row"><span>Total Paid:</span> <strong>₹{total_amount:.2f}</strong></div>
            </div>

            <div class="footer">
              <p>RailFood Cloud Services &bull; Powered by AWS Free Tier &bull; Happy Journey!</p>
            </div>
          </div>
        </body>
        </html>
        """

        try:
            self.ses_client.send_email(
                Source=self.sender,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {"Data": html_body, "Charset": "UTF-8"},
                    },
                },
            )
            return True
        except ClientError as e:
            print(f"SES Send Email Error: {e}")
            return False


ses_service = SESService()

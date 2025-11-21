export function generateOtpEmailTemplate(companyName: string, otp: string) {
  return `
   <!DOCTYPE html>

    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${companyName} - Verify Your Email</title>

        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Montserrat', sans-serif;
                line-height: 1.6;
                color: #111111;
            }

            body {
                background-color: #f5f5f5;
                padding: 20px;
            }

            .container {
                max-width: 600px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
                border: 1px solid #e5e5e5;
            }

            .header p {
                font-size: 14px;
                width: 100%;
                color: #ffffff;
                height: auto;
            }

            .header {
                background: #000000;
                padding: 40px 20px;
                text-align: center;
                color: #ffffff;

                position: relative;
                overflow: hidden;
            }

            .header::after {
                content: '';
                position: absolute;
                bottom: 0;
            }

            .header img {
                max-width: 80px;
            }

            .content {
                padding: 40px;
                background: #ffffff;
            }

            .message-box {
                background: #fafafa;
                border-left: 4px solid #000000;
                border-radius: 6px;
                padding: 25px;
                margin: 30px 0;
                line-height: 1.7;
                color: #111111;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                text-align: center;
            }

            .otp-box {
                margin: 20px 0;
                padding: 16px 24px;
                border-radius: 12px;
                background-color: #000000;
                border: 1px solid #000000;
                display: inline-block;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 6px;
                color: #ffffff;
            }

            .signature {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e5e5;
                text-align: right;
            }

            .company-name {
                font-family: 'Playfair Display', serif;
                font-weight: 600;
                color: #000000;
                font-size: 18px;
                margin-top: 5px;
            }

            .footer {
                text-align: center;
                padding: 25px 20px;
                font-size: 13px;
                color: #777777;
                background-color: #f5f5f5;
                border-top: 1px solid #e5e5e5;
            }

            .copyright {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e5e5e5;
                color: #777777;
                font-size: 12px;
            }

            @media (max-width: 640px) {
                body {
                    padding: 10px;
                }

                .container {
                    margin: 15px auto;
                    border-radius: 12px;
                }

                .header {
                    padding: 30px 15px;
                }

                .header img {
                    max-width: 120px;
                }

                .content {
                    padding: 25px 20px;
                }

                .message-box {
                    padding: 20px;
                }
            }
        </style>

    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://res.cloudinary.com/dlpetmfks/image/upload/v1763749945/v_logo_cmzrfr.png" alt="${companyName} logo" />
                <p>Email Verification Code</p>
            </div>

            <div class="content">
                <div class="message-box">
                    <p>Use the one-time password (OTP) below to verify your email address for <strong>${companyName}</strong>.</p>
                    <div class="otp-box">${otp}</div>
                    <p>This code will expire shortly. If you did not request this code, you can safely ignore this email.</p>
                </div>

                <div class="signature">
                    <div>Warm regards,</div>
                    <div class="company-name">The ${companyName} Team</div>
                </div>
            </div>

            <div class="footer">
                <p>If you did not request this email, please ignore it.</p>
                <p class="copyright">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
        </div>

    </body>
    </html>
  `;
}

export function generateMessageEmailTemplate(
  companyName: string,
  recipientName: string,
  message: string
) {
  return `
   <!DOCTYPE html>

    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${companyName} - New Message</title>

        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Montserrat', sans-serif;
                line-height: 1.6;
                color: #111111;
            }

            body {
                background-color: #f5f5f5;
                padding: 20px;
            }

            .container {
                max-width: 600px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
                border: 1px solid #e5e5e5;
            }

            .header p {
                font-size: 14px;
                width: 100%;
                color: #ffffff;
                height: auto;
            }

            .header {
                background: #000000;
                padding: 40px 20px;
                text-align: center;
                color: #ffffff;

                position: relative;
                overflow: hidden;
            }

            .header::after {
                content: '';
                position: absolute;
                bottom: 0;
            }

            .header img {
                max-width: 80px;
            }

            .content {
                padding: 40px;
                background: #ffffff;
            }

            .message-box {
                background: #fafafa;
                border-left: 4px solid #000000;
                border-radius: 6px;
                padding: 25px;
                margin: 30px 0;
                line-height: 1.7;
                color: #111111;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }

            .message-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }

            .message-body {
                font-size: 14px;
                white-space: pre-line;
                margin-top: 10px;
            }

            .signature {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e5e5;
                text-align: right;
            }

            .company-name {
                font-family: 'Playfair Display', serif;
                font-weight: 600;
                color: #000000;
                font-size: 18px;
                margin-top: 5px;
            }

            .footer {
                text-align: center;
                padding: 25px 20px;
                font-size: 13px;
                color: #777777;
                background-color: #f5f5f5;
                border-top: 1px solid #e5e5e5;
            }

            .copyright {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e5e5e5;
                color: #777777;
                font-size: 12px;
            }

            @media (max-width: 640px) {
                body {
                    padding: 10px;
                }

                .container {
                    margin: 15px auto;
                    border-radius: 12px;
                }

                .header {
                    padding: 30px 15px;
                }

                .header img {
                    max-width: 120px;
                }

                .content {
                    padding: 25px 20px;
                }

                .message-box {
                    padding: 20px;
                }
            }
        </style>

    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://res.cloudinary.com/dlpetmfks/image/upload/v1763749945/v_logo_cmzrfr.png" alt="${companyName} logo" />
                <p>New Message from ${companyName}</p>
            </div>

            <div class="content">
                <div class="message-box">
                    <p>Hi ${recipientName},</p>
                    <div class="message-title">You have a new message from ${companyName}</div>
                    <div class="message-body">${message}</div>
                </div>

                <div class="signature">
                    <div>Warm regards,</div>
                    <div class="company-name">The ${companyName} Team</div>
                </div>
            </div>

            <div class="footer">
                <p>You are receiving this email because you have an account with ${companyName}.</p>
                <p class="copyright">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
        </div>

    </body>
    </html>
  `;
}
export function generateEmailTemplate(companyName: string, recipientName: string, message: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${companyName} - Important Message</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Montserrat', sans-serif;
                line-height: 1.6;
                color: #2c1810;
            }

            body {
                background-color: #faf5f2;
                padding: 20px;
            }

            .container {
                max-width: 600px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(92, 22, 26, 0.1);
                border: 1px solid #f0e6e0;
            }

            .header {
                background: linear-gradient(135deg, #5c161a 0%, #7d1d23 100%);
                padding: 40px 20px;
                text-align: center;
                color: white;
                position: relative;
                overflow: hidden;
            }

            .header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 8px;
                background: linear-gradient(90deg, #8b2630, #5c161a);
            }

            .header h1 {
                font-family: 'Playfair Display', serif;
                font-size: 36px;
                font-weight: 700;
                margin: 10px 0 5px;
                letter-spacing: 1px;
                text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
            }

            .header p {
                font-size: 14px;
                opacity: 0.9;
                font-weight: 300;
                letter-spacing: 0.5px;
            }

            .content {
                padding: 40px;
                background: #fff;
            }

            .greeting {
                font-family: 'Playfair Display', serif;
                font-size: 22px;
                color: #5c161a;
                margin-bottom: 25px;
                font-weight: 500;
                border-bottom: 2px solid #f0e6e0;
                padding-bottom: 15px;
            }

            .message-box {
                background: #fefcfb;
                border-left: 4px solid #8b2630;
                border-radius: 6px;
                padding: 25px;
                margin: 30px 0;
                line-height: 1.7;
                color: #2c1810;
                box-shadow: 0 2px 8px rgba(92, 22, 26, 0.05);
            }

            .signature {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #f0e6e0;
                text-align: right;
            }

            .company-name {
                font-family: 'Playfair Display', serif;
                font-weight: 600;
                color: #5c161a;
                font-size: 18px;
                margin-top: 5px;
            }

            .footer {
                text-align: center;
                padding: 25px 20px;
                font-size: 13px;
                color: #8c8c8c;
                background-color: #faf5f2;
                border-top: 1px solid #f0e6e0;
            }

            .social-links {
                margin: 15px 0;
            }

            .social-links a {
                display: inline-block;
                margin: 0 8px;
                color: #8b2630;
                font-size: 18px;
                transition: color 0.3s;
            }

            .social-links a:hover {
                color: #5c161a;
            }

            .footer p {
                margin-bottom: 10px;
                line-height: 1.6;
            }

            .footer a {
                color: #8b2630;
                text-decoration: none;
                font-weight: 500;
                margin: 0 10px;
                transition: color 0.3s;
            }

            .footer a:hover {
                color: #5c161a;
                text-decoration: underline;
            }

            .copyright {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #f0e6e0;
                color: #8c8c8c;
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

                .header h1 {
                    font-size: 28px;
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
                <h1>${companyName}</h1>
                <p>Your Trusted Partner</p>
            </div>

            <div class="content">
                <div class="greeting">
                    Dear ${recipientName},
                </div>

                <div class="message-box">
                    ${message.replace(/\n/g, '<br>')}
                </div>

                <div class="signature">
                    <div>Warm regards,</div>
                    <div class="company-name">The ${companyName} Team</div>
                </div>
            </div>

            <div class="footer">
                <div class="social-links">
                    <a href="#" aria-label="Facebook">
                        <i class="fab fa-facebook"></i> Facebook
                    </a>
                    <a href="#" aria-label="Twitter">
                        <i class="fab fa-twitter"></i> Twitter
                    </a>
                    <a href="#" aria-label="Instagram">
                        <i class="fab fa-instagram"></i> Instagram
                    </a>
                </div>
                <p>If you have any questions, please don't hesitate to contact us at <a href="mailto:support@vetted.com">support@vetted.com</a></p>
                <p>
                    <a href="https://vetted.com">Our Website</a>
                    <a href="https://vetted.com/privacy">Privacy Policy</a>
                    <a href="https://vetted.com/terms">Terms of Service</a>
                </p>
                <p class="copyright">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}
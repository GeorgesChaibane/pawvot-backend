# Setting Up Gmail SMTP for PawVot Email Notifications

This guide will walk you through setting up Gmail SMTP for sending account verification emails and order confirmations in PawVot.

## Prerequisites

1. A Gmail account
2. Two-factor authentication enabled on your Gmail account

## Step 1: Enable Two-Factor Authentication

1. Go to your [Google Account settings](https://myaccount.google.com)
2. Navigate to the "Security" tab
3. Under "Signing in to Google," find "2-Step Verification" and turn it on
4. Follow Google's prompts to complete the setup

## Step 2: Generate an App Password

1. After enabling 2-Step Verification, go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "App" dropdown and choose "Other (Custom name)"
3. Enter "PawVot" or another recognizable name
4. Click "Generate"
5. Google will display a 16-character password. **Copy this password and keep it secure!**
6. This password will be used in your `.env` file

## Step 3: Update Your Environment Variables

Add the following to your `.env` file in the server directory:

```
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_gmail_email@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
EMAIL_FROM=your_gmail_email@gmail.com
```

Replace the placeholder values with your actual Gmail address and the app password you generated.

## Step 4: Test the Email Service

After setting up the environment variables, you can test that the email service is working correctly:

1. Start the server
2. Check the console logs for "SMTP server connection established successfully"
3. Test account verification by registering a new user
4. Test order confirmation by placing a test order

## Troubleshooting

If you encounter issues:

1. **Connection errors**: Ensure your app password is correct and hasn't expired
2. **Email not sending**: Check if your Gmail account has enough sending quota (free Gmail accounts have a limit of approximately 500 emails per day)
3. **Authentication failures**: Make sure your Gmail account is not blocking the access and that the app password is correctly entered

## Security Best Practices

1. Never commit your `.env` file to version control
2. Regularly rotate your app password for better security
3. Consider using a dedicated email service provider like SendGrid, Mailgun, or Amazon SES for production environments with high email volume

## Gmail Limitations

Be aware that Gmail has the following limitations:

- Free Gmail accounts can send approximately 500 emails per day
- Google Workspace accounts can send up to 2,000 emails per day
- Individual email size limit is 25MB (including attachments)

For high-volume applications, consider upgrading to a dedicated email service provider.

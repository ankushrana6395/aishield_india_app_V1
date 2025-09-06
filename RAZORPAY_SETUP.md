# Razorpay Setup for Testing

To enable payment functionality in the application, you need to set up Razorpay test keys. Follow these steps:

## 1. Sign up for Razorpay

1. Go to [https://razorpay.com/](https://razorpay.com/)
2. Click on "Sign Up" and create a free account
3. Complete the verification process

## 2. Get Test Keys

1. After logging in, go to the Razorpay Dashboard
2. Navigate to "Settings" → "API Keys"
3. Click on "Generate Test Key"
4. Copy both the "Key ID" and "Key Secret"

## 3. Update Environment Variables

### Server-side (.env file)
Replace the placeholder values in your `.env` file:
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Client-side (client/.env file)
Replace the placeholder value in your `client/.env` file:
```
REACT_APP_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
```

## 4. Test Payments

Razorpay provides test cards for testing payments:

### Test Card Details
- Card Number: 4111 1111 1111 1111
- Expiry: Any future date (e.g., 12/25)
- CVV: 123
- Name: Any name
- OTP: 123456

### Other Test Payment Methods
- UPI: success@razorpay
- Net Banking: success
- Wallet: success

## 5. Testing the Payment Flow

1. Start both the server and client applications
2. Register a new user or log in with an existing account
3. Navigate to the payment page
4. Click "Proceed to Payment"
5. Use one of the test payment methods above
6. Complete the payment process

## Troubleshooting

If you encounter issues:

1. Ensure both the server and client are using the correct keys
2. Check that the keys are not swapped (Key ID vs Key Secret)
3. Verify that the keys are from the "Test" environment, not "Live"
4. Make sure the server is running and accessible
5. Check the browser console and server logs for error messages

## Security Notes

- Never commit actual keys to version control
- Always use test keys during development
- Keep your keys secure and private
- Use environment variables to store sensitive information

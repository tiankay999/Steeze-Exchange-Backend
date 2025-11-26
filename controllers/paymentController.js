require('dotenv').config();
const https = require('https');
const User = require('../models/users');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transactions');

const payStack = {
  acceptPayment: async (req, res) => {
    try {
      const { email, amount } = req.body;

      const params = JSON.stringify({
        email,
        amount: amount * 100, // Paystack uses kobo
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      };

      const clientReq = https.request(options, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
          data += chunk;
        });

        apiRes.on('end', () => {
          return res.status(200).json(JSON.parse(data));
        });
      });

      clientReq.on('error', (error) => {
        console.error(error);
        res.status(500).json({ error: 'Payment initialization failed' });
      });

      clientReq.write(params);
      clientReq.end();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const reference = req.params.reference;
      console.log('--- Starting Verification for Ref:', reference, '---');

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      };

      const clientReq = https.request(options, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
          data += chunk;
        });

        apiRes.on('end', async () => {
          try {
            const responseData = JSON.parse(data);
            console.log('Paystack full response:', responseData);

            if (
              responseData.status &&
              responseData.data &&
              responseData.data.status === 'success'
            ) {
              console.log('Paystack status is success. Proceeding to update DB...');
              const { customer, amount, reference } = responseData.data;
              const email = customer.email;
              const actualAmount = amount / 100; // back to normal currency

              // ✅ 1. Check if transaction already exists (Sequelize style)
              const existingTransaction = await Transaction.findOne({
                where: { reference },
              });

              if (existingTransaction) {
                console.log('Transaction already exists.');
                return res.status(200).json({
                  status: true,
                  message: 'Payment already verified',
                  data: existingTransaction,
                });
              }

              // ✅ 2. Find user by email (Sequelize style)
              const user = await User.findOne({
                where: { email },
              });
              console.log('User found:', user ? user.id : 'No user found');

              if (!user) {
                console.log('User not found for email:', email);
                return res.status(404).json({ error: 'User not found' });
              }

              // ✅ 3. Find or create wallet using user.id (NOT user._id)
              let wallet = await Wallet.findOne({
                where: { uid: user.id },
              });

              if (!wallet) {
                console.log('Creating new wallet...');
                wallet = await Wallet.create({
                  uid: user.id,
                  balance: 0,
                });
              }
              console.log('Wallet found/created:', wallet ? wallet.id : 'No wallet', 'Current Balance:', wallet ? wallet.balance : 'N/A');

              // make sure balance is a number (DECIMAL often comes as string)
              const currentBalance = Number(wallet.balance) || 0;
              const newBalance = currentBalance + Number(actualAmount);

              await wallet.update({ balance: newBalance });
              console.log('Wallet updated. New Balance:', newBalance);

              // ✅ 4. Create transaction record (Sequelize style)
              const newTrans = await Transaction.create({
                uid: user.id,
                amount: actualAmount,
                type: 'deposit',
                reference,
                status: 'success',
              });
              console.log('Transaction created:', newTrans.id);

              console.log('Wallet funded successfully.');
              return res.status(200).json({
                status: true,
                message: 'Successfully Deposited',
                data: {
                  wallet,
                  transaction: newTrans,
                },
              });
            } else {
              console.log('Payment failed at Paystack level.');
              return res.status(400).json({
                status: false,
                message:
                  'Payment Verification Failed: Transaction not successful',
              });
            }
          } catch (innerError) {
            console.error('Inner Error:', innerError);
            if (!res.headersSent) {
              return res
                .status(500)
                .json({ error: 'Internal Server Error processing wallet' });
            }
          }
        });
      });

      clientReq.on('error', (error) => {
        console.error(error);
        res
          .status(500)
          .json({ error: 'Payment verification connection failed' });
      });

      clientReq.end();
    } catch (error) {
      console.error('Outer Error:', error);
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = payStack;

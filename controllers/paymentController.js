require('dotenv').config();
const https = require('https');
const User = require('../models/users')
const Wallet= require('../models/wallet')
const Transaction= require('../models/transactions');
const authMiddleware = require('../middleware/authMiddleware');


const payStack = {
    acceptPayment: async (req, res) => {
        try {
            
            const email = req.body.email;
            const amount = req.body.amount;

  
            // Request parameters
            const params = JSON.stringify({
                "email": email,
                "amount": amount * 100 // Convert to kobo
            });

            // API request options
            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: '/transaction/initialize',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            // Make request to Paystack
            const clientReq = https.request(options, apiRes => {
                let data = '';

                apiRes.on('data', (chunk) => {
                    data += chunk;
                });

                apiRes.on('end', () => {
                    return res.status(200).json(JSON.parse(data));
                });
            });

            clientReq.on('error', error => {
                console.error(error);
                res.status(500).json({ error: 'Payment initialization failed' });
            });

            clientReq.write(params);
            clientReq.end();

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    verifyPayment: async(req, res) => {
        try {
            const reference = req.params.reference;
             
             
            
         


            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: `/transaction/verify/${reference}`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            };

            const clientReq = https.request(options, apiRes => {
                let data = '';

                apiRes.on('data', (chunk) => {
                    data += chunk;
                });

                apiRes.on('end', () => {
                    return res.status(200).json(JSON.parse(data));
                });
            });

            clientReq.on('error', error => {
                console.error(error);
                res.status(500).json({ error: 'Payment verification failed' });
            });


              const wallet= await Wallet.findone({where:{uid}})
              if (wallet){
                const balance= parseFloat(wallet.balance)+ amount 
                const total=balance
                const update= await Wallet.update({balance:total},{where:{uid}})
                if(update){
                  const trans= await Transaction.create({uid,type:'deposit',amount,status:'Deposit Successful'})
                  if(trans){
                    return res.status(200).json({message:'Deposit Successful'})
                  }
                }
              }

            clientReq.end();
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

module.exports = payStack;

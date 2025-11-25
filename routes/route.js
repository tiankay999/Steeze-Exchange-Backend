const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/api/payment/initialize', paymentController.acceptPayment);
router.get('/api/payment/verify/:reference', paymentController.verifyPayment);

module.exports = router;

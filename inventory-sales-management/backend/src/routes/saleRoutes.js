import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createSale, listSales, deleteSale, startMpesaPayment, mpesaCallback, getMpesaPayment } from '../controllers/saleController.js';

const router = Router();

router.post('/', authenticate, createSale);
router.post('/mpesa/stk-push', authenticate, startMpesaPayment);
router.get('/mpesa/:id', authenticate, getMpesaPayment);
router.post('/mpesa/callback', mpesaCallback);
router.get('/', authenticate, authorize('ADMIN'), listSales);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSale);

export default router;

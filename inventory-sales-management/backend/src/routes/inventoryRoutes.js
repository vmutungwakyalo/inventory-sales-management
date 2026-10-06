import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { currentInventory, movements, stockIn, deleteStockIn } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', authenticate, currentInventory);
router.get('/movements', authenticate, authorize('ADMIN'), movements);
router.post('/stock-in', authenticate, authorize('ADMIN'), stockIn);
router.delete('/stock-in/:id', authenticate, authorize('ADMIN'), deleteStockIn);

export default router;

import { Router } from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct, priceHistory } from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listProducts);
router.post('/', authenticate, authorize('ADMIN'), createProduct);
router.put('/:id', authenticate, authorize('ADMIN'), updateProduct);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteProduct);
router.get('/:id/price-history', authenticate, authorize('ADMIN'), priceHistory);

export default router;

import { Router } from 'express';
import { adminSummary } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.get('/admin/summary', authenticate, authorize('ADMIN'), adminSummary);
export default router;

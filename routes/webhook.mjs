import express from 'express';
import generatePDFControllers from '../controllers/generatePDFControllers.mjs';

const router = express.Router()

router.post('/generate-skck-pdf', generatePDFControllers.generateSkckPdf);
router.post('/generate-sik-pdf', generatePDFControllers.generateSikPdf);

export default router;

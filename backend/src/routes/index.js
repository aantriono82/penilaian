import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { bankSoalController } from '../controllers/bankSoalController.js';
import { soalController, soalImageController } from '../controllers/soalController.js';
import { generateController } from '../controllers/generateController.js';
import { configController } from '../controllers/configController.js';
import { adminController } from '../controllers/adminController.js';
import { uploadController } from '../controllers/uploadController.js';
import { stimulusController, stimulusUpload } from '../controllers/stimulusController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// AUTH
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);
router.put('/auth/profile', authMiddleware, authController.updateProfile);
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// BANK SOAL
router.get('/bank-soal', authMiddleware, bankSoalController.getAll);
router.get('/bank-soal/:id', authMiddleware, bankSoalController.getOne);
router.post('/bank-soal', authMiddleware, bankSoalController.create);
router.put('/bank-soal/:id', authMiddleware, bankSoalController.update);
router.delete('/bank-soal/:id', authMiddleware, bankSoalController.delete);
router.post('/bank-soal/:id/duplicate', authMiddleware, bankSoalController.duplicate);

// SOAL
router.get('/bank-soal/:bank_soal_id/soal', authMiddleware, soalController.getByBank);
router.get('/soal/:id', authMiddleware, soalController.getOne);
router.post('/soal', authMiddleware, soalController.create);
router.put('/soal/:id', authMiddleware, soalController.update);
router.delete('/soal/:id', authMiddleware, soalController.delete);
router.put('/soal/reorder', authMiddleware, soalController.reorder);
router.post('/soal/bulk-delete', authMiddleware, soalController.bulkDelete);

// SOAL IMAGE
router.post('/soal/:id/regenerate-image', authMiddleware, soalImageController.regenerateImage);
router.delete('/soal/:id/image', authMiddleware, soalImageController.removeImage);

// GENERATE AI
router.post('/generate', authMiddleware, generateController.generate);
router.get('/generate/history', authMiddleware, generateController.getHistory);
router.delete('/generate/history/:id', authMiddleware, generateController.deleteHistory);
router.post('/generate/history/bulk-delete', authMiddleware, generateController.bulkDeleteHistory);

// STIMULUS
router.post('/stimulus', authMiddleware, stimulusController.generate);
router.post('/stimulus/upload', authMiddleware, stimulusUpload.single('file'), stimulusController.upload);
router.put('/stimulus/:id', authMiddleware, stimulusController.update);

// CONFIG
router.get('/config', authMiddleware, configController.getConfig);
router.post('/config', authMiddleware, configController.setConfig);
router.get('/config/models', authMiddleware, configController.getModels);
router.post('/config/models', authMiddleware, configController.createModel);
router.put('/config/models/:id', authMiddleware, configController.updateModel);
router.delete('/config/models/:id', authMiddleware, configController.deleteModel);
router.put('/config/models/:id/default', authMiddleware, configController.setDefaultModel);
router.get('/config/templates', authMiddleware, configController.getTemplates);
router.post('/config/templates', authMiddleware, configController.createTemplate);
router.put('/config/templates/:id', authMiddleware, configController.updateTemplate);
router.delete('/config/templates/:id', authMiddleware, configController.deleteTemplate);
router.get('/config/test-api-key', authMiddleware, configController.testApiKey);
router.get('/config/openrouter-models', authMiddleware, configController.getOpenRouterModels);

// ADMIN
router.get('/admin/users', authMiddleware, adminOnly, adminController.getUsers);
router.post('/admin/users', authMiddleware, adminOnly, adminController.createUser);
router.put('/admin/users/:id/toggle', authMiddleware, adminOnly, adminController.toggleUserStatus);
router.put('/admin/users/:id/reset-password', authMiddleware, adminOnly, adminController.resetPassword);
router.get('/admin/stats', authMiddleware, adminOnly, adminController.getStats);

// UPLOAD
router.post('/upload', authMiddleware, upload.single('file'), uploadController.uploadImage);
router.delete('/upload/:id', authMiddleware, uploadController.deleteImage);
router.get('/uploads', authMiddleware, uploadController.getUserFiles);

export default router;

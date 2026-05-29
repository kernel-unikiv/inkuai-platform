'use strict';
const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const v = require('../validators/auth.validator');

router.post('/register',         validateBody(v.register),       authController.register);
router.post('/login',            validateBody(v.login),          authController.login);
router.post('/logout',           authenticate,                   authController.logout);
router.post('/refresh-token',    validateBody(v.refreshToken),   authController.refreshToken);
router.post('/forgot-password',  validateBody(v.forgotPassword), authController.forgotPassword);
router.post('/reset-password',   validateBody(v.resetPassword),  authController.resetPassword);
router.get('/me',                authenticate,                   authController.getMe);
router.get('/verify-email/:token',                               authController.verifyEmail);

module.exports = router;

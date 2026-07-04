'use strict';
const router = require('express').Router();
const c = require('../controllers/aisuggest.controller');

router.post('/field',     c.suggestField);
router.post('/fill-form', c.fillForm);
router.post('/summarize', c.summarize);

module.exports = router;

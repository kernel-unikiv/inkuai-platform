'use strict';
const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/apiResponse');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2,9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.py','.js','.csv','.json','.txt','.md','.ipynb','.pkl','.h5','.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new AppError(`Tipo de ficheiro não permitido: ${ext}`, 400), false);
};

const upload = multer({
  storage, fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = upload;

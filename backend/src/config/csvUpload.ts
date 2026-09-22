import multer from 'multer';

// Separate multer instance for plain CSV uploads (product bulk import).
// Deliberately NOT the Cloudinary-backed `upload` from cloudinary.ts — a CSV
// isn't media and has no business being routed through image storage.
// memoryStorage keeps the file only in `req.file.buffer` for the duration of
// the request; nothing is written to disk or any external bucket.
const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is generous for a flat-field product CSV
    fileFilter: (_req, file, cb) => {
        const isCsv =
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'application/octet-stream' ||
            file.originalname.toLowerCase().endsWith('.csv');
        if (!isCsv) {
            cb(new Error('Only .csv files are accepted'));
            return;
        }
        cb(null, true);
    },
});

export { csvUpload };

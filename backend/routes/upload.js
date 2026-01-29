const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload image endpoint
router.post('/image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Create file info object
        const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            url: `/uploads/${req.file.filename}`,
            uploadDate: new Date().toISOString()
        };

        // You can save file info to database here if needed
        // For now, we'll just return the file info

        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            data: fileInfo
        });

    } catch (error) {
        console.error('Upload error:', error);

        // Clean up uploaded file if error occurred
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Upload failed: ' + error.message
        });
    }
});

// Get uploaded images list
router.get('/images', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir)
            .filter(file => {
                const filePath = path.join(uploadsDir, file);
                const stat = fs.statSync(filePath);
                return stat.isFile() && file.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            })
            .map(file => {
                const filePath = path.join(uploadsDir, file);
                const stat = fs.statSync(filePath);
                return {
                    filename: file,
                    url: `/uploads/${file}`,
                    size: stat.size,
                    uploadDate: stat.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        res.json({
            success: true,
            data: files
        });

    } catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get images: ' + error.message
        });
    }
});

// Delete image endpoint
router.delete('/image/:filename', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image: ' + error.message
        });
    }
});

module.exports = router;

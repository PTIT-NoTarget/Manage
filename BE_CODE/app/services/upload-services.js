const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const file = req.file;

    // Validate file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only image files (JPEG, PNG, GIF, WebP) are allowed",
      });
    }

    // Validate file size (10MB max)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 10MB",
      });
    }

    // Get user ID from JWT (if authenticated)
    const userId = req.user?.id || "anonymous";

    // Generate unique filename
    const timestamp = Date.now();
    const publicId = `${process.env.CLOUDINARY_FOLDER}/${userId}/${timestamp}`;

    // Upload to cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: process.env.CLOUDINARY_FOLDER,
          resource_type: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            return res.status(500).json({
              success: false,
              message: "Failed to upload image",
              error: error.message,
            });
          }

          resolve(
            res.status(200).json({
              success: true,
              message: "Image uploaded successfully",
              data: {
                asset_id: result.asset_id,
                public_id: result.public_id,
                version: result.version,
                signature: result.signature,
                width: result.width,
                height: result.height,
                format: result.format,
                resource_type: result.resource_type,
                created_at: result.created_at,
                tags: result.tags,
                bytes: result.bytes,
                type: result.type,
                etag: result.etag,
                placeholder: result.placeholder,
                url: result.url,
                secure_url: result.secure_url,
                folder: result.folder,
                original_filename: result.original_filename,
              },
            }),
          );
        },
      );

      // Convert buffer to stream and pipe to cloudinary
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  } catch (error) {
    console.error("❌ Upload service error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Delete image from Cloudinary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    // Delete from cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return res.status(200).json({
        success: true,
        message: "Image deleted successfully",
        data: result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to delete image",
        data: result,
      });
    }
  } catch (error) {
    console.error("❌ Delete image error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get image metadata
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getImageMetadata = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    // Get resource metadata
    const result = await cloudinary.api.resource(publicId);

    return res.status(200).json({
      success: true,
      message: "Image metadata retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Get metadata error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

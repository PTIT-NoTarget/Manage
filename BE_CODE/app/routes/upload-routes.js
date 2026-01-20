const { jwtAuth } = require("../middleware");
const uploadServices = require("../services/upload-services");
const uploadImage = require("../middleware/upload-image");

module.exports = function (app) {
  const apiUrl = "/api/upload";

  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Authorization, Origin, Content-Type, Accept",
    );
    next();
  });

  // Upload image endpoint
  // POST /api/upload/image
  // Middleware: optional authentication, image upload
  app.post(
    apiUrl + "/image",
    uploadImage.single("file"),
    uploadServices.uploadImage,
  );

  // Delete image endpoint
  // POST /api/upload/delete
  // Body: { publicId: "path/to/image" }
  app.post(apiUrl + "/delete", jwtAuth.verifyToken, uploadServices.deleteImage);

  // Get image metadata endpoint
  // GET /api/upload/metadata/:publicId
  app.get(
    apiUrl + "/metadata/:publicId",
    jwtAuth.verifyToken,
    uploadServices.getImageMetadata,
  );
};

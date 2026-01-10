const multer = require("multer");

const storage = multer.memoryStorage();

const excelFileFilter = (req, file, cb) => {
  const name = (file.originalname || "").toLowerCase();
  const isXlsx =
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx");
  const isXls =
    file.mimetype === "application/vnd.ms-excel" || name.endsWith(".xls");

  if (isXlsx || isXls) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xls, .xlsx) are allowed"));
  }
};

module.exports = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const { verifyUser } = require("../middleware");
const taskServices = require("../services/task-services");
const { jwtAuth } = require("../middleware");
const uploadExcel = require("../middleware/upload-excel");

module.exports = function (app) {
  const apiUrl = "/api/task";
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Authorization",
      "Origin, Content-Type, Accept",
    );
    next();
  });

  //Add a task
  app.post(apiUrl + "/add", taskServices.addATask);

  //get all task
  app.post(apiUrl + "/getAll", taskServices.getAllTasks);

  // dashboard weekly (Mon->Sat) based on start_date/end_date
  app.post(apiUrl + "/dashboard/weekly", taskServices.getDashboardWeekly);

  //get my tasks (by token userId)
  app.post(apiUrl + "/my", jwtAuth.verifyToken, taskServices.getMyTasks);

  //get task by id
  app.get(apiUrl + "/findById/:id", taskServices.getATaskById);

  //update project
  app.put(apiUrl + "/update", taskServices.updateATask);

  //delete task
  app.delete(apiUrl + "/delete", taskServices.deleteATask);

  // import tasks from excel
  app.post(
    apiUrl + "/import",
    uploadExcel.single("file"),
    taskServices.importTasksFromExcel,
  );

  // download excel template for import
  app.get(
    apiUrl + "/import-template/:projectId",
    taskServices.downloadImportTemplate,
  );
};

const database = require("../models/index.js");
const Project = database.project;
const User = database.user;
const Task = database.task;
const io = require("../services/socket-instance").getIO();
const Notification = database.notification;
const { Op } = require("sequelize");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const {
  sendTelegramMessage,
  escapeTelegramHtml,
} = require("./telegram-notifier");

const safeParseJsonArray = (value) => {
  try {
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseExcelDateToIso = (value) => {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const dateObj = XLSX.SSF.parse_date_code(value);
    if (dateObj) {
      const dt = new Date(Date.UTC(dateObj.y, dateObj.m - 1, dateObj.d));
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    const m = s.match(/^([0-3]?\d)[/\-]([01]?\d)[/\-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }

    const t = Date.parse(s);
    if (!isNaN(t)) return new Date(t).toISOString();
  }

  return null;
};

const normalizeEnum = (value) => {
  if (value == null) return null;
  return String(value).trim().toUpperCase();
};

// FE IssueStatus values are strings: BACKLOG='0', NEW='1', IN_PROGRESS='2', TESTING='4', DONE='5', REJECT='6'
const normalizeIssueStatusForDb = (value) => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // already a code
  if (["0", "1", "2", "4", "5", "6"].includes(raw)) return raw;

  const upper = raw.toUpperCase();
  const map = {
    BACKLOG: "0",
    NEW: "1",
    IN_PROGRESS: "2",
    TESTING: "4",
    DONE: "5",
    REJECT: "6",
  };

  return map[upper] || null;
};

// FE IssuePriority values are TitleCase strings: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest'
// Template may use uppercase keys (LOWEST/LOW/...) so we map them.
const normalizeIssuePriorityForDb = (value) => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const valid = ["Lowest", "Low", "Medium", "High", "Highest"];
  if (valid.includes(raw)) return raw;

  const upper = raw.toUpperCase();
  const map = {
    LOWEST: "Lowest",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    HIGHEST: "Highest",
  };
  return map[upper] || null;
};

const parseUserNameFromExcel = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const parts = s
    .split("-")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : s;
};

const splitFollowers = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
};

exports.getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const projectId = req.body.project_id;
    const assignedBy = req.body.assigned_by;
    const status = req.body.status;
    const title = req.body.name;
    const id = req.body.id;
    const createdAt = req.body.createdAt;

    const whereCondition = {};
    if (projectId) {
      whereCondition.project_id = projectId;
    }
    if (assignedBy) {
      whereCondition.assigned_by = assignedBy;
    }
    if (status) {
      whereCondition.status = status;
    }
    if (title) {
      whereCondition.name = { [Op.like]: `%${title}%` };
    }
    if (createdAt) {
      const startOfDay = new Date(new Date(createdAt).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(createdAt).setHours(23, 59, 59, 999));
      whereCondition.createdAt = { [Op.between]: [startOfDay, endOfDay] };
    }
    if (id) {
      whereCondition.id = id;
    }

    const tasks = await Task.findAndCountAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
    });

    const data = tasks.rows.map((item) => {
      return {
        id: item.id,
        title: item.name,
        type: item.label,
        status: item.status,
        priority: item.priority,
        listPosition: 0, // temp
        description: item.description,
        estimate: 1, // temp
        timeSpent: 1, // temp
        timeRemaining: 1, // temp
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        reporterId: item.assigned_by,
        userIds: safeParseJsonArray(item.follower_ids), // follower id
        comments: [],
        projectId: item.project_id,
        startDate: item.start_date,
        endDate: item.end_date,
        createdBy: item.created_by,
        storyPoint: item.story_point,
      };
    });

    res.json({
      totalItems: tasks.count,
      totalPages: Math.ceil(tasks.count / pageSize),
      page: page,
      pageSize: pageSize,
      issues: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const projectId = req.body.project_id;
    const status = req.body.status;
    const titleOrName = req.body.name || req.body.title;
    const id = req.body.id;
    const createdAt = req.body.createdAt;

    const whereCondition = {
      assigned_by: req.userId,
    };

    if (projectId) {
      whereCondition.project_id = projectId;
    }
    if (status) {
      whereCondition.status = status;
    }
    if (titleOrName) {
      whereCondition.name = { [Op.like]: `%${titleOrName}%` };
    }
    if (createdAt) {
      const startOfDay = new Date(new Date(createdAt).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(createdAt).setHours(23, 59, 59, 999));
      whereCondition.createdAt = { [Op.between]: [startOfDay, endOfDay] };
    }
    if (id) {
      whereCondition.id = id;
    }

    const tasks = await Task.findAndCountAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
    });

    const data = tasks.rows.map((item) => {
      return {
        id: item.id,
        title: item.name,
        type: item.label,
        status: item.status,
        priority: item.priority,
        listPosition: 0, // temp
        description: item.description,
        estimate: 1, // temp
        timeSpent: 1, // temp
        timeRemaining: 1, // temp
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        reporterId: item.assigned_by,
        userIds: safeParseJsonArray(item.follower_ids),
        comments: [],
        projectId: item.project_id,
        startDate: item.start_date,
        endDate: item.end_date,
        createdBy: item.created_by,
        storyPoint: item.story_point,
      };
    });

    res.json({
      totalItems: tasks.count,
      totalPages: Math.ceil(tasks.count / pageSize),
      page: page,
      pageSize: pageSize,
      issues: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addATask = async (req, res) => {
  try {
    if (!req.body.project_id) {
      return res.status(400).json({
        message: "project_id is required",
      });
    }

    const project = await Project.findByPk(req.body.project_id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (!req.body.created_by) {
      return res.status(400).json({
        message: "created_by is required",
      });
    }

    const body = {
      project_id: req.body.project_id,
      name: req.body.name,
      description: req.body.description,
      label: req.body.label,
      status: req.body.status,
      priority: req.body.priority,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      assigned_by: req.body.assigned_by,
      created_by: req.body.created_by,
      story_point: req.body.story_point,
      follower_ids: JSON.stringify(req.body.follower_ids || []),
    };

    const task = await Task.create(body);

    // Lấy thông tin user
    const user = await User.findByPk(body.created_by);

    const notiBody = {
      user_id: 0,
      title: ``,
      message: `${user.dataValues.fullName} vừa tạo mới công việc "${body.name}"`,
      seen: false,
      metadata: JSON.stringify({
        type: "TASK_CREATED",
        taskId: task.id,
        projectId: body.project_id,
        taskName: body.name,
      }),
    };

    await Notification.create(notiBody);

    // Telegram notification (optional via env)
    if (user) {
      await sendTelegramMessage(
        `<b>${escapeTelegramHtml(
          user.dataValues.fullName
        )}</b> vừa tạo mới công việc <b>${escapeTelegramHtml(body.name)}</b>`
      );
    }

    // Gửi thông báo
    io.emit("taskNotification", notiBody);

    return res.status(200).json({
      message: "Task added successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getATaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const data = {
      id: task.id,
      title: task.name,
      type: task.label,
      status: task.status,
      priority: task.priority,
      listPosition: 0, // temp
      description: task.description,
      estimate: 1, // temp
      timeSpent: 1, // temp
      timeRemaining: 1, // temp
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      reporterId: task.assigned_by,
      userIds: safeParseJsonArray(task.follower_ids),
      comments: [],
      projectId: task.project_id,
      startDate: task.start_date,
      endDate: task.end_date,
      createdBy: task.created_by,
      storyPoint: task.story_point,
    };

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateATask = async (req, res) => {
  try {
    if (!req.body.id) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const task = await Task.findByPk(req.body.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // body update task
    const body = {
      id: req.body.id,
      project_id: task.dataValues.project_id,
      name: req.body.name,
      description: req.body.description,
      label: req.body.label,
      status: req.body.status,
      priority: req.body.priority,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      assigned_by: req.body.assigned_by,
      created_by: task.dataValues.created_by,
      story_point: req.body.story_point,
      user_update: req.body.user_update, // userId update task
      follower_ids: JSON.stringify(req.body.follower_ids || []),
    };

    const prevStatus = task.dataValues.status;

    // Lấy thông tin user
    const user = await User.findByPk(body.user_update);

    // update task
    await task.update(body);

    // Noti
    if (req.body.assigned_by && req.body.assigned_by !== req.body.user_update) {
      // metadata noti update status task
      const metadataTaskStatus = {
        prevStatus: prevStatus,
        currentStatus: body.status,
        nameUserUpdate: user.dataValues.fullName,
        taskId: req.body.id,
        taskName: task.dataValues.name,
        projectId: task.dataValues.project_id,
      };
      // Lưu thông báo vào DB
      const notiBody = {
        user_id: req.body.assigned_by,
        title: ``,
        message: ``,
        seen: false,
        metadata: JSON.stringify(metadataTaskStatus),
      };

      await Notification.create(notiBody);

      // Telegram notification (optional via env)
      if (user) {
        await sendTelegramMessage(
          `<b>${escapeTelegramHtml(
            user.dataValues.fullName
          )}</b> đã cập nhật trạng thái công việc <b>${escapeTelegramHtml(
            task.dataValues.name
          )}</b> (${escapeTelegramHtml(prevStatus)} → ${escapeTelegramHtml(
            body.status
          )})`
        );
      }

      // Gửi thông báo
      io.emit("taskNotification", notiBody);
    }
    // response update task
    return res.status(200).json({
      message: "Task updated successfully",
    });
  } catch (error) {
    console.log("task err", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteATask = async (req, res) => {
  try {
    if (!req.body.id) {
      return res.status(400).json({
        success: false,
        message: "Id is required",
      });
    }

    const task = await Task.findByPk(req.body.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await task.destroy();

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.importTasksFromExcel = async (req, res) => {
  const transaction = await database.sequelize.transaction();
  try {
    if (!req.file || !req.file.buffer) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Excel file is required (field name: file)",
      });
    }

    const projectId = req.body.project_id ? Number(req.body.project_id) : null;
    const createdBy = req.body.created_by ? Number(req.body.created_by) : null;

    if (!projectId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "project_id is required",
      });
    }

    if (!createdBy) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "created_by is required",
      });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Excel has no sheets",
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Excel sheet is empty",
      });
    }

    const errors = [];
    const created = [];
    const notiQueue = [];

    const creatorUser = await User.findByPk(createdBy);
    const creatorName = creatorUser?.dataValues?.fullName || "";

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] || {};

      const taskCode = row["Mã Task"] || row["Ma Task"] || row["MA TASK"];
      const taskName =
        row["Tên công việc"] || row["Ten cong viec"] || row["TEN CONG VIEC"];
      const statusRaw =
        row["Trạng thái"] || row["Trang thai"] || row["TRANG THAI"];
      const descriptionRaw = row["Mô tả"] || row["Mo ta"] || row["MO TA"];
      const createdAtRaw =
        row["Ngày tạo task"] || row["Ngay tao task"] || row["NGAY TAO TASK"];
      const deadlineRaw = row["Deadline"] || row["DEADLINE"];
      const assigneeRaw =
        row["Người phụ trách"] ||
        row["Nguoi phu trach"] ||
        row["NGUOI PHU TRACH"];
      const followersRaw =
        row["Người theo dõi"] || row["Nguoi theo doi"] || row["NGUOI THEO DOI"];
      const priorityRaw =
        row["Độ ưu tiên"] || row["Do uu tien"] || row["DO UU TIEN"];

      if (!taskName || !String(taskName).trim()) {
        errors.push({ row: index + 2, message: "Tên công việc is required" });
        continue;
      }

      const status = normalizeIssueStatusForDb(statusRaw) || "0";
      const priority = normalizeIssuePriorityForDb(priorityRaw);

      const createdAtIso = parseExcelDateToIso(createdAtRaw);
      const deadlineIso = parseExcelDateToIso(deadlineRaw);

      const assigneeName = parseUserNameFromExcel(assigneeRaw);
      let assignedBy = null;
      if (assigneeName) {
        const user = await User.findOne({ where: { fullName: assigneeName } });
        if (user) assignedBy = user.id;
      }

      const followerNames = splitFollowers(followersRaw)
        .map(parseUserNameFromExcel)
        .filter(Boolean);

      const followerIds = [];
      for (const followerName of followerNames) {
        const follower = await User.findOne({
          where: { fullName: followerName },
        });
        if (follower) followerIds.push(follower.id);
      }

      const descriptionBase = descriptionRaw ? String(descriptionRaw) : "";
      const codePrefix = taskCode ? String(taskCode).trim() : "";
      const description = codePrefix
        ? descriptionBase
          ? `[${codePrefix}] ${descriptionBase}`
          : `[${codePrefix}]`
        : descriptionBase;

      try {
        const newTask = await Task.create(
          {
            project_id: projectId,
            name: String(taskName).trim(),
            description,
            label: "Task",
            status,
            priority,
            start_date: createdAtIso,
            end_date: deadlineIso,
            assigned_by: assignedBy,
            created_by: createdBy,
            story_point: null,
            follower_ids: JSON.stringify(followerIds),
            createdAt: createdAtIso || undefined,
            updatedAt: createdAtIso || undefined,
          },
          { transaction }
        );
        created.push({ row: index + 2, id: newTask.id });

        const notiBody = {
          user_id: 0,
          title: ``,
          message: `${creatorName} vừa import công việc "${newTask.name}"`,
          seen: false,
          metadata: JSON.stringify({
            type: "TASK_IMPORTED",
            taskId: newTask.id,
            projectId: newTask.project_id,
            taskName: newTask.name,
          }),
        };

        await Notification.create(notiBody, { transaction });

        notiQueue.push({
          notiBody,
          telegramHtml: creatorName
            ? `<b>${escapeTelegramHtml(
                creatorName
              )}</b> vừa import công việc <b>${escapeTelegramHtml(
                newTask.name
              )}</b>`
            : `<b>Import</b> vừa tạo công việc <b>${escapeTelegramHtml(
                newTask.name
              )}</b>`,
        });
      } catch (e) {
        errors.push({
          row: index + 2,
          message: e?.message || "Create task failed",
        });
      }
    }

    await transaction.commit();

    for (const item of notiQueue) {
      io.emit("taskNotification", item.notiBody);
      sendTelegramMessage(item.telegramHtml);
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${created.length} task(s)`,
      created,
      errors,
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch {}
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.downloadImportTemplate = async (req, res) => {
  try {
    const projectId = req.params.projectId
      ? Number(req.params.projectId)
      : null;
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "projectId is required" });
    }

    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          through: { attributes: [] },
        },
      ],
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const members = project.users || project.dataValues?.users || [];
    const userChoices = (members || []).map((u) => {
      const username = u.username || "";
      const fullName = u.fullName || "";
      const combined = [username, fullName].filter(Boolean).join("-");
      return combined || fullName || username;
    });

    const statuses = [
      "BACKLOG",
      "NEW",
      "IN_PROGRESS",
      "TESTING",
      "DONE",
      "REJECT",
    ];
    const priorities = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"];

    const wb = new ExcelJS.Workbook();
    wb.creator = "Manage";
    wb.created = new Date();

    const ws = wb.addWorksheet("Tasks", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws.columns = [
      { header: "Tên công việc", key: "ten", width: 30 },
      { header: "Trạng thái", key: "trang_thai", width: 14 },
      { header: "Mô tả", key: "mo_ta", width: 35 },
      { header: "Ngày tạo task", key: "ngay_tao", width: 16 },
      { header: "Deadline", key: "deadline", width: 16 },
      { header: "Người phụ trách", key: "nguoi_phu_trach", width: 22 },
      { header: "Người theo dõi", key: "nguoi_theo_doi", width: 28 },
      { header: "Độ ưu tiên", key: "do_uu_tien", width: 14 },
    ];

    ws.getRow(1).font = { bold: true };

    // Example row (optional)
    ws.addRow({
      ten: "Abc",
      trang_thai: "BACKLOG",
      mo_ta: "abc",
      ngay_tao: "12/07/2025",
      deadline: "12/07/2025",
      nguoi_phu_trach: userChoices[0] || "",
      nguoi_theo_doi: userChoices[1] || userChoices[0] || "",
      do_uu_tien: "HIGHEST",
    });

    const listSheet = wb.addWorksheet("Lists");
    listSheet.state = "veryHidden";

    // Fill lists
    statuses.forEach((v, i) => (listSheet.getCell(`A${i + 1}`).value = v));
    priorities.forEach((v, i) => (listSheet.getCell(`B${i + 1}`).value = v));

    const usersToWrite = userChoices.length ? userChoices : [""];
    usersToWrite.forEach((v, i) => (listSheet.getCell(`C${i + 1}`).value = v));

    // Named ranges
    wb.definedNames.add(`Lists!$A$1:$A$${statuses.length}`, "StatusList");
    wb.definedNames.add(`Lists!$B$1:$B$${priorities.length}`, "PriorityList");
    wb.definedNames.add(`Lists!$C$1:$C$${usersToWrite.length}`, "UserList");

    const maxRows = 500;
    for (let r = 2; r <= maxRows + 1; r++) {
      // Status (B)
      ws.getCell(`B${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=StatusList"],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Giá trị không hợp lệ",
        error: "Vui lòng chọn Trạng thái từ danh sách",
      };

      // Assignee (F)
      ws.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=UserList"],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Giá trị không hợp lệ",
        error: "Vui lòng chọn Người phụ trách từ danh sách thành viên dự án",
      };

      // Followers (G) - allow multi by comma; keep dropdown but don't block custom input
      ws.getCell(`G${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=UserList"],
        showErrorMessage: false,
      };

      // Priority (H)
      ws.getCell(`H${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=PriorityList"],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Giá trị không hợp lệ",
        error: "Vui lòng chọn Độ ưu tiên từ danh sách",
      };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=task_import_template_project_${projectId}.xlsx`
    );

    const buffer = await wb.xlsx.writeBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

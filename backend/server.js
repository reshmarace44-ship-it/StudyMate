
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Task = require("./Task");
const Subject = require("./models/Subject");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve frontend files from the project parent folder
app.use(express.static(path.join(__dirname, "..")));

// ================= PDF UPLOAD SETUP =================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = path.basename(file.originalname)
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(-100);

        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isPdf =
            file.mimetype === "application/pdf" &&
            path.extname(file.originalname).toLowerCase() === ".pdf";

        if (!isPdf) {
            return cb(new Error("PDF files only are allowed."));
        }

        cb(null, true);
    }
});

app.use("/uploads", express.static(uploadDir));

// ================= HOME =================

app.get("/", (req, res) => {
    res.send("StudyMate Backend is running!");
});

// ================= TASK ROUTES =================

app.get("/api/tasks", async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/tasks", async (req, res) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.patch("/api/tasks/:id", async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete("/api/tasks/:id", async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ================= SUBJECT ROUTES =================

app.get("/api/subjects", async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ createdAt: -1 });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/subjects", async (req, res) => {
    try {
        const name = req.body.name?.trim();

        if (!name) {
            return res.status(400).json({
                message: "Subject name is required"
            });
        }

        const subject = await Subject.create({ name });
        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post("/api/subjects/:subjectId/units", async (req, res) => {
    try {
        const title = req.body.title?.trim();

        if (!title) {
            return res.status(400).json({
                message: "Unit title is required"
            });
        }

        const subject = await Subject.findById(req.params.subjectId);

        if (!subject) {
            return res.status(404).json({
                message: "Subject not found"
            });
        }

        subject.units.push({ title });
        await subject.save();

        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post(
    "/api/subjects/:subjectId/units/:unitId/topics",
    async (req, res) => {
        try {
            const title = req.body.title?.trim();

            if (!title) {
                return res.status(400).json({
                    message: "Topic title is required"
                });
            }

            const subject = await Subject.findById(req.params.subjectId);

            if (!subject) {
                return res.status(404).json({
                    message: "Subject not found"
                });
            }

            const unit = subject.units.id(req.params.unitId);

            if (!unit) {
                return res.status(404).json({
                    message: "Unit not found"
                });
            }

            unit.topics.push({ title });
            await subject.save();

            res.status(201).json(subject);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
);

app.patch(
    "/api/subjects/:subjectId/units/:unitId/topics/:topicId",
    async (req, res) => {
        try {
            const subject = await Subject.findById(req.params.subjectId);

            if (!subject) {
                return res.status(404).json({
                    message: "Subject not found"
                });
            }

            const unit = subject.units.id(req.params.unitId);

            if (!unit) {
                return res.status(404).json({
                    message: "Unit not found"
                });
            }

            const topic = unit.topics.id(req.params.topicId);

            if (!topic) {
                return res.status(404).json({
                    message: "Topic not found"
                });
            }

            if (typeof req.body.notes === "string") {
                topic.notes = req.body.notes;
            }

            if (typeof req.body.completed === "boolean") {
                topic.completed = req.body.completed;
            }

            await subject.save();
            res.json(subject);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
);

// ================= PDF UPLOAD ROUTE =================

app.post(
    "/api/subjects/:subjectId/units/:unitId/topics/:topicId/pdfs",
    (req, res, next) => {
        upload.single("pdf")(req, res, error => {
            if (error) {
                const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

                return res.status(status).json({
                    message: error.code === "LIMIT_FILE_SIZE"
                        ? "PDF size must be 5 MB or less."
                        : error.message || "PDF upload error."
                });
            }

            next();
        });
    },
    async (req, res) => {
        let uploadedFilePath = req.file?.path;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "Please select a PDF file."
                });
            }

            const subject = await Subject.findById(req.params.subjectId);

            if (!subject) {
                return res.status(404).json({
                    message: "Subject not found."
                });
            }

            const unit = subject.units.id(req.params.unitId);

            if (!unit) {
                return res.status(404).json({
                    message: "Unit not found."
                });
            }

            const topic = unit.topics.id(req.params.topicId);

            if (!topic) {
                return res.status(404).json({
                    message: "Topic not found."
                });
            }

            if (!Array.isArray(topic.pdfs)) {
                topic.pdfs = [];
            }

            topic.pdfs.push({
                fileName: req.file.originalname,
                fileUrl: `/uploads/${req.file.filename}`
            });

            await subject.save();

            return res.status(201).json({
                message: "PDF uploaded successfully!",
                pdf: topic.pdfs[topic.pdfs.length - 1]
            });
        } catch (error) {
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                try {
                    fs.unlinkSync(uploadedFilePath);
                } catch (cleanupError) {
                    console.error("File cleanup error:", cleanupError);
                }
            }

            console.error("PDF upload error:", error);

            return res.status(500).json({
                message: "PDF upload failed."
            });
        }
    }
);

// ================= JSON ERROR HANDLER =================

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        message: "An unexpected server error occurred."
    });
});

// ================= START SERVER =================

async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from the .env file.");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(
                `StudyMate server running on http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
    }
}

startServer();

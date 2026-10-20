
const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        completed: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String,
            default: ""
        },
        pdfs: [
            {
                fileName: String,
                fileUrl: String
            }
        ]
    },
    { timestamps: true }
);

const unitSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        topics: [topicSchema]
    },
    { timestamps: true }
);

const subjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        units: [unitSchema]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);

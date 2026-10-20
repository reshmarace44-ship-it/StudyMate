const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  dueDate: {
    type: String,
    default: ""
  },
  priority: {
    type: String,
    default: "Medium"
  },
  completed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Task", taskSchema);
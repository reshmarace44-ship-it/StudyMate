
const API_URL = "http://localhost:3000/api";
const TASKS_API = `${API_URL}/tasks`;
const LIBRARY_API = `${API_URL}/subjects`;

// =====================================
// COMMON API HELPER
// =====================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        console.error("Server response:", text);
        throw new Error(
            "Server JSON response anuppala. Backend server and API route check pannunga."
        );
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function showError(error) {
    console.error(error);
    alert(error.message || "Something went wrong.");
}

// =====================================
// THEME: DARK / LIGHT MODE
// =====================================

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");

    if (themeToggle) {
        themeToggle.textContent =
            theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
    }
}

applyTheme(localStorage.getItem("studymateTheme") || "light");

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.contains("dark-mode");
        const newTheme = isDark ? "light" : "dark";

        localStorage.setItem("studymateTheme", newTheme);
        applyTheme(newTheme);
    });
}

// =====================================
// TASK MANAGEMENT
// =====================================

let tasks = [];
let tasksLoaded = false;

const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("taskList");
const searchTask = document.getElementById("searchTask");

function getTaskTitle(task) {
    return task.title || task.name || task.task || "";
}

function getTaskDueDate(task) {
    return task.dueDate ? String(task.dueDate).slice(0, 10) : "";
}

function getTaskPriority(task) {
    return task.priority || "Medium";
}

function isTaskCompleted(task) {
    return Boolean(task.completed);
}

function renderTasks() {
    if (!taskList) return;

    taskList.replaceChildren();

    const searchText = searchTask
        ? searchTask.value.trim().toLowerCase()
        : "";

    const filteredTasks = tasks.filter(task =>
        getTaskTitle(task).toLowerCase().includes(searchText)
    );

    if (filteredTasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = searchText
            ? "No matching tasks found."
            : "No tasks yet. Add your first task!";
        taskList.appendChild(emptyMessage);
    }

    filteredTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";

        const title = document.createElement("span");
        title.textContent = getTaskTitle(task);

        if (isTaskCompleted(task)) {
            title.style.textDecoration = "line-through";
        }

        const details = document.createElement("small");
        details.textContent =
            `Due: ${getTaskDueDate(task) || "No date"} | Priority: ${getTaskPriority(task)}`;

        const completeButton = document.createElement("button");
        completeButton.textContent = isTaskCompleted(task)
            ? "↩ Undo"
            : "✓ Complete";

        completeButton.addEventListener("click", () => {
            toggleTask(task);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑 Delete";

        deleteButton.addEventListener("click", () => {
            deleteTask(task);
        });

        item.append(title, document.createElement("br"), details);
        item.append(
            document.createElement("br"),
            completeButton,
            deleteButton
        );

        taskList.appendChild(item);
    });

    updateDashboard();
}

async function loadTasks() {
    try {
        const data = await apiRequest(TASKS_API);

        tasks = Array.isArray(data) ? data : data.tasks || [];
        tasksLoaded = true;

        renderTasks();
    } catch (error) {
        tasksLoaded = false;
        showError(error);
    }
}

async function addTask() {
    if (!taskInput) return;

    const title = taskInput.value.trim();

    if (!title) {
        alert("Please enter a task.");
        return;
    }

    const taskData = {
        title,
        dueDate: dueDateInput ? dueDateInput.value : "",
        priority: priorityInput ? priorityInput.value : "Medium",
        completed: false
    };

    try {
        const createdTask = await apiRequest(TASKS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData)
        });

        if (createdTask && createdTask._id) {
            tasks.push(createdTask);
        } else {
            await loadTasks();
        }

        taskInput.value = "";

        if (dueDateInput) dueDateInput.value = "";

        renderTasks();
    } catch (error) {
        showError(error);
    }
}

async function toggleTask(task) {
    try {
        const updatedTask = await apiRequest(
            `${TASKS_API}/${task._id}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    completed: !isTaskCompleted(task)
                })
            }
        );

        Object.assign(task, updatedTask);
        renderTasks();
    } catch (error) {
        showError(error);
    }
}

async function deleteTask(task) {
    if (!confirm("Delete this task?")) return;

    try {
        await apiRequest(`${TASKS_API}/${task._id}`, {
            method: "DELETE"
        });

        tasks = tasks.filter(item => item._id !== task._id);
        renderTasks();
    } catch (error) {
        showError(error);
    }
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(isTaskCompleted).length;
    const pending = total - completed;
    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    const totalCount = document.getElementById("totalCount");
    const completedCount = document.getElementById("completedCount");
    const pendingCount = document.getElementById("pendingCount");
    const progressPercent = document.getElementById("progressPercent");
    const progressBar = document.getElementById("progressBar");
    const progressMessage = document.getElementById("progressMessage");

    if (totalCount) totalCount.textContent = total;
    if (completedCount) completedCount.textContent = completed;
    if (pendingCount) pendingCount.textContent = pending;

    if (progressPercent) {
        progressPercent.textContent = `${percentage}%`;
    }

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    if (progressMessage) {
        progressMessage.textContent = total === 0
            ? "Start by adding your first task!"
            : percentage === 100
                ? "Great job! All tasks completed!"
                : "Keep going. You're making progress!";
    }
}

if (taskInput) {
    taskInput.addEventListener("keydown", event => {
        if (event.key === "Enter") addTask();
    });
}

if (searchTask) {
    searchTask.addEventListener("input", renderTasks);
}

// =====================================
// LEGACY SUBJECT LIST
// =====================================

const subjectInput = document.getElementById("subjectInput");
const subjectList = document.getElementById("subjectList");
const subjectCount = document.getElementById("subjectCount");

let simpleSubjects = [];

try {
    simpleSubjects = JSON.parse(
        localStorage.getItem("subjects") || "[]"
    );
} catch {
    simpleSubjects = [];
}

function renderSimpleSubjects() {
    if (subjectList) {
        subjectList.replaceChildren();

        simpleSubjects.forEach((subject, index) => {
            const item = document.createElement("li");
            item.textContent = subject;

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "🗑";

            deleteButton.addEventListener("click", () => {
                simpleSubjects.splice(index, 1);
                localStorage.setItem(
                    "subjects",
                    JSON.stringify(simpleSubjects)
                );
                renderSimpleSubjects();
            });

            item.appendChild(deleteButton);
            subjectList.appendChild(item);
        });
    }

    if (subjectCount) {
        subjectCount.textContent = simpleSubjects.length;
    }
}

function addSubject() {
    if (!subjectInput) return;

    const name = subjectInput.value.trim();

    if (!name) {
        alert("Enter a subject name.");
        return;
    }

    simpleSubjects.push(name);

    localStorage.setItem(
        "subjects",
        JSON.stringify(simpleSubjects)
    );

    subjectInput.value = "";
    renderSimpleSubjects();
}

renderSimpleSubjects();

// =====================================
// STUDY LIBRARY: SUBJECTS, UNITS, TOPICS
// =====================================

const librarySubjectName = document.getElementById("librarySubjectName");
const addLibrarySubjectButton = document.getElementById("addLibrarySubject");
const libraryMessage = document.getElementById("libraryMessage");
const librarySubjects = document.getElementById("librarySubjects");

let libraryData = [];

function setLibraryMessage(message) {
    if (libraryMessage) {
        libraryMessage.textContent = message;
    }
}

async function loadLibrarySubjects() {
    if (!librarySubjects) return;

    try {
        const data = await apiRequest(LIBRARY_API);
        libraryData = Array.isArray(data) ? data : data.subjects || [];

        renderLibrarySubjects();
        setLibraryMessage("");
    } catch (error) {
        setLibraryMessage(error.message);
        console.error(error);
    }
}

function renderLibrarySubjects() {
    if (!librarySubjects) return;

    librarySubjects.replaceChildren();

    if (libraryData.length === 0) {
        const message = document.createElement("p");
        message.textContent = "No study subjects yet. Add one above!";
        librarySubjects.appendChild(message);
        return;
    }

    libraryData.forEach(subject => {
        const subjectCard = document.createElement("section");
        subjectCard.className = "library-subject-card";

        const heading = document.createElement("h3");
        heading.textContent = subject.name;

        const unitInput = document.createElement("input");
        unitInput.type = "text";
        unitInput.placeholder = "Enter unit name";

        const addUnitButton = document.createElement("button");
        addUnitButton.textContent = "➕ Add Unit";

        addUnitButton.addEventListener("click", async () => {
            const title = unitInput.value.trim();

            if (!title) {
                alert("Enter a unit name.");
                return;
            }

            try {
                await apiRequest(`${LIBRARY_API}/${subject._id}/units`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title })
                });

                await loadLibrarySubjects();
            } catch (error) {
                showError(error);
            }
        });

        subjectCard.append(heading, unitInput, addUnitButton);

        (subject.units || []).forEach(unit => {
            const unitCard = document.createElement("div");
            unitCard.className = "library-unit-card";

            const unitHeading = document.createElement("h4");
            unitHeading.textContent = unit.title;

            const topicInput = document.createElement("input");
            topicInput.type = "text";
            topicInput.placeholder = "Enter topic name";

            const addTopicButton = document.createElement("button");
            addTopicButton.textContent = "➕ Add Topic";

            addTopicButton.addEventListener("click", async () => {
                const title = topicInput.value.trim();

                if (!title) {
                    alert("Enter a topic name.");
                    return;
                }

                try {
                    await apiRequest(
                        `${LIBRARY_API}/${subject._id}/units/${unit._id}/topics`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title })
                        }
                    );

                    await loadLibrarySubjects();
                } catch (error) {
                    showError(error);
                }
            });

            unitCard.append(unitHeading, topicInput, addTopicButton);

            (unit.topics || []).forEach(topic => {
                const topicCard = document.createElement("div");
                topicCard.className = "library-topic-card";

                const topicLabel = document.createElement("label");
                const completedCheckbox = document.createElement("input");

                completedCheckbox.type = "checkbox";
                completedCheckbox.checked = Boolean(topic.completed);

                completedCheckbox.addEventListener("change", async () => {
                    try {
                        await apiRequest(
                            `${LIBRARY_API}/${subject._id}/units/${unit._id}/topics/${topic._id}`,
                            {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    completed: completedCheckbox.checked
                                })
                            }
                        );

                        await loadLibrarySubjects();
                    } catch (error) {
                        completedCheckbox.checked = Boolean(topic.completed);
                        showError(error);
                    }
                });

                topicLabel.append(
                    completedCheckbox,
                    document.createTextNode(
                        ` ${topic.title}${topic.completed ? " ✓" : ""}`
                    )
                );

                const notes = document.createElement("textarea");
                notes.placeholder = "Write your notes here...";
                notes.value = topic.notes || "";

                const saveNotesButton = document.createElement("button");
                saveNotesButton.textContent = "💾 Save Notes";

                saveNotesButton.addEventListener("click", async () => {
                    try {
                        await apiRequest(
                            `${LIBRARY_API}/${subject._id}/units/${unit._id}/topics/${topic._id}`,
                            {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ notes: notes.value })
                            }
                        );

                        alert("Notes saved successfully!");
                        await loadLibrarySubjects();
                    } catch (error) {
                        showError(error);
                    }
                });

                // PDF file selector
                const pdfInput = document.createElement("input");
                pdfInput.type = "file";
                pdfInput.accept = ".pdf,application/pdf";

                // PDF upload button
                const uploadPdfButton = document.createElement("button");
                uploadPdfButton.textContent = "📄 Upload PDF";

                uploadPdfButton.addEventListener("click", async () => {
                    const file = pdfInput.files[0];

                    if (!file) {
                        alert("First, choose a PDF file.");
                        return;
                    }

                    if (
                        file.type !== "application/pdf" ||
                        !file.name.toLowerCase().endsWith(".pdf")
                    ) {
                        alert("PDF files only are allowed.");
                        return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                        alert("PDF size must be 5 MB or less.");
                        return;
                    }

                    const formData = new FormData();
                    formData.append("pdf", file);

                    uploadPdfButton.disabled = true;
                    uploadPdfButton.textContent = "Uploading...";

                    try {
                        const response = await fetch(
                            `${LIBRARY_API}/${subject._id}/units/${unit._id}/topics/${topic._id}/pdfs`,
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                        const responseText = await response.text();
                        let result;

                        try {
                            result = responseText
                                ? JSON.parse(responseText)
                                : {};
                        } catch {
                            console.error(
                                "PDF upload response:",
                                responseText
                            );

                            throw new Error(
                                "Server HTML response anuppudhu. Backend route and terminal error check pannunga."
                            );
                        }

                        if (!response.ok) {
                            throw new Error(
                                result.message || "PDF upload failed."
                            );
                        }

                        alert("PDF uploaded successfully!");
                        await loadLibrarySubjects();
                    } catch (error) {
                        showError(error);
                    } finally {
                        uploadPdfButton.disabled = false;
                        uploadPdfButton.textContent = "📄 Upload PDF";
                    }
                });

                // Display uploaded PDFs
                const pdfList = document.createElement("div");
                pdfList.className = "topic-pdf-list";

                (topic.pdfs || []).forEach(pdf => {
                    const link = document.createElement("a");

                    link.href = `http://localhost:3000${pdf.fileUrl}`;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = `📎 ${pdf.fileName}`;

                    pdfList.appendChild(link);
                    pdfList.appendChild(document.createElement("br"));
                });

                topicCard.append(
                    topicLabel,
                    document.createElement("br"),
                    notes,
                    document.createElement("br"),
                    saveNotesButton,
                    document.createElement("br"),
                    pdfInput,
                    uploadPdfButton,
                    pdfList
                );

                unitCard.appendChild(topicCard);
            });

            subjectCard.appendChild(unitCard);
        });

        librarySubjects.appendChild(subjectCard);
    });
}

async function addLibrarySubject() {
    if (!librarySubjectName) return;

    const name = librarySubjectName.value.trim();

    if (!name) {
        alert("Enter a subject name.");
        return;
    }

    try {
        await apiRequest(LIBRARY_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        librarySubjectName.value = "";
        setLibraryMessage("Subject added successfully!");

        await loadLibrarySubjects();
    } catch (error) {
        showError(error);
    }
}

if (addLibrarySubjectButton) {
    addLibrarySubjectButton.addEventListener(
        "click",
        addLibrarySubject
    );
}

if (librarySubjectName) {
    librarySubjectName.addEventListener("keydown", event => {
        if (event.key === "Enter") addLibrarySubject();
    });
}

// =====================================
// START APPLICATION
// =====================================

loadTasks();
loadLibrarySubjects();

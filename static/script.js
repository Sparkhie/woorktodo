const API_URL = "/api/tasks";


// ============================================================
// ELEMENTS
// ============================================================

const taskFormContainer =
    document.getElementById(
        "taskFormContainer"
    );

const taskForm =
    document.getElementById(
        "taskForm"
    );

const taskList =
    document.getElementById(
        "taskList"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const filterSelect =
    document.getElementById(
        "filterSelect"
    );


// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        const response =
            await fetch(API_URL);

        const tasks =
            await response.json();

        displayTasks(tasks);

        loadStats();

    } catch (error) {

        console.error(
            "Error loading tasks:",
            error
        );

    }
}


// ============================================================
// DISPLAY TASKS
// ============================================================

function displayTasks(tasks) {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const filter =
        filterSelect.value;


    let filteredTasks =
        tasks.filter(task => {

            const matchesSearch =
                task.title
                    .toLowerCase()
                    .includes(search);


            let matchesFilter = true;


            if (filter === "pending") {

                matchesFilter =
                    !task.completed;

            }


            if (filter === "completed") {

                matchesFilter =
                    task.completed;

            }


            if (filter === "high") {

                matchesFilter =
                    task.priority === "High"
                    && !task.completed;

            }


            return (
                matchesSearch &&
                matchesFilter
            );

        });


    taskList.innerHTML = "";


    if (filteredTasks.length === 0) {

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    filteredTasks.forEach(
        task => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "task-card";


            const completedClass =
                task.completed
                    ? "completed"
                    : "";


            const dueDate =
                task.due_date
                    ? `Due: ${task.due_date}`
                    : "No due date";


            card.innerHTML = `

                <div class="task-top">

                    <div>

                        <div
                            class="task-title ${completedClass}"
                        >
                            ${escapeHtml(
                                task.title
                            )}
                        </div>


                        <div
                            class="task-description"
                        >
                            ${escapeHtml(
                                task.description
                            )}
                        </div>

                    </div>


                    <span
                        class="badge ${task.priority.toLowerCase()}"
                    >
                        ${task.priority}
                    </span>

                </div>


                <div class="task-meta">

                    <span class="badge">
                        ${dueDate}
                    </span>

                    <span class="badge">
                        ${
                            task.completed
                                ? "Completed"
                                : "Pending"
                        }
                    </span>

                </div>


                <div class="task-actions">

                    <button
                        class="action-button"
                        onclick="toggleTask(
                            ${task.id},
                            ${!task.completed}
                        )"
                    >
                        ${
                            task.completed
                                ? "Mark Pending"
                                : "Complete"
                        }
                    </button>


                    <button
                        class="action-button"
                        onclick="editTask(
                            ${task.id}
                        )"
                    >
                        Edit
                    </button>


                    <button
                        class="action-button delete-button"
                        onclick="deleteTask(
                            ${task.id}
                        )"
                    >
                        Delete
                    </button>

                </div>

            `;


            taskList.appendChild(
                card
            );

        }
    );
}


// ============================================================
// CREATE TASK
// ============================================================

taskForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const taskId =
            document.getElementById(
                "taskId"
            ).value;


        const taskData = {

            title:
                document.getElementById(
                    "title"
                ).value,

            description:
                document.getElementById(
                    "description"
                ).value,

            priority:
                document.getElementById(
                    "priority"
                ).value,

            due_date:
                document.getElementById(
                    "dueDate"
                ).value || null

        };


        let response;


        if (taskId) {

            response =
                await fetch(
                    `${API_URL}/${taskId}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                taskData
                            )
                    }
                );

        } else {

            response =
                await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                taskData
                            )
                    }
                );

        }


        if (response.ok) {

            resetForm();

            loadTasks();

        } else {

            const error =
                await response.json();

            alert(
                error.detail ||
                "Something went wrong."
            );

        }

    }
);


// ============================================================
// EDIT TASK
// ============================================================

async function editTask(taskId) {

    const response =
        await fetch(
            `${API_URL}/${taskId}`
        );


    const task =
        await response.json();


    document.getElementById(
        "taskId"
    ).value = task.id;


    document.getElementById(
        "title"
    ).value = task.title;


    document.getElementById(
        "description"
    ).value =
        task.description;


    document.getElementById(
        "priority"
    ).value =
        task.priority;


    document.getElementById(
        "dueDate"
    ).value =
        task.due_date || "";


    taskFormContainer.classList.remove(
        "hidden"
    );

}


// ============================================================
// COMPLETE TASK
// ============================================================

async function toggleTask(
    taskId,
    completed
) {

    await fetch(
        `${API_URL}/${taskId}`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                completed:
                    completed
            })
        }
    );


    loadTasks();

}


// ============================================================
// DELETE TASK
// ============================================================

async function deleteTask(taskId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {

        return;

    }


    await fetch(
        `${API_URL}/${taskId}`,
        {
            method: "DELETE"
        }
    );


    loadTasks();

}


// ============================================================
// STATISTICS
// ============================================================

async function loadStats() {

    const response =
        await fetch(
            "/api/stats"
        );


    const stats =
        await response.json();


    document.getElementById(
        "totalTasks"
    ).textContent =
        stats.total;


    document.getElementById(
        "pendingTasks"
    ).textContent =
        stats.pending;


    document.getElementById(
        "completedTasks"
    ).textContent =
        stats.completed;


    document.getElementById(
        "highPriorityTasks"
    ).textContent =
        stats.high_priority;

}


// ============================================================
// FORM CONTROLS
// ============================================================

document.getElementById(
    "newTaskButton"
).addEventListener(
    "click",
    () => {

        resetForm();

        taskFormContainer.classList.remove(
            "hidden"
        );

    }
);


document.getElementById(
    "cancelButton"
).addEventListener(
    "click",
    () => {

        resetForm();

    }
);


function resetForm() {

    taskForm.reset();

    document.getElementById(
        "taskId"
    ).value = "";


    taskFormContainer.classList.add(
        "hidden"
    );

}


// ============================================================
// SEARCH AND FILTER
// ============================================================

searchInput.addEventListener(
    "input",
    loadTasks
);


filterSelect.addEventListener(
    "change",
    loadTasks
);


// ============================================================
// SECURITY HELPER
// ============================================================

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value || "";

    return div.innerHTML;

}


// ============================================================
// START APPLICATION
// ============================================================

loadTasks();
loadStats();
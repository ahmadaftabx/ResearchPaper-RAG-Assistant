// Use the backend serving this page.
const pdfUpload = document.getElementById("pdfUpload");
const uploadButton = document.getElementById("uploadButton");
const questionInput = document.getElementById("question");
const levelSelect = document.getElementById("level");
const askButton = document.getElementById("askButton");
const chatBox = document.getElementById("chatBox");
let isLoading = false;

// Add plain text safely, including questions and server responses.
function addMessage(text, type = "bot") {
    const message = document.createElement("div");
    message.className = "message " + type;
    message.textContent = text;
    chatBox.appendChild(message);
    scrollChat();
    return message;
}

function scrollChat() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setLoading(loading) {
    isLoading = loading;
    uploadButton.disabled = loading;
    askButton.disabled = loading;
    pdfUpload.disabled = loading;
    chatBox.setAttribute("aria-busy", String(loading));
}

// Read a backend response and show useful errors for failed requests.
async function readResponse(response) {
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("The server returned an unreadable response. Check that the backend is running.");
    }
    if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Request failed. Please try again.";
        throw new Error(detail);
    }
    return data;
}

// Upload the selected PDF using the backend's expected file field.
async function uploadPDF() {
    if (isLoading) return;
    const file = pdfUpload.files[0];
    if (!file) {
        addMessage("Please choose a PDF file first.");
        return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        addMessage("Please choose a file ending in .pdf.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const progress = addMessage("Uploading and processing your PDF...");

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });
        const data = await readResponse(response);
        progress.textContent = (data.message || "PDF processed successfully.") + " You can now ask questions.";
    } catch (error) {
        progress.textContent = "Could not upload the PDF. " + error.message;
    } finally {
        setLoading(false);
        scrollChat();
    }
}

// Send the question and chosen explanation level.
async function sendMessage() {
    if (isLoading) return;
    const question = questionInput.value.trim();
    if (!question) {
        questionInput.focus();
        return;
    }

    addMessage(question, "user");
    questionInput.value = "";
    setLoading(true);
    const typing = addMessage("PaperMind is thinking...", "bot typing");

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, level: levelSelect.value })
        });
        const data = await readResponse(response);
        typing.remove();
        displayAnswer(data.answer);
    } catch (error) {
        typing.textContent = "Could not get an answer. " + error.message;
    } finally {
        setLoading(false);
        scrollChat();
        questionInput.focus();
    }
}

// Render the five answer sections without inserting server text as HTML.
function displayAnswer(answer) {
    if (!answer || typeof answer !== "object") {
        addMessage(answer || "No answer was returned.");
        return;
    }
    if (answer.error) {
        addMessage(answer.error + (answer.details ? ": " + answer.details : ""));
        return;
    }

    const message = document.createElement("div");
    message.className = "message bot";

    function addSection(title, content) {
        const section = document.createElement("section");
        section.className = "section";
        const heading = document.createElement("h3");
        heading.textContent = title;
        section.appendChild(heading);
        section.appendChild(content);
        message.appendChild(section);
    }

    function addTextSection(title, text) {
        if (!text) return;
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        addSection(title, paragraph);
    }

    addTextSection("Main Idea", answer.main_idea);

    if (Array.isArray(answer.key_concepts) && answer.key_concepts.length) {
        const list = document.createElement("ul");
        for (const concept of answer.key_concepts) {
            const item = document.createElement("li");
            if (typeof concept === "string") {
                item.textContent = concept;
            } else if (concept && typeof concept === "object") {
                const name = document.createElement("strong");
                name.textContent = (concept.concept || concept.term || "Concept") + ": ";
                item.appendChild(name);
                item.appendChild(document.createTextNode(concept.explanation || "Not available in document."));
            } else {
                continue;
            }
            list.appendChild(item);
        }
        if (list.children.length) addSection("Key Concepts", list);
    }

    addTextSection("Equations Explained", answer.equations_explained);
    addTextSection("Real World Example", answer.real_world_example);
    addTextSection("Simple Summary", answer.simple_summary);

    if (!message.children.length) {
        addMessage(answer.raw_response || JSON.stringify(answer, null, 2));
        return;
    }
    chatBox.appendChild(message);
    scrollChat();
}

// Connect the existing buttons. Shift+Enter adds a new line in the textarea.
uploadButton.addEventListener("click", uploadPDF);
askButton.addEventListener("click", sendMessage);
questionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMessage();
    }
});

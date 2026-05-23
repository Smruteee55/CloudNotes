// --- GLOBAL STATE ---
let editingNoteId = null;

// --- 1. INITIALIZATION & SESSION CHECK ---
window.onload = function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        // Hide the login overlay if session exists
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('display-username').innerText = savedUser;
        
        // Update the sidebar avatar with the first letter
        const avatar = document.getElementById('avatar-initial');
        if (avatar) avatar.innerText = savedUser.charAt(0).toUpperCase();
        
        loadNotes();
    }
};

// --- 2. AUTHENTICATION ---
async function handleSignup() {
    const usernameInput = document.getElementById('reg-username');
    const passwordInput = document.getElementById('reg-password');

    if (!usernameInput.value || !passwordInput.value) {
        alert("Please enter both a username and password.");
        return;
    }

    try {
       const response = await fetch('https://cloudnotes-api-smruti-2026-fbcphwd2avezg9df.southeastasia-01.azurewebsites.net/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    })

        if (response.ok) {
            alert("Account created! Welcome to CloudNotes.");
            localStorage.setItem('currentUser', usernameInput.value.trim());
            location.reload(); // Refresh to initialize the dashboard layout
        } else {
            const error = await response.text();
            alert("Signup failed: " + error);
        }
    } catch (error) {
        console.error("Connection error:", error);
        alert("Backend is not responding. Ensure 'func start' is running.");
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('currentUser');
        location.reload();
    }
}

// --- 3. NOTE OPERATIONS (CRUD) ---

async function saveNote() {
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    const importanceInput = document.getElementById('is-important');
    
    // 1. RE-FETCH IDENTITY: Ensure we grab the latest user from storage
    const currentUser = localStorage.getItem('currentUser');

    // 2. SAFETY CHECK: Prevent "Guest" or null users from polluting the DB
    if (!currentUser || currentUser === "Guest") {
        alert("Authentication Error: Please log in again to save notes.");
        handleLogout(); // Force a clean slate if identity is missing
        return;
    }

    if (!titleInput.value.trim()) {
        alert("Please give your note a title.");
        return;
    }

    // 3. PREPARE DATA: Explicitly map the currentUser to studentId
    const noteData = {
        studentId: currentUser, 
        title: titleInput.value,
        content: contentInput.value,
        isImportant: importanceInput.checked,
        lastEditedDate: new Date().toISOString()
    };

    if (editingNoteId) {
        noteData.id = editingNoteId;
    } else {
        noteData.createdAt = new Date().toISOString();
    }

    try {
        console.log(`Attempting to save note for user: ${currentUser}`);

       const response = await fetch('https://cloudnotes-api-smruti-2026-fbcphwd2avezg9df.southeastasia-01.azurewebsites.net/api/saveNote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData)
});

        if (response.ok) {
            console.log("Success: Note synced to Azure Cosmos DB");
            resetEditor();
            loadNotes(); // This will now fetch notes specifically for the new user
        } else {
            const errorText = await response.text();
            console.error("Server rejected the note:", errorText);
            alert("Save failed. Check terminal for backend errors.");
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Cannot connect to Azure Function. Is 'func start' running?");
    }
}

async function loadNotes() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;

    try {
        // Fetch ALL notes from the API
        const response = await fetch('https://cloudnotes-api-smruti-2026-fbcphwd2avezg9df.southeastasia-01.azurewebsites.net/api/getNotes');
    const notes = await response.json();

        
        const list = document.getElementById('notes-list');
        if (!list) return; // Safety check
        
        list.innerHTML = ''; 

        // Filter notes for the current logged-in user
        const userNotes = notes.filter(n => 
            n.studentId && n.studentId.toLowerCase() === currentUser.toLowerCase()
        );

        console.log(`Found ${userNotes.length} notes for ${currentUser}`);

        if (userNotes.length === 0) {
            list.innerHTML = `<p style="color: #9F1239; padding: 20px;">No notes found for ${currentUser}. Start by creating one above!</p>`;
            return;
        }

        // Sort notes so the newest ones appear first
        userNotes.sort((a, b) => new Date(b.lastEditedDate || b.createdAt) - new Date(a.lastEditedDate || a.createdAt));

        userNotes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = note.isImportant ? 'note-card important' : 'note-card';
            
            // Fix: Added safety check for title and content to prevent "undefined" errors
            const title = note.title || "Untitled";
            const content = note.content || "";
            const safeTitle = title.replace(/'/g, "\\'");
            const safeContent = content.replace(/'/g, "\\'");

            noteCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    ${note.isImportant ? '<span class="important-badge">✨ Important</span>' : '<span></span>'}
                    <div class="card-actions">
                        <button class="icon-btn" onclick="prepareEdit('${note.id}', '${safeTitle}', '${safeContent}', ${note.isImportant})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn" onclick="deleteNote('${note.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <h3>${title}</h3>
                <p>${content}</p>
                <div class="note-footer">
                    <small>Last edited: ${note.lastEditedDate ? new Date(note.lastEditedDate).toLocaleDateString() : 'Just now'}</small>
                </div>
            `;
            list.appendChild(noteCard);
        });
    } catch (error) {
        console.error("Error loading notes:", error);
    }
}
async function deleteNote(noteId) {
    if (!confirm("Delete this note permanently?")) return;
    try {
        const response = await fetch(`https://cloudnotes-api-smruti-2026-fbcphwd2avezg9df.southeastasia-01.azurewebsites.net/api/deleteNote?id=${noteId}`, { method: 'DELETE' });
        if (response.ok) loadNotes(); 
    } catch (error) {
        console.error("Error deleting note:", error);
    }
}

// --- 4. UI HELPERS ---

function prepareEdit(id, title, content, isImportant) {
    document.getElementById('note-title').value = title;
    document.getElementById('note-content').value = content;
    document.getElementById('is-important').checked = isImportant;
    
    editingNoteId = id; 
    
    // Change button text to indicate update mode
    const syncBtn = document.querySelector('.btn-primary');
    if (syncBtn) syncBtn.innerText = "Update Note";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetEditor() {
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('is-important').checked = false;
    editingNoteId = null; 
    
    const syncBtn = document.querySelector('.btn-primary');
    if (syncBtn) syncBtn.innerText = "Sync to Azure";
}

// --- 5. SEARCH & FILTER ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        const allNoteCards = document.querySelectorAll('.note-card');
        
        allNoteCards.forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            const content = card.querySelector('p').innerText.toLowerCase();
            
            // Show card if search term matches title OR content
            if (title.includes(searchTerm) || content.includes(searchTerm)) {
                card.style.display = "flex";
            } else {
                card.style.display = "none";
            }
        });
    });
}
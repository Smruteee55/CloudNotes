global.crypto = require('crypto');
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("CloudNotesDB").container("Notes");

module.exports = async function (context, req) {
    // 1. GET THE STUDENT ID FROM THE REQUEST BODY
    const { studentId, title, content, isImportant, id } = req.body;

    const noteEntry = {
        studentId: studentId, // CHANGED: Now it uses the actual logged-in user
        title: title,
        content: content,
        isImportant: isImportant || false,
        createdAt: req.body.createdAt || new Date().toISOString(),
        lastEditedDate: new Date().toISOString()
    };

    // If we are editing, we need to include the ID so it updates instead of creates new
    if (id) {
        noteEntry.id = id;
    }

    try {
        // Use upsert so it handles both New Notes and Edits (Updates)
        const { resource: doc } = await container.items.upsert(noteEntry);
        context.res = { 
            status: 201, 
            body: doc,
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (err) {
        context.res = { status: 500, body: "Error: " + err.message };
    }
};
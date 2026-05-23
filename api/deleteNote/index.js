const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("CloudNotesDB").container("Notes");

module.exports = async function (context, req) {
    // Cosmos DB needs the ID of the note and the Partition Key (studentId)
    const noteId = req.query.id;
    const studentId = "Smruti"; 

    if (!noteId) {
        context.res = { status: 400, body: "Please pass a note ID" };
        return;
    }

    try {
        await container.item(noteId, studentId).delete();
        context.res = { status: 200, body: "Note deleted from Azure" };
    } catch (err) {
        context.res = { status: 500, body: "Delete failed: " + err.message };
    }
};

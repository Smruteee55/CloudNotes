global.crypto = require('crypto'); // Fix for the SDK error we saw earlier
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("CloudNotesDB").container("Users");

module.exports = async function (context, req) {
    const { username, password } = req.body;

    if (!username || !password) {
        context.res = { status: 400, body: "Please provide both username and password." };
        return;
    }

    const newUser = {
        id: crypto.randomUUID(), // Generates a unique ID
        username: username,
        password: password, // For a student project, plain text is okay for now
        studentId: username // We'll use this to link notes to this user later
    };

    try {
        const { resource: createdItem } = await container.items.create(newUser);
        context.res = {
            status: 201,
            body: { message: "User registered successfully!", user: createdItem.username }
        };
    } catch (err) {
        context.res = { status: 500, body: "Error registering user: " + err.message };
    }
};
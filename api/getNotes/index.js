const { CosmosClient } = require("@azure/cosmos");
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("CloudNotesDB").container("Notes");

module.exports = async function (context, req) {
    try {
        // FIXED: Removed the WHERE clause so it fetches ALL notes.
        // Your frontend (app.js) will now handle the filtering for the logged-in user.
        const { resources: notes } = await container.items
            .query("SELECT * FROM c") 
            .fetchAll();

        context.res = {
            status: 200,
            body: notes,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (err) {
        context.res = {
            status: 500,
            body: "Error fetching from Azure: " + err.message
        };
    }
};

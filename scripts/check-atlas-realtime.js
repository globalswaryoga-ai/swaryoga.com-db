
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkStatus() {
    const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
    if (!uri) return console.log("No URI");
    
    console.log("Connecting to check server status...");
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    
    try {
        const admin = conn.connection.db.admin();
        const status = await admin.serverStatus();
        console.log("--- ATLAS STATUS ---");
        console.log("Current Connections:", status.connections.current);
        console.log("Available Connections:", status.connections.available);
        console.log("Active Connections (Doing work):", status.connections.active || "N/A");
    } catch (e) {
        console.log("Could not get detailed status (Tier limit?):", e.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkStatus();

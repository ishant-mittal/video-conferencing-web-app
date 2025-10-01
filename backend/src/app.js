import 'dotenv/config';
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);

connectToSocket(server);

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`mongo connected db host: ${connectionDb.connection.host}`);
        
        server.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("failed to connect to the database", error);
        process.exit(1);
    }
};

start();
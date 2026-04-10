import express, { application } from 'express';
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./ٌroutes/auth.route.js";
import userRoutes from "./ٌroutes/user.route.js";
import chatRoutes from "./ٌroutes/chat.route.js";

import { connectDB } from './lib/db.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin : "http://localhost:5173",
  credentials : true //allow cookies to be sent from frontend to backend
})); // Enable CORS for all routes
app.use(cookieParser()); 
app.use(express.json()); // Parsing JSON body


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});


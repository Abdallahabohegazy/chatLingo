import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protectRoutes(req, res, next) {
    try {
        const token = req.cookies?.jwt;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if(!decoded) {
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized - User not found" });
        }

        req.user = user;

        next();
    }catch (error) {
        console.error("Error in protectRoutes middleware:", error.message);
        res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
}
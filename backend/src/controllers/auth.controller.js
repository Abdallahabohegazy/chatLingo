import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export async function signup(req, res) {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Use DiceBear avatar service with a deterministic seed
    const seed = fullName || email;
    const dicebearAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      seed
    )}`;

    const newUser = await User.create({
      fullName,
      email,
      password,
      profilePic: dicebearAvatar,
      avatar: dicebearAvatar,
    });

    // CREATE THE USER IN STREAM AS WELL
    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
    } catch (error) {
      console.error("Error creating Stream user:", error);
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
      httpOnly: true, //prevent xss attacks
      sameSite: "strict", //prevent csrf attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in Signup controller:", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}


export async function login(req, res) {
  try {
  const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    
    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
      httpOnly: true, //prevent xss attacks
      sameSite: "strict", //prevent csrf attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in Login controller:", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}



export async function logout(req, res) {
  res.clearCookie("jwt")
  res.status(200).json({ success: true, message: "Logged out successfully" });
}




export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const {fullName , bio, nativeLanguage, learningLanguage ,location } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({
         message: "All fields are required" ,
         missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage", 
          !learningLanguage && "learningLanguage",
          !location && "location",
         ].filter(Boolean),    
      });
    }

    const { profilePic } = req.body;

    const avatarUrl =
      profilePic && profilePic.trim()
        ? profilePic
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId.toString()}`;

    const updateData = {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      profilePic: avatarUrl,
      avatar: avatarUrl,
      isOnboarded: true,
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
    }catch (streamError) {
      console.error("Error updating Stream user during onboarding:", streamError.message);

    }
    
    res.status(200).json({ success: true, user: updatedUser });


  } catch (error) {
    console.log("Error in Onboarding controller:", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}

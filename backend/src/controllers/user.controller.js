import FriendRequest from "../models/friendRequest.js";
import User from "../models/User.js";


export async function getRecommendedUsers(req, res) {
    try {
        const currentUsserId = req.user.id;
        const currentUser = req.user;

        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUsserId } }, // Exclude the current user
                { _id: { $nin: currentUser.friends } }, // Exclude friends
                { isOnboarded: true } // Only include users who are onboarded
            ]
        })
        res.status(200).json(recommendedUsers);

    } catch (error) {
        console.log("Error in getRecommendedUsers controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }

}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user.id).select("friends").populate("friends", "fullName profilePic nativeLanguage learningLanguage _id");
        const friends = user?.friends || [];
        res.status(200).json({ friends });
    } catch (error) {
        console.log("Error in getMyFriends controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}


export async function sendFriendRequest(req, res) {
    try{
        const myId = req.user.id;
        const{id:recipientId} = req.params;

        // prevent sending friend request to yourself
        if(myId === recipientId){
            return res.status(400).json({message:"You cannot send a friend request to yourself"});
        }

        const recipient = await User.findById(recipientId);
        if(!recipient){
            return res.status(404).json({message:"Recipient user not found"});
        }

        //check if they are already friends
        const friendsIds = (recipient.friends || []).map((f) => f.toString());
        if (friendsIds.includes(myId.toString())) {
            return res.status(400).json({message:"You are already friends with this user"});
        }

        // check if a friend request already exists between the two users
        const existingRequest = await FriendRequest.findOne({
            $or:[
                {sender:myId, recipient:recipientId},
                {sender:recipientId, recipient:myId}
            ]
        });

        if(existingRequest){
            return res.status(400).json({message:"A friend request already exists between you and this user"});
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId,
        });

        res.status(200).json({ success: true, friendRequest });
    } catch(error){
        console.log("Error in sendFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}

export async function acceptFriendRequest(req, res) {
    try{

        const {id:requestId} = req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if(!friendRequest){
            return res.status(404).json({message:"Friend request not found"});
        }

        // only the recipient of the friend request can accept it
        if(friendRequest.recipient.toString() !== req.user.id){
            return res.status(403).json({message:"You are not authorized to accept this friend request"});
        }

        friendRequest.status = "accepted";
        await friendRequest.save();
        

        // add each user to the other user's friends list
        //$addToset : adds element to an array only if it doesn't already exist in the array
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet:{friends:friendRequest.recipient}});

        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet:{friends:friendRequest.sender}});

        res.status(200).json({message:"Friend request accepted"});

    } catch(error){
        console.log("Error in acceptFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}




export async function getFriendRequests(req, res) {
    try{
        const inComingRequests = await FriendRequest.find({
            recipient:req.user.id,
            status:"pending"
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

        const acceptedRequests = await FriendRequest.find({
            recipient:req.user.id,
            status:"accepted"
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json({inComingRequests, acceptedRequests});
    }catch(error){
        console.log("Error in getFriendRequests controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}


export async function getOutGoingFriendRequests(req, res) {
    try{
        const outGoingRequests = await FriendRequest.find({
            sender:req.user.id,
            status:"pending"
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage");

        
        res.status(200).json(outGoingRequests);
    }catch(error){ 
        console.log("Error in getOutGoingFriendRequests controller:", error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}
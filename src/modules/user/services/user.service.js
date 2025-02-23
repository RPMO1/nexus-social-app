import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbServices from "../../../DB/db.service.js"
import { roleTypes, userModel } from "../../../DB/model/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import cloud from '../../../utils/multer/cloudinary.js'
import { postModel } from "../../../DB/model/Post.model.js";
import { friendRequestModel } from "../../../DB/model/friendRequest.model.js";


export const profile = asyncHandler(
    async (req, res, next) => {
        const user = await dbServices.findOne({
            model: userModel,
            filter: { _id: req.user._id },
            populate: [
                { path: "viewers.userId", select: "userName email image" },
                { path: "blockedUsers", select: "userName image" },
                { path: "friends", select: "userName image" },
                {
                    path: "friendRequests",
                    match: { status: false }, // Only fetch pending requests
                    populate: { path: "senderId", select: "userName image" } // Fetch sender details
                },
                {
                    path: "posts", match: { isDeleted: { $exists: false }, isArchived: { $exists: false } },
                    populate: {
                        path: 'comments',
                        match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
                        populate: {
                            path: "reply",
                            match: { commentId: { $exists: false } },
                            populate: {
                                path: "reply",
                                match: { commentId: { $exists: false } }
                            }
                        }
                    }
                }]
        })

        return successResponse({ res, data: { user } })
    }
)


export const shareProfile = asyncHandler(async (req, res, next) => {
    const { profileId } = req.params;
    const viewerId = req.user._id; // Current user's ID
    const currentTime = Date.now();

    // Check if the profile exists
    const userProfile = await dbServices.findOne({
        model: userModel,
        filter: { _id: profileId, isDeleted: { $exists: false } },
        select: "userName email DOB phone image blockedUsers",
        populate: [{ path: "viewers.userId", select: "userName email image" }]
    });

    if (!userProfile) {
        return next(new Error("Invalid account ID", { cause: 404 }));
    }

    // Fetch viewer's profile to check blockedUsers
    const viewerProfile = await dbServices.findOne({
        model: userModel,
        filter: { _id: viewerId, isDeleted: { $exists: false } },
        select: "blockedUsers"
    });

    if (!viewerProfile) {
        return next(new Error("Invalid viewer account", { cause: 404 }));
    }

    // Check if either the profile owner or the viewer has blocked the other
    if (userProfile.blockedUsers.includes(viewerId) || viewerProfile.blockedUsers.includes(profileId)) {
        return res.status(403).json({ error: "Access denied. You have been blocked or have blocked this user." });
    }

    // Skip if the viewer is the profile owner
    if (profileId === viewerId.toString()) {
        return successResponse({ res, data: { userProfile } });
    }

    // Check if the viewer already exists in the array using $elemMatch
    const viewerExists = await dbServices.findOne({
        model: userModel,
        filter: {
            _id: profileId,
            "viewers": { $elemMatch: { userId: viewerId } }
        },
        select: "viewers"
    });

    if (viewerExists) {
        // Get the viewer object and their view times
        const existingViewer = viewerExists.viewers.find(viewer => viewer.userId.toString() === viewerId.toString());
        const viewCount = existingViewer.time.length;

        // Update the viewer's time array with the new timestamp (always update, even if it's below 6)
        await dbServices.updateOne({
            model: userModel,
            filter: { _id: profileId, "viewers.userId": viewerId },
            data: {
                $push: {
                    "viewers.$.time": {
                        $each: [currentTime], // Add the new timestamp
                        $slice: -5           // Keep only the most recent 5 timestamps
                    }
                }
            }
        });

        // If this is the 6th view (after the update), trigger the email
        if (viewCount === 5) {
            emailEvent.emit("sendProfileViewEmail", {
                email: userProfile.email,
                userName: req.user.userName,
                viewTimes: [...existingViewer.time, currentTime] // Include the latest view time as well
            });
        }
    } else {
        // Add a new viewer to the array
        await dbServices.updateOne({
            model: userModel,
            filter: { _id: profileId },
            data: {
                $push: {
                    viewers: {
                        userId: viewerId,
                        time: [currentTime] // Initialize the time array
                    }
                }
            }
        });
    }

    return successResponse({ res, data: { userProfile } });
});

export const updateBasicProfile = asyncHandler(
    async (req, res, next) => {
        const user = await dbServices.findByIdAndUpdate({
            model: userModel,
            id: req.user._id,
            data: req.body,
            options: {
                new: true
            }
        })
        return successResponse({ res, data: { user } })
    }
)

export const updatePassword = asyncHandler(
    async (req, res, next) => {
        const { oldPassword, password } = req.body;
        if (!compareHash({ plaintext: oldPassword, hashValue: req.user.password })) {
            return next(new Error("In-valid old password"), { cause: 400 })
        }
        const user = await dbServices.findByIdAndUpdate({
            model: userModel,
            id: req.user._id,
            data: {
                password: generateHash({ plaintext: password }),
                credentialsChangeTime: Date.now()
            },
        })
        successResponse({ res })
    }
)

export const updateEmail = asyncHandler(
    async (req, res, next) => {
        const { email } = req.body;
        if (await dbServices.findOne({ model: userModel, filter: { email } })) {
            return next(new Error("Email Exists"), { cause: 409 })
        }
        const user = await dbServices.updateOne({
            model: userModel,
            filter: { _id: req.user._id },
            data: {
                tempEmail: email
            },
        })

        emailEvent.emit("updateEmail", { id: req.user._id, email })   //sendCode to the new account
        emailEvent.emit("sendConfirmEmail", { id: req.user._id, email: req.user.email })       //sendCode to the old account
        successResponse({ res })
    }
)

export const resendUpdateEmailOTP = asyncHandler(async (req, res, next) => {
    const { oldEmail, newEmail } = req.body;

    const user = await dbServices.findOne({ model: userModel, filter: { email: oldEmail, tempEmail: newEmail } });
    if (!user) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Check if OTPs are still valid
    const oldEmailOTPExpire = "updateEmailOTPExpire"; // The expiration field for both emails
    if (user[oldEmailOTPExpire] && Date.now() < user[oldEmailOTPExpire]) {
        return next(new Error("OTP for old email is still valid, no need to resend", { cause: 400 }));
    }

    // Check if the user is within the resend attempt limit
    if (user.resendOTPAttempts >= 5) {
        const currentTime = Date.now();
        const timeGap = currentTime - (user.lastResendAttempt || 0);

        if (timeGap < 5 * 60 * 1000) { // 5-minute gap
            return next(new Error("You have exceeded the maximum number of attempts. Please wait 5 minutes before retrying.", { cause: 429 }));
        } else {
            // Reset resend attempts and cooldown after 5 minutes
            await dbServices.updateOne({
                model: userModel,
                filter: { _id: user._id },
                data: { $set: { resendOTPAttempts: 0 }, $unset: { lastResendAttempt: 1 } },
            });
        }
    }

    // Update user resend attempt count and emit event for both emails
    await dbServices.updateOne({
        model: userModel,
        filter: { _id: user._id },
        data: {
            lastResendAttempt: Date.now(),
            $inc: { resendOTPAttempts: 1 },
        },
    });

    emailEvent.emit("sendConfirmEmail", { id: user._id, email: oldEmail }); // Send OTP to old email
    emailEvent.emit("updateEmail", { id: user._id, email: newEmail });      // Send OTP to new email

    return successResponse({ res, status: 200, message: "OTP sent successfully" });
});

export const replaceEmail = asyncHandler(async (req, res, next) => {
    const { oldEmailCode, code } = req.body;

    // Check if the temp email exists as another user's email
    if (await dbServices.findOne({ model: userModel, filter: { email: req.user.tempEmail } })) {
        return next(new Error("Email already exists", { cause: 409 }));
    }

    // Check OTP expirations
    if (Date.now() > req.user.emailOTPExpire) {
        return next(new Error("Old email verification code has expired", { cause: 400 }));
    }

    if (Date.now() > req.user.updateEmailOTPExpire) {
        return next(new Error("New email verification code has expired", { cause: 400 }));
    }

    // Verify OTPs
    if (!compareHash({ plaintext: oldEmailCode, hashValue: req.user.emailOTP })) {
        return next(new Error("Invalid verification code for old email", { cause: 400 }));
    }

    if (!compareHash({ plaintext: code, hashValue: req.user.updateEmailOTP })) {
        return next(new Error("Invalid verification code for new email", { cause: 400 }));
    }

    // Update user email and reset temporary fields
    await dbServices.updateOne({
        model: userModel,
        filter: { _id: req.user._id },
        data: {
            email: req.user.tempEmail,
            credentialsChangeTime: Date.now(),
            resendOTPAttempts: 0,
            $unset: {
                tempEmail: 1,
                updateEmailOTP: 1,
                updateEmailOTPExpire: 1,
                emailOTP: 1,
                emailOTPExpire: 1,
                lastResendAttempt: 1
            },
        },
    });

    return successResponse({ res });
});


export const enableTwoStepVerification = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!await dbServices.findOne({ model: userModel, filter: { _id: user._id } })) {
        return next(new Error("User not found"), { cause: 404 })
    }
    await dbServices.updateOne({
        model: userModel,
        filter: { _id: user._id },
        data: {
            twoFAEnabled: false,  // Make sure 2FA is not yet enabled
        },
    })

    emailEvent.emit("enable2FA", { id: user._id, email: user.email })
    return successResponse({ res, message: "OTP sent to your email to enable 2FA." });
});


export const verifyTwoStepVerificationOTP = asyncHandler(async (req, res, next) => {
    const { code } = req.body;

    const user = await dbServices.findOne({ model: userModel, filter: { _id: req.user._id, twoFAEnabled: false } });
    if (!user) {
        return next(new Error("In-valid Account", { cause: 404 }));
    }

    // Check OTP expirations
    if (Date.now() > user.twoFAOTPExpire) {
        return next(new Error("verification code is expired", { cause: 400 }));
    }

    if (!compareHash({ plaintext: code, hashValue: user.twoFAOTP })) {
        return next(new Error("Invalid verification OTP code ", { cause: 400 }));
    }

    await dbServices.updateOne({
        model: userModel,
        filter: { _id: user._id },
        data: {
            twoFAEnabled: true,
            $unset: { twoFAOTP: 1, twoFAOTPExpire: 1 }
        },
    });

    return successResponse({ res, message: "2-Step Verification enabled successfully." });

});


export const uploadImage = asyncHandler(
    async (req, res, next) => {
        console.log(req.file)
        const { secure_url, public_id } = await cloud.uploader.upload(req.file.path, { folder: `user/${req.user._id}` })
        const user = await dbServices.findByIdAndUpdate({
            model: userModel,
            id: req.user._id,
            data: {
                image: { secure_url, public_id }
            },
            options: {
                new: false
            }
        })
        if (user.image?.public_id) {
            await cloud.uploader.destroy(user.image.public_id)
        }
        return successResponse({ res, data: { file: req.file, user } })
    }
)

export const coverImages = asyncHandler(
    async (req, res, next) => {
        console.log(req.file)
        const images = []
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: `user/${req.user._id}/cover` })
            images.push({ secure_url, public_id })
        }
        const user = await dbServices.findByIdAndUpdate({
            model: userModel,
            id: req.user._id,
            data: {
                // coverImages: req.files.map(file => file.finalPath)
                coverImages: images
            },
            options: {
                new: true
            }
        })
        return successResponse({ res, data: { file: req.file, user } })
    }
)

export const blockUser = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (req.body.email === req.user.email) {
        return res.status(400).json({ error: "You cannot block yourself." });
    }

    const userToBlock = await userModel.findOne({ email });
    if (!userToBlock) {
        return next(new Error("User not found."));
    }

    // Remove the blocked user from the current user's friends list
    await dbServices.findByIdAndUpdate({
        model: userModel,
        id: req.user._id,
        data: { $pull: { friends: userToBlock._id } }, // Remove the blocked user from friends
        options: { new: true }
    });

    // Remove the current user from the blocked user's friends list
    await dbServices.findByIdAndUpdate({
        model: userModel,
        id: userToBlock._id,
        data: { $pull: { friends: req.user._id } }, // Remove the current user from their friends
        options: { new: true }
    });

    // Update the logged-in user's blocked list
    const updatedUser = await dbServices.findByIdAndUpdate({
        model: userModel,
        id: req.user._id,
        data: { $addToSet: { blockedUsers: userToBlock._id } },
        options: { new: true }
    });

    return successResponse({
        res,
        message: `User with email ${email} has been blocked.`,
        data: { updatedUser }
    });
});

export const sendFriendRequest = asyncHandler(async (req, res, next) => {
    const { friendId } = req.params

    if (friendId == req.user._id) {
        return res.status(400).json({ error: "You cannot Add yourself as a friend." });
    }

    const userToBeFriend = await dbServices.findOne({
        model: userModel,
        filter: { _id: friendId, isDeleted: { $exists: false } },
    })
    if (!userToBeFriend) {
        return next(new Error("User not found.", { cause: 404 }));
    }

    // Check if the user has blocked the current user
    if (userToBeFriend.blockedUsers.includes(req.user._id)) {
        return next(new Error("You cannot add this user as a friend because they have blocked you.", { cause: 400 }));
    }

    // Check if the current user has blocked the user to be added
    if (req.user.blockedUsers.includes(userToBeFriend._id)) {
        return next(new Error("You cannot add this user as a friend because you have blocked them.", { cause: 400 }));

    }

    const friendRequest = await dbServices.create({
        model: friendRequestModel,
        data: {
            friendId,
            senderId: req.user._id
        }

    })


    return successResponse({ res, status: 201, data: { friendRequest } });
});


export const acceptFriendRequest = asyncHandler(async (req, res, next) => {
    const { friendRequestId } = req.params
    console.log(friendRequestId)

    const friendRequest = await dbServices.findOneAndDelete({
        model: friendRequestModel,
        filter: {
            _id: friendRequestId,
            status: false,
            friendId: req.user._id
        },
    })
    console.log(friendRequest)
    if (!friendRequest) {
        return next(new Error("Friend request not found.", { cause: 404 }));
    }

    //Add both as friends to each other
    await dbServices.updateOne({
        model: userModel,
        filter: { _id: friendRequest.senderId },
        data: { $addToSet: { friends: req.user._id } }

    });

    await dbServices.updateOne({
        model: userModel,
        filter: { _id: req.user._id },
        data: { $addToSet: { friends: friendRequest.senderId } }

    });

    return successResponse({ res });
});


export const dashboard = asyncHandler(async (req, res, next) => {
    const [users, posts] = await Promise.allSettled([
        dbServices.findAll({
            model: userModel,
            filter: {}
        }),
        dbServices.findAll({
            model: postModel,
            filter: {}
        })
    ]);

    return successResponse({
        res,
        data: {
            users,
            posts
        }
    });
});

export const changePrivileges = asyncHandler(async (req, res, next) => {
    const { userId, role } = req.body

    const owner = req.user.role === roleTypes.superAdmin ? {} : {
        role: {
            $nin: [roleTypes.admin, roleTypes.superAdmin]
        }
    }
    const user = await dbServices.findOneAndUpdate({
        model: userModel,
        filter: {
            _id: userId,
            // isDeleted: { $exists: false },
            isDeleted: { $in: [null, undefined] },
            ...owner
        },
        data: {
            role,
            modifiedBy: req.user._id
        },
        options: {
            new: true
        }

    })
    return successResponse({
        res,
        data: {
            user
        }
    });
});

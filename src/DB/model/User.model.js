import mongoose, { Schema, Types, model } from "mongoose"
import { decodeEncryption, generateEncryption } from "../../utils/security/encryption.security.js";

export const genderTypes = { male: "male", female: "female" }
export const roleTypes = { user: "user", admin: "admin", superAdmin: "superAdmin" }
export const providerTypes = { system: "system", google: "google" }

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 25,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    emailOTP: String,
    emailOTPExpire: Date,

    tempEmail: String,
    updateEmailOTP: String,
    updateEmailOTPExpire: Date,

    twoFAEnabled: {
        type: Boolean,
        default: false
    },
    twoFAOTP: String,
    twoFAOTPExpire: Date,



    resendOTPAttempts: { type: Number, default: 0 },
    lastResendAttempt: Date,

    password: {
        type: String,
    },

    phone: String,
    DOB: Date,

    // image: String,
    image: { secure_url: String, public_id: String },

    // coverImages: [String],
    coverImages: [{ secure_url: String, public_id: String }],

    gender: {
        type: String,
        enum: Object.values(genderTypes),
        default: genderTypes.male
    },

    role: {
        type: String,
        enum: Object.values(roleTypes),
        default: roleTypes.user
    },
    provider: {
        type: String,
        enum: Object.values(providerTypes),
        default: providerTypes.system
    },
    confirmEmail: {
        type: Boolean,
        default: false
    },
    isDeleted: Date,

    credentialsChangeTime: Date,
    viewers: [{ userId: { type: Types.ObjectId, ref: "User" }, time: [Date] }],
    blockedUsers: [{ type: Types.ObjectId, ref: 'User' }],
    friends: [{ type: Types.ObjectId, ref: 'User' }],
    modifiedBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } });

userSchema.virtual('posts', {
    localField: '_id',
    foreignField: 'userId',
    ref: 'Post',
})

userSchema.virtual('friendRequests', {
    localField: '_id',
    foreignField: 'friendId',
    ref: 'FriendRequest',
})

userSchema.pre("findOneAndUpdate", { document: false, query: true }, function (next) {
    const update = this.getUpdate();

    if (update.phone) {
        update.phone = generateEncryption({ plaintext: update.phone });
        this.setUpdate(update);
    }

    next();
});

userSchema.post("findOne", function (doc) {
    if (doc && doc.phone) {
        doc.phone = decodeEncryption({ ciphertext: doc.phone });
    }
});



export const userModel = mongoose.models.User || model("User", userSchema);
export const socketConnections = new Map()

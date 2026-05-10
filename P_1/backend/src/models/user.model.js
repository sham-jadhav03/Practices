import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

const userModel = mongoose.model("User", userSchema);

export default userModel;
import userModel from '../models/user.model.js';
import jwt from "jsonwebtoken"

const sendTokenResponse = async (req, res) => {
  const token = jwt.sign({
    id: userModel._id
  },
{
    expireIn: "1d"
})

res.token("token", token)

res.status(200).json({
    message,
    success: true,
    user:{
         id: user._id,
         username: user.username,
         email: user.email,
         password: user.password
    }
})
}

export const register = async (req, res) => {
    const {username, email, password} = req.body;

    const userAlreadyExists = await userModel.findOne({
        $or: [{ username }, { email }]
    });
    if (userAlreadyExists) {
        return res.status(400).json({ message: "Username or email already exists" });
    }

    const user = await userModel({
        username, email, password
    })
  
    await user.save();

    sendTokenResponse(req, res)
}


export const login = async (req, res) => {
    const { email, password } = req.body;
 
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    sendTokenResponse(req, res)
}
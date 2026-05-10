import userModel from '../models/user.model.js';


export const register = async (req, res) => {
    const {username, email, password} = req.body;

    const existingUser = await  userModel.findOne({
        $or: [{ username }, { email }]
    });
    if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
    }

    
}
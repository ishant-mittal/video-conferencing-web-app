import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

import httpStatus from "http-status";

import bcrypt, { hash } from "bcrypt"
import crypto from "crypto"

// register and login

const register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "user already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "user registered" })

    } catch (e) {
        res.json({ message: `something went wrong ${e}` })
    }

}

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "please provide both username and password" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "user not found" })
        }

        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "invalid username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: `something went wrong ${e}` })
    }
}

// history monitoring

const addToHistory = async (req, res) => {
    // get the token of the user and the meeting code that needs to be added
    const { token, meeting_code } = req.body; // req.body: get the data from the body of the http request being made by the user

    try {
        //find the user using the token
        const user = await User.findOne({ token: token });

        // create a new item to add to the meeting model
        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        // wait for the item to get saved in the model
        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "added meeting to the history" })
    } catch (e) {
        res.json({ message: `something went wrong ${e}` })
    }
}

const getUserHistory = async (req, res) => {
    // get the token of the user who is making this request
    const { token } = req.query; // req.query: get the data directly from the url of the user making the request

    try {
        // find the user using the token
        const user = await User.findOne({ token: token });

        // gather all the meetings of the user from the model
        const meetings = await Meeting.find({ user_id: user.username })

        // respond with all the meetings found for the user
        res.json(meetings)
    } catch (e) {
        res.json({ message: `something went wrong ${e}` })
    }
}

export { login, register, getUserHistory, addToHistory }
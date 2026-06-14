const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const authmiddleware = async (req,res,next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            "msg":"access denied"
        });
    }

    const token = authHeader.substring(7);

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }catch(err){
        return res.status(401).json({
            "msg":"invalid token"
        });
    }
}

module.exports = { authmiddleware };
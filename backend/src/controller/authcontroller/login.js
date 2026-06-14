const pool = require('../../db/dbconnection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Loginuser = async (req,res) => {
    let {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({
            msg: "All fields are required"
        });
    }

    try{
        const user = await pool.query(
        "SELECT * FROM user_details WHERE email=$1", [email]
    );

    if(user.rows.length === 0){
        return res.status(401).json({
            "msg":"Invalid email or password"
        });
    }
    const existingUser = user.rows[0];

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if(!isMatch){
        return res.status(401).json({
            "msg":"Invalid email or password"
        });
    }

    const token = jwt.sign({
        id: existingUser.user_id,
        
    },
        process.env.JWT_SECRET, {expiresIn: '1h'});

    return res.status(200).json({
        "msg":"Login successful",
        "token": token,
        user: {
        id: existingUser.user_id,
        username: existingUser.username,
        email: existingUser.email
    }
    });
    }catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }

}

module.exports = {
    Loginuser
}
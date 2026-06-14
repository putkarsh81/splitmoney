const bcrypt = require('bcrypt');
const pool = require('../../db/dbconnection');

const registerUser = async (req,res) => {
    let {username, email, password} = req.body;
    
    if (!username || !email || !password) {
    return res.status(400).json({
        msg: "All fields are required"
    });
}

    try{
        const user_exists = await pool.query(
            "SELECT * FROM user_details WHERE email=$1", [email]
        );

    if(user_exists.rows.length > 0){
        return res.status(401).json({
            "msg":"Email already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        "INSERT INTO user_details (username,email,password) VALUES ($1,$2,$3)", [username, email, hashedPassword]
    );

    return res.status(201).json({
        "msg":"User registered successfully"
    });
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            "msg":"Internal server error"
        });
    }

    
}

module.exports = {
    registerUser
}
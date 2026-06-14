const pool = require('../db/dbconnection');

const createGroup = async (req,res) => {
    const {groupname} = req.body;
    const user_id = req.user.id;

    try{
        if(!groupname){
        return res.status(400).json({
            msg:"please enter group name"
        });
    }

    const result = await pool.query(
        "INSERT INTO groups (name, created_by) VALUES ($1,$2) RETURNING *", [groupname, user_id]
    );

    const addMember  = await pool.query(
        "INSERT INTO group_members(group_id, user_id, joined_at) VALUES ($1,$2,CURRENT_DATE) RETURNING *", [result.rows[0].id, user_id]
    );

    return res.status(201).json({
        msg:"successfully created group",
        group:result.rows[0]
    });
    }
    catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }
}



module.exports = {createGroup};
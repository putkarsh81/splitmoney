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

const getAllGroup = async (req,res) => {
    const user_id = req.user.id;

    try{
        const result = await pool.query(
            "SELECT * FROM groups g join group_members gm on g.id = gm.group_id WHERE gm.user_id=$1 AND gm.left_at IS NULL",[user_id]
        );

        res.status(201).json({
            groups:result.rows
        });
    }catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }
}

const addMember = async (req,res) => {
    const user_id = req.body.user_id;
    const group_id = req.params.group_id;
    const current_user_id = req.user.id;

    try{
    const group_exists = await pool.query(
        "SELECT * FROM groups WHERE id=$1",[group_id]
    );

    if(group_exists.rows.length == 0){
        return res.status(404).json({
            msg:"group not found"
        });
    }

    if(current_user_id !== group_exists.rows[0].created_by){
        return res.status(403).json({
            msg:"only group creator can add members"
        });
    }    

    const user_exists = await pool.query(
        "SELECT * FROM user_details WHERE user_id=$1",[user_id]
    );

    if(user_exists.rows.length == 0){
        return res.status(404).json({
            msg:"user not found"
        });
    }

    const member_exists = await pool.query(
        "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL   ",[group_id, user_id]
    );

    if(member_exists.rows.length > 0){
        return res.status(404).json({
            msg:"user is already a member of the group"
        });
    }

    
        const result = await pool.query(
            "INSERT INTO group_members(group_id, user_id, joined_at) VALUES ($1,$2,CURRENT_DATE) RETURNING *", [group_id, user_id]
        );
        return res.status(201).json({
            msg:"member added successfully",
            member:result.rows[0]
        });
    }catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }
}

const getGroupMembers = async (req,res) => {
    const group_id = req.params.group_id;
    const user_id = req.user.id;
    try{
        const group_exists = await pool.query(
            "SELECT * FROM groups WHERE id=$1",[group_id]
        );
        if(group_exists.rows.length == 0){
            return res.status(404).json({
                msg:"group not found"
            });
        }

        const is_member = await pool.query(
            "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL",[group_id, user_id]
        );
        if(is_member.rows.length == 0){
            return res.status(403).json({
                msg:"access denied"
            });
        }
        const members = await pool.query(
            "SELECT u.user_id, u.username, u.email, gm.joined_at FROM user_details u JOIN group_members gm ON u.user_id = gm.user_id WHERE gm.group_id=$1 AND gm.left_at IS NULL",[group_id]
        );
        return res.status(200).json({
            members:members.rows
        });
    }catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }
}

const removeMember = async (req,res) => {
    const user_id = Number(req.params.user_id);
    const group_id = Number(req.params.group_id);
    const current_user_id = req.user.id; 
    try{
        const group_exists = await pool.query(
            "SELECT * FROM groups WHERE id=$1",[group_id]
        );
        if(group_exists.rows.length == 0){
            return res.status(404).json({
                msg:"group not found"
            });
        }
        if(current_user_id == user_id){
            return res.status(403).json({
                msg:"group creator cannot remove themselves from the group"
            });
        }
        
        if(current_user_id !== group_exists.rows[0].created_by){
            return res.status(403).json({
                msg:"only group creator can remove members"
            });
        }

        const member_exists = await pool.query(
            "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL",[group_id, user_id]
        );
        if(member_exists.rows.length == 0){
            return res.status(404).json({
                msg:"member not found in the group"
            });
        }

        const result = await pool.query(
            "UPDATE group_members SET left_at=CURRENT_DATE WHERE group_id=$1 AND user_id=$2 RETURNING *",[group_id, user_id]
        );
        return res.status(200).json({
            msg:"member removed successfully",
            member:result.rows[0]
        });
    }catch(err){
        console.error(err);
        return res.status(500).json({   
        "msg":"Internal server error"
        });
    }   
}

module.exports = {createGroup, getAllGroup, addMember, getGroupMembers, removeMember};
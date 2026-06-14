const pool = require("../../db/dbconnection");

const getProfile = async (req, res) => {
    try {

        const id = req.user.id;

        const result = await pool.query(
            `SELECT user_id, username, email
             FROM user_details
             WHERE user_id = $1`,
            [id]
        );
        
        return res.status(200).json(
            result.rows[0]
        );

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            msg: "Internal server error"
        });

    }
};

module.exports = {
    getProfile
};
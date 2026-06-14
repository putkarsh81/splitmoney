const pool = require("../../db/dbconnection");

const getProfile = async (req, res) => {
    try {

        const email = req.user.email;

        const result = await pool.query(
            `SELECT username, email
             FROM user_details
             WHERE email = $1`,
            [email]
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
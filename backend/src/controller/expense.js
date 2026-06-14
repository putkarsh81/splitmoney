const pool = require("../db/dbconnection");

const addExpense = async (req,res) => {
    const {group_id, description, amount, paid_by, expense_date, members} = req.body;

    if(
   !group_id ||
   !description ||
   !amount ||
   !paid_by ||
   !expense_date ||
   !members ||
   members.length === 0
){
   return res.status(400).json({
      msg: "All fields are required"
   });

   if(
    !Array.isArray(members) ||
    members.length === 0
){
    return res.status(400).json({
        msg:"Members array required"
    });
}
}

    try{
        const group_exist = await pool.query(
        "SELECT * FROM groups WHERE id=$1", [group_id]
    );
    if(group_exist.rows.length == 0){
        return res.status(404).json({
            msg:"group not found"
        });
    }

    const payer_exist = await pool.query(
        "SELECT * FROM user_details WHERE user_id=$1",[paid_by]
    );
    if(payer_exist.rows.length == 0){
        return res.status(404).json({
            msg:"User not exists"
        })
    }

    const paid_by_exists = await pool.query(
        "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND joined_at<=$3 AND (left_at IS NULL OR left_at>=$3)",[group_id, paid_by,expense_date]
    );
    if(paid_by_exists.rows.length == 0){
        return res.status(404).json({
            msg:"User not exists in group by whom bill paid"
        })
    }

    for(const memberId of members){
        const member_exist = await pool.query(
            "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2  AND joined_at<=$3 AND (left_at IS NULL OR left_at>=$3)",[group_id, memberId,expense_date]
        );
        if(member_exist.rows.length  == 0){
            return res.status(404).json({
                msg:`${memberId} is not part of group `
            });
        }
    }

    
    await pool.query("BEGIN");

    // Insert Expense
    const expenseResult = await pool.query(
        `INSERT INTO expenses
        (
            group_id,
            description,
            amount,
            paid_by,
            expense_date
        )
        VALUES($1,$2,$3,$4,$5)
        RETURNING *`,
        [
            group_id,
            description,
            amount,
            paid_by,
            expense_date
        ]
    );

    const expenseId = expenseResult.rows[0].id;

    const shareAmount = (
        Number(amount) / members.length
    ).toFixed(2);

    for(const memberId of members){

        await pool.query(
            `INSERT INTO expense_shares
            (
                expense_id,
                user_id,
                share_amount
            )
            VALUES($1,$2,$3)`,
            [
                expenseId,
                memberId,
                shareAmount
            ]
        );}

        await pool.query("COMMIT");

    return res.status(201).json({
        msg: "Expense created successfully",
        expense: expenseResult.rows[0]
    });
    }
    catch(err){

    await pool.query("ROLLBACK");

    console.error(err);

    return res.status(500).json({
        msg: "Internal server error"
    });

}

    




}

module.exports = {addExpense};
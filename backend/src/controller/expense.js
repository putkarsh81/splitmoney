const pool = require("../db/dbconnection");

async function calculateBalances(group_id) {
    const active_member = await pool.query(
        "SELECT u.user_id, u.username FROM user_details u JOIN group_members gm ON u.user_id = gm.user_id WHERE gm.group_id=$1 AND gm.left_at IS NULL",[group_id]
    );
    const balances = [];

    for (const member of active_member.rows) {

    const paidResult = await pool.query(
        `SELECT COALESCE(SUM(amount),0) AS amount_paid
         FROM expenses
         WHERE group_id=$1
         AND paid_by=$2`,
        [group_id, member.user_id]
    );

    const owedResult = await pool.query(
        `SELECT COALESCE(SUM(es.share_amount),0) AS amount_owed
         FROM expense_shares es
         JOIN expenses e
         ON es.expense_id = e.id
         WHERE e.group_id=$1
         AND es.user_id=$2`,
        [group_id, member.user_id]
    );

    const amount_paid =
        Number(paidResult.rows[0].amount_paid);

    const amount_owed =
        Number(owedResult.rows[0].amount_owed);

    balances.push({
        user_id: member.user_id,
        username: member.username,
        amount_paid,
        amount_owed,
        net_balance:
            Number(
                (amount_paid - amount_owed)
                .toFixed(2)
            )
    });
    }
    balances.sort(
    (a,b) => b.net_balance - a.net_balance
);
    return balances;
}



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

const viewExpense = async (req,res) => {
    const group_id = req.params.group_id;
    const current_user = req.user.id;

    try{
        const group_exist = await pool.query(
        "SELECT * FROM groups WHERE id=$1",[group_id]
    );
    if(group_exist.rows.length == 0){
        return res.status(404).json({
            msg:"group not found"
        });
    }

    const user_in_group = await pool.query(
        "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL",[group_id, current_user]
    );
    if(user_in_group.rows.length == 0){
        return res.status(403).json({
            msg:"User is not a member of this group"
        });
    }

    const expenses = await pool.query(
        `SELECT e.id, e.description, e.amount, e.paid_by, ud.username as paid_by_username, e.expense_date,
        json_agg(json_build_object('user_id', es.user_id, 'username', u.username, 'share_amount', es.share_amount)) AS shares
        FROM expenses e
        JOIN expense_shares es ON e.id = es.expense_id
        JOIN user_details u ON es.user_id = u.user_id
        JOIN user_details ud ON e.paid_by = ud.user_id
        WHERE e.group_id = $1
        GROUP BY e.id, ud.username, e.expense_date`, [group_id]
    );

    if(expenses.rows.length == 0){
        return res.status(404).json({
            msg:"No expenses found for this group"
        });
    }
    
        return res.status(200).json({
            expenses: expenses.rows
        });
    }catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }

    

}

const balance = async (req,res) => {
    const group_id = req.params.group_id;
    const current_user = req.user.id;
    try{
        const group_exist = await pool.query(
        "SELECT * FROM groups WHERE id=$1",[group_id]
    );
    if(group_exist.rows.length == 0){
        return res.status(404).json({
            msg:"group not found"
        });
    }   
    const user_in_group = await pool.query(
        "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL",[group_id, current_user]
    );
    if(user_in_group.rows.length == 0){
        return res.status(403).json({
            msg:"User is not a member of this group"
        });
    }
    
    const balances = await calculateBalances(group_id);

    return res.status(200).json({
    group_id,
    balances
}); 

}
    catch(err){
        console.error(err);
        return res.status(500).json({
            "msg":"Internal server error"
        });
    }
}

const settlement = async (req,res) => {
    const group_id = req.params.group_id;
    const current_user = req.user.id;

    try{
        const group_exist = await pool.query(
        "SELECT * FROM groups WHERE id=$1",[group_id]
    );
    if(group_exist.rows.length == 0){
        return res.status(404).json({
            msg:"group not found"
        });
    }
    const user_in_group = await pool.query(
        "SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL",[group_id, current_user]
    );  

    if(user_in_group.rows.length == 0){
        return res.status(403).json({
            msg:"User is not a member of this group"
        });
    }

    const balances = await calculateBalances(group_id);

    const creditors = balances
    .filter(member => member.net_balance > 0)
    .map(member => ({ ...member }));

const debtors = balances
    .filter(member => member.net_balance < 0)
    .map(member => ({ ...member }));

    const settlements = [];

    let i = 0;
    let j = 0;

    while(i < creditors.length && j < debtors.length){
        const creditor = creditors[i];
        const debtor = debtors[j];

        const settlementAmount = Math.min(
            creditor.net_balance,
            Math.abs(debtor.net_balance)
        );

        settlements.push({
            from_user_id: debtor.user_id,
            from_username: debtor.username,
            to_user_id: creditor.user_id,
            to_username: creditor.username,
            amount: settlementAmount.toFixed(2)
        });

        creditor.net_balance -= settlementAmount;
        debtor.net_balance += settlementAmount;

        if(Math.abs(creditor.net_balance) < 0.01){
            i++;
        }

        if(Math.abs(debtor.net_balance) < 0.01){
            j++;
        }

    }

    return res.status(200).json({
        group_id,
        total_members: balances.length,
        settlements
    });
    }   catch(err){
        console.error(err);
        return res.status(500).json({   
            "msg":"Internal server error"
        });
    }
}



module.exports = {addExpense,viewExpense, balance, settlement};
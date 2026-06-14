const express = require('express');
const pool = require('./src/db/dbconnection');
const app = express();
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, './.env') });
const { authmiddleware } = require('./src/middleware/authmiddleware');
const { createGroup, getAllGroup, removeGroup } = require('./src/controller/groups');
const { addExpense} = require('./src/controller/expense');

app.use(express.json());

pool.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Database connection error', err.stack));


app.post('/register', require('./src/controller/authcontroller/register').registerUser);
app.post('/login', require('./src/controller/authcontroller/login').Loginuser);
app.get('/profile', authmiddleware, require('./src/controller/authcontroller/profile').getProfile);
app.post('/groups/create', authmiddleware, createGroup);
app.get('/groups/allgroups',authmiddleware, getAllGroup);
app.post('/groups/:group_id/addmember/',authmiddleware,require('./src/controller/groups').addMember);
app.get('/groups/:group_id/getmembers',authmiddleware,require('./src/controller/groups').getGroupMembers);

app.delete('/groups/removemember/:group_id/:user_id',authmiddleware,require('./src/controller/groups').removeMember);

app.post("/expense/add", authmiddleware, addExpense);
app.get("/groups/:group_id/expense",authmiddleware, require('./src/controller/expense').viewExpense);
app.get("/groups/:group_id/balance",authmiddleware, require('./src/controller/expense').balance);

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port ' + (process.env.PORT || 3000));
});
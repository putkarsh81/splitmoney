const express = require('express');
const pool = require('./src/db/dbconnection');
const app = express();
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, './.env') });
const { authmiddleware } = require('./src/middleware/authmiddleware');
const { createGroup, getAllGroup, removeGroup } = require('./src/controller/groups');

app.use(express.json());

pool.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Database connection error', err.stack));


app.post('/register', require('./src/controller/authcontroller/register').registerUser);
app.post('/login', require('./src/controller/authcontroller/login').Loginuser);
app.get('/profile', authmiddleware, require('./src/controller/authcontroller/profile').getProfile);
app.post('/groups/create', authmiddleware, createGroup);
app.get('/groups/allgroups',authmiddleware, getAllGroup);
//app.delete('/groups/remove/:id',authmiddleware,removeGroup);

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port ' + (process.env.PORT || 3000));
});
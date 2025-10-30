// This is the core model for any user, whether an instructor or a student.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema, model } = mongoose;

const userSchema = new Schema(
  
);


const User = model('User', userSchema);
module.exports = User;
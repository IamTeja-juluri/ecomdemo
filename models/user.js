const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const Schema = mongoose.Schema;

const userSchema = Schema({
  username: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  phone:{
    type: Number,
  },
  address: {
    street: { 
      type: String, 
    },
    city: { 
      type: String,  
    },
    state: { 
      type: String,  
    },
    pinCode: { 
      type: String,  
    }
  },
  otpSecret:{
    type: String,
  },
  isAdmin: {
    type: Boolean,
  },
  isSuperAdmin: {
    type: Boolean,
  },
});

// encrypt the password before storing
userSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
};

userSchema.methods.validPassword = function (candidatePassword) {
  if (this.password != null) {
    return bcrypt.compareSync(candidatePassword, this.password);
  } else {
    return false;
  }
};

module.exports = mongoose.model("User", userSchema);

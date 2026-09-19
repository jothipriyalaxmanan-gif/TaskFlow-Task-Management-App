const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { FallbackUser } = require('../services/fileStore');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters']
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password field when converting document to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const MongooseUser = mongoose.model('User', userSchema);

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Unified User Constructor
const UserModel = function (data) {
  if (isMongoConnected()) {
    return new MongooseUser(data);
  }
  return new FallbackUser(data);
};

UserModel.findOne = function (...args) {
  if (isMongoConnected()) {
    return MongooseUser.findOne(...args);
  }
  return FallbackUser.findOne(...args);
};

UserModel.findById = function (...args) {
  if (isMongoConnected()) {
    return MongooseUser.findById(...args);
  }
  return FallbackUser.findById(...args);
};

UserModel.find = function (...args) {
  if (isMongoConnected()) {
    return MongooseUser.find(...args);
  }
  return FallbackUser.find(...args);
};

module.exports = UserModel;

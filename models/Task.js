const mongoose = require('mongoose');
const { FallbackTask } = require('../services/fileStore');

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user']
    },
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    deadline: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be either low, medium, or high'
      },
      default: 'medium'
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed'],
        message: 'Status must be either pending or completed'
      },
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Index user and status for efficient querying
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, deadline: 1 });

const MongooseTask = mongoose.model('Task', taskSchema);

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Unified Task Constructor
const TaskModel = function (data) {
  if (isMongoConnected()) {
    return new MongooseTask(data);
  }
  return new FallbackTask(data);
};

TaskModel.find = function (...args) {
  if (isMongoConnected()) {
    return MongooseTask.find(...args);
  }
  return FallbackTask.find(...args);
};

TaskModel.findOne = function (...args) {
  if (isMongoConnected()) {
    return MongooseTask.findOne(...args);
  }
  return FallbackTask.findOne(...args);
};

TaskModel.findOneAndDelete = function (...args) {
  if (isMongoConnected()) {
    return MongooseTask.findOneAndDelete(...args);
  }
  return FallbackTask.findOneAndDelete(...args);
};

module.exports = TaskModel;

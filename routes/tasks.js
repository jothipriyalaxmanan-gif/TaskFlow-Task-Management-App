const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');

// All task routes require authentication
router.use(authMiddleware);

// @route   GET /api/tasks
// @desc    Get all tasks for logged in user (with filtering, search, sorting)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { status, priority, search, sortBy, order } = req.query;

    // Filter query strictly scoped to authenticated user
    const filter = { user: req.user._id };

    if (status && ['pending', 'completed'].includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    if (priority && ['low', 'medium', 'high'].includes(priority.toLowerCase())) {
      filter.priority = priority.toLowerCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    // Determine sorting
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'deadline') {
      const sortOrder = order === 'desc' ? -1 : 1;
      sortOptions = { deadline: sortOrder, createdAt: -1 };
    } else if (sortBy === 'priority') {
      // Custom priority order or standard sort
      const sortOrder = order === 'asc' ? 1 : -1;
      sortOptions = { priority: sortOrder, createdAt: -1 };
    } else if (sortBy === 'createdAt') {
      const sortOrder = order === 'asc' ? 1 : -1;
      sortOptions = { createdAt: sortOrder };
    }

    const tasks = await Task.find(filter).sort(sortOptions);

    // Compute summary metrics for this user
    const allUserTasks = await Task.find({ user: req.user._id });
    const now = new Date();

    const stats = {
      total: allUserTasks.length,
      completed: allUserTasks.filter((t) => t.status === 'completed').length,
      pending: allUserTasks.filter((t) => t.status === 'pending').length,
      overdue: allUserTasks.filter(
        (t) => t.status === 'pending' && t.deadline && new Date(t.deadline) < now
      ).length
    };

    res.json({
      success: true,
      count: tasks.length,
      stats,
      tasks
    });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks.'
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, description, deadline, priority, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const task = new Task({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || 'medium',
      status: status || 'pending'
    });

    const savedTask = await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully!',
      task: savedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create task.'
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get a single task by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized access.'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get single task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task.'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update an existing task
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { title, description, deadline, priority, status } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized access.'
      });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : null;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;

    const updatedTask = await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully!',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update task.'
    });
  }
});

// @route   PATCH /api/tasks/:id/status
// @desc    Toggle or set task status (pending/completed)
// @access  Private
router.patch('/:id/status', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized access.'
      });
    }

    const { status } = req.body;
    if (status && ['pending', 'completed'].includes(status)) {
      task.status = status;
    } else {
      // Toggle if not explicitly specified
      task.status = task.status === 'completed' ? 'pending' : 'completed';
    }

    const updatedTask = await task.save();

    res.json({
      success: true,
      message: `Task marked as ${updatedTask.status}.`,
      task: updatedTask
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change task status.'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized access.'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully!'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task.'
    });
  }
});

module.exports = router;

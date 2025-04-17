const { UserFeedback } = require('../models');

exports.createFeedback = async (req, res, next) => {
  try {
    const { category, message } = req.body;
    // Ensure the required fields are provided.
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Feedback message must be at least 10 characters long.' });
    }
    
    // Get the authenticated user's ID from the request (assuming middleware sets req.user)
    const userId = req.user.id;
    
    // Create a new feedback entry
    const feedback = await UserFeedback.create({
      userId,
      category: category || 'general',
      message: message.trim()
    });
    
    res.status(201).json({
      message: 'Feedback submitted successfully!',
      feedback
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    next(error);
  }
};

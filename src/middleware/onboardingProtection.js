const { User } = require('../models');

/**
 * Middleware to protect dashboard endpoints by ensuring user has completed onboarding
 * Returns 403 with ONBOARDING_INCOMPLETE error if user is not onboarded
 */
const requireOnboarding = async (req, res, next) => {
  try {
    // Skip onboarding check for admin users
    if (req.user && req.user.isAdmin) {
      return next();
    }

    // Get user ID from request (could be in params or user object)
    const userId = req.params.userId || req.params.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User ID not found in request'
      });
    }

    // Authorization check: User can only access their own data (unless admin)
    if (req.user && req.user.id != userId && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Unauthorized access',
        message: 'Users can only access their own data'
      });
    }

    // Check if user is onboarded
    const user = await User.findByPk(userId, {
      attributes: ['id', 'onboarded', 'onboarding_step', 'onboarded_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user has completed onboarding
    if (!user.onboarded) {
      return res.status(403).json({
        error: 'ONBOARDING_INCOMPLETE',
        message: 'User must complete onboarding to access this feature',
        onboarding_step: user.onboarding_step,
        redirect_to: `/onboarding?step=${user.onboarding_step}`
      });
    }

    // User is onboarded, proceed to next middleware
    next();
  } catch (error) {
    console.error('Error in onboarding protection middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify onboarding status'
    });
  }
};

/**
 * Middleware to protect house-related endpoints by ensuring user has completed onboarding
 * and belongs to the house they're trying to access
 */
const requireOnboardingForHouse = async (req, res, next) => {
  try {
    // Skip onboarding check for admin users
    if (req.user && req.user.isAdmin) {
      return next();
    }

    const { houseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!houseId) {
      return res.status(400).json({
        error: 'House ID required'
      });
    }

    // Check if user is onboarded and belongs to the house
    const user = await User.findByPk(userId, {
      attributes: ['id', 'houseId', 'onboarded', 'onboarding_step', 'onboarded_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user has completed onboarding
    if (!user.onboarded) {
      return res.status(403).json({
        error: 'ONBOARDING_INCOMPLETE',
        message: 'User must complete onboarding to access house features',
        onboarding_step: user.onboarding_step,
        redirect_to: `/onboarding?step=${user.onboarding_step}`
      });
    }

    // Check if user belongs to the house they're trying to access
    if (user.houseId != houseId) {
      return res.status(403).json({
        error: 'Unauthorized access',
        message: 'User does not belong to this house'
      });
    }

    // User is onboarded and belongs to the house, proceed
    next();
  } catch (error) {
    console.error('Error in house onboarding protection middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify house access'
    });
  }
};

module.exports = {
  requireOnboarding,
  requireOnboardingForHouse
}; 
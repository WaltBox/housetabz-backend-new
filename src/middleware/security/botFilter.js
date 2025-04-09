// middleware/security/botFilter.js
const botFilter = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // Common bot user agents
    const botPatterns = [
      'bot', 'crawler', 'spider', 'slurp', 'baiduspider',
      'semrush', 'ahrefs', 'yandex', 'lighthouse', 'googlebot'
    ];
    
    // Check if this is likely a bot
    const isBot = botPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );
    
    // Common non-API paths bots try to access
    const commonBotTargets = [
      '/wp-login.php', '/wp-admin', '/admin', 
      '/.env', '/config', '/.git', '/install.php',
      '/phpinfo.php', '/phpMyAdmin', '/phpmyadmin'
    ];
    
    if (isBot || commonBotTargets.some(path => req.path.includes(path))) {
      // Send a 200 response to bots to prevent them from retrying
      // This will stop them from consuming resources with 4xx errors
      return res.status(200).send('OK');
    }
    
    next();
  };
  
  module.exports = botFilter;
// middleware/security/botFilter.js
const botFilter = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  
  const botPatterns = [
    'bot', 'crawler', 'spider', 'slurp', 'baiduspider',
    'semrush', 'ahrefs', 'yandex', 'lighthouse', 'googlebot'
  ];
  
  const isBot = botPatterns.some(pattern =>
    userAgent.toLowerCase().includes(pattern)
  );
  
  // Updated paths to be more specific
  const commonBotTargets = [
    '/wp-login.php', '/wp-admin', '/admin.php',
    '/.env', '/config', '/.git', '/install.php',
    '/phpinfo.php', '/phpMyAdmin', '/phpmyadmin'
  ];
  
  if (isBot || commonBotTargets.some(path => req.path.includes(path))) {
    return res.status(200).send('OK');
  }
  
  next();
};

module.exports = botFilter; // 👈 Make sure this line exists
'use strict';

module.exports = (req, res) => {
  res.status(200).json({ success: true, message: 'Vercel serverless function working!' });
};

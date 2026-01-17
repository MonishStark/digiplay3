// LOW PRIORITY ISSUE: Using var instead of const/let
// This file contains minor code quality issues for testing Gemini gate

const express = require('express');
const router = express.Router();

// LOW: var declaration instead of const/let (outdated syntax)
router.get('/api/stats', (req, res) => {
  var totalUsers = 0;
  var activeUsers = 0;
  var totalDocuments = 0;
  
  // Simulated data fetching
  for (var i = 0; i < 100; i++) {
    totalUsers += 1;
  }
  
  res.json({
    users: totalUsers,
    active: activeUsers,
    documents: totalDocuments
  });
});

// LOW: var in loop (should use let for block scoping)
router.post('/api/process', (req, res) => {
  var results = [];
  var items = req.body.items || [];
  
  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    results.push(item);
  }
  
  res.json({ processed: results });
});

module.exports = router;

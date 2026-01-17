// CRITICAL SECURITY ISSUE: SQL Injection Vulnerability
// This file contains intentional security flaws for testing Gemini gate

const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// Create database connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER_NAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
});

// CRITICAL: SQL Injection - directly concatenating user input into SQL query
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  
  // VULNERABLE: No input validation or parameterized query
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// CRITICAL: SQL Injection in search functionality
router.post('/search', (req, res) => {
  const searchTerm = req.body.query;
  
  // VULNERABLE: User input directly in SQL query
  const query = `SELECT * FROM documents WHERE title LIKE '%${searchTerm}%'`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// CRITICAL: Authentication bypass vulnerability
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABLE: SQL injection allows authentication bypass
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

module.exports = router;

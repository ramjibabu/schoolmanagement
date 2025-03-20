const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const dotenv=require('dotenv')
const path=require('path')

const app = express();
app.use(bodyParser.json());
dotenv.config({path:path.join(__dirname,'config','config.env')})

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER , // Change to your MySQL username
  password:  process.env.DB_PASSWORD, // Change to your MySQL password
  database:  process.env.DB_NAME, // Ensure database exists
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err);
    return;
  }
  console.log("Connected to database");
});

// Add School API
app.post("/addSchool", (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ message: "All fields are required" });
  }
  
  const sql = "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      console.error("Error inserting data: ", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({ message: "School added successfully", id: result.insertId });
  });
});

// List Schools API (Sorted by proximity)
app.get("/listSchools", (req, res) => {
  const { latitude, longitude } = req.query;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Latitude and longitude are required" });
  }

  const sql = "SELECT * FROM schools";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data: ", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Calculate distance using Haversine formula
    results.forEach((school) => {
      school.distance = getDistanceFromLatLonInKm(latitude, longitude, school.latitude, school.longitude);
    });

    results.sort((a, b) => a.distance - b.distance);
    res.json(results);
  });
});

// Haversine Formula to calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

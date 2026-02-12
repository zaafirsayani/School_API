const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB Atlas connection string (use your actual connection string)
const mongoURI = "mongodb+srv://zaafirsayani:ViscaE!Barca123@school-api.fyl1kzs.mongodb.net/userrecords?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Define a Schema for the user
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  phone: String,
  address: String,
  username: String,
  password: String
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

// Serve the frontend HTML page (index.html)
app.use(express.static('public')); // Assuming your HTML file is in 'public' directory

// API route to get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();  // Fetch users from the database
    res.json(users);  // Send users as JSON
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users');
  }
});

// API route to add a new user
app.post('/add-user', async (req, res) => {
  const { name, age, gender, phone, address, username, password } = req.body;

  const newUser = new User({
    name,
    age,
    gender,
    phone,
    address,
    username,
    password // In production, hash the password
  });

  try {
    await newUser.save();  // Save the user to the database
    res.status(201).send('User added');
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).send('Error saving user');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:5500');
});

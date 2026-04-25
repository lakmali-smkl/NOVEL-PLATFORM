const mongoose = require('mongoose');

// Connection string: librarydb is the database name
const mongoURI = 'mongodb://127.0.0.1:27017/librarydb';

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB: librarydb'))
  .catch((err) => console.error('Connection error:', err));
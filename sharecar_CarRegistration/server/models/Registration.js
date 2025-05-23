const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  name: String,
  carNumber: String,
  rentalStartTime: Date,
  rentalEndTime: Date,
  rentalFee: Number,
  tag: String
});

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration; 
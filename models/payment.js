const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);


const paymentSchema = Schema({
  orderId: {
    type: String,
    required: true,
  },
  receiptId: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);

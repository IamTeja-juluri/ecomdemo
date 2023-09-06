const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const categorySchema = Schema({
  categoryCode: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  imagePath: {
      id: {
        type: String,
        required: true,
      },
      secure_url: {
        type: String,
        required: true,
      }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
  // slug: {
  //   type: String,
  //   unique: true,
  //   slug: "title",
  // },
});

module.exports = mongoose.model("Category", categorySchema);

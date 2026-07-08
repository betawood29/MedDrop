// SearchTerm model — tracks how often each search query is used, powers "popular searches"

const mongoose = require('mongoose');

const searchTermSchema = new mongoose.Schema({
  term: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  lastSearchedAt: {
    type: Date,
    default: Date.now,
  },
});

searchTermSchema.index({ count: -1 });

module.exports = mongoose.model('SearchTerm', searchTermSchema);

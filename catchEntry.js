import mongoose from 'mongoose'

const cacheEntrySchema = new mongoose.Schema({
    index: String,
    activeTab: String,
    layer: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, expires: 604800 } // documents will expire after 7 days
  });

  export default mongoose.model('CacheEntry', cacheEntrySchema);

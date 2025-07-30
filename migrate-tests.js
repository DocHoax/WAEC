const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/waec-cbt', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

const Test = require('./models/test');

async function migrate() {
  try {
    const result = await Test.updateMany(
      { availability: { $exists: true } },
      { $unset: { availability: '' }, $set: { status: 'draft', batches: [] } }
    );
    console.log('Migration completed:', result);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
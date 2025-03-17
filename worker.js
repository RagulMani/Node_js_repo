const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/insurance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = mongoose.model('User', new mongoose.Schema({
    firstName: String,
    dob: String,
    address: String,
    phone: String,
    state: String,
    zipCode: String,
    email: String,
    gender: String,
    userType: String
}));

const results = [];
fs.createReadStream(workerData.filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        try {
            await User.insertMany(results);
            parentPort.postMessage({ success: true, message: 'CSV data uploaded successfully!' });
        } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
        }
    })
    .on('error', (err) => {
        parentPort.postMessage({ success: false, error: err.message });
    });

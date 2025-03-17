const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const { Worker } = require('worker_threads');
const os = require('os');
const cron = require('node-cron');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/insurance', {
    useUnifiedTopology: true
});

const upload = multer({ dest: 'uploads/' });

const Agent = mongoose.model('Agent', new mongoose.Schema({ name: String }));
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
const Account = mongoose.model('Account', new mongoose.Schema({ name: String }));
const LOB = mongoose.model('LOB', new mongoose.Schema({ categoryName: String }));
const Carrier = mongoose.model('Carrier', new mongoose.Schema({ companyName: String }));
const Policy = mongoose.model('Policy', new mongoose.Schema({
    policyNumber: String,
    startDate: String,
    endDate: String,
    categoryId: mongoose.Schema.Types.ObjectId,
    companyId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId
}));

app.post('/upload', upload.single('file'), (req, res) => {
    const worker = new Worker('./worker.js', { workerData: { filePath: req.file.path } });
    worker.on('message', message => res.json(message));
    worker.on('error', error => res.status(500).json({ error: error.message }));
});

app.get('/policy/:username', async (req, res) => {
    const user = await User.findOne({ firstName: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const policies = await Policy.find({ userId: user._id });
    res.json(policies);
});

app.get('/policy/aggregate', async (req, res) => {
    const result = await Policy.aggregate([
        { $group: { _id: '$userId', policies: { $push: '$$ROOT' } } }
    ]);
    res.json(result);
});

setInterval(() => {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    if (cpuUsage > 0.7) {
        console.log('CPU usage high, restarting server...');
        process.exit(1);
    }
}, 10000);

const Message = mongoose.model('Message', new mongoose.Schema({ text: String, time: Date }));
app.post('/schedule-message', async (req, res) => {
    const { message, day, time } = req.body;
    const scheduleTime = new Date(`${day} ${time}`);
    await Message.create({ text: message, time: scheduleTime });
    cron.schedule(`${scheduleTime.getMinutes()} ${scheduleTime.getHours()} * * *`, () => {
        console.log('Scheduled Message:', message);
    });
    res.json({ message: 'Message scheduled' });
});

app.listen(5000, () => console.log('Server running on port 5000'));

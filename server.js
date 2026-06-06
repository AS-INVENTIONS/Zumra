require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();
app.use(cors({
    origin: 'https://as-inventions.github.io'
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas Successfully!'))
    .catch(err => console.error('Database connection error:', err));

// Database Schemas
const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
    details: { type: String, default: "Added by Admin." }
});

const UnitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminKey: { type: String, required: true, default: "123" },
    students: [StudentSchema]
});

const SectorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminKey: { type: String, required: true, default: "sec123" },
    units: [UnitSchema]
});

const DivisionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminKey: { type: String, required: true, default: "27305838" },
    sectors: [SectorSchema]
});

const Division = mongoose.model('Division', DivisionSchema);
const Config = mongoose.model('Config', new mongoose.Schema({ superKey: { type: String, default: "27305838" } }));

async function getSuperKey() {
    let config = await Config.findOne();
    if (!config) {
        config = new Config();
        await config.save();
    }
    return config.superKey;
}

// --- Dynamic APIs ---

// 1. Verify Ultra Admin Key (aman27305838) - Securely compared on Server
app.post('/api/ultra-verify', (req, res) => {
    const { key } = req.body;
    const ultraKey = process.env.ULTRA_KEY || "aman27305838";
    if (key === ultraKey) {
        return res.json({ success: true, message: "Ultra Admin verified successfully!" });
    }
    res.status(401).json({ success: false, message: "Invalid Key!" });
});

// 2. Verify Super Key (27305838)
app.post('/api/super-verify', async (req, res) => {
    const { key } = req.body;
    const superKey = await getSuperKey();
    if (key === superKey) return res.json({ success: true });
    res.status(401).json({ success: false });
});

// 3. Divisions Management
app.get('/api/divisions', async (req, res) => {
    res.json(await Division.find({}, '_id name adminKey'));
});

app.post('/api/divisions', async (req, res) => {
    const newDiv = new Division({ name: req.body.name, sectors: [] });
    await newDiv.save();
    res.status(201).json(newDiv);
});

app.delete('/api/divisions/:id', async (req, res) => {
    await Division.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.put('/api/divisions/:id/password', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.adminKey = req.body.newPassword;
    await div.save();
    res.json({ success: true });
});

app.post('/api/divisions/:id/verify', async (req, res) => {
    const div = await Division.findById(req.params.id);
    if (div && div.adminKey === req.body.key) return res.json({ success: true, division: div });
    res.status(401).json({ success: false });
});

// 4. Sectors Management
app.get('/api/divisions/:id/sectors', async (req, res) => {
    const div = await Division.findById(req.params.id);
    res.json(div ? div.sectors : []);
});

app.post('/api/divisions/:id/sectors', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.push({ name: req.body.name, adminKey: req.body.adminKey });
    await div.save();
    res.status(201).json(div.sectors);
});

app.delete('/api/divisions/:id/sectors/:sectorId', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.pull({ _id: req.params.sectorId });
    await div.save();
    res.json({ success: true });
});

app.put('/api/divisions/:id/sectors/:sectorId/password', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.id(req.params.sectorId).adminKey = req.body.newPassword;
    await div.save();
    res.json({ success: true });
});

app.post('/api/divisions/:id/sectors/:sectorId/verify', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const sec = div.sectors.id(req.params.sectorId);
    if (sec && sec.adminKey === req.body.key) return res.json({ success: true, sector: sec });
    res.status(401).json({ success: false });
});

// 5. Units Management
app.get('/api/divisions/:id/sectors/:sectorId/units', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const sec = div.sectors.id(req.params.sectorId);
    res.json(sec ? sec.units : []);
});

app.post('/api/divisions/:id/sectors/:sectorId/units', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.id(req.params.sectorId).units.push({ name: req.body.name, adminKey: req.body.adminKey });
    await div.save();
    res.status(201).json(div.sectors.id(req.params.sectorId).units);
});

app.delete('/api/divisions/:id/sectors/:sectorId/units/:unitId', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.id(req.params.sectorId).units.pull({ _id: req.params.unitId });
    await div.save();
    res.json({ success: true });
});

app.put('/api/divisions/:id/sectors/:sectorId/units/:unitId/password', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.id(req.params.sectorId).units.id(req.params.unitId).adminKey = req.body.newPassword;
    await div.save();
    res.json({ success: true });
});

app.post('/api/divisions/:id/sectors/:sectorId/units/:unitId/verify', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const unit = div.sectors.id(req.params.sectorId).units.id(req.params.unitId);
    if (unit && unit.adminKey === req.body.key) return res.json({ success: true, unit });
    res.status(401).json({ success: false });
});

// 6. Students & Attendance Management
app.get('/api/divisions/:id/sectors/:sectorId/units/:unitId/students', async (req, res) => {
    const div = await Division.findById(req.params.id);
    res.json(div.sectors.id(req.params.sectorId).units.id(req.params.unitId).students);
});

app.post('/api/divisions/:id/sectors/:sectorId/units/:unitId/students', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const unit = div.sectors.id(req.params.sectorId).units.id(req.params.unitId);
    unit.students.push({ name: req.body.name, details: req.body.details });
    await div.save();
    res.status(201).json(unit.students);
});

app.put('/api/divisions/:id/sectors/:sectorId/units/:unitId/students/:studentId', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const student = div.sectors.id(req.params.sectorId).units.id(req.params.unitId).students.id(req.params.studentId);
    student.name = req.body.name || student.name;
    student.details = req.body.details || student.details;
    await div.save();
    res.json(div.sectors.id(req.params.sectorId).units.id(req.params.unitId).students);
});

app.delete('/api/divisions/:id/sectors/:sectorId/units/:unitId/students/:studentId', async (req, res) => {
    const div = await Division.findById(req.params.id);
    div.sectors.id(req.params.sectorId).units.id(req.params.unitId).students.pull({ _id: req.params.studentId });
    await div.save();
    res.json(div.sectors.id(req.params.sectorId).units.id(req.params.unitId).students);
});

app.post('/api/divisions/:id/sectors/:sectorId/units/:unitId/attendance', async (req, res) => {
    const div = await Division.findById(req.params.id);
    const unit = div.sectors.id(req.params.sectorId).units.id(req.params.unitId);
    req.body.studentIds.forEach(sid => {
        const student = unit.students.id(sid);
        if (student) student.score += 1;
    });
    await div.save();
    res.json(unit.students);
});

// --- SECURE TOP PERFORMER CALCULATION ON BACKEND ---

app.get('/api/top-performer', async (req, res) => {
    try {
        const divisions = await Division.find({});
        let bestStudent = null;
        let bestPath = "";

        divisions.forEach(div => {
            div.sectors.forEach(sec => {
                sec.units.forEach(unit => {
                    unit.students.forEach(student => {
                        if (!bestStudent || student.score > bestStudent.score) {
                            bestStudent = student;
                            bestPath = `${div.name} ➔ ${sec.name} ➔ ${unit.name}`;
                        }
                    });
                });
            });
        });

        if (bestStudent && bestStudent.score > 0) {
            res.json({ name: bestStudent.name, score: bestStudent.score, path: bestPath });
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/divisions/:id/top-performer', async (req, res) => {
    try {
        const div = await Division.findById(req.params.id);
        if (!div) return res.status(404).json({ error: "Division not found" });

        let bestStudent = null;
        let bestPath = "";

        div.sectors.forEach(sec => {
            sec.units.forEach(unit => {
                unit.students.forEach(student => {
                    if (!bestStudent || student.score > bestStudent.score) {
                        bestStudent = student;
                        bestPath = `${sec.name} ➔ ${unit.name}`;
                    }
                });
            });
        });

        if (bestStudent && bestStudent.score > 0) {
            res.json({ name: bestStudent.name, score: bestStudent.score, path: bestPath });
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/divisions/:id/sectors/:sectorId/top-performer', async (req, res) => {
    try {
        const div = await Division.findById(req.params.id);
        if (!div) return res.status(404).json({ error: "Division not found" });

        const sec = div.sectors.id(req.params.sectorId);
        if (!sec) return res.status(404).json({ error: "Sector not found" });

        let bestStudent = null;
        let bestPath = "";

        sec.units.forEach(unit => {
            unit.students.forEach(student => {
                if (!bestStudent || student.score > bestStudent.score) {
                    bestStudent = student;
                    bestPath = `${unit.name}`;
                }
            });
        });

        if (bestStudent && bestStudent.score > 0) {
            res.json({ name: bestStudent.name, score: bestStudent.score, path: bestPath });
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Ultra Dashboard
app.get('/api/ultra/all-data', async (req, res) => {
    res.json({ superKey: await getSuperKey(), divisions: await Division.find({}) });
});

app.put('/api/ultra/update-passwords', async (req, res) => {
    if (req.body.superKey) {
        let config = await Config.findOne();
        if (!config) config = new Config();
        config.superKey = req.body.superKey;
        await config.save();
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

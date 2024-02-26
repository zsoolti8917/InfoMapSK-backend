import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import morgan from 'morgan';

const app = express();
const port = 5500;

// Middleware
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parsing JSON bodies
app.use(cors()); // Enabling CORS

// Fetch dimension details
app.get('/dimension-details', async (req, res) => {
    const { datasetCode, dimensionName } = req.query;
    if (!datasetCode || !dimensionName) {
        return res.status(400).send('Both datasetCode and dimensionName are required');
    }

    const url = `https://data.statistics.sk/api/v2/dimension/${datasetCode}/${dimensionName}?lang=en`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(`Error fetching dimension details: ${error}`);
        res.status(500).send(`Error fetching dimension details: ${error}`);
    }
});

// Process data with Python script
app.post('/process-data', (req, res) => {
    const { apiUrl } = req.body;
    if (!apiUrl) {
        return res.status(400).send('API URL is required');
    }

    const pythonProcess = spawn('python', ['data_clean.py', apiUrl]);

    let pythonData = "";
    pythonProcess.stdout.on('data', (data) => {
        pythonData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}`);
            return res.status(500).send(`Failed to process data with Python script. Exit code: ${code}`);
        }
        try {
            const output = JSON.parse(pythonData);
            res.json(output);
        } catch (e) {
            console.error(`Error parsing Python script output: ${e.message}`);
            res.status(500).send(`Error parsing Python script output: ${e.message}`);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
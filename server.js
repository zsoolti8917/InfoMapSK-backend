import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import morgan from 'morgan';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config()

const app = express();
const port = 5500;

// Middleware
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parsing JSON bodies
app.use(cors()); // Enabling CORS


const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS
    },
  });
  app.post('/send-email', (req, res) => {
    const { name, email, nazovFirmy, titul, message } = req.body;
  
    // Setup email data
    const mailOptions = {
      from: "web.support@infomap.sk", // Sender address
      to: "podpora@infomap.sk", // Replace with your email address
      subject: `New message from ${name}`, // Subject line
      text: `
        Name: ${name}
        Email: ${email}
        Company Name: ${nazovFirmy || 'Not Provided'}
        Title: ${titul || 'Not Provided'}
        Message: ${message}
      `, // Plain text body
    };
  
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).send('Error sending email.');
      }
      console.log('Email sent:', info.response);
      res.status(200).send('Email sent successfully.');
    });
  });

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
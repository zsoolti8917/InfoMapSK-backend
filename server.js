import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import morgan from 'morgan';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fs from 'fs';
dotenv.config()
import { promises as fs1 } from 'fs';
import {Schema} from 'mongoose'
import mongoose from 'mongoose'
const app = express();
const port = 5500;
import datasetCitiesConfig from './datasetsCitiesConfig.json' assert { type: "json" };
import datasetDistrictsConfig from './datasetsDistrictsConfig.json' assert { type: "json" };
import datasetRegionsConfig from './datasetsRegionsConfig.json' assert { type: "json" };
import datasetSlovakiaConfig from './datasetsSlovakiaConfig.json' assert { type: "json" };
// Middleware
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parsing JSON bodies
app.use(cors()); // Enabling CORS

mongoose.connect('mongodb://localhost:27017/InfoMapSK', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('Connection error', err));

  const jsonStatSchema = new Schema({
    nutsCode: String, // To store the NUTS code associated with the dataset
    label: String, // The label of the dataset for easy identification
    update: Date, // The last update date of the dataset
    data: Schema.Types.Mixed, // The actual JSON-stat data
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  });
  const JsonStat = mongoose.model('JsonStat', jsonStatSchema);

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
/*app.get('/dimension-details', async (req, res) => {
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
});*/

// Process data with Python script
/*app.post('/process-data', (req, res) => {
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
*/
app.get('/get-slovakia-geojson', (req, res) => {
    fs.readFile(path.join(__dirname, './geojson/slovakia_corrected.geojson'), 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error reading Slovakia GeoJSON file');
      }
      res.json(JSON.parse(data));
    });
  });

  app.get('/get-regions-geojson', (req, res) => {
    fs.readFile(path.join(__dirname, './geojson/corrected_regions.geojson'), 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error reading tegions GeoJSON file');
      }
      res.json(JSON.parse(data));
    });
  });

  app.get('/get-districts-geojson', (req, res) => {
    fs.readFile(path.join(__dirname, './geojson/updated_districts.geojson'), 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error reading districts GeoJSON file');
      }
      res.json(JSON.parse(data));
    });
  });

  app.get('/get-cities-geojson', (req, res) => {
    fs.readFile(path.join(__dirname, './geojson/updated_corrected_cities.geojson'), 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error reading Cities GeoJSON file');
      }
      res.json(JSON.parse(data));
    });
  });

// Define the mapping of index to NUTS codes

app.get('/api/slovakia/:index/:activeTab', async (req, res) => {
  const { activeTab, index } = req.params;
  const nutsCode = 'SK0'; // The NUTS code for Slovakia


  // Check if the activeTab exists in datasetRegionsConfig
  if (!datasetRegionsConfig[activeTab]) {
    return res.status(404).send('Category not found');
  }

  // Fetch all datasets for the activeTab category
  const datasets = datasetRegionsConfig[activeTab];
  try {
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: "SK0" }));
    }));

    // Send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
    return res.status(500).send('Error fetching data');
  }
});

app.get('/api/regions/:index/:activeTab', async (req, res) => {
  const { index, activeTab } = req.params;

  let simplifiedMapping;
  try {
    const mappingData = await fs1.readFile('./mapping-json/regions_mapping.json', { encoding: 'utf-8' });
    simplifiedMapping = JSON.parse(mappingData);
  } catch (error) {
    console.error('Error reading mapping file:', error);
    return res.status(500).send('Internal server error');
  }

  const nutsCode = simplifiedMapping[index];
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  // Check if the activeTab exists in datasetRegionsConfig
  if (!datasetRegionsConfig[activeTab]) {
    return res.status(404).send('Category not found');
  }

  // Fetch all datasets for the activeTab category
  const datasets = datasetRegionsConfig[activeTab];
  try {
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode }));
    }));

    // Send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
    return res.status(500).send('Error fetching data');
  }
});

app.get('/api/districts/:index/:activeTab', async (req, res) => {
  const { index, activeTab } = req.params;

  let simplifiedMapping;
  try {
    const mappingData = await fs1.readFile('./mapping-json/districts_mapping.json', { encoding: 'utf-8' });
    simplifiedMapping = JSON.parse(mappingData);
  } catch (error) {
    console.error('Error reading mapping file:', error);
    return res.status(500).send('Internal server error');
  }

  const nutsCode = simplifiedMapping[index];
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  // Check if the activeTab exists in datasetDistrictsConfig
  if (!datasetDistrictsConfig[activeTab]) {
    return res.status(404).send('Category not found');
  }

  // Fetch all datasets for the activeTab category
  const datasets = datasetDistrictsConfig[activeTab];
  try {
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode }));
    }));

    // Send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
    return res.status(500).send('Error fetching data');
  }
});



app.get('/api/cities/:index/:activeTab', async (req, res) => {
  const { index, activeTab } = req.params;

  let simplifiedMapping;
  try {
    const mappingData = await fs1.readFile('./mapping-json/cities_mapping.json', { encoding: 'utf-8' });
    simplifiedMapping = JSON.parse(mappingData);
  } catch (error) {
    console.error('Error reading mapping file:', error);
    return res.status(500).send('Internal server error');
  }

  const nutsCode = simplifiedMapping[index];
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  // Check if the activeTab exists in datasetCitiesConfig
  if (!datasetCitiesConfig[activeTab]) {
    return res.status(404).send('Category not found');
  }

  // Fetch all datasets for the activeTab category
  const datasets = datasetCitiesConfig[activeTab];
  try {
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode }));
    }));

    // Send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
    return res.status(500).send('Error fetching data');
  }
});





// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
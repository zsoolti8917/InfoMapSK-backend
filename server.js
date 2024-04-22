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
const app = express();
const port = process.env.port || 3000;
import datasetCitiesConfig from './datasetsCitiesConfig.json' assert { type: "json" };
import datasetDistrictsConfig from './datasetsDistrictsConfig.json' assert { type: "json" };
import datasetRegionsConfig from './datasetsRegionsConfig.json' assert { type: "json" };
import datasetSlovakiaConfig from './datasetsSlovakiaConfig.json' assert { type: "json" };
// Middleware
import mongoose from 'mongoose';

import CacheEntry from './catchEntry.js';

app.use(morgan('dev')); // Logging
app.use(express.json()); // Parsing JSON bodies
app.use(cors()); // Enabling CORS

const mongoURI = process.env.mongoURI; // Replace with your actual connection URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error(err));

  mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to db');
  });
  
  mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose connection is disconnected.');
  });

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
  if (!datasetSlovakiaConfig[activeTab]) {
    return res.status(404).send('Category not found');
  }

  // Fetch all datasets for the activeTab category
  const datasets = datasetSlovakiaConfig[activeTab];
  try {
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: "SK0" , title: dataset.title}));
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
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode, title: dataset.title }));
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
  const layer = 'districts';
  // First, try to serve the data from cache
  try {
    const cachedData = await CacheEntry.findOne({ index, activeTab, layer });
    if (cachedData) {
      console.log('Serving data from cache for:', index, activeTab);
      return res.json(cachedData.data);
    }
  } catch (cacheError) {
    console.error('Cache retrieval error:', cacheError);
    // You might want to continue despite cache errors, or handle them differently
  }

  // Proceed if no cache hit
  try {
    const mappingData = await fs1.readFile('./mapping-json/districts_mapping.json', { encoding: 'utf-8' });
    const simplifiedMapping = JSON.parse(mappingData);

    const nutsCode = simplifiedMapping[index];
    if (!nutsCode) {
      return res.status(400).send('Invalid index provided');
    }

    if (!datasetDistrictsConfig[activeTab]) {
      return res.status(404).send('Category not found');
    }

    const datasets = datasetDistrictsConfig[activeTab];
    const responses = await Promise.all(datasets.map(dataset => {
      const url = dataset.url.replace('${nutsCode}', nutsCode);
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode, title: dataset.title }));
    }));

    // Cache the newly fetched data
    const newCacheData = new CacheEntry({
      index,
      activeTab,
      layer,
      data: responses
    });
    await newCacheData.save();

    // Then send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal server error');
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
      return axios.get(url).then(response => ({ id: dataset.id, data: response.data, nutsCode: nutsCode , title: dataset.title}));
    }));

    // Send the fetched data back to the frontend
    res.json(responses);
  } catch (error) {
    console.error('Error fetching data from external API:', error);
    return res.status(500).send('Error fetching data');
  }
});


async function loadData(fileName) {
  try {
      const filePath = path.join(__dirname, 'geojson', fileName);
      const data = await fs1.readFile(filePath, 'utf8');
      return JSON.parse(data);
  } catch (error) {
      console.error(`Error loading data from ${fileName}:`, error);
      throw error; // Ensuring error is propagated for handling in the calling function
  }
}

async function aggregateData() {
  try {
      const [citiesData, districtsData, regionsData] = await Promise.all([
          loadData('updated_corrected_cities.geojson'),
          loadData('updated_districts.geojson'),
          loadData('corrected_regions.geojson'),
      ]);
      const cities = citiesData.features; // Replace 'features' with the actual property name if different
      const districts = districtsData.features; // Replace 'features' with the actual property name if different
      const regions = regionsData.features; 
      // Transform and aggregate data
      const transformedData = [
        ...cities.filter(city => city.properties.IDN5).map(city => ({
              name: city.properties.name,
              type: 'city',
              IDN: city.properties.IDN5,
              SKtype: 'Osada'
          })),
          ...districts.filter(district => district.properties.IDN4).map(district => ({
              name: district.properties.NM3,
              type: 'district', // Manually setting the type
              IDN: district.properties.IDN4,
              SKtype: 'Okres'
          })),
          ...regions.filter(region => region.properties.IDN4).map(region => ({
              name: region.properties.NM4,
              type: 'region', // Manually setting the type
              IDN: region.properties.IDN4,
              SKtype: 'Kraj'
          })),
      ];

      return transformedData;
  } catch (error) {
      console.error("Error aggregating data:", error);
      throw error; // Rethrowing error for handling in the endpoint
  }
}

app.get('/list/places', async (req, res) => {
  try {
      const aggregatedData = await aggregateData();
      res.json(aggregatedData);
  } catch (error) {
      res.status(500).send("An error occurred while aggregating place data.");
  }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
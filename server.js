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
const indexToNuts13 = {
  "0": "SK0",
  "1": "SK01",
  "2": "SK010",
  "3": "SK02",
  "4": "SK021",
  "5": "SK022",
  "6": "SK023",
  "7": "SK03",
  "8": "SK031",
  "9": "SK032",
  "10": "SK04",
  "11": "SK041",
  "12": "SK042"
};

app.get('/api/regions/:index', async (req, res) => {
  const { index } = req.params; // This 'index' is now the provided index for NUTS code

  // Use the index to get the corresponding NUTS code
  const nutsCode = indexToNuts13[index];
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  try {
    const collectionResponse = await axios.get('https://data.statistics.sk/api/v2/collection?lang=en');
    const datasets = collectionResponse.data.link.item;

    const filteredDatasets = datasets.filter(dataset => dataset.dimension.hasOwnProperty('nuts13'));

    const transformedUrls = filteredDatasets.map(dataset => {
      const urlParts = dataset.href.split('/');
      const nutsIndex = urlParts.indexOf('nuts13');

      // Replace 'nuts15' with the actual nutsCode
      if (nutsIndex > -1) {
        urlParts[nutsIndex] = nutsCode; 
        // Set all subsequent parts to 'all', including the last dimension
        for (let i = nutsIndex + 1; i < urlParts.length; i++) {
          if(urlParts[i].includes('?')){ // Check if the part includes query parameters
            let queryParamsIndex = urlParts[i].indexOf('?');
            urlParts[i] = 'all' + urlParts[i].slice(queryParamsIndex); // Preserve query parameters
          }else{
            urlParts[i] = 'all';
          }
        }
      }
      
      const newUrl = urlParts.join('/');

      return newUrl;
    });

    // Return the transformed URLs
    res.json({ urls: transformedUrls });
  } catch (error) {
    console.error('Error processing datasets:', error);
    res.status(500).send('Internal server error');
  }
});

const indexToNuts14Code = {
  "0": "SK_CAP",
  "1": "SK0",
  "2": "SK01",
  "3": "SK010",
  "4": "SK0101",
  "5": "SK0102",
  "6": "SK0103",
  "7": "SK0104",
  "8": "SK0105",
  "9": "SK0106",
  "10": "SK0107",
  "11": "SK0108",
  "12": "SK02",
  "13": "SK021",
  "14": "SK0211",
  "15": "SK0212",
  "16": "SK0213",
  "17": "SK0214",
  "18": "SK0215",
  "19": "SK0216",
  "20": "SK0217",
  "21": "SK022",
  "22": "SK0221",
  "23": "SK0222",
  "24": "SK0223",
  "25": "SK0224",
  "26": "SK0225",
  "27": "SK0226",
  "28": "SK0227",
  "29": "SK0228",
  "30": "SK0229",
  "31": "SK023",
  "32": "SK0231",
  "33": "SK0232",
  "34": "SK0233",
  "35": "SK0234",
  "36": "SK0235",
  "37": "SK0236",
  "38": "SK0237",
  "39": "SK03",
  "40": "SK031",
  "41": "SK0311",
  "42": "SK0312",
  "43": "SK0313",
  "44": "SK0314",
  "45": "SK0315",
  "46": "SK0316",
  "47": "SK0317",
  "48": "SK0318",
  "49": "SK0319",
  "50": "SK031A",
  "51": "SK031B",
  "52": "SK032",
  "53": "SK0321",
  "54": "SK0322",
  "55": "SK0323",
  "56": "SK0324",
  "57": "SK0325",
  "58": "SK0326",
  "59": "SK0327",
  "60": "SK0328",
  "61": "SK0329",
  "62": "SK032A",
  "63": "SK032B",
  "64": "SK032C",
  "65": "SK032D",
  "66": "SK04",
  "67": "SK041",
  "68": "SK0411",
  "69": "SK0412",
  "70": "SK0413",
  "71": "SK0414",
  "72": "SK0415",
  "73": "SK0416",
  "74": "SK0417",
  "75": "SK0418",
  "76": "SK0419",
  "77": "SK041A",
  "78": "SK041B",
  "79": "SK041C",
  "80": "SK041D",
  "81": "SK042",
  "82": "SK0421",
  "83": "SK0422",
  "84": "SK0422_0425",
  "85": "SK0423",
  "86": "SK0424",
  "87": "SK0425",
  "88": "SK0426",
  "89": "SK0427",
  "90": "SK0428",
  "91": "SK0429",
  "92": "SK042A",
  "93": "SK042B"
};

app.get('/api/districts/:index', async (req, res) => {
  const { index } = req.params;
  
  const nutsCode = indexToNuts14Code[index];
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  try {
    const collectionResponse = await axios.get('https://data.statistics.sk/api/v2/collection?lang=en');
    const datasets = collectionResponse.data.link.item;

    const filteredDatasets = datasets.filter(dataset => dataset.dimension.hasOwnProperty('nuts14'));

    const transformedUrls = filteredDatasets.map(dataset => {
      const urlParts = dataset.href.split('/');
      const nutsIndex = urlParts.indexOf('nuts14');

      // Replace 'nuts15' with the actual nutsCode
      if (nutsIndex > -1) {
        urlParts[nutsIndex] = nutsCode; 
        // Set all subsequent parts to 'all', including the last dimension
        for (let i = nutsIndex + 1; i < urlParts.length; i++) {
          if(urlParts[i].includes('?')){ // Check if the part includes query parameters
            let queryParamsIndex = urlParts[i].indexOf('?');
            urlParts[i] = 'all' + urlParts[i].slice(queryParamsIndex); // Preserve query parameters
          }else{
            urlParts[i] = 'all';
          }
        }
      }
      
      const newUrl = urlParts.join('/');

      return newUrl;
    });

    res.json({ urls: transformedUrls });
  } catch (error) {
    console.error('Error fetching or transforming datasets:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/cities/:index', async (req, res) => {
  const { index } = req.params;

  let simplifiedMapping;
  try {
    const mappingData = await fs1.readFile('./mapping-json/inverted_mapping.json', { encoding: 'utf-8' });
    simplifiedMapping = JSON.parse(mappingData);
  } catch (error) {
    console.error('Error reading mapping file:', error);
    return res.status(500).send('Internal server error');
  }

  const nutsCode = simplifiedMapping[index];
  console.log('nutsCode:', nutsCode)
  if (!nutsCode) {
    return res.status(400).send('Invalid index provided');
  }

  try {
    const collectionResponse = await axios.get('https://data.statistics.sk/api/v2/collection?lang=en');
    const datasets = collectionResponse.data.link.item;

    const filteredDatasets = datasets.filter(dataset => dataset.dimension.hasOwnProperty('nuts15'));

    const transformedUrls = filteredDatasets.map(dataset => {
      const urlParts = dataset.href.split('/');
      const nutsIndex = urlParts.indexOf('nuts15');

      // Replace 'nuts15' with the actual nutsCode
      if (nutsIndex > -1) {
        urlParts[nutsIndex] = nutsCode; 
        // Set all subsequent parts to 'all', including the last dimension
        for (let i = nutsIndex + 1; i < urlParts.length; i++) {
          if(urlParts[i].includes('?')){ // Check if the part includes query parameters
            let queryParamsIndex = urlParts[i].indexOf('?');
            urlParts[i] = 'all' + urlParts[i].slice(queryParamsIndex); // Preserve query parameters
          }else{
            urlParts[i] = 'all';
          }
        }
      }
      
      const newUrl = urlParts.join('/');

      return newUrl;
    });

    res.json({ urls: transformedUrls });
  } catch (error) {
    console.error('Error processing datasets:', error);
    res.status(500).send('Internal server error');
  }
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
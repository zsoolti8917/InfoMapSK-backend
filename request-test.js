import axios from 'axios';
import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import moment from 'moment';
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
    },
    uniqueIdentifier: { type: String, unique: true, required: true }
  });
  const JsonStat = mongoose.model('JsonStat', jsonStatSchema);

  async function fetchDatasets() {
    try {
        const response = await axios.get('https://data.statistics.sk/api/v2/collection?lang=en');
        return response.data.link.item;
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
}

function filterDatasets(datasets, nutsType) {
    return datasets.filter(dataset => dataset.dimension && dataset.dimension.hasOwnProperty(nutsType));
}

// Step 3: Fetch available years for a dataset
async function fetchAvailableYears(dataset) {
    try {
      // Dynamically find the year dimension by its key ending with "_rok"
      const yearDimensionKey = Object.keys(dataset.dimension).find(key => key.endsWith('_rok'));
      if (!yearDimensionKey) {
        throw new Error('Year dimension not found');
      }
      const yearDimensionHref = dataset.dimension[yearDimensionKey].href;
      const response = await axios.get(yearDimensionHref);
      return Object.keys(response.data.category.index);
    } catch (error) {
      console.error(`Error fetching available years: ${error}`);
      throw error; // Ensure to rethrow the error to be handled upstream
    }
  }

function transformUrl(baseHref, nutsCode, nutsType, year) {
    let urlParts = baseHref.split('/');
    const nutsIndex = urlParts.findIndex(part => part.includes(nutsType));

    if (nutsIndex !== -1 && urlParts[nutsIndex + 1]) {
        urlParts[nutsIndex + 1] = nutsCode; // Set the NUTS code
        // Assuming 'year' should replace a specific part after the NUTS code
        urlParts[nutsIndex + 2] = year; // Set the year

        // Set all dimensions after year to 'all', assuming the structure is consistent
        for (let i = nutsIndex + 3; i < urlParts.length; i++) {
            if(urlParts[i].includes('?')) {
                let queryParamsIndex = urlParts[i].indexOf('?');
                urlParts[i] = 'all' + urlParts[i].slice(queryParamsIndex);
            } else {
                urlParts[i] = 'all';
            }
        }
    }
    console.log(urlParts.join('/'));
    return urlParts.join('/');
}

async function fetchDataForYear(url) {
  const response = await axios.get(url);
  return response.data;
}

async function saveToMongoDB(nutsCode, data, label, updateDateString) {
    // Parse the update date string to a Date object using moment.js for better reliability
    const updateDate = moment(updateDateString, 'YYYY-MM-DD').toDate();
  
    // Check if the date is valid
    if (!updateDate || isNaN(updateDate.getTime())) {
      console.error('Invalid date provided:', updateDateString);
      throw new Error('Invalid date provided');
    }
  
    nutsCode = String(nutsCode); // Ensure nutsCode is a string to match schema expectations
    const uniqueIdentifier = `${nutsCode}_${label.replace(/\s+/g, '_')}`;

    try {
      await JsonStat.findOneAndUpdate(
        { uniqueIdentifier: uniqueIdentifier }, // Use the composite key for uniqueness
        {
          $set: {
            nutsCode: nutsCode,
            data: data,
            label: label,
            update: updateDate,
            lastUpdated: Date.now(),
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
      throw error;
    }
  }
  async function processDatasets(nutsCode, nutsType) {
    const datasets = await fetchDatasets();
    const filteredDatasets = filterDatasets(datasets, nutsType);

    for (const dataset of filteredDatasets) {
        const years = await fetchAvailableYears(dataset);
        let aggregatedData = {}; // Object to hold data aggregated across years
        const label = dataset.label;
        const updateDateString = dataset.update;

        for (const year of years) {
            const url = transformUrl(dataset.href, nutsCode, nutsType, year);
            const yearData = await fetchDataForYear(url); // Fetch data for each year
            aggregatedData[year] = yearData; // Aggregate data by year
        }

        // Now, save the aggregated data for this dataset
        await saveToMongoDB(nutsCode, aggregatedData, label, updateDateString);
    }
}

// Example usage:
const nutsCode = 'SK0106504947'; // Example NUTS code
const nutsType = 'nuts15'; // Adjust based on your needs
processDatasets(nutsCode, nutsType).then(() => console.log('Data processing complete.')).catch(console.error);

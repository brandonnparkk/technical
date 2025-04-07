require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const upload = multer({ dest: 'uploads/' });
// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

app.use(express.json());

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Routes
app.post('/api/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // File type validation
    if (!req.file.mimetype.includes('csv') && !req.file.originalname.endsWith('.csv')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid file type',
        details: 'Only CSV files are allowed'
      });
    }

    const results = [];
    let hasParsingErrors = false;
    const parsingErrors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (err) => {
        hasParsingErrors = true;
        parsingErrors.push(`CSV parsing error: ${err.message}`);
      })
      .on('end', async () => {
        fs.unlinkSync(req.file.path);

        if (hasParsingErrors) {
          return res.status(400).json({
            error: 'CSV parsing failed',
            details: parsingErrors
          });
        }

        if (results.length === 0) {
          return res.status(400).json({ error: 'Empty CSV' });
        }

        // Normalize and prepare records
        const normalizedRecords = results.map(row => {
          const normalizedAddress = (row.PROPERTYADDRESS || '').toString().trim().toLowerCase();
          return {
            normalizedAddress,
            propertyData: {
              property_address: row.PROPERTYADDRESS,
              city: row.CITY,
              state: row.STATE,
              zip: row.ZIP,
              county: row.COUNTY,
              latitude: parseFloat(row.LATITUDE) || null,
              longitude: parseFloat(row.LONGITUDE) || null,
              year_built: parseInt(row.YEARBUILT) || null,
              updated_at: new Date(),
              occupancy_rate: row.OCCUPANCYRATE ? parseFloat(row.OCCUPANCYRATE) : null,
              parking_spaces: row.PARKINGSPACES ? parseInt(row.PARKINGSPACES) : null,
              has_ev_charging: row.HASEVCHARGING ? 
                String(row.HASEVCHARGING).toLowerCase() === 'true' : null,
              redevelopment_opportunities: row.REDEVELOPMENTOPPORTUNITIES || null
            }
          };
        });

        // Get unique addresses in batches
        const BATCH_SIZE = 100;
        let existingProperties = [];
        const uniqueAddresses = [...new Set(normalizedRecords.map(r => r.normalizedAddress))];

        for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
          const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);
          const { data: batchData, error } = await supabase
            .from('properties')
            .select('id, property_address')
            .in('property_address', batch);

          if (error) throw error;
          if (batchData) existingProperties = [...existingProperties, ...batchData];
        }

        // Create address to ID map
        const addressIdMap = new Map();
        existingProperties.forEach(prop => {
          const normalized = (prop.property_address || '').toString().trim().toLowerCase();
          addressIdMap.set(normalized, prop.id);
        });

        // Prepare records for upsert
        const recordsToUpsert = normalizedRecords.map(record => {
          const existingId = addressIdMap.get(record.normalizedAddress);
          return existingId 
            ? { ...record.propertyData, id: existingId }
            : record.propertyData;
        });

        // Process in batches
        const BATCH_UPSERT_SIZE = 50;
        let updatedCount = 0;
        let insertedCount = 0;
        const errors = [];

        for (let i = 0; i < recordsToUpsert.length; i += BATCH_UPSERT_SIZE) {
          const batch = recordsToUpsert.slice(i, i + BATCH_UPSERT_SIZE);
          const { data, error } = await supabase
            .from('properties')
            .upsert(batch, { onConflict: 'property_address' });

          if (error) {
            errors.push(error.message);
          } else if (data) {
            updatedCount += batch.filter(r => r.id).length;
            insertedCount += batch.filter(r => !r.id).length;
          }
        }

        if (errors.length > 0) {
          return res.status(500).json({
            error: 'Partial database operation failure',
            details: errors,
            stats: {
              successfulUpdates: updatedCount,
              successfulInserts: insertedCount,
              failedBatches: errors.length
            }
          });
        }

        res.json({
          message: 'CSV processed successfully',
          stats: {
            totalProcessed: results.length,
            updated: updatedCount,
            inserted: insertedCount
          }
        });
      });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: err.message
    });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/api/census/geocode', async (req, res) => {
  try {
    const { street, city, state } = req.query;
    
    if (!street || !city || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.get(
      'https://geocoding.geo.census.gov/geocoder/geographies/address',
      {
        params: {
          street,
          city,
          state,
          benchmark: 'Public_AR_Current',
          vintage: 'Current_Current',
          layers: 10,
          format: 'json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
});

app.get('/api/census/census-data', async (req, res) => {
  try {
    const { state, county } = req.query;
    
    if (!state || !county) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.get(
      'https://api.census.gov/data/2023/acs/acs1',
      {
        params: {
          get: 'NAME,C25004_001E,C25004_002E,C25004_003E',
          for: `county:${county}`,
          in: `state:${state}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Census data error:', error);
    res.status(500).json({ error: 'Failed to fetch census data' });
  }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import express from 'express';

import pool from "../db/index.mjs";
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { createClient } from 'redis';
import session from 'express-session';
import { RedisStore } from 'connect-redis';

// function import
import uploadSkckPDFToCloudinary from './pdfControllers.mjs';
import generatePDFControllers from './generatePDFControllers.mjs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5001;
const SESSION_SECRET = process.env.SESSION_SECRET;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const redisClient = createClient({
    url: `redis://default:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
});

redisClient.on('connect', () => {
    console.log('Connected to Redis...');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
    process.exit(1);
});

(async () => {
    await redisClient.connect();
})();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json()); 

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, 
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

async function getBase64Image(filePathOrUrl) {
    try {
        if (isValidHttpUrl(filePathOrUrl)) {
            const response = await axios.get(filePathOrUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');
            return imageBuffer.toString('base64');
        } else {
            const imageBuffer = await fs.readFile(filePathOrUrl);
            return imageBuffer.toString('base64');
        }
    } catch (err) {
        console.error(`Error getting image from ${filePathOrUrl}:`, err.message);
        return 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
}

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to WAC Fake App!</h1>
        <p>Explore these features:</p>
        <ul>
            <li><a href="/register/step1">Skck Form (Session Management)</a></li>
            <li><a href="/data">Cached API Response Example</a></li>
        </ul>
    `);
});

app.use(express.json());

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

app.get('/register/step1', (req, res) => {
    const formData = req.session.formData || {};
    res.render('step1', { formData });
});

app.post('/register/step1', (req, res) => {
    const { applicant_name, place_date_birth, complete_address, needs, id_number, submission_date, verification_status, passport_photo} =req.body

    if (!applicant_name || !id_number) {
        return res.status(400).send('Name and ID_Number are required.');
    }

    req.session.formData = req.session.formData || {}; 
    req.session.formData.place_date_birth = place_date_birth;
    req.session.formData.complete_address = complete_address;
    req.session.formData.submission_date = submission_date;
    req.session.formData.passport_photo = passport_photo;
    req.session.formData.applicant_name = applicant_name;
    req.session.formData.id_number = id_number;
    req.session.formData.needs = needs;

    console.log(`Session after Step 1: ${JSON.stringify(req.session.formData)}`);

    res.redirect('/register/confirm');
});

app.get('/register/confirm', (req, res) => {
    if (!req.session.formData || !req.session.formData.applicant_name || !req.session.formData.complete_address) {
        return res.redirect('/register/step1');
    }
    const formData = req.session.formData;
    res.render('confirm', { formData });
});

app.post('/register/submit', async (req, res) => {
    if (!req.session.formData || !req.session.formData.name || !req.session.formData.address) {
        return res.status(400).send('Session data missing. Please restart the form.');
    }

    const finalData = req.session.formData;

    const hasilPdf = await generatePDFControllers(finalData);

   const upload =  await uploadSkckPDFToCloudinary(hasilPdf);

    const { applicant_name, place_date_birth, complete_address, needs, id_number, submission_date, verification_status, passport_photo} = req.session.formData;
    pool.query(
    'INSERT INTO skck ( applicant_name, place_date_birth, complete_address, needs, id_number, submission_date, verification_status, passport_photo) VALUES ($1, $2, $3, $4, $5, $6, $7 , $8)',
    [ applicant_name, place_date_birth, complete_address, needs, id_number, submission_date, verification_status, passport_photo],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.status(201).send(`SKCK added with ID: ${results.insertId}`);
    });

    console.log(JSON.stringify(finalData, null, 2));
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error completing registration.');
        }
        res.render('success');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
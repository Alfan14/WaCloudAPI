import { RedisStore } from 'connect-redis';
import redis from 'redis';
import express from 'express';
import session from 'express-session';
import { createClient } from 'redis';

import bodyParser from 'body-parser';
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000;
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

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to Redis Express App!</h1>
        <p>Explore these features:</p>
        <ul>
            <li><a href="/register/step1">Multi-step Registration Form (Session Management)</a></li>
            <li><a href="/data">Cached API Response Example</a></li>
        </ul>
    `);
});

// Session Management Routes (Multi-step Form)

app.get('/register/step1', (req, res) => {
    const formData = req.session.formData || {};
    res.render('step1', { formData });
});

app.post('/register/step1', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).send('Name and Email are required.');
    }

    req.session.formData = req.session.formData || {}; 
    req.session.formData.name = name;
    req.session.formData.email = email;

    console.log(`Session after Step 1: ${JSON.stringify(req.session.formData)}`);

    res.redirect('/register/step2');
});

app.get('/register/step2', (req, res) => {
    if (!req.session.formData || !req.session.formData.name) {
        return res.redirect('/register/step1');
    }
    const formData = req.session.formData; 
    res.render('step2', { formData });
});

app.post('/register/step2', (req, res) => {
    const { address, city } = req.body;
    if (!address || !city) {
        return res.status(400).send('Address and City are required.');
    }

    req.session.formData.address = address;
    req.session.formData.city = city;

    console.log(`Session after Step 2: ${JSON.stringify(req.session.formData)}`);

    res.redirect('/register/confirm');
});

app.get('/register/confirm', (req, res) => {
    if (!req.session.formData || !req.session.formData.name || !req.session.formData.address) {
        return res.redirect('/register/step1');
    }
    const formData = req.session.formData;
    res.render('confirm', { formData });
});

app.post('/register/submit', (req, res) => {
    if (!req.session.formData || !req.session.formData.name || !req.session.formData.address) {
        return res.status(400).send('Session data missing. Please restart the form.');
    }

    const finalData = req.session.formData;

    console.log('--- Final Registration Data Submitted ---');
    console.log(JSON.stringify(finalData, null, 2));
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error completing registration.');
        }
        res.render('success');
    });
});

async function getSlowData() {
    return new Promise(resolve => {
        setTimeout(() => {
            const data = {
                timestamp: new Date().toISOString(),
                message: "This data came from a slow source!",
                source: "Database/External API"
            };
            console.log('--- Fetched data from slow source ---');
            resolve(data);
        }, 2000); 
    });
}

app.get('/data', async (req, res) => {
    const cacheKey = 'my:cached:data';
    let data;

    try {
        // 1. Check Redis Cache
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            data = JSON.parse(cachedData);
            data.source = "Redis Cache";
            console.log('--- Data served from Redis Cache ---');
            return res.json(data);
        }

        // 2. Cache Miss: Fetch from slow source
        data = await getSlowData();

        // 3. Store in Redis with TTL (e.g., 60 seconds)
        // Use JSON.stringify to store objects
        await redisClient.set(cacheKey, JSON.stringify(data), { EX: 60 }); 
        console.log('--- Stored data in Redis cache ---');

        data.source = "Database/External API (Cached)";
        res.json(data);

    } catch (error) {
        console.error('Error fetching/caching data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/clear-cache', async (req, res) => {
    const cacheKey = 'my:cached:data';
    try {
        const deletedCount = await redisClient.del(cacheKey);
        res.send(`Cache for '${cacheKey}' cleared. Keys deleted: ${deletedCount}`);
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).send('Error clearing cache.');
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to:');
    console.log(`  - http://localhost:${PORT}/register/step1 (for multi-step form)`);
    console.log(`  - http://localhost:${PORT}/data (for cached API)`);
    console.log(`  - http://localhost:${PORT}/clear-cache (to clear the API cache)`);
});
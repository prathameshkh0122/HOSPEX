const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const DEFAULT_CITY = { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 };
const cache = new Map();

function number(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

async function cached(key, ttl, work) {
  const previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return previous.value;
  const value = await work();
  cache.set(key, { value, expires: Date.now() + ttl });
  return value;
}

exports.weather = asyncHandler(async (req, res) => {
  const latitude = number(req.query.latitude, DEFAULT_CITY.latitude, -90, 90);
  const longitude = number(req.query.longitude, DEFAULT_CITY.longitude, -180, 180);
  const name = String(req.query.name || DEFAULT_CITY.name).trim().slice(0, 80);
  const key = `weather:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const data = await cached(key, 8 * 60 * 1000, async () => {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude, longitude, current: 'temperature_2m,apparent_temperature,rain,weather_code,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m', forecast_days: '3', timezone: 'auto' });
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw httpError(502, 'Live weather provider is temporarily unavailable.');
    const payload = await response.json();
    return { location: { name, latitude, longitude, timezone: payload.timezone }, current: payload.current, hourly: payload.hourly, fetchedAt: new Date().toISOString(), source: 'Open-Meteo' };
  });
  res.json({ success: true, data });
});

exports.socialSignals = asyncHandler(async (req, res) => {
  const location = String(req.query.location || DEFAULT_CITY.name).trim().slice(0, 60);
  const query = `${location} (weather OR rain OR flood OR storm OR travel)`;
  const key = `social:${location.toLowerCase()}`;
  const data = await cached(key, 10 * 60 * 1000, async () => {
    try {
      const url = new URL('https://www.reddit.com/search.json');
      url.search = new URLSearchParams({ q: query, sort: 'new', t: 'week', limit: '8', restrict_sr: 'false' });
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'HOSPEX-DigitalTwin/1.0 (public-signal-dashboard)' }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) throw new Error(`Reddit returned ${response.status}`);
      const payload = await response.json();
      const posts = (payload.data?.children || []).map(({ data: post }) => ({
        title: post.title, subreddit: post.subreddit_name_prefixed, score: post.score, comments: post.num_comments,
        createdAt: new Date(post.created_utc * 1000).toISOString(), url: `https://www.reddit.com${post.permalink}`
      })).filter((post) => post.title).slice(0, 6);
      return { location, posts, fetchedAt: new Date().toISOString(), source: 'Reddit public search', note: 'Public discussion is an early-warning signal, not a verified emergency source.' };
    } catch (_error) {
      return { location, posts: [], fetchedAt: new Date().toISOString(), source: 'Reddit public search', unavailable: true, note: 'Public social feed is temporarily unavailable; weather predictions continue normally.' };
    }
  });
  res.json({ success: true, data });
});

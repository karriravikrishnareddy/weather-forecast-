const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const cityNameEl = document.getElementById("cityName");
const currentDateTimeEl = document.getElementById("currentDateTime");
const weatherIconEl = document.getElementById("weatherIcon");
const temperatureEl = document.getElementById("temperature");
const weatherConditionEl = document.getElementById("weatherCondition");
const feelsLikeEl = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("windSpeed");
const highLowEl = document.getElementById("highLow");
const forecastGridEl = document.getElementById("forecastGrid");

const weatherCodes = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Cloudy", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" }
};

let currentRequest = null;
const weatherCache = new Map();

async function fetchWeatherByCity(city) {
  const cacheKey = city.toLowerCase().trim();

  if (weatherCache.has(cacheKey)) {
    return weatherCache.get(cacheKey);
  }

  // Cancel previous request
  if (currentRequest) {
    currentRequest.abort();
  }

  currentRequest = new AbortController();
  const { signal } = currentRequest;

  // 1. Find city
  const geoUrl =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}` +
    `&count=1` +
    `&language=en` +
    `&format=json`;

  const geoResponse = await fetch(geoUrl, { signal });

  if (!geoResponse.ok) {
    throw new Error("City search failed.");
  }

  const geoData = await geoResponse.json();

  if (!geoData.results?.length) {
    throw new Error("City not found. Try another city.");
  }

  const place = geoData.results[0];

  // 2. Get weather
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${place.latitude}` +
    `&longitude=${place.longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto` +
    `&forecast_days=8`;

  const weatherResponse = await fetch(weatherUrl, { signal });

  if (!weatherResponse.ok) {
    throw new Error("Weather data could not be loaded.");
  }

  const weatherData = await weatherResponse.json();

  const result = {
    city: place.name,
    country: place.country || "",
    weather: weatherData
  };

  weatherCache.set(cacheKey, result);

  return result;
}

function getWeatherInfo(code) {
  return (
    weatherCodes[code] || {
      label: "Weather",
      icon: "🌤️"
    }
  );
}

function renderWeather(data) {
  const { current, daily } = data.weather;

  const currentCode = getWeatherInfo(current.weather_code);

  cityNameEl.textContent =
    `${data.city}${data.country ? ", " + data.country : ""}`;

  // Use API timezone
  currentDateTimeEl.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: data.weather.timezone
  }).format(new Date());

  weatherIconEl.textContent = currentCode.icon;

  temperatureEl.textContent =
    `${Math.round(current.temperature_2m)}°C`;

  weatherConditionEl.textContent =
    currentCode.label;

  feelsLikeEl.textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  humidityEl.textContent =
    `${Math.round(current.relative_humidity_2m)}%`;

  windSpeedEl.textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  const high = Math.round(daily.temperature_2m_max[0]);
  const low = Math.round(daily.temperature_2m_min[0]);

  highLowEl.textContent = `${high}° / ${low}°`;

  // Build forecast using one DOM update
  const fragment = document.createDocumentFragment();

  for (let i = 1; i < 8; i++) {
    const code = getWeatherInfo(daily.weather_code[i]);

    const date = new Date(`${daily.time[i]}T12:00:00`);

    const dayName = date.toLocaleDateString("en-US", {
      weekday: "short"
    });

    const highTemp =
      Math.round(daily.temperature_2m_max[i]);

    const lowTemp =
      Math.round(daily.temperature_2m_min[i]);

    const card = document.createElement("article");

    card.className = "forecast-day";

    card.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="icon">${code.icon}</div>
      <div class="temps">
        <span class="max">${highTemp}°</span>
        <span class="min">${lowTemp}°</span>
      </div>
    `;

    fragment.appendChild(card);
  }

  forecastGridEl.replaceChildren(fragment);
}

async function loadWeatherForCity(city) {
  if (!city) return;

  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";

  weatherConditionEl.textContent = "Loading weather...";
  cityNameEl.textContent = city;

  try {
    const result = await fetchWeatherByCity(city);

    renderWeather(result);

    cityInput.value = city;
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error(error);

    cityNameEl.textContent = "Unable to load weather";
    weatherConditionEl.textContent = error.message;

    temperatureEl.textContent = "--°C";
    feelsLikeEl.textContent = "--°C";
    humidityEl.textContent = "--%";
    windSpeedEl.textContent = "-- km/h";
    highLowEl.textContent = "-- / --";
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

function searchCity() {
  const city = cityInput.value.trim();

  if (!city) {
    cityInput.focus();
    return;
  }

  loadWeatherForCity(city);
}

searchBtn.addEventListener("click", searchCity);

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchCity();
  }
});
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');

const cityNameEl = document.getElementById('cityName');
const currentDateTimeEl = document.getElementById('currentDateTime');
const weatherIconEl = document.getElementById('weatherIcon');
const temperatureEl = document.getElementById('temperature');
const weatherConditionEl = document.getElementById('weatherCondition');
const feelsLikeEl = document.getElementById('feelsLike');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const highLowEl = document.getElementById('highLow');
const forecastGridEl = document.getElementById('forecastGrid');

const weatherCodes = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mostly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Cloudy', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' }
};

const defaultCity = '';

async function fetchWeatherByCity(city) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );

  if (!geoRes.ok) {
    throw new Error('City search failed. Please try another location.');
  }

  const geoData = await geoRes.json();

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error('No matching city found. Please try a different name.');
  }

  const place = geoData.results[0];
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`
  );

  if (!weatherRes.ok) {
    throw new Error('Weather data could not be loaded.');
  }

  const weatherData = await weatherRes.json();

  return {
    city: place.name,
    country: place.country || '',
    weather: weatherData
  };
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function renderWeather(data) {
  const current = data.weather.current;
  const daily = data.weather.daily;
  const currentCode = weatherCodes[current.weather_code] || { label: 'Weather', icon: '🌤️' };

  cityNameEl.textContent = `${data.city}${data.country ? ', ' + data.country : ''}`;
  currentDateTimeEl.textContent = formatDateTime(new Date().toISOString());
  weatherIconEl.textContent = currentCode.icon;
  temperatureEl.textContent = `${Math.round(current.temperature_2m)}°C`;
  weatherConditionEl.textContent = currentCode.label;
  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
  humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  windSpeedEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  if (daily.temperature_2m_max && daily.temperature_2m_min) {
    const high = Math.round(daily.temperature_2m_max[0]);
    const low = Math.round(daily.temperature_2m_min[0]);
    highLowEl.textContent = `${high}° / ${low}°`;
  }

  const futureDays = daily.time.slice(1, 8);

  forecastGridEl.innerHTML = '';
  futureDays.forEach((day, index) => {
    const actualIndex = index + 1;
    const code = weatherCodes[daily.weather_code[actualIndex]] || { label: 'Weather', icon: '🌤️' };
    const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });

    const card = document.createElement('article');
    card.className = 'forecast-day';

    const high = Math.round(daily.temperature_2m_max[actualIndex]);
    const low = Math.round(daily.temperature_2m_min[actualIndex]);

    card.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="icon">${code.icon}</div>
      <div class="temps">
        <span class="max">${high}°</span>
        <span class="min">${low}°</span>
      </div>
    `;

    forecastGridEl.appendChild(card);
  });
}

async function loadWeatherForCity(city) {
  try {
    const result = await fetchWeatherByCity(city);
    renderWeather(result);
    cityInput.value = city;
  } catch (error) {
    weatherConditionEl.textContent = error.message;
    temperatureEl.textContent = '--°C';
    cityNameEl.textContent = 'Unable to load weather';
    console.error(error);
  }
}

searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) {
    loadWeatherForCity(city);
  }
});

cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const city = cityInput.value.trim();
    if (city) {
      loadWeatherForCity(city);
    }
  }
});

if (defaultCity) {
  loadWeatherForCity(defaultCity);
} else {
  cityNameEl.textContent = 'Weather Forecast';
  currentDateTimeEl.textContent = 'Search for a city to see live weather';
  temperatureEl.textContent = '--°C';
  weatherConditionEl.textContent = 'Waiting for input';
  feelsLikeEl.textContent = '--°C';
  humidityEl.textContent = '--%';
  windSpeedEl.textContent = '-- km/h';
  highLowEl.textContent = '-- / --';
  weatherIconEl.textContent = '☀️';
}

// Anda harus mengganti ini dengan KUNCI API OpenWeatherMap Anda yang sebenarnya
const API_KEY = '6cd68757748eacc566fadf63162adb9e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit

// === DOM ELEMENTS ===
const locationNameEl = document.getElementById('location-name');
const temperatureEl = document.getElementById('temperature');
const conditionEl = document.getElementById('condition');
const iconEl = document.getElementById('weather-icon');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const forecastContainer = document.getElementById('forecast-container');
const currentWeatherSection = document.getElementById('current-weather');
const forecastSection = document.getElementById('forecast-section');
const loadingEl = document.getElementById('loading-state');
const errorEl = document.getElementById('error-message');
const themeToggleBtn = document.getElementById('theme-toggle');
const unitToggleBtn = document.getElementById('unit-toggle');
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');

// --- UTILITY FUNCTIONS ---

/**
 * Menampilkan atau menyembunyikan loading state dan error message (FR-5)
 * @param {boolean} isLoading - true untuk menampilkan loading, false untuk menyembunyikan
 * @param {string} error - Pesan error, jika ada
 */
function updateState(isLoading = false, error = null) {
    if (isLoading) {
        loadingEl.classList.remove('hidden');
        currentWeatherSection.classList.add('hidden');
        forecastSection.classList.add('hidden');
        errorEl.classList.add('hidden');
    } else if (error) {
        errorEl.textContent = `Error: ${error}. Please try again.`;
        errorEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
        currentWeatherSection.classList.add('hidden');
        forecastSection.classList.add('hidden');
    } else {
        loadingEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        currentWeatherSection.classList.remove('hidden');
        forecastSection.classList.remove('hidden');
    }
}

/**
 * Mengubah suhu dari Kelvin ke unit yang dipilih
 * @param {number} temp - Suhu dalam Kelvin
 * @returns {number} Suhu dalam Celsius atau Fahrenheit
 */
function convertTemperature(temp) {
    const kelvinToCelsius = temp - 273.15;
    if (currentUnit === 'metric') {
        return kelvinToCelsius.toFixed(1);
    } else {
        return (kelvinToCelsius * 9/5 + 32).toFixed(1);
    }
}

// --- API FETCHING ---

/**
 * Mengambil data cuaca saat ini berdasarkan koordinat
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function fetchCurrentWeatherByCoords(lat, lon) {
    updateState(true);
    try {
        const url = `${BASE_URL}weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
        const response = await fetch(url);
        
        // Non-Functional Requirement: API response handling < 1 second (perlu optimasi server/cache)
        if (!response.ok) {
            throw new Error('Failed to fetch current weather data');
        }
        
        const data = await response.json();
        displayCurrentWeather(data);
        fetchForecastByCoords(lat, lon);
    } catch (error) {
        console.error(error);
        updateState(false, error.message);
    }
}

/**
 * Mengambil data 5-hari forecast berdasarkan koordinat (FR-3)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function fetchForecastByCoords(lat, lon) {
    try {
        // OpenWeatherMap "forecast" API memberikan data 3-jam, perlu filter untuk 5 hari *harian*
        const url = `${BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const data = await response.json();
        displayForecast(data);
        updateState(false); // Sembunyikan loading setelah semua data selesai
    } catch (error) {
        console.error(error);
        updateState(false, error.message);
    }
}

// --- DISPLAY FUNCTIONS ---

/**
 * Menampilkan data cuaca saat ini (FR-1)
 * @param {object} data - Data cuaca dari API
 */
function displayCurrentWeather(data) {
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    const windUnit = currentUnit === 'metric' ? 'm/s' : 'mph';

    locationNameEl.textContent = `${data.name}, ${data.sys.country}`;
    temperatureEl.textContent = `${data.main.temp.toFixed(1)}${unitSymbol}`;
    conditionEl.textContent = data.weather[0].description.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    feelsLikeEl.textContent = `${data.main.feels_like.toFixed(1)}${unitSymbol}`;
    humidityEl.textContent = `${data.main.humidity}%`;
    windSpeedEl.textContent = `${data.wind.speed.toFixed(1)}${windUnit}`;
    
    // Icon URL
    const iconCode = data.weather[0].icon;
    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.alt = data.weather[0].description;
}

/**
 * Menampilkan data 5-hari forecast (FR-3)
 * @param {object} data - Data forecast dari API
 */
function displayForecast(data) {
    forecastContainer.innerHTML = '';
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    const dailyData = {};

    // Filter data 3-jam menjadi per hari
    data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyData[date]) {
            dailyData[date] = { temps: [], icon: item.weather[0].icon, description: item.weather[0].description };
        }
        dailyData[date].temps.push(item.main.temp);
    });

    let count = 0;
    for (const dateStr in dailyData) {
        if (count >= 5) break; // Hanya 5 hari
        
        const day = new Date(dateStr);
        const temps = dailyData[dateStr].temps;
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const iconCode = dailyData[dateStr].icon;

        // Membuat elemen forecast
        const item = document.createElement('div');
        item.classList.add('forecast-item');
        item.innerHTML = `
            <p class="day">${day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
            <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${dailyData[dateStr].description}">
            <p>High: ${maxTemp.toFixed(1)}${unitSymbol}</p>
            <p>Low: ${minTemp.toFixed(1)}${unitSymbol}</p>
        `;
        // TODO: Tambahkan event listener untuk detail lebih lanjut (FR-3: Clickable forecast items)

        forecastContainer.appendChild(item);
        count++;
    }
}

// --- EVENT HANDLERS ---

/**
 * Mendapatkan lokasi pengguna menggunakan Geolocation API (FR-1)
 */
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchCurrentWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.error("Geolocation error:", error);
                // Fallback to a default city if geolocation fails
                fetchWeatherByCity('London'); 
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        fetchWeatherByCity('London'); 
    }
}

/**
 * Mencari cuaca berdasarkan nama kota (FR-2)
 * @param {string} city - Nama kota
 */
async function fetchWeatherByCity(city) {
    updateState(true);
    try {
        const url = `${BASE_URL}weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            // FR-2: Handle search errors gracefully
            throw new Error(`City not found: ${city}`);
        }

        const data = await response.json();
        displayCurrentWeather(data);
        
        // Ambil koordinat kota untuk mendapatkan forecast 5 hari
        fetchForecastByCoords(data.coord.lat, data.coord.lon);
        
        // TODO: FR-4: Simpan pencarian terbaru secara lokal
    } catch (error) {
        console.error(error);
        updateState(false, error.message);
    }
}


// Event listener untuk form pencarian (FR-2)
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        fetchWeatherByCity(city);
        cityInput.value = '';
    }
});

// Event listener untuk tombol toggle unit (FR-5)
unitToggleBtn.addEventListener('click', () => {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    const currentCity = locationNameEl.textContent.split(',')[0];
    if (currentCity && currentCity !== 'City') {
        fetchWeatherByCity(currentCity);
    } else {
        getLocation(); // Muat ulang lokasi default/saat ini
    }
});

// Event listener untuk tombol toggle tema (FR-5)
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    // TODO: FR-4: Ingat preferensi tema pengguna menggunakan localStorage
});


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // TODO: FR-4: Muat preferensi unit dan tema dari localStorage

    getLocation(); // FR-1: Tampilkan cuaca lokasi pengguna saat pertama kali dimuat
});

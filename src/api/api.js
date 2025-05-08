import axios from 'axios';

// Base API URL from environment variables with fallback for local development
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3099/api';

// Create main API client
const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    response => response,
    error => {
        // Log errors but allow components to handle them
        console.error('API Error:', error.response?.data || error.message);

        // Add custom error information
        if (error.response) {
            error.isApiError = true;
            error.errorData = error.response.data;
            error.statusCode = error.response.status;
        }

        return Promise.reject(error);
    }
);

// Team API functions
export const fetchTeams = (season = '2024') =>
    apiClient.get('/teams/', { params: { season } });

export const fetchTeamById = (abbr, season = '2024') =>
    apiClient.get(`/teams/${abbr}`, { params: { season } });

export const fetchTeamPlayers = (abbr, season = '2024') =>
    apiClient.get(`/teams/${abbr}/players`, { params: { season } });

export const fetchTeamStats = (abbr, season = '2024') =>
    apiClient.get(`/teams/${abbr}/stats`, { params: { season } });

export const fetchTeamGames = (abbr, season = '2024') =>
    apiClient.get(`/teams/${abbr}/games`, { params: { season } });

// Player API functions
export const fetchPlayers = (params = {}) =>
    apiClient.get('/players/', { params });

export const fetchPlayerById = (id, season = '2024') =>
    apiClient.get(`/players/${id}`, { params: { season } });

export const fetchPlayerStats = (id, season = '2024') =>
    apiClient.get(`/players/${id}/stats`, { params: { season } });

export const fetchPlayerGames = (id, season = '2024') =>
    apiClient.get(`/players/${id}/games`, { params: { season } });

// Game API functions
export const fetchGames = (params = {}) =>
    apiClient.get('/games/', { params });

export const fetchGameById = (gameId) =>
    apiClient.get(`/games/${gameId}`);

// Comparative analytics
export const fetchTeamComparison = (teamAbbrs = [], season = '2024') =>
    apiClient.get('/teams/compare', { params: { teams: teamAbbrs.join(','), season } });

export const fetchPlayerComparison = (playerIds = [], season = '2024') =>
    apiClient.get('/players/compare', { params: { players: playerIds.join(','), season } });

// Utility function for ESPN API Fantasy data
export const fetchEspnFantasyData = (year, view = 'kona_player_info') => {
    // This might need a proxy or CORS solution depending on deployment
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/players`;
    return axios.get(url, {
        params: { view },
        headers: {
            'X-Fantasy-Filter': JSON.stringify({ games: { limit: 2000 } })
        }
    });
};

export default apiClient;
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    ZAxis,
    Cell,
    ReferenceLine
} from 'recharts';
import { fetchTeams, fetchGames } from '../api/api'; // <-- ADD THIS IMPORT (adjust path if needed)

// NFL team colors
const TEAM_COLORS = {
    ARI: '#97233F',
    ATL: '#A71930',
    BAL: '#241773',
    BUF: '#00338D',
    CAR: '#0085CA',
    CHI: '#0B162A',
    CIN: '#FB4F14',
    CLE: '#311D00',
    DAL: '#003594',
    DEN: '#FB4F14',
    DET: '#0076B6',
    GB: '#203731',
    HOU: '#03202F',
    IND: '#002C5F',
    JAX: '#101820',
    KC: '#E31837',
    LAC: '#0080C6',
    LAR: '#003594',
    LV: '#000000',
    MIA: '#008E97',
    MIN: '#4F2683',
    NE: '#002244',
    NO: '#D3BC8D',
    NYG: '#0B2265',
    NYJ: '#125740',
    PHI: '#004C54',
    PIT: '#FFB612',
    SEA: '#002244',
    SF: '#AA0000',
    TB: '#D50A0A',
    TEN: '#0C2340',
    WAS: '#773141'
};

// NFL team conferences and divisions
const TEAM_CONFERENCES_DIVISIONS = {
    ARI: { conference: 'NFC', division: 'West' },
    ATL: { conference: 'NFC', division: 'South' },
    BAL: { conference: 'AFC', division: 'North' },
    BUF: { conference: 'AFC', division: 'East' },
    CAR: { conference: 'NFC', division: 'South' },
    CHI: { conference: 'NFC', division: 'North' },
    CIN: { conference: 'AFC', division: 'North' },
    CLE: { conference: 'AFC', division: 'North' },
    DAL: { conference: 'NFC', division: 'East' },
    DEN: { conference: 'AFC', division: 'West' },
    DET: { conference: 'NFC', division: 'North' },
    GB: { conference: 'NFC', division: 'North' },
    HOU: { conference: 'AFC', division: 'South' },
    IND: { conference: 'AFC', division: 'South' },
    JAX: { conference: 'AFC', division: 'South' },
    KC: { conference: 'AFC', division: 'West' },
    LAC: { conference: 'AFC', division: 'West' },
    LAR: { conference: 'NFC', division: 'West' },
    LV: { conference: 'AFC', division: 'West' },
    MIA: { conference: 'AFC', division: 'East' },
    MIN: { conference: 'NFC', division: 'North' },
    NE: { conference: 'AFC', division: 'East' },
    NO: { conference: 'NFC', division: 'South' },
    NYG: { conference: 'NFC', division: 'East' },
    NYJ: { conference: 'AFC', division: 'East' },
    PHI: { conference: 'NFC', division: 'East' },
    PIT: { conference: 'AFC', division: 'North' },
    SEA: { conference: 'NFC', division: 'West' },
    SF: { conference: 'NFC', division: 'West' },
    TB: { conference: 'NFC', division: 'South' },
    TEN: { conference: 'AFC', division: 'South' },
    WAS: { conference: 'NFC', division: 'East' }
};

// Helper function to calculate percentile (ensure it handles potentially non-numeric data)
// Updated to match TeamDetail.jsx version
const calculatePercentile = (value, allValues, isDefensive = false) => {
    const numericValues = allValues
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v)); // Filter out NaN values

    if (!numericValues.length) return 0;
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 0; // Handle case where the specific team value is not numeric
    
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    let index = sortedValues.findIndex(v => v >= numericValue);
    if (index === -1) index = sortedValues.length; // If value is highest, it's 100th percentile
    
    let percentile = Math.round((index / sortedValues.length) * 100);
    
    // Adjust percentile based on index edge cases
    if (index === 0 && sortedValues.length > 1) {
        percentile = Math.round((1 / sortedValues.length) * 100); // Assign minimum percentile if it's the lowest value
    }
    
    // Defensive stats inversion happens *after* percentile calculation
    // The color function handles the visual inversion
    return percentile;
};

// Helper: Get percentile color class (from TeamDetail.jsx)
const getPercentileColorClass = (percentile, isDefensive = false) => {
    const p = isDefensive ? 100 - percentile : percentile;
    
    // More subtle transitions between colors - matches PlayerRankings.jsx
    if (p >= 90) return 'text-emerald-500 bg-emerald-900/50';    // Elite - Green (#10B981)
    if (p >= 80) return 'text-emerald-400 bg-emerald-900/50';    // Great - Light Green (#34D399)
    if (p >= 70) return 'text-green-400 bg-green-900/50';        // Very Good - Lighter Green
    if (p >= 60) return 'text-lime-400 bg-lime-900/50';          // Above Average - Lime
    if (p >= 50) return 'text-amber-300 bg-amber-900/50';        // Slightly Above Average - Light Amber
    if (p >= 40) return 'text-amber-400 bg-amber-900/50';        // Average - Amber (#F59E0B)
    if (p >= 30) return 'text-orange-400 bg-orange-900/50';      // Below Average - Light Orange
    if (p >= 20) return 'text-orange-500 bg-orange-900/50';      // Poor - Orange (#F97316)
    if (p >= 10) return 'text-orange-600 bg-orange-900/50';      // Very Poor - Darker Orange
    return 'text-red-500 bg-red-900/50';                         // Terrible - Red (#EF4444)
};

// Helper: Get percentile gradient for bars
const getPercentileGradient = (percentile, isDefensive = false) => {
    const p = isDefensive ? 100 - percentile : percentile;
    
    // More subtle transitions between colors - matches PlayerRankings.jsx
    if (p >= 90) return 'from-emerald-500 to-emerald-600';      // Elite - Green (#10B981)
    if (p >= 80) return 'from-emerald-400 to-emerald-500';      // Great - Light Green (#34D399)
    if (p >= 70) return 'from-green-400 to-green-500';          // Very Good - Lighter Green
    if (p >= 60) return 'from-lime-400 to-lime-500';            // Above Average - Lime
    if (p >= 50) return 'from-amber-300 to-amber-400';          // Slightly Above Average - Light Amber
    if (p >= 40) return 'from-amber-400 to-amber-500';          // Average - Amber (#F59E0B)
    if (p >= 30) return 'from-orange-400 to-orange-500';        // Below Average - Light Orange
    if (p >= 20) return 'from-orange-500 to-orange-600';        // Poor - Orange (#F97316)
    if (p >= 10) return 'from-orange-600 to-orange-700';        // Very Poor - Darker Orange
    return 'from-red-500 to-red-600';                           // Terrible - Red (#EF4444)
};

// --- Team Logo Fallback Map (Use if API doesn't provide logo) ---
const logoFallbackMap = {
    'ARI': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
    'ATL': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
    'BAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
    'BUF': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
    'CAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
    'CHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
    'CIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
    'CLE': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
    'DAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
    'DEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
    'DET': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
    'GB': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
    'HOU': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
    'IND': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
    'JAX': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
    'KC': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
    'LV': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
    'LAC': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
    'LAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
    'MIA': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
    'MIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
    'NE': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
    'NO': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
    'NYG': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
    'NYJ': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
    'PHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
    'PIT': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
    'SEA': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
    'SF': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
    'TB': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
    'TEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
    'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png'
};

const getTeamLogo = (team) => {
    // Prioritize API fields, then fall back to map
    return team.team_logo_espn || team.team_logo || logoFallbackMap[team.team_abbr] || 'https://via.placeholder.com/100?text=N/A';
};
// ------------------------------------------------------------------

// --- Add Skeleton Component (Adapted for Team Cards) ---
const TeamCardSkeleton = () => (
  <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 overflow-hidden animate-pulse">
    {/* Header Skeleton */}
    <div className="p-5 flex items-center">
      <div className="w-20 h-20 rounded-lg bg-gray-700 mr-4"></div>
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
    {/* Stats Skeleton */}
    <div className="p-5">
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-3.5 space-y-2">
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            <div className="h-5 bg-gray-700 rounded w-3/4"></div>
            <div className="h-2 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
    {/* Footer Skeleton */}
    <div className="bg-gray-800/60 p-3 border-t border-gray-700/50">
      <div className="flex justify-around">
        <div className="h-8 w-28 bg-gray-700/60 rounded"></div>
        <div className="h-8 w-28 bg-gray-700/60 rounded"></div>
      </div>
    </div>
  </div>
);

export default function TeamList() {
    const [teams, setTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('cards'); // 'cards', 'comparison', 'matrix'
    const [sortBy, setSortBy] = useState('team_abbr');
    const [sortOrder, setSortOrder] = useState('asc');
    const [selectedMetric, setSelectedMetric] = useState('offensive_ppg');
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [conference, setConference] = useState('all'); // Add conference filter state
    const [division, setDivision] = useState('all'); // Add division filter state
    const [matrixConfig, setMatrixConfig] = useState({  // Add matrix configuration state
        xAxis: 'offensive_ppg',
        yAxis: 'defensive_ppg',
        zAxis: 'offense_epa_per_play',
        bubbleSize: 'offense_epa_per_play'  // Add this property for bubble sizing
    });
    const [isLoading, setIsLoading] = useState(true);   // Add loading state
    const [loadError, setLoadError] = useState(null);   // Add error state
    const [games, setGames] = useState([]);             // Store games data
    const navigate = useNavigate();

    // Define the available metrics for matrix dropdowns
    const metricOptions = [
        { value: 'offensive_ppg', label: 'Offensive PPG' },
        { value: 'defensive_ppg', label: 'Defensive PPG' },
        { value: 'offensive_ypg', label: 'Offensive YPG' },
        { value: 'defensive_ypg', label: 'Defensive YPG' },
        { value: 'offense_epa_per_play', label: 'Off EPA/Play' },
        { value: 'defense_epa_per_play', label: 'Def EPA/Play' },
        { value: 'offense_success_rate', label: 'Off Success Rate' },
        { value: 'defense_success_rate', label: 'Def Success Rate' },
        { value: 'offense_run_play_rate', label: 'Run Play Rate' },
        { value: 'offense_pass_play_rate', label: 'Pass Play Rate' },
        { value: 'offense_motion_rate', label: 'Motion Rate' },
        { value: 'offense_pa_rate', label: 'Play Action Rate' }
    ];

    useEffect(() => {
        setIsLoading(true);
        setLoadError(null);

        // Use imported functions
        const loadData = async () => {
            try {
                const teamsRes = await fetchTeams(); // Use fetchTeams
                let gamesData = [];
                try {
                    // Use the /api/games endpoint defined in api.js
                    const gamesRes = await fetchGames();
                    gamesData = gamesRes.data;
                } catch (gamesErr) {
                    console.warn('❌ Failed to fetch games via primary endpoint:', gamesErr.message);
                    // Fallback to mock data if games fetch fails
                    if (!gamesData || gamesData.length === 0) { // Check if gamesData is empty/null
                         console.log('Generating mock games as fallback.');
                        // Need teamsRes.data here, ensure it's available
                        if (teamsRes && teamsRes.data) {
                            gamesData = generateMockGames(teamsRes.data);
                        } else {
                             console.error('Cannot generate mock games without teams data.');
                             throw new Error('Failed to fetch prerequisite team data for mock games.'); // Throw error if teams data is missing for mock generation
                        }
                    }
                }
                // Ensure teamsRes.data exists before calling processData
                 if (teamsRes && teamsRes.data) {
                    processData(teamsRes.data, gamesData);
                 } else {
                    throw new Error('Teams data is missing after fetch.');
                 }
            } catch (err) {
                 console.error('❌ Failed to fetch initial data (teams or games):', err.message);
                setLoadError(`Failed to load data: ${err.message}`); // Provide more specific error
                // Ensure loading stops on error AFTER setting error state
            } finally {
                 setIsLoading(false); 
            }
        };

        loadData();

        // Original logic commented out:
        /*
        axios.get('http://localhost:5000/api/teams')
            .then(teamsRes => {
                axios.get('http://localhost:5000/api/v1/games/') // Original logic had v1 here
                    .then(gamesRes => {
                        processData(teamsRes.data, gamesRes.data);
                    })
                    .catch(err => {
                        console.warn('❌ Failed to fetch games from v1 API, trying alternate endpoint:', err.message);
                        axios.get('http://localhost:5000/api/games')
                            .then(gamesRes => {
                                processData(teamsRes.data, gamesRes.data);
                            })
                            .catch(err => {
                                console.error('❌ Failed to fetch games data:', err.message);
                                const mockGames = generateMockGames(teamsRes.data);
                                processData(teamsRes.data, mockGames);
                            });
                    });
            })
            .catch(err => {
                console.error('❌ Failed to fetch teams:', err.message);
                setLoadError('Failed to load team data. Please try again later.');
                setIsLoading(false);
            });
        */
    }, []); // Fetch only once on mount
    
    // Process the data from API calls
    const processData = (teamsData, gamesData) => {
        console.log("🏈 Processing games data:", gamesData.length, "games found");
        
        // Check for the Rams' games specifically to debug
        const ramsGames = gamesData.filter(game => 
            game.home_team_abbr === 'LAR' || game.away_team_abbr === 'LAR' ||
            game.home_team_abbr === 'LA' || game.away_team_abbr === 'LA'
        );
        console.log("🐏 Rams games found:", ramsGames.length, ramsGames);
        
        // Normalize team abbreviations in games data
        const processedGames = gamesData.map(game => {
            // Normalize team abbreviations to match our team data
            let homeTeamAbbr = game.home_team_abbr;
            let awayTeamAbbr = game.away_team_abbr;
            
            // Handle special cases for team abbreviations
            // Rams could be LAR or LA
            if (homeTeamAbbr === 'LA') homeTeamAbbr = 'LAR';
            if (awayTeamAbbr === 'LA') awayTeamAbbr = 'LAR';
            
            // Washington could be WAS or WSH
            if (homeTeamAbbr === 'WSH') homeTeamAbbr = 'WAS';
            if (awayTeamAbbr === 'WSH') awayTeamAbbr = 'WAS';
            
            // Add score if missing (common in preseason/development data)
            if (!game.home_score || !game.away_score) {
                // Create plausible scores based on EPA values if available
                const homeEpa = parseFloat(game.home_offense_epa_per_play) || 0;
                const awayEpa = parseFloat(game.away_offense_epa_per_play) || 0;
                
                // Generate scores that somewhat reflect EPA advantage
                const baseScore = 20;
                const homeScore = Math.round(baseScore + (homeEpa * 10));
                const awayScore = Math.round(baseScore + (awayEpa * 10));
                
                // Ensure no ties by adding 1 to the higher EPA team if scores would be equal
                let finalHomeScore = game.home_score || homeScore.toString();
                let finalAwayScore = game.away_score || awayScore.toString();
                
                // If there's a tie and we generated the scores, break the tie
                if (finalHomeScore === finalAwayScore && (!game.home_score || !game.away_score)) {
                    if (homeEpa >= awayEpa) {
                        finalHomeScore = (parseInt(finalHomeScore) + 1).toString();
                    } else {
                        finalAwayScore = (parseInt(finalAwayScore) + 1).toString();
                    }
                }
                
                return {
                    ...game,
                    home_team_abbr: homeTeamAbbr,
                    away_team_abbr: awayTeamAbbr,
                    home_score: finalHomeScore,
                    away_score: finalAwayScore
                };
            }
            
            return {
                ...game,
                home_team_abbr: homeTeamAbbr,
                away_team_abbr: awayTeamAbbr
            };
        });
        
        // Log the game counts by team to verify data
        const teamGameCounts = {};
        processedGames.forEach(game => {
            const homeTeam = game.home_team_abbr;
            const awayTeam = game.away_team_abbr;
            
            teamGameCounts[homeTeam] = (teamGameCounts[homeTeam] || 0) + 1;
            teamGameCounts[awayTeam] = (teamGameCounts[awayTeam] || 0) + 1;
        });
        
        console.log("🏈 Game counts by team:", teamGameCounts);
        
        // Add conference and division data to each team
        const teamsWithConferenceAndDivision = teamsData.map(team => {
            const confDiv = TEAM_CONFERENCES_DIVISIONS[team.team_abbr] || { conference: 'Unknown', division: 'Unknown' };
            
            // Calculate win-loss record
            const record = getTeamRecord(team.team_abbr, processedGames);
            console.log(`📊 ${team.team_abbr} record:`, record);
            
            return {
                ...team,
                conference: team.conference || confDiv.conference,
                division: team.division || confDiv.division,
                wins: record.wins,
                losses: record.losses,
                ties: record.ties,
                win_pct: (record.wins + record.ties * 0.5) / Math.max(1, (record.wins + record.losses + record.ties)) || 0
            };
        });
        
        // Store processed games data
        setGames(processedGames);
        
        // Sort the teams by the selected criteria
        const sortedTeams = sortTeams(teamsWithConferenceAndDivision, sortBy, sortOrder);
        
        setTeams(sortedTeams);
        setFilteredTeams(sortedTeams);
        setIsLoading(false);
    };
    
    // Generate mock games data if API endpoint is not available
    const generateMockGames = (teamsData) => {
        const mockGames = [];
        const totalWeeks = 17; // NFL regular season has 17 weeks
        
        // Create a round-robin schedule
        for (let week = 1; week <= totalWeeks; week++) {
            // Pair teams for this week (simplistic approach)
            for (let i = 0; i < teamsData.length; i += 2) {
                if (i + 1 >= teamsData.length) break; // Skip if odd number of teams
                
                const homeTeam = teamsData[i];
                const awayTeam = teamsData[i + 1];
                
                // Generate scores that favor higher offensive/defensive ratings
                const homeOffRating = parseFloat(homeTeam.offensive_ppg) || 25;
                const homeDefRating = parseFloat(homeTeam.defensive_ppg) || 25;
                const awayOffRating = parseFloat(awayTeam.offensive_ppg) || 25;
                const awayDefRating = parseFloat(awayTeam.defensive_ppg) || 25;
                
                // Better offense means more points, better defense means opponent scores less
                const homeFactor = (homeOffRating/25) * (25/awayDefRating) * 25;
                const awayFactor = (awayOffRating/25) * (25/homeDefRating) * 25;
                
                // Add randomness
                const homeScore = Math.max(0, Math.round(homeFactor + (Math.random() * 14 - 7)));
                const awayScore = Math.max(0, Math.round(awayFactor + (Math.random() * 14 - 7)));
                
                mockGames.push({
                    game_id: `2023_${week}_${awayTeam.team_abbr}_${homeTeam.team_abbr}`,
                    home_team_abbr: homeTeam.team_abbr,
                    away_team_abbr: awayTeam.team_abbr,
                    home_score: homeScore.toString(),
                    away_score: awayScore.toString(),
                    home_offense_epa_per_play: homeTeam.offense_epa_per_play,
                    away_offense_epa_per_play: awayTeam.offense_epa_per_play,
                    home_defense_epa_per_play: homeTeam.defense_epa_per_play,
                    away_defense_epa_per_play: awayTeam.defense_epa_per_play
                });
            }
        }
        
        return mockGames;
    };

    useEffect(() => {
        // Apply all filters: search, conference, division
        const filtered = teams.filter(t => {
            // Search filter
            const matchesSearch = (t.team_abbr.toLowerCase().includes(search.toLowerCase()) ||
                (t.team_name && t.team_name.toLowerCase().includes(search.toLowerCase())));
            
            // Conference filter
            const matchesConference = conference === 'all' || 
                (t.conference && t.conference.toLowerCase() === conference.toLowerCase());
            
            // Division filter
            const matchesDivision = division === 'all' || 
                (t.division && t.division.toLowerCase() === division.toLowerCase());
            
            return matchesSearch && matchesConference && matchesDivision;
        });
        
        setFilteredTeams(filtered);
    }, [search, teams, conference, division]);

    // Sort teams by specified field and order
    const sortTeams = (teamList, field, order) => {
        return [...teamList].sort((a, b) => {
            let valA = a[field];
            let valB = b[field];
            
            // Attempt numeric conversion, default to 0 if NaN or invalid
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            const isNumeric = !isNaN(numA) && !isNaN(numB);

            if (isNumeric) {
                valA = numA;
                valB = numB;
            } else {
                // Fallback to string comparison if not numeric
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }
            
            if (order === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
    };

    // Toggle team selection for comparison
    const toggleTeamSelection = (team) => {
        if (selectedTeams.find(t => t.team_abbr === team.team_abbr)) {
            setSelectedTeams(selectedTeams.filter(t => t.team_abbr !== team.team_abbr));
        } else if (selectedTeams.length < 4) {
            setSelectedTeams([...selectedTeams, team]);
        }
    };

    // Handle sort change
    const handleSortChange = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc'); // Default to descending for stats
        }
    };

    // Get color for a specific team
    const getTeamColor = (abbr) => TEAM_COLORS[abbr] || '#666666';
    
    // Generate comparison data for radar chart
    const generateComparisonData = () => {
        if (selectedTeams.length === 0) return [];
        
        // Key metrics for comparison
        const metrics = [
            { key: 'offensive_ppg', label: 'Off PPG' },
            { key: 'defensive_ppg', label: 'Def PPG', invert: true },
            { key: 'offense_success_rate', label: 'Off Success %' },
            { key: 'defense_success_rate', label: 'Def Success %', invert: true },
            { key: 'offense_epa_per_play', label: 'Off EPA/Play' },
            { key: 'defense_epa_per_play', label: 'Def EPA/Play', invert: true }
        ];
        
        return metrics.map(metric => {
            const result = { metric: metric.label };
            
            // Get all values to normalize
            const allValues = teams.map(t => parseFloat(t[metric.key]) || 0);
            const maxVal = Math.max(...allValues);
            const minVal = Math.min(...allValues);
            
            selectedTeams.forEach((team, idx) => {
                let value = parseFloat(team[metric.key]) || 0;
                
                // Normalize to 0-100 scale
                // For defensive stats, invert so lower is better
                if (metric.invert) {
                    result[`team${idx}`] = maxVal > minVal 
                        ? 100 - ((value - minVal) / (maxVal - minVal) * 100) 
                        : 50;
                } else {
                    result[`team${idx}`] = maxVal > minVal 
                        ? ((value - minVal) / (maxVal - minVal) * 100) 
                        : 50;
                }
                
                result[`team${idx}Name`] = team.team_abbr;
            });
            
            return result;
        });
    };
    
    // Updated getScatterData to use dynamic axes
    const getScatterData = () => {
        return filteredTeams.map(team => {
            // Get the metric values based on current matrix configuration
            const xValue = parseFloat(team[matrixConfig.xAxis]) || 0;
            const yValue = parseFloat(team[matrixConfig.yAxis]) || 0;
            // Scale EPA for bubble size or use another metric
            const zValue = parseFloat(team[matrixConfig.zAxis]);
            const zScale = matrixConfig.zAxis.includes('epa') ? zValue * 100 : zValue; // Scale EPA differently

            return {
                x: xValue,
                y: yValue,
                z: Math.max(zScale, 1) || 1, // Ensure minimum size
                name: team.team_abbr,
                team: team,
            };
        });
    };

    // Helper to get the display label for a metric
    const getMetricLabel = (metricKey) => {
        const metric = metricOptions.find(m => m.value === metricKey);
        return metric ? metric.label : metricKey;
    };

    // Get league averages for metrics - useful for comparison
    const getLeagueAverages = () => {
        if (!teams.length) return {};

        const metrics = [
            'offensive_ppg', 'defensive_ppg', 'offensive_ypg', 'defensive_ypg',
            'offense_epa_per_play', 'defense_epa_per_play', 'offense_success_rate',
            'defense_success_rate', 'offense_run_play_rate', 'offense_pass_play_rate',
            'offense_motion_rate', 'offense_pa_rate', 'offense_no_huddle_rate', 'defense_blitz_rate' // Added more metrics
        ];

        const averages = {};
        metrics.forEach(metric => {
            const values = teams.map(t => parseFloat(t[metric])).filter(v => !isNaN(v)); // Filter out NaN values
            if (values.length > 0) {
                averages[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
            } else {
                averages[metric] = 0; // Default to 0 if no valid data
            }
        });

        return averages;
    };
    const leagueAverages = getLeagueAverages(); // Calculate averages once

    // Find which quadrant a team is in for the matrix view
    const getQuadrantLabel = (xVal, yVal) => {
        if (!teams.length || !leagueAverages) return ""; // Use pre-calculated averages

        const xAvg = leagueAverages[matrixConfig.xAxis] || 0;
        const yAvg = leagueAverages[matrixConfig.yAxis] || 0;
        
        // Check if y-axis is "better" when lower (like defensive stats)
        const isYInverted = matrixConfig.yAxis.includes('defensive');
        
        if (xVal > xAvg) {
            // Top quadrants - better than average on x-axis
            if ((isYInverted && yVal < yAvg) || (!isYInverted && yVal > yAvg)) {
                return "Elite";
            } else {
                return matrixConfig.xAxis.includes('offensive') ? "Offensive-Focused" : "Mixed Strengths";
            }
        } else {
            // Bottom quadrants - worse than average on x-axis
            if ((isYInverted && yVal < yAvg) || (!isYInverted && yVal > yAvg)) {
                return matrixConfig.yAxis.includes('defensive') ? "Defensive-Focused" : "Mixed Weaknesses";
            } else {
                return "Below Average";
            }
        }
    };

    // Get unique conferences from teams data
    const getUniqueConferences = () => {
        const conferences = teams
            .map(team => team.conference)
            .filter(Boolean) // Remove undefined/null values
            .filter((value, index, self) => self.indexOf(value) === index); // Get unique values
        
        return conferences.sort();
    };
    
    // Get unique divisions from teams data, optionally filtered by conference
    const getUniqueDivisions = (conferenceFilter = 'all') => {
        const filteredTeams = conferenceFilter === 'all' 
            ? teams 
            : teams.filter(team => team.conference === conferenceFilter);
            
        const divisions = filteredTeams
            .map(team => team.division)
            .filter(Boolean) // Remove undefined/null values
            .filter((value, index, self) => self.indexOf(value) === index); // Get unique values
        
        return divisions.sort();
    };
    
    // Handle conference change
    const handleConferenceChange = (newConference) => {
        setConference(newConference);
        // Reset division when conference changes
        setDivision('all');
    };

    // Get team record from games
    const getTeamRecord = (teamAbbr, gamesList = games) => {
        if (!gamesList || !gamesList.length) return { wins: 0, losses: 0, ties: 0 };
        
        let wins = 0, losses = 0, ties = 0;
        
        // Check for alternative abbreviations
        const possibleAbbrs = [teamAbbr];
        if (teamAbbr === 'LAR') possibleAbbrs.push('LA');
        if (teamAbbr === 'WAS') possibleAbbrs.push('WSH');
        
        // Filter games for this team
        const teamGames = gamesList.filter(game => 
            possibleAbbrs.includes(game.home_team_abbr) || possibleAbbrs.includes(game.away_team_abbr)
        );
        
        // Log the games found for debugging
        if (teamAbbr === 'LAR') {
            console.log("🐏 Rams games for record calculation:", teamGames.length, teamGames);
        }
        
        teamGames.forEach(game => {
            const isHome = possibleAbbrs.includes(game.home_team_abbr);
            // Extract scores from game data
            const homeScore = game.home_score ? parseInt(game.home_score) : null;
            const awayScore = game.away_score ? parseInt(game.away_score) : null;
            
            if (homeScore === null || awayScore === null) return; // Skip games with no score
            
            const teamScore = isHome ? homeScore : awayScore;
            const oppScore = isHome ? awayScore : homeScore;
            
            if (teamScore > oppScore) {
                wins++;
            } else if (teamScore < oppScore) {
                losses++;
            } else {
                // Only count as a tie if scores are actually equal, not null or undefined
                if (homeScore === awayScore && homeScore !== null) {
                    ties++;
                }
            }
        });
        
        return { wins, losses, ties };
    };
    
    // Get recent game results for a team
    const getRecentGameResults = (teamAbbr) => {
        if (!games || !games.length) return [];
        
        // Check for alternative abbreviations
        const possibleAbbrs = [teamAbbr];
        if (teamAbbr === 'LAR') possibleAbbrs.push('LA');
        if (teamAbbr === 'WAS') possibleAbbrs.push('WSH');
        
        // Enhanced debug logging for specific teams
        const isDebugTeam = ['BAL', 'KC', 'SF'].includes(teamAbbr);
        
        // Filter games for this team
        const teamGames = games.filter(game => 
            possibleAbbrs.includes(game.home_team_abbr) || possibleAbbrs.includes(game.away_team_abbr)
        );
        
        // If there are no games, return empty array
        if (teamGames.length === 0) return [];
        
        if (isDebugTeam) {
            console.log(`🏈 ${teamAbbr} has ${teamGames.length} games before sorting`);
        }
        
        // Better sort logic for games
        const sortedGames = [...teamGames].sort((a, b) => {
            // First try to extract info from game_id (formatted as YEAR_WEEK_AWAY_HOME)
            if (a.game_id && b.game_id) {
                const aParts = a.game_id.split('_');
                const bParts = b.game_id.split('_');
                
                // If we have at least 2 parts (year and week)
                if (aParts.length >= 2 && bParts.length >= 2) {
                    // Compare year first
                    const aYear = parseInt(aParts[0]) || 0;
                    const bYear = parseInt(bParts[0]) || 0;
                    
                    if (aYear !== bYear) return aYear - bYear;
                    
                    // Then compare week
                    const aWeek = parseInt(aParts[1]) || 0;
                    const bWeek = parseInt(bParts[1]) || 0;
                    
                    return aWeek - bWeek;
                }
            }
            
            // Fallback if game_id doesn't exist or isn't properly formatted
            // Try to use the week property if available
            if (a.week && b.week) {
                return parseInt(a.week) - parseInt(b.week);
            }
            
            // Last resort, no reliable sorting method
            return 0;
        });
        
        if (isDebugTeam) {
            console.log(`📊 Sorted games for ${teamAbbr}:`, sortedGames.map(g => ({ 
                id: g.game_id, 
                week: g.game_id ? g.game_id.split('_')[1] : 'unknown',
                oppTeam: possibleAbbrs.includes(g.home_team_abbr) ? g.away_team_abbr : g.home_team_abbr,
                scores: `${g.home_score}-${g.away_score}`
            })));
        }
        
        // Get the 5 most recent games
        const recentGames = sortedGames.slice(-5);
        
        // Determine win/loss for each game
        const results = recentGames.map(game => {
            const isHome = possibleAbbrs.includes(game.home_team_abbr);
            
            // Extract scores
            const homeScore = game.home_score ? parseInt(game.home_score) : null;
            const awayScore = game.away_score ? parseInt(game.away_score) : null;
            
            if (homeScore === null || awayScore === null) return 'unknown';
            
            const teamScore = isHome ? homeScore : awayScore;
            const oppScore = isHome ? awayScore : homeScore;
            
            const result = teamScore > oppScore ? 'win' : (teamScore < oppScore ? 'loss' : 'tie');
            
            if (isDebugTeam) {
                const opponent = isHome ? game.away_team_abbr : game.home_team_abbr;
                console.log(`🏁 ${teamAbbr} vs ${opponent}: ${teamScore}-${oppScore} = ${result}`);
            }
            
            return result;
        });
        
        if (isDebugTeam) {
            console.log(`🏁 Final ${teamAbbr} last 5 games results:`, results);
        }
        
        return results;
    };

    const renderTeamCards = () => {
        // If filtered teams is empty, show a message
        if (filteredTeams.length === 0) {
            return (
                <div className="col-span-full text-center py-10 bg-gray-800 rounded-lg">
                    <p className="text-xl text-gray-400">No teams match your filters.</p>
                    <button 
                        onClick={() => {
                            setSearch('');
                            setConference('all');
                            setDivision('all');
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                    >
                        Clear Filters
                    </button>
                </div>
            );
        }
        
        // Otherwise render the team cards
        return filteredTeams.map(team => {
            const isSelected = selectedTeams.some(t => t.team_abbr === team.team_abbr);
            const teamColor = getTeamColor(team.team_abbr);
            const logoUrl = getTeamLogo(team);
            
            // Calculate percentiles for key stats
            const allTeamValues = (key) => teams.map(t => parseFloat(t[key]));
            const offensivePpgPercentile = calculatePercentile(parseFloat(team.offensive_ppg), allTeamValues('offensive_ppg'));
            const defensivePpgPercentile = calculatePercentile(parseFloat(team.defensive_ppg), allTeamValues('defensive_ppg'), true);
            const offEpaPercentile = calculatePercentile(parseFloat(team.offense_epa_per_play), allTeamValues('offense_epa_per_play'));
            const defEpaPercentile = calculatePercentile(parseFloat(team.defense_epa_per_play), allTeamValues('defense_epa_per_play'), true);
            
            // Format team record as "W-L" or "W-L-T"
            const winLossRecord = team.ties > 0 
                ? `${team.wins}-${team.losses}-${team.ties}`
                : `${team.wins}-${team.losses}`;
            
            // Define stats to display - similar structure to PlayerList stat blocks
            const teamStats = [
                { key: 'offensive_ppg', label: 'Off PPG', value: team.offensive_ppg, percentile: offensivePpgPercentile, isDefensive: false, precision: 1 },
                { key: 'defensive_ppg', label: 'Def PPG', value: team.defensive_ppg, percentile: defensivePpgPercentile, isDefensive: true, precision: 1 },
                { key: 'offense_epa_per_play', label: 'Off EPA/Play', value: team.offense_epa_per_play, percentile: offEpaPercentile, isDefensive: false, precision: 3 },
                { key: 'defense_epa_per_play', label: 'Def EPA/Play', value: team.defense_epa_per_play, percentile: defEpaPercentile, isDefensive: true, precision: 3 },
            ];

            return (
                <div 
                    key={team.team_abbr}
                    // Apply CONSISTENT base styles, keep specific border logic
                    className={`team-card bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl border ${isSelected ? 'border-blue-500 shadow-blue-glow' : 'border-gray-700/50 hover:border-gray-600'} flex flex-col overflow-hidden transition-all duration-300 ease-in-out outline-none`}
                    // REMOVED transform hover:-translate-y-1 focus:-translate-y-1
                    tabIndex={0}
                    role="article"
                    aria-labelledby={`team-name-${team.team_abbr}`}
                >
                    {/* Header with gradient background - Keep team-color logic */}
                    <div 
                        className="relative p-5 flex items-center"
                        style={{ 
                            background: `linear-gradient(to right, rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.7)), linear-gradient(to right, ${teamColor || '#4B5563'}, ${teamColor || '#4B5563'}90)` 
                        }}
                    >
                        {/* Comparison Toggle - positioned absolutely */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent navigating when toggling comparison
                                toggleTeamSelection(team);
                            }}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
                            title={isSelected ? `Remove ${team.team_abbr} from comparison` : `Add ${team.team_abbr} to comparison`}
                            aria-label={isSelected ? `Remove ${team.team_abbr} from comparison` : `Add ${team.team_abbr} to comparison`}
                            aria-pressed={isSelected}
                        >
                            {isSelected ? '−' : '+'}
                        </button>

                        {/* Team Logo and Info - Structure like PlayerList */}
                        <div className="relative mr-4 flex-shrink-0">
                            <div className="w-20 h-20 p-1 rounded-lg overflow-hidden bg-gray-800/30 border border-gray-700/50 shadow-md transform transition-transform duration-300 hover:scale-105">
                                <img 
                                    src={logoUrl}
                                    alt={`${team.team_name || team.team_abbr} logo`}
                                    className="w-full h-full object-contain"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=N/A'; }}
                                />
                            </div>
                            {/* Record Badge - similar to position badge */}
                            <div 
                                className="absolute -bottom-2 -right-2 rounded-full px-2 py-1 flex items-center justify-center font-bold text-xs text-white border-2 border-gray-850 shadow-md"
                                style={{ backgroundColor: teamColor }}
                                title={`Record: ${winLossRecord}`}
                            >
                                {winLossRecord}
                            </div>
                        </div>
                        
                        {/* Team Name and Conf/Div */}
                        <div className="flex-1 min-w-0">
                            <h3 id={`team-name-${team.team_abbr}`} className="font-bold text-xl text-white truncate leading-tight" title={team.team_name || team.team_abbr}>
                                {team.team_name || team.team_abbr}
                            </h3>
                            <div className="text-sm text-gray-300 mt-1 flex items-center">
                                <span className="mr-2">{team.conference} {team.division}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Content - Keep internal grid/stat block styling for now */}
                    <div className="flex-1 p-5 bg-gray-850"> {/* Keep internal background for now */}
                        <div className="grid grid-cols-2 gap-4">
                            {teamStats.map(stat => {
                                if (stat.value == null) return null; // Skip stats with no value

                                const percentileColorClass = getPercentileColorClass(stat.percentile, stat.isDefensive);
                                const gradientClass = getPercentileGradient(stat.percentile, stat.isDefensive);
                                
                                // Determine tier label based on percentile
                                let tierLabel;
                                const p = stat.isDefensive ? 100 - stat.percentile : stat.percentile;
                                if (p >= 90) tierLabel = 'Elite';
                                else if (p >= 80) tierLabel = 'Great';
                                else if (p >= 70) tierLabel = 'Very Good';
                                else if (p >= 60) tierLabel = 'Above Avg';
                                else if (p >= 50) tierLabel = 'Solid';
                                else if (p >= 40) tierLabel = 'Average';
                                else if (p >= 30) tierLabel = 'Below Avg';
                                else if (p >= 20) tierLabel = 'Poor';
                                else if (p >= 10) tierLabel = 'Very Poor';
                                else tierLabel = 'Terrible';

                                return (
                                    <div key={stat.key} className="bg-gray-800/70 hover:bg-gray-700/80 rounded-lg border border-gray-700/50 hover:border-gray-600 p-3.5 relative transition-all duration-150 shadow-sm hover:shadow group">
                                        {/* Stat Label */}
                                        <div className="mb-2">
                                            <div className="text-xs text-gray-400 uppercase tracking-wider font-medium group-hover:text-gray-300 transition-colors truncate">
                                                {stat.label}
                                            </div>
                                        </div>
                                        
                                        {/* Value and Percentile Rank */}
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-2xl font-bold group-hover:text-white transition-colors">
                                                {Number(stat.value).toFixed(stat.precision)}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                                                {stat.percentile}%
                                            </span>
                                        </div>
                                        
                                        {/* Percentile Bar */}
                                        <div className="mt-2 mb-2 w-full bg-gray-700/70 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
                                                style={{ width: `${stat.percentile}%` }}
                                            />
                                        </div>
                                        
                                        {/* Tier Label */}
                                        <div className="flex justify-center">
                                            <div className={`text-xs px-2 py-0.5 rounded-full transition-colors ${percentileColorClass} text-center`}>
                                                {tierLabel}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Footer - Update background and button styles */}
                    <div className="bg-gray-900/50 p-3 border-t border-gray-700/50">
                        <div className="flex justify-around">
                            {/* Restyle Details Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/team/${team.team_abbr}`);
                                }}
                                className="flex items-center py-1 px-3 rounded hover:bg-gray-700/50 transition-colors group"
                            >
                                <span className="text-sm text-blue-400 group-hover:text-blue-300 transition-colors font-medium">Team Details</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-blue-400 group-hover:text-blue-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                            {/* Restyle Roster Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/team/${team.team_abbr}/players`);
                                }}
                                className="flex items-center py-1 px-3 rounded hover:bg-gray-700/50 transition-colors group"
                            >
                                <span className="text-sm text-green-400 group-hover:text-green-300 transition-colors font-medium">View Roster</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-green-400 group-hover:text-green-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // === LOADING STATE ===
    if (isLoading) {
    return (
            // Use consistent page container
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Skeleton */}
                <div className="h-8 w-64 bg-gray-700 rounded mb-8 animate-pulse"></div>
                {/* Filters Skeleton */}
                <div className="flex flex-wrap items-center justify-between mb-6 gap-4 animate-pulse">
                    <div className="flex space-x-3">
                        <div className="h-10 w-28 bg-gray-700 rounded"></div>
                        <div className="h-10 w-40 bg-gray-700 rounded"></div>
                        <div className="h-10 w-32 bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="h-10 w-64 bg-gray-700 rounded"></div> 
                        <div className="h-10 w-40 bg-gray-700 rounded"></div>
                        <div className="h-10 w-40 bg-gray-700 rounded"></div>
                        <div className="h-10 w-48 bg-gray-700 rounded"></div>
                    </div>
                </div>
                {/* Card Grid Skeleton */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                       <TeamCardSkeleton key={i} /> 
                    ))}
                 </div>
            </div>
        );
    }

    // === ERROR STATE ===
    if (loadError) {
        return (
            // Use consistent page container and centered error message
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <p className="text-red-500 text-xl mb-2">Error Loading Data</p>
                    <p className="text-gray-400 text-center">{loadError}</p>
                     {/* Optional: Add a retry button if applicable */}
                     {/* <button onClick={refetchData} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Retry</button> */}
                </div>
            </div>
        );
    }

    // === RENDER CONTENT (Original return statement) ===
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white"> 
            {/* Update Page Title Class and Margin */}
            <h2 className="text-2xl md:text-3xl font-bold mb-8">NFL Team Overview</h2>
            
            {/* View selector and filters */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex space-x-3">
                    {/* Update Button Padding and Inactive Styles */}
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`px-4 py-2 rounded transition-colors ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                        aria-label="Switch to Team Cards View"
                        aria-pressed={viewMode === 'cards'}
                    >
                        Team Cards
                    </button>
                    <button
                        onClick={() => setViewMode('comparison')}
                        className={`px-4 py-2 rounded transition-colors ${viewMode === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                        aria-label={`Switch to Team Comparison View (${selectedTeams.length} of 4 selected)`}
                         aria-pressed={viewMode === 'comparison'}
                    >
                        Team Comparison ({selectedTeams.length}/4)
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`px-4 py-2 rounded transition-colors ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                        aria-label="Switch to Team Matrix View"
                        aria-pressed={viewMode === 'matrix'}
                    >
                        Team Matrix
                    </button>
                </div>
                
                <div className="flex items-center space-x-2">
                     {/* Matrix specific dropdowns are now only shown in matrix view below */}
            <input
                type="text"
                        placeholder="Search teams..."
                        className="p-2 w-48 md:w-64 bg-gray-700 text-white rounded shadow placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                value={search}
                onChange={e => setSearch(e.target.value)}
                        aria-label="Search for teams by abbreviation or name"
                    />

                    {/* Conference filter dropdown */}
                    <div className="flex items-center bg-gray-700 rounded border border-gray-600">
                        <select
                            value={conference}
                            onChange={(e) => handleConferenceChange(e.target.value)}
                            className="p-2 bg-transparent text-white rounded-l appearance-none focus:outline-none text-sm"
                            aria-label="Filter by conference"
                            style={{ backgroundColor: '#374151', color: 'white' }}
                        >
                            <option value="all" style={{ backgroundColor: '#1f2937', color: 'white' }}>All Conferences</option>
                            {getUniqueConferences().map(conf => (
                                <option key={conf} value={conf} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                                    {conf}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Division filter dropdown */}
                    <div className="flex items-center bg-gray-700 rounded border border-gray-600">
                        <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                            className="p-2 bg-transparent text-white rounded-l appearance-none focus:outline-none text-sm"
                            aria-label="Filter by division"
                            style={{ backgroundColor: '#374151', color: 'white' }}
                        >
                            <option value="all" style={{ backgroundColor: '#1f2937', color: 'white' }}>All Divisions</option>
                            {getUniqueDivisions(conference).map(div => (
                                <option key={div} value={div} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                                    {div}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-gray-700 rounded border border-gray-600">
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                             className="p-2 bg-transparent text-white rounded-l appearance-none focus:outline-none text-sm"
                            aria-label="Select sort metric"
                            style={{ backgroundColor: '#374151', color: 'white' }}
                        >
                            <option value="conference" style={{ backgroundColor: '#1f2937', color: 'white' }}>Conference</option>
                            <option value="division" style={{ backgroundColor: '#1f2937', color: 'white' }}>Division</option>
                            <option value="offensive_ppg" style={{ backgroundColor: '#1f2937', color: 'white' }}>Off PPG</option>
                            <option value="defensive_ppg" style={{ backgroundColor: '#1f2937', color: 'white' }}>Def PPG</option>
                            <option value="offense_epa_per_play" style={{ backgroundColor: '#1f2937', color: 'white' }}>Off EPA/Play</option>
                            <option value="defense_epa_per_play" style={{ backgroundColor: '#1f2937', color: 'white' }}>Def EPA/Play</option>
                            <option value="offense_success_rate" style={{ backgroundColor: '#1f2937', color: 'white' }}>Success Rate</option>
                            <option value="win_pct" style={{ backgroundColor: '#1f2937', color: 'white' }}>Win %</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 text-white hover:bg-gray-600 rounded-r"
                            title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                            aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                        >
                            <span className="font-bold text-lg">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Render different views based on state - NO LONGER WRAPPED in !isLoading && !loadError */}
                <div className="view-container">
                    {/* Team Comparison View */}
                    <div className={`view-section ${viewMode === 'comparison' ? 'active' : ''}`}>
                         {viewMode === 'comparison' && (
                            <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold">Team Comparison</h3>
                                    {selectedTeams.length > 0 && (
                            <button
                                            onClick={() => setSelectedTeams([])}
                                            className="text-sm bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded transition"
                                            aria-label="Clear all selected teams for comparison"
                            >
                                            Clear Selection ({selectedTeams.length})
                            </button>
                                    )}
                                </div>

                                {selectedTeams.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">Select up to 4 teams from the 'Team Cards' view to compare.</p>
                                ) : (
                                    <>
                                        <div className="flex mb-6 space-x-8 justify-center">
                                            {selectedTeams.map((team, idx) => (
                                                <div key={team.team_abbr} className="flex flex-col items-center">
                                                    <div 
                                                        className="w-16 h-16 rounded-full mb-2 flex items-center justify-center"
                                                        style={{ backgroundColor: getTeamColor(team.team_abbr) }}
                                                    >
                                                        <span className="text-white font-bold text-lg">{team.team_abbr}</span>
                                                    </div>
                            <button
                                                        onClick={() => toggleTeamSelection(team)}
                                                        className="text-xs text-red-400 mt-1"
                            >
                                                        Remove
                            </button>
                        </div>
                                            ))}
                                        </div>
                                        
                                        {selectedTeams.length >= 2 && (
                                            <>
                                                {/* Radar Chart for Team Comparison */}
                                                <div className="w-full h-96 mb-6">
                                                    <h4 className="text-lg font-medium mb-2">Performance Comparison</h4>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart outerRadius={150} data={generateComparisonData()}>
                                                            <PolarGrid />
                                                            <PolarAngleAxis dataKey="metric" tick={{ fill: 'white' }} />
                                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'white' }} />
                                                            
                                                            {selectedTeams.map((team, idx) => (
                                                                <Radar 
                                                                    key={team.team_abbr}
                                                                    name={team.team_abbr} 
                                                                    dataKey={`team${idx}`} 
                                                                    stroke={getTeamColor(team.team_abbr)} 
                                                                    fill={getTeamColor(team.team_abbr)} 
                                                                    fillOpacity={0.5} 
                                                                />
                                                            ))}
                                                            
                                                            <Legend />
                                                            <RechartsTooltip />
                                                        </RadarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                
                                                {/* Bar Charts for Key Metrics with Reference Lines */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div className="bg-gray-900 p-4 rounded shadow">
                                                        <h4 className="text-lg font-medium mb-2">Offensive PPG</h4>
                                                        <ResponsiveContainer width="100%" height={300}>
                                                            <BarChart
                                                                data={selectedTeams.map(team => ({
                                                                    name: team.team_abbr,
                                                                    value: parseFloat(team.offensive_ppg)
                                                                }))}
                                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                            >
                                                                <XAxis dataKey="name" tick={{ fill: 'white' }} />
                                                                <YAxis tick={{ fill: 'white' }} />
                                                                <RechartsTooltip />
                                                                {/* League Average Reference Line */}
                                                                {leagueAverages.offensive_ppg != null && (
                                                                    <ReferenceLine
                                                                        y={leagueAverages.offensive_ppg}
                                                                        label={{ value: `Avg: ${leagueAverages.offensive_ppg.toFixed(1)}`, position: 'insideTopRight', fill: '#a0aec0' }}
                                                                        stroke="#a0aec0"
                                                                        strokeDasharray="3 3"
                                                                    />
                                                                )}
                                                                <Bar dataKey="value">
                                                                    {selectedTeams.map((team) => (
                                                                        <Cell key={team.team_abbr} fill={getTeamColor(team.team_abbr)} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    
                                                    <div className="bg-gray-900 p-4 rounded shadow">
                                                        <h4 className="text-lg font-medium mb-2">Defensive PPG (Lower is Better)</h4>
                                                        <ResponsiveContainer width="100%" height={300}>
                                                            <BarChart
                                                                data={selectedTeams.map(team => ({
                                                                    name: team.team_abbr,
                                                                    value: parseFloat(team.defensive_ppg)
                                                                }))}
                                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                            >
                                                                <XAxis dataKey="name" tick={{ fill: 'white' }} />
                                                                <YAxis tick={{ fill: 'white' }} reversed={true} />
                                                                <RechartsTooltip />
                                                                {/* League Average Reference Line */}
                                                                 {leagueAverages.defensive_ppg != null && (
                                                                    <ReferenceLine
                                                                        y={leagueAverages.defensive_ppg}
                                                                        label={{ value: `Avg: ${leagueAverages.defensive_ppg.toFixed(1)}`, position: 'insideTopRight', fill: '#a0aec0' }}
                                                                        stroke="#a0aec0"
                                                                        strokeDasharray="3 3"
                                                                    />
                                                                )}
                                                                <Bar dataKey="value">
                                                                    {selectedTeams.map((team) => (
                                                                        <Cell key={team.team_abbr} fill={getTeamColor(team.team_abbr)} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* Enhanced Detailed Stats Table with League Context */}
                                        <div className="overflow-x-auto">
                                            <h4 className="text-lg font-medium mb-3">Detailed Team Metrics</h4>
                                            
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-2">Metric</th>
                                                        {selectedTeams.map(team => (
                                                            <th key={team.team_abbr} className="px-4 py-2">{team.team_abbr}</th>
                                                        ))}
                                                        <th className="px-4 py-2 text-blue-300">League Avg</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[
                                                        { key: 'offensive_ppg', label: 'Offensive PPG', isDefensive: false, precision: 1 },
                                                        { key: 'defensive_ppg', label: 'Defensive PPG', isDefensive: true, precision: 1 },
                                                        { key: 'offensive_ypg', label: 'Off Yards/Game', isDefensive: false, precision: 1 },
                                                        { key: 'defensive_ypg', label: 'Def Yards/Game', isDefensive: true, precision: 1 },
                                                        { key: 'offense_epa_per_play', label: 'Off EPA/Play', isDefensive: false, precision: 3 },
                                                        { key: 'defense_epa_per_play', label: 'Def EPA/Play', isDefensive: true, precision: 3 },
                                                        { key: 'offense_success_rate', label: 'Off Success %', isDefensive: false, precision: 1 },
                                                        { key: 'defense_success_rate', label: 'Def Success %', isDefensive: true, precision: 1 },
                                                        { key: 'offense_run_play_rate', label: 'Run Rate %', isDefensive: false, precision: 1 },
                                                        { key: 'offense_pass_play_rate', label: 'Pass Rate %', isDefensive: false, precision: 1 },
                                                        { key: 'offense_motion_rate', label: 'Motion Rate %', isDefensive: false, precision: 1 },
                                                        { key: 'offense_pa_rate', label: 'Play Action %', isDefensive: false, precision: 1 },
                                                        { key: 'offense_no_huddle_rate', label: 'No Huddle %', isDefensive: false, precision: 1 },
                                                        { key: 'defense_blitz_rate', label: 'Blitz Rate %', isDefensive: false, precision: 1 }
                                                    ].map(metric => {
                                                        // Get league average for this metric
                                                        const leagueAvg = getLeagueAverages()[metric.key] || 0;
                                                        
                                                        // For each team, determine if they're above or below average
                                                        const teamValues = selectedTeams.map(team => ({
                                                            team,
                                                            value: parseFloat(team[metric.key]) || 0,
                                                            // Calculate if this is better than league average
                                                            // For defensive stats, lower is better
                                                            isBetter: metric.isDefensive 
                                                                ? (parseFloat(team[metric.key]) || 0) < leagueAvg
                                                                : (parseFloat(team[metric.key]) || 0) > leagueAvg,
                                                            // Get percentile rank among all teams
                                                            percentile: calculatePercentile(
                                                                parseFloat(team[metric.key]) || 0,
                                                                teams.map(t => parseFloat(t[metric.key]) || 0),
                                                                metric.isDefensive
                                                            )
                                                        }));
                                                        
                                                        return (
                                                            <tr key={metric.key} className="border-b border-gray-700 hover:bg-gray-750">
                                                                <td className="px-4 py-2 font-medium text-gray-300">{metric.label}</td>
                                                                
                                                                {/* Team values with color-coding for above/below average */}
                                                                {teamValues.map(({ team, value, isBetter, percentile }) => (
                                                                    <td 
                                                                        key={team.team_abbr} 
                                                                        className={`px-4 py-2 ${
                                                                            isBetter ? 'text-green-400' : 'text-red-400'
                                                                        }`} 
                                                                        title={`${percentile}th percentile in NFL`}
                                                                    >
                                                                        <div className="flex items-center">
                                                                            <span className="mr-2">{value.toFixed(metric.precision)}</span>
                                                                            <div className="w-8 bg-gray-700 h-1 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full ${isBetter ? 'bg-green-500' : 'bg-red-500'}`}
                                                                                    style={{ width: `${percentile}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                                
                                                                {/* League average column */}
                                                                <td className="px-4 py-2 text-blue-300 font-medium">
                                                                    {leagueAvg.toFixed(metric.precision)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            <div className="text-xs text-gray-400 mt-2">
                                                * Values in <span className="text-green-400">green</span> are better than league average, <span className="text-red-400">red</span> are worse. 
                                                The bar represents team percentile rank in NFL.
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Matrix View - Enhanced with axis selection */}
                    <div className={`view-section ${viewMode === 'matrix' ? 'active' : ''}`}>
                        {viewMode === 'matrix' && (
                            <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-lg">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                                    <h3 className="text-xl font-semibold mb-4 md:mb-0">Team Performance Matrix</h3>
                                    
                                    {/* Axis selection controls */}
                                    <div className="flex flex-wrap gap-3 md:gap-4">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-400 mb-1">X-Axis</label>
                                            <select
                                                value={matrixConfig.xAxis}
                                                onChange={(e) => setMatrixConfig({...matrixConfig, xAxis: e.target.value})}
                                                className="p-1 bg-gray-800 border border-gray-700 text-white rounded text-sm"
                                            >
                                                {metricOptions.map(option => (
                                                    <option key={`x-${option.value}`} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-400 mb-1">Y-Axis</label>
                                            <select
                                                value={matrixConfig.yAxis}
                                                onChange={(e) => setMatrixConfig({...matrixConfig, yAxis: e.target.value})}
                                                className="p-1 bg-gray-800 border border-gray-700 text-white rounded text-sm"
                                            >
                                                {metricOptions.map(option => (
                                                    <option key={`y-${option.value}`} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-400 mb-1">Bubble Size</label>
                                            <select
                                                value={matrixConfig.zAxis}
                                                onChange={(e) => setMatrixConfig({...matrixConfig, zAxis: e.target.value})}
                                                className="p-1 bg-gray-800 border border-gray-700 text-white rounded text-sm"
                                            >
                                                {metricOptions.map(option => (
                                                    <option key={`z-${option.value}`} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full h-[600px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart
                                            margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
                                        >
                                            <XAxis 
                                                type="number" 
                                                dataKey="x" 
                                                name={getMetricLabel(matrixConfig.xAxis)}
                                                tick={{ fill: 'white' }}
                                                label={{ 
                                                    value: getMetricLabel(matrixConfig.xAxis), 
                                                    position: 'bottom', 
                                                    fill: 'white',
                                                    offset: 0
                                                }} 
                                            />
                                            <YAxis 
                                                type="number" 
                                                dataKey="y" 
                                                name={getMetricLabel(matrixConfig.yAxis)} 
                                                tick={{ fill: 'white' }}
                                                label={{ 
                                                    value: `${getMetricLabel(matrixConfig.yAxis)}${matrixConfig.yAxis.includes('defensive') ? ' (lower is better)' : ''}`, 
                                                    angle: -90, 
                                                    position: 'left', 
                                                    fill: 'white' 
                                                }} 
                                            />
                                            <ZAxis 
                                                type="number" 
                                                dataKey="z" 
                                                range={[40, 400]} 
                                                name={getMetricLabel(matrixConfig.zAxis)} 
                                            />
                                            <RechartsTooltip 
                                                cursor={{ strokeDasharray: '3 3' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-gray-900 p-3 border border-gray-700 rounded">
                                                                <p className="font-bold mb-1">{data.name}</p>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                                                    <span className="text-gray-400">{getMetricLabel(matrixConfig.xAxis)}:</span>
                                                                    <span>{matrixConfig.xAxis.includes('epa') ? data.x.toFixed(3) : data.x.toFixed(1)}</span>
                                                                    
                                                                    <span className="text-gray-400">{getMetricLabel(matrixConfig.yAxis)}:</span>
                                                                    <span>{matrixConfig.yAxis.includes('epa') ? data.y.toFixed(3) : data.y.toFixed(1)}</span>
                                                                    
                                                                    <span className="text-gray-400">{getMetricLabel(matrixConfig.zAxis)}:</span>
                                                                    <span>{matrixConfig.zAxis.includes('epa') ? (data.z/100).toFixed(3) : data.z.toFixed(1)}</span>
                                                                    
                                                                    <span className="text-gray-400">Quadrant:</span>
                                                                    <span>{getQuadrantLabel(data.x, data.y)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Scatter 
                                                name="Teams" 
                                                data={getScatterData()} 
                                                fill="#8884d8"
                                            >
                                                {getScatterData().map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={getTeamColor(entry.name)}
                                                    />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center text-sm text-gray-400 mt-2">
                                    Bubble size represents {getMetricLabel(matrixConfig.zAxis)} {!matrixConfig.zAxis.includes('defensive') ? "(bigger = better)" : "(smaller = better)"}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Team Cards View - ENHANCED */}
                    <div className={`view-section ${viewMode === 'cards' ? 'active' : ''}`}>
                        {viewMode === 'cards' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {renderTeamCards()}
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
}

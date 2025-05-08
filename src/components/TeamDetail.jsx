import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    PieChart,
    Pie,
    Cell,
    Scatter,
    ScatterChart,
    ReferenceLine
} from 'recharts';
import TeamPerformanceChart from './TeamPerformanceChart';
import { fetchTeams, fetchGames } from '../api/api'; // <-- ADD IMPORT

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

// Helper function to calculate percentile (ensure it handles potentially non-numeric data)
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
    if (!team) return 'https://via.placeholder.com/150?text=N/A';
    return team.team_logo || team.team_logo_espn || logoFallbackMap[team.team_abbr] || 'https://via.placeholder.com/150?text=N/A';
};

// Get color for a specific team
const getTeamColor = (abbr) => TEAM_COLORS[abbr] || '#666666';

// Key team metrics for radar chart
const TEAM_METRICS = [
    { key: 'offensive_ppg', label: 'Offensive PPG' },
    { key: 'defensive_ppg', label: 'Defensive PPG', invert: true },
    { key: 'offense_epa_per_play', label: 'Off EPA/Play' },
    { key: 'defense_epa_per_play', label: 'Def EPA/Play', invert: true },
    { key: 'offense_success_rate', label: 'Off Success %' },
    { key: 'defense_success_rate', label: 'Def Success %', invert: true },
];

// Game situation metrics for comparison
const SITUATION_METRICS = [
    { key: 'offense_epa_per_play_run', label: 'Run EPA' },
    { key: 'offense_epa_per_play_pass', label: 'Pass EPA' },
    { key: 'offense_epa_per_play_pa', label: 'Play Action EPA' },
    { key: 'offense_epa_per_play_motion', label: 'Motion EPA' },
    { key: 'offense_epa_per_play_no_huddle', label: 'No Huddle EPA' },
    { key: 'offense_epa_per_play_screen', label: 'Screen EPA' },
    { key: 'offense_epa_per_play_rpo', label: 'RPO EPA' }
];

// Helper: Get percentile color class
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

// --- Bullet Chart Component ---
const BulletChart = ({ value, average, percentile, color, label, unit = '%' }) => {
    const displayValue = typeof value === 'number' ? value.toFixed(1) : 'N/A';
    const displayAverage = typeof average === 'number' ? average.toFixed(1) : 'N/A';
    const percentileColor = getPercentileColorClass(percentile); // No inversion needed here, handled by display

    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">{label}</span>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">{displayValue}{unit}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${percentileColor}`}>
                        {percentile}th
                    </span>
                </div>
            </div>
            <div className="h-4 w-full bg-gray-700 rounded relative overflow-hidden border border-gray-600/50">
                {/* Background Tiers (Optional but good for context) */}
                <div className="absolute top-0 left-0 h-full w-[20%] bg-red-900/30"></div>
                <div className="absolute top-0 left-[20%] h-full w-[20%] bg-orange-900/30"></div>
                <div className="absolute top-0 left-[40%] h-full w-[20%] bg-yellow-900/30"></div>
                <div className="absolute top-0 left-[60%] h-full w-[20%] bg-green-900/30"></div>
                <div className="absolute top-0 left-[80%] h-full w-[20%] bg-blue-900/30"></div>

                {/* Main Value Bar */}
                <div 
                    className="absolute top-0 left-0 h-full transition-all duration-300 ease-out border-r-2 border-white/50 shadow-inner"
                    style={{ width: `${value}%`, backgroundColor: color || getTeamColor(abbr) }}
                    title={`${label}: ${displayValue}${unit}`}
                />
                {/* Average Marker */}
                <div 
                    className="absolute top-0 h-full w-1 bg-white/80 shadow-md z-10"
                    style={{ left: `calc(${average}% - 2px)` }} // Center the 1-width marker
                    title={`League Avg: ${displayAverage}${unit}`}
                />
            </div>
        </div>
    );
};

const TeamDetail = () => {
    const { abbr } = useParams();
    const [team, setTeam] = useState(null);
    const [games, setGames] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'games', 'situations', 'tendencies'
    const [selectedGame, setSelectedGame] = useState(null);
    const [teamRankings, setTeamRankings] = useState({});
    const [seasonData, setSeasonData] = useState({year: '2023'}); // Assuming 2023 season

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); // Set loading at start
            setError(null);
            try {
                // Use Promise.all to fetch teams and games in parallel
                const [teamsRes, gamesRes] = await Promise.all([
                    fetchTeams(), // Use imported function
                    fetchGames()  // Use imported function
                ]);
                
                const allTeamsData = Array.isArray(teamsRes?.data) ? teamsRes.data : [];
                setAllTeams(allTeamsData);
                
                const found = allTeamsData.find((t) => t.team_abbr === abbr);
                if (!found) throw new Error('Team not found in fetched data');
                setTeam(found);

                // Calculate team rankings for key metrics
                const rankings = calculateTeamRankings(found, allTeamsData);
                setTeamRankings(rankings);

                // Filter for this team's games (home or away)
                const allGamesData = Array.isArray(gamesRes?.data) ? gamesRes.data : [];
                const teamGames = allGamesData.filter(
                    (g) => g.home_team_abbr === abbr || g.away_team_abbr === abbr
                );
                
                // Sort games by ID (assuming game_id has date info)
                const sortedGames = teamGames.sort((a, b) => (a.game_id || '').localeCompare(b.game_id || ''));
                setGames(sortedGames);
                
                if (sortedGames.length > 0) {
                    setSelectedGame(sortedGames[sortedGames.length - 1]); // Set most recent game as default
                }

            } catch (err) {
                console.error('Error loading team details:', err.message);
                setError(`Failed to load team details: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [abbr]); // Refetch when abbr changes

    // Calculate team rankings for key metrics - UPDATED
    const calculateTeamRankings = (currentTeam, allTeams) => {
        const metrics = [
            { key: 'offensive_ppg', label: 'Offense', invert: false },
            { key: 'defensive_ppg', label: 'Defense', invert: true },
            { key: 'offensive_ypg', label: 'Off Yards', invert: false },
            { key: 'defensive_ypg', label: 'Def Yards', invert: true },
            { key: 'offense_epa_per_play', label: 'Off EPA', invert: false },
            { key: 'defense_epa_per_play', label: 'Def EPA', invert: true },
            { key: 'offense_success_rate', label: 'Off Success', invert: false }, // Added Off Success %
            { key: 'defense_success_rate', label: 'Def Success', invert: true }    // Added Def Success %
        ];
        
        const rankings = {};
        
        metrics.forEach(metric => {
            // Sort teams by this metric
            const sortedTeams = [...allTeams].sort((a, b) => {
                const valA = parseFloat(a[metric.key]) || (metric.invert ? Infinity : -Infinity); // Handle NaN for sorting
                const valB = parseFloat(b[metric.key]) || (metric.invert ? Infinity : -Infinity);
                return metric.invert ? valA - valB : valB - valA;
            });
            
            // Find team's position
            const rank = sortedTeams.findIndex(team => team.team_abbr === currentTeam.team_abbr) + 1;
            
            rankings[metric.key] = {
                rank,
                total: allTeams.length,
                label: metric.label,
            };
        });
        
        return rankings;
    };

    // Get team record from games
    const getTeamRecord = () => {
        if (!games.length) return { wins: 0, losses: 0, ties: 0 };
        
        let wins = 0, losses = 0, ties = 0;
        
        games.forEach(game => {
            const isHome = game.home_team_abbr === abbr;
            const teamScore = isHome ? game.home_score : game.away_score;
            const oppScore = isHome ? game.away_score : game.home_score;
            
            // Ensure scores exist and are numeric
            if (teamScore != null && oppScore != null) {
                if (parseInt(teamScore) > parseInt(oppScore)) {
                    wins++;
                } else if (parseInt(teamScore) < parseInt(oppScore)) {
                    losses++;
                } else {
                    ties++;
                }
            }
        });
        
        return { wins, losses, ties };
    };

    // Get division standing
    const getDivisionStanding = () => {
        if (!team || !allTeams.length) return { rank: 'N/A', total: 0 };
        
        // Filter teams in same division
        const divisionTeams = allTeams.filter(t => 
            t.team_division === team.team_division && 
            t.team_conference === team.team_conference
        );
        
        // Sort by win percentage (could expand with tiebreakers)
        const sortedTeams = divisionTeams.map(t => {
            const tGames = games.filter(g => g.home_team_abbr === t.team_abbr || g.away_team_abbr === t.team_abbr);
            let wins = 0, totalGames = 0;
            
            tGames.forEach(game => {
                const isHome = game.home_team_abbr === t.team_abbr;
                const teamScore = isHome ? game.home_score : game.away_score;
                const oppScore = isHome ? game.away_score : game.home_score;
                
                if (teamScore != null && oppScore != null) {
                    totalGames++;
                    if (parseInt(teamScore) > parseInt(oppScore)) {
                        wins++;
                    }
                }
            });
            
            const winPct = totalGames > 0 ? wins / totalGames : 0;
            return { team: t, winPct };
        }).sort((a, b) => b.winPct - a.winPct);
        
        const rank = sortedTeams.findIndex(item => item.team.team_abbr === abbr) + 1;
        return { rank, total: sortedTeams.length };
    };

    // Generates radar chart data for team metrics vs league average
    const generateTeamComparisonData = () => {
        if (!team || !allTeams.length) return [];
        
        return TEAM_METRICS.map(metric => {
            const result = { metric: metric.label };
            
            // Calculate league average
            const allValues = allTeams.map(t => parseFloat(t[metric.key]) || 0);
            const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
            const maxVal = Math.max(...allValues);
            const minVal = Math.min(...allValues);
            
            // Team value
            let teamValue = parseFloat(team[metric.key]) || 0;
            
            // Normalize to 0-100 scale (higher is better)
            if (metric.invert) {
                // For defensive stats, lower is better so invert
                result.team = maxVal > minVal 
                    ? 100 - ((teamValue - minVal) / (maxVal - minVal) * 100)
                    : 50;
                result.league = maxVal > minVal
                    ? 100 - ((avg - minVal) / (maxVal - minVal) * 100)
                    : 50;
            } else {
                result.team = maxVal > minVal
                    ? ((teamValue - minVal) / (maxVal - minVal) * 100)
                    : 50;
                result.league = maxVal > minVal
                    ? ((avg - minVal) / (maxVal - minVal) * 100)
                    : 50;
            }
            
            return result;
        });
    };
    
    // Get opponent team abbreviation from a game
    const getOpponent = (game) => {
        // --- DEBUG LOGGING ---
        if (!game || !game.home_team_abbr || !game.away_team_abbr) {
            console.warn('getOpponent received incomplete game object:', game);
        }
        // --- END DEBUG LOGGING ---

        const opponent = game.home_team_abbr === abbr ? game.away_team_abbr : game.home_team_abbr;

        // --- DEBUG LOGGING ---
         if (['BAL', 'KC', 'SF', 'ARI'].includes(abbr)) { // Log only for specific teams
            console.log(`[getOpponent for ${abbr} Game ${game?.game_id}]: Home=${game?.home_team_abbr}, Away=${game?.away_team_abbr}, Current=${abbr}, Result=${opponent}`);
         }
        // --- END DEBUG LOGGING ---
        
        return opponent;
    };
    
    // Get our team's prefix (home_ or away_) for a specific game
    const getTeamPrefix = (game) => {
        return game.home_team_abbr === abbr ? 'home_' : 'away_';
    };
    
    // Get opponent's prefix (home_ or away_) for a specific game
    const getOpponentPrefix = (game) => {
        return game.home_team_abbr === abbr ? 'away_' : 'home_';
    };
    
    // Generate situation comparison for selected game
    const generateGameSituationData = () => {
        if (!selectedGame) return [];
        
        const teamPrefix = getTeamPrefix(selectedGame);
        const oppPrefix = getOpponentPrefix(selectedGame);
        const opponent = getOpponent(selectedGame);
        
        // Filter out RPO EPA from the metrics list for this chart
        const metricsToDisplay = SITUATION_METRICS.filter(metric => metric.key !== 'offense_epa_per_play_rpo');

        return metricsToDisplay.map(metric => {
            const teamKey = `${teamPrefix}${metric.key}`;
            const oppKey = `${oppPrefix}${metric.key}`;
            
            return {
                situation: metric.label,
                team: parseFloat(selectedGame[teamKey]) || 0,
                opponent: parseFloat(selectedGame[oppKey]) || 0,
                teamName: abbr,
                opponentName: opponent
            };
        });
    };
    
    // Generate play-calling data for pie chart
    const generatePlayCallingData = () => {
        if (!team) return [];
        
        return [
            { name: 'Run', value: parseFloat(team.offense_run_play_rate) || 0 },
            { name: 'Pass', value: parseFloat(team.offense_pass_play_rate) || 0 },
        ];
    };
    
    // Generate play type breakdown for bar chart
    const generatePlayTypeData = () => {
        if (!team) return [];
        
        return [
            { name: 'Motion', value: parseFloat(team.offense_motion_rate) || 0 },
            { name: 'Play Action', value: parseFloat(team.offense_pa_rate) || 0 },
            { name: 'No Huddle', value: parseFloat(team.offense_no_huddle_rate) || 0 },
            { name: 'Screen', value: parseFloat(team.offense_screen_rate) || 0 },
            { name: 'RPO', value: parseFloat(team.offense_rpo_rate) || 0 },
            { name: 'QB Out Pocket', value: parseFloat(team.offense_qb_out_pocket_rate) || 0 }
        ];
    };
    
    // Format the game ID for display
    const formatGameId = (gameId) => {
        if (!gameId) return '';
        const parts = gameId.split('_');
        if (parts.length < 3) return gameId;
        
        return `Week ${parts[1]} vs ${parts[3] === abbr ? parts[2] : parts[3]}`;
    };
    
    // Get EPA per play for offense and defense across all games
    const getEpaData = () => {
        if (!games.length) return [];
        
        return games.map(game => {
            const prefix = getTeamPrefix(game);
            return {
                name: formatGameId(game.game_id),
                gameId: game.game_id,
                offense: parseFloat(game[`${prefix}offense_epa_per_play`]) || 0,
                defense: parseFloat(game[`${prefix}defense_epa_per_play`]) || 0,
            };
        });
    };
    
    // Get success rate data for each game
    const getSuccessRateData = () => {
        if (!games.length) return [];
        
        return games.map(game => {
            const prefix = getTeamPrefix(game);
            return {
                name: formatGameId(game.game_id),
                gameId: game.game_id,
                offense: parseFloat(game[`${prefix}offense_success_rate`]) || 0,
                defense: parseFloat(game[`${prefix}defense_success_rate`]) || 0,
            };
        });
    };
    
    // Get situational EPA data for all games
    const getSituationalTrendsData = (situation) => {
        if (!games.length) return [];
        
        return games.map(game => {
            const prefix = getTeamPrefix(game);
            return {
                name: formatGameId(game.game_id),
                gameId: game.game_id,
                value: parseFloat(game[`${prefix}offense_epa_per_play_${situation}`]) || 0,
            };
        });
    };
    
    // Get game result type (win, loss, tie) - MODIFIED to use Net EPA & handle missing opponent
    const getGameResult = (game) => {
        const opponentAbbr = getOpponent(game);
        
        // If opponent can't be determined, result is unknown
        if (!opponentAbbr) {
             console.warn(`[${abbr} Game ${game.game_id}]: Opponent abbreviation not found. Home: ${game.home_team_abbr}, Away: ${game.away_team_abbr}`);
            return 'unknown';
        }

        const teamPrefix = getTeamPrefix(game);
        const oppPrefix = getOpponentPrefix(game);
        
        // Calculate Net EPA = Offense EPA - Defense EPA
        // Ensure robust parsing with fallback to 0
        const teamOffEpa = parseFloat(game[`${teamPrefix}offense_epa_per_play`]);
        const teamDefEpa = parseFloat(game[`${teamPrefix}defense_epa_per_play`]);
        const teamNetEpa = (isNaN(teamOffEpa) ? 0 : teamOffEpa) - (isNaN(teamDefEpa) ? 0 : teamDefEpa);
        
        const oppOffEpa = parseFloat(game[`${oppPrefix}offense_epa_per_play`]);
        const oppDefEpa = parseFloat(game[`${oppPrefix}defense_epa_per_play`]);
        const oppNetEpa = (isNaN(oppOffEpa) ? 0 : oppOffEpa) - (isNaN(oppDefEpa) ? 0 : oppDefEpa);
        
        // Debug Logging
        if (['BAL', 'KC', 'SF', 'ARI'].includes(abbr)) { // Added ARI for debugging
             console.log(`[${abbr} vs ${opponentAbbr} Game ${game.game_id}]: Team Net EPA: ${teamNetEpa.toFixed(3)}, Opp Net EPA: ${oppNetEpa.toFixed(3)}`);
        }

        // Add a small tolerance for floating point comparison
        const tolerance = 0.0001;
        if (teamNetEpa > oppNetEpa + tolerance) {
            return 'win';
        } else if (teamNetEpa < oppNetEpa - tolerance) {
            return 'loss';
        } else {
            // Log actual ties (within tolerance), distinguish from unknown opponent case
            console.log(` --> EPA Tie Detected (within tolerance) for ${abbr} vs ${opponentAbbr}`);
            return 'tie';
        }
    };

    // Get score differential for a game (positive = team won, negative = team lost)
    const getScoreDifferential = (game) => {
        const isHome = game.home_team_abbr === abbr;
        const teamScore = parseInt(isHome ? game.home_score : game.away_score) || 0;
        const oppScore = parseInt(isHome ? game.away_score : game.home_score) || 0;
        return teamScore - oppScore;
    };

    // Generate game timeline data
    const generateGameTimelineData = () => {
        if (!games.length) return [];
        
        return games.map((game, index) => {
            const result = getGameResult(game);
            const differential = getScoreDifferential(game);
            const isHome = game.home_team_abbr === abbr;
            const opponent = getOpponent(game);
            const prefix = getTeamPrefix(game);
            
            // Get key metrics for this game - Updated score access
            const offensePpg = parseFloat(isHome ? game.home_score : game.away_score) || 0;
            const defensePpg = parseFloat(isHome ? game.away_score : game.home_score) || 0;
            const offenseEpa = parseFloat(game[`${prefix}offense_epa_per_play`]) || 0;
            const defenseEpa = parseFloat(game[`${prefix}defense_epa_per_play`]) || 0;
            const successRate = parseFloat(game[`${prefix}offense_success_rate`]) || 0;
            
            return {
                gameIndex: index + 1,
                gameId: game.game_id,
                week: `Week ${game.game_id?.split('_')[1] || index + 1}`,
                opponent,
                result,
                differential,
                isHome,
                metrics: {
                    offensePpg,
                    defensePpg,
                    offenseEpa,
                    defenseEpa,
                    successRate
                }
            };
        });
    };

    // Generate running averages for key metrics
    const generateRunningAverages = () => {
        if (!games.length) return [];
        
        const timelineData = generateGameTimelineData();
        const runningData = [];
        
        let offEpaSum = 0;
        let defEpaSum = 0;
        let offensePointsSum = 0;
        let defensePointsSum = 0;
        let winsCount = 0;
        
        timelineData.forEach((game, idx) => {
            // Update running totals
            offEpaSum += game.metrics.offenseEpa;
            defEpaSum += game.metrics.defenseEpa;
            offensePointsSum += game.metrics.offensePpg;
            defensePointsSum += game.metrics.defensePpg;
            if (game.result === 'win') winsCount++;
            
            // Calculate averages
            const gamesPlayed = idx + 1;
            const winPct = (winsCount / gamesPlayed) * 100;
            
            runningData.push({
                gameIndex: game.gameIndex,
                week: game.week,
                avgOffEpa: offEpaSum / gamesPlayed,
                avgDefEpa: defEpaSum / gamesPlayed,
                avgOffPoints: offensePointsSum / gamesPlayed,
                avgDefPoints: defensePointsSum / gamesPlayed,
                winPct
            });
        });
        
        return runningData;
    };

    // Render Overview Tab - ENHANCED v2
    const renderOverview = () => {
        if (!team) return null;
        const record = getTeamRecord();
        const winLossRecord = record.ties > 0 ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
        const timelineData = generateGameTimelineData();
        
        const overviewMetrics = [
            { key: 'offensive_ppg', label: 'Off PPG', precision: 1, isDefensive: false },
            { key: 'defensive_ppg', label: 'Def PPG', precision: 1, isDefensive: true },
            { key: 'offensive_ypg', label: 'Off YPG', precision: 1, isDefensive: false },
            { key: 'defensive_ypg', label: 'Def YPG', precision: 1, isDefensive: true },
            { key: 'offense_epa_per_play', label: 'Off EPA/Play', precision: 3, isDefensive: false },
            { key: 'defense_epa_per_play', label: 'Def EPA/Play', precision: 3, isDefensive: true },
            { key: 'offense_success_rate', label: 'Off Success %', precision: 1, isDefensive: false },
            { key: 'defense_success_rate', label: 'Def Success %', precision: 1, isDefensive: true },
        ];

    return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- Left Column: Key Stats & Rankings --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Key Metrics & Rank</h3>
                        <div className="space-y-4">
                            {overviewMetrics.map(metric => {
                                const value = parseFloat(team[metric.key]);
                                const rankInfo = teamRankings[metric.key] || { rank: 'N/A', total: allTeams.length };
                                const percentile = calculatePercentile(value, allTeams.map(t => parseFloat(t[metric.key])), metric.isDefensive);
                                const barGradient = getPercentileGradient(percentile, metric.isDefensive); // Get the gradient class string
                                
                                // Define tooltip text for specific metrics
                                let tooltipText = null;
                                if (metric.key === 'offense_epa_per_play') {
                                    tooltipText = "Expected Points Added per offensive play. Measures the change in expected points before and after each play. Higher is better.";
                                } else if (metric.key === 'defense_epa_per_play') {
                                    tooltipText = "Expected Points Added allowed per defensive play. Lower raw EPA allowed is better (higher percentile rank reflects this inversion).";
                                } else if (metric.key === 'offense_success_rate') {
                                    tooltipText = "Percentage of offensive plays gaining positive EPA. Run: 40%/60%/100% of yards needed on 1st/2nd/3rd-4th down. Pass: >0 EPA. Higher is better.";
                                } else if (metric.key === 'defense_success_rate') {
                                    tooltipText = "Percentage of opponent offensive plays allowed that were successful (positive EPA). Lower success rate allowed is better (higher percentile rank reflects this inversion).";
                                }
                                
                        return (
                                    <div key={metric.key}>
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            {/* Wrap label in div for tooltip positioning if tooltipText exists */}
                                            {tooltipText ? (
                                                <div className="group relative flex items-center space-x-1"> {/* Added space-x-1 */}
                                                    <span className="text-gray-400 font-medium cursor-help">{metric.label}</span>
                                                    {/* Info Icon */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 transition-colors duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {/* Tooltip Content - styled like others */}
                                                    <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700 pointer-events-none"> {/* Added pointer-events-none */}
                                                        {tooltipText}
                                                        {/* CSS Triangle Arrow */}
                                                        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-900 dark:border-t-gray-700"></div>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 font-medium">{metric.label}</span>
                                            )}
                                            <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${getPercentileColorClass(percentile, metric.isDefensive)}`}>
                                                Rank {rankInfo.rank}/{rankInfo.total}
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-100 mb-2"> {/* Added mb-2 */}
                                            {value != null ? value.toFixed(metric.precision) : 'N/A'}
                                        </p>
                                        {/* --- NEW Bar Chart Representation --- */}
                                        <div 
                                            className="h-3 w-full bg-gray-700 rounded overflow-hidden border border-gray-600/50"
                                            title={`${percentile}th Percentile`}
                                        >
                                            <div 
                                                className={`h-full rounded bg-gradient-to-r ${barGradient} transition-all duration-300 ease-out`}
                                                style={{ width: `${percentile}%` }}
                                            ></div>
                                        </div>
                                        {/* --- End NEW Bar Chart --- */}
                                    </div>
                        );
                    })}
                </div>
            </div>

                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                       <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Play Style</h3>
                       <div className="space-y-4">
                            {/* Run/Pass Balance Simplified */}
                             <div>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-400 font-medium">Run/Pass Ratio</span>
                                </div>
                                <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-700">
                                    <div 
                                        className="bg-green-500 h-full transition-all duration-300 ease-out"
                                        style={{ width: `${team.offense_run_play_rate}%` }} 
                                        title={`Run: ${team.offense_run_play_rate}%`}
                                    ></div>
                                    <div 
                                        className="bg-blue-500 h-full transition-all duration-300 ease-out"
                                        style={{ width: `${team.offense_pass_play_rate}%` }} 
                                        title={`Pass: ${team.offense_pass_play_rate}%`}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>Run {team.offense_run_play_rate}%</span>
                                    <span>Pass {team.offense_pass_play_rate}%</span>
                                </div>
                            </div>
                            {/* Key Tendencies */}
                            {[
                                { key: 'offense_motion_rate', label: 'Motion %' },
                                { key: 'offense_pa_rate', label: 'Play Action %' },
                                { key: 'offense_no_huddle_rate', label: 'No Huddle %' },
                                { key: 'defense_blitz_rate', label: 'Blitz %' }
                            ].map(item => (
                                <div key={item.key} className="flex justify-between items-center text-sm">
                                     <span className="text-gray-400 font-medium">{item.label}:</span>
                                     <span className="font-semibold text-gray-200">{team[item.key]}%</span>
                                </div>
                            ))}
                       </div>
                    </div>
                </div>

                {/* --- Right Column: Charts & Trends --- */}
                <div className="lg:col-span-2 space-y-6">
                     {/* Game Results Timeline */}
                     <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Recent Form (Last {timelineData.length} Games)</h3>
                        <div className="flex space-x-1 justify-center items-center flex-wrap">
                            {timelineData.map(game => {
                                // Determine result based on the pre-calculated result in timelineData
                                const epaResult = game.result; // Use the result already calculated
                                let bgColor = 'bg-gray-600'; // Default for unknown/tie
                                let resultChar = 'T'; // Default

                                if (epaResult === 'win') {
                                    bgColor = 'bg-green-500';
                                    resultChar = 'W';
                                } else if (epaResult === 'loss') {
                                    bgColor = 'bg-red-500';
                                    resultChar = 'L';
                                } else if (epaResult === 'tie') {
                                     bgColor = 'bg-yellow-500'; // Specific color for EPA tie
                                     resultChar = 'T';
                                } else { // Handle 'unknown' case
                                     bgColor = 'bg-gray-500'; // Different gray for unknown
                                     resultChar = '?';
                                }
                                
                                // Prepare tooltip text
                                let tooltipText = `${game.week} vs ${game.opponent || 'Unknown'}`;
                                if (epaResult !== 'unknown' && game.gameId) { // Check if gameId exists for calculation
                                    // Find the original game object to calculate EPA for tooltip if needed
                                    const originalGame = games.find(g => g.game_id === game.gameId);
                                    if (originalGame) {
                                        const teamPrefix = getTeamPrefix(originalGame);
                                        const oppPrefix = getOpponentPrefix(originalGame);
                                        const teamNetEpa = (parseFloat(originalGame[`${teamPrefix}offense_epa_per_play`]) || 0) - (parseFloat(originalGame[`${teamPrefix}defense_epa_per_play`]) || 0);
                                        const oppNetEpa = (parseFloat(originalGame[`${oppPrefix}offense_epa_per_play`]) || 0) - (parseFloat(originalGame[`${oppPrefix}defense_epa_per_play`]) || 0);
                                        tooltipText += `: ${epaResult.toUpperCase()} (Net EPA: ${teamNetEpa.toFixed(3)} vs ${oppNetEpa.toFixed(3)})`;
                                    } else {
                                        tooltipText += `: ${epaResult.toUpperCase()} (EPA data unavailable)`;
                                    }
                                } else if (epaResult === 'unknown') {
                                     tooltipText += ": Result Unknown (Missing Data)";
                                } else {
                                     tooltipText += `: ${epaResult.toUpperCase()}`;
                                }

                                return (
                                    <div 
                                        key={game.gameId || game.gameIndex} // Use index as fallback key
                                        className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold text-white ${bgColor}`}
                                        title={tooltipText} // Updated tooltip
                                    >
                                        {resultChar}
                                    </div>
                                );
                            })}
                        </div>
                         <p className="text-xs text-gray-500 mt-2 text-center">W/L/T based on Net EPA per Play comparison. (?) indicates missing opponent data.</p>
                     </div>
                     
                    {/* Team Radar Chart vs League Average */}
                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Performance Profile vs. League</h3>
                        <div className="w-full h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={120} data={generateTeamComparisonData()}>
                                    <PolarGrid stroke="#4b5563" /> {/* Gray-600 */}
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#d1d5db' }} fontSize={12} /> {/* Gray-300 */}
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} fontSize={10} /> {/* Gray-400 */}
                                    <Radar
                                        name={abbr}
                                        dataKey="team"
                                        stroke={getTeamColor(abbr)}
                                        fill={getTeamColor(abbr)}
                                        fillOpacity={0.6}
                                        strokeWidth={2}
                                    />
                                    <Radar
                                        name="League Avg"
                                        dataKey="league"
                                        stroke="#6b7280" /* Gray-500 */
                                        fill="#6b7280"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                        labelStyle={{ color: '#e5e7eb' }}
                                        itemStyle={{ color: '#d1d5db' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* EPA & Success Rate Trends Combined/Simplified */}
                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Game-by-Game Performance Trends</h3>
                        <div className="w-full h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart 
                                    data={getEpaData()} // Using EPA data for points
                                    margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: '#9ca3af', angle: -45, textAnchor: 'end' }} 
                                        height={50} 
                                        fontSize={10}
                                        interval={0} // Show all ticks if possible
                                    />
                                    <YAxis 
                                        yAxisId="left" 
                                        tick={{ fill: '#9ca3af' }} 
                                        fontSize={10} 
                                        label={{ value: 'EPA/Play', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                                    />
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        tick={{ fill: '#9ca3af' }} 
                                        fontSize={10} 
                                        dataKey="success" // Hypothetical success rate key if added to data
                                        // label={{ value: 'Success %', angle: 90, position: 'insideRight', fill: '#9ca3af', fontSize: 10 }}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                        labelStyle={{ color: '#e5e7eb' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: '12px'}} />
                                    <Line 
                                        yAxisId="left"
                                        name="Offense EPA/Play" 
                                        type="monotone" 
                                        dataKey="offense" 
                                        stroke="#22c55e" /* Green-500 */
                                        activeDot={{ r: 6 }} 
                                        strokeWidth={2}
                                    />
                                    <Line 
                                         yAxisId="left"
                                        name="Defense EPA/Play (Inverted)" 
                                        type="monotone" 
                                        dataKey="defense"
                                        stroke="#ef4444" /* Red-500 */
                                        activeDot={{ r: 6 }} 
                                        strokeWidth={2}
                                    />
                                    {/* Add Success Rate Lines if data is available */}
                                    {/* <Line yAxisId="right" name="Off Success %" ... /> */}
                                    {/* <Line yAxisId="right" name="Def Success %" ... /> */}
                                     <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" strokeDasharray="3 3" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Defense EPA/Play shown inverted (lower raw value is better performance).</p>
                    </div>
                </div>
            </div>
        );
    };
    
    // Render Games Tab - ENHANCED v2
    const renderGames = () => {
        const timelineData = generateGameTimelineData();
        
        return (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* --- Game List Column --- */}
                <div className="xl:col-span-1 space-y-3 h-[75vh] overflow-y-auto pr-2"> 
                    <h3 className="text-lg font-semibold mb-2 text-gray-200 sticky top-0 bg-gray-900 py-2 z-10">Game Log ({games.length})</h3>
                    {games.map((game) => {
                        const opponent = getOpponent(game);
                        const isHome = game.home_team_abbr === abbr;
                        const result = getGameResult(game);
                        const teamScore = isHome ? game.home_score : game.away_score;
                        const oppScore = isHome ? game.away_score : game.home_score;
                        
                        let resultClass = 'border-gray-600';
                        if (result === 'win') resultClass = 'border-green-500';
                        if (result === 'loss') resultClass = 'border-red-500';
                        if (result === 'tie') resultClass = 'border-yellow-500';
                        if (result === 'unknown') resultClass = 'border-gray-500';
                        
                        const isSelected = selectedGame?.game_id === game.game_id;
                        
                        return (
                        <div
                            key={game.game_id}
                                className={`bg-gray-850 p-3 rounded-lg border-l-4 transition-all duration-200 cursor-pointer hover:bg-gray-800 ${resultClass} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 bg-gray-800' : 'border-gray-700 hover:border-gray-600'}`}
                                onClick={() => setSelectedGame(game)}
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedGame(game) }}
                                role="button"
                                aria-pressed={isSelected}
                                aria-label={`Select game vs ${opponent}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-gray-400">{formatGameId(game.game_id)} {isHome ? '(H)' : '(A)'}</span>
                                    <img 
                                        src={getTeamLogo({ team_abbr: opponent })} // Use simple object for logo lookup
                                        alt={`${opponent} logo`}
                                        className="w-6 h-6 object-contain"
                                        onError={(e) => { e.target.style.display = 'none'; }} // Hide if logo fails
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xl font-bold ${result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {result === 'win' ? 'W' : result === 'loss' ? 'L' : result === 'tie' ? 'T' : '?'} 
                                        {/* Removed {teamScore}-{oppScore} as scores are not available from this API endpoint */}
                                    </span>
                            <Link
                                to={`/game/${game.game_id}`}
                                        className="text-xs text-blue-400 hover:underline"
                                        onClick={(e) => e.stopPropagation()} // Prevent card click
                                        aria-label={`View full details for game vs ${opponent}`}
                            >
                                        Details →
                            </Link>
                        </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* --- Selected Game Analysis Column --- */}
                <div className="xl:col-span-2 space-y-6">
                    {selectedGame ? (
                        <div className="sticky top-0 z-10"> {/* Make analysis section sticky */} 
                            <h3 className="text-lg font-semibold mb-3 text-gray-200 bg-gray-900 py-2">Analysis: {formatGameId(selectedGame.game_id)}</h3>
                            <div className="space-y-6 h-[calc(75vh - 40px)] overflow-y-auto pr-2"> {/* Allow scrolling for analysis */} 
                                
                                {/* Situational EPA Comparison Card */} 
                                <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                                    <h4 className="text-md font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Situational EPA/Play vs. {getOpponent(selectedGame)}</h4>
                                    <div className="h-96">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={generateGameSituationData()}
                                                layout="vertical"
                                                margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" horizontal={false} />
                                                <XAxis type="number" tick={{ fill: '#9ca3af' }} fontSize={10} />
                                                <YAxis 
                                                    dataKey="situation" 
                                                    type="category" 
                                                    tick={{ fill: '#d1d5db' }} 
                                                    fontSize={10} 
                                                    width={80} 
                                                />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                                    labelStyle={{ color: '#e5e7eb' }}
                                                    itemStyle={{ fontSize: '12px' }}
                                                    formatter={(value) => value.toFixed(3)}
                                                />
                                                <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: '11px'}} />
                                                <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="2 2" />
                                                <Bar 
                                                    name={abbr} 
                                                    dataKey="team" 
                                                    fill={getTeamColor(abbr)} 
                                                    radius={[0, 3, 3, 0]} // Slightly rounded bars
                                                />
                                                <Bar 
                                                    name={getOpponent(selectedGame)} 
                                                    dataKey="opponent" 
                                                    fill={getTeamColor(getOpponent(selectedGame))} 
                                                    radius={[0, 3, 3, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Success Rate Comparison Card */}
                                <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                                     <div className="flex items-center mb-3 border-b border-gray-700 pb-2">
                                        <h4 className="text-md font-semibold text-gray-200">Situational Success Rate vs. {getOpponent(selectedGame)}</h4>
                                        {/* Tooltip for Success Rate Definition */}
                                        <div className="group relative ml-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-200 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                                                Success Rate: % of plays with positive EPA. Pass plays need {'>'}0 EPA. Run plays need 40% of yards needed on 1st down, 60% on 2nd, 100% on 3rd/4th.
                                                {/* CSS Triangle Arrow */}
                                                <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-900 dark:border-t-gray-700"></div>
                                            </span>
                                        </div>
                                     </div>
                                    <div className="space-y-3">
                                        {['run', 'pass', 'early_down', 'late_down', 'motion', 'pa'].map(situation => {
                                            const prefix = getTeamPrefix(selectedGame);
                                            const oppPrefix = getOpponentPrefix(selectedGame);
                                            const teamValue = parseFloat(selectedGame[`${prefix}offense_success_rate_${situation}`]) || 0;
                                            const oppValue = parseFloat(selectedGame[`${oppPrefix}offense_success_rate_${situation}`]) || 0;
                                            const diff = teamValue - oppValue;
                                            
                                            let label = situation.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                            if (situation === 'pa') label = 'Play Action';
                                            
                                            return (
                                                <div key={situation}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-gray-300">{label}</span>
                                                        <span className={`text-xs font-semibold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}% diff
                                                        </span>
                                                    </div>
                                                    {/* Comparison Bar */}
                                                    <div className="flex h-4 w-full bg-gray-700 rounded overflow-hidden relative border border-gray-600">
                                                         {/* Opponent Bar (Background) */}
                                                        <div className="h-full" style={{ width: `${oppValue}%`, backgroundColor: getTeamColor(getOpponent(selectedGame)), opacity: 0.5 }}></div>
                                                         {/* Team Bar (Foreground) */}
                                                        <div className="absolute top-0 left-0 h-full border-r-2 border-white shadow-inner" style={{ width: `${teamValue}%`, backgroundColor: getTeamColor(abbr) }} title={`${abbr}: ${teamValue.toFixed(1)}%`}></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                                        <span>{abbr}: {teamValue.toFixed(1)}%</span>
                                                        <span>{getOpponent(selectedGame)}: {oppValue.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                 {/* Play Calling Comparison Card */}
                                <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                                     <h4 className="text-md font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Play Calling Comparison vs. {getOpponent(selectedGame)}</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {[ 'offense_run_play_rate', 'offense_pass_play_rate', 'offense_motion_rate', 'offense_pa_rate', 'offense_no_huddle_rate', 'offense_screen_rate', 'offense_rpo_rate', 'offense_qb_out_pocket_rate'
                                        ].map(key => {
                                            const prefix = getTeamPrefix(selectedGame);
                                            const oppPrefix = getOpponentPrefix(selectedGame);
                                            const teamVal = parseFloat(selectedGame[`${prefix}${key}`]) || 0;
                                            const oppVal = parseFloat(selectedGame[`${oppPrefix}${key}`]) || 0;
                                            const label = key.replace('offense_', '').replace(/_/g, ' ').replace('rate', '%').replace(/\b\w/g, c => c.toUpperCase());
                                            
                                            return (
                                                <div key={key} className="text-sm">
                                                    <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                                                    <div className="flex justify-between items-center font-medium bg-gray-700 px-2 py-1 rounded">
                                                        <span style={{ color: getTeamColor(abbr) }}>{teamVal.toFixed(1)}%</span>
                                                        <span className="text-gray-500 text-xs">vs</span>
                                                        <span style={{ color: getTeamColor(getOpponent(selectedGame)) }}>{oppVal.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[75vh] text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3" />
                            </svg>
                            <p className="text-lg">Select a game from the list to view analysis.</p>
                </div>
            )}
                </div>
            </div>
        );
    };
    
    // Render Situations Tab - ENHANCED
    const renderSituations = () => {
        const situations = [
            { key: 'run', label: 'Run Game' },
            { key: 'pass', label: 'Pass Game' },
            { key: 'pa', label: 'Play Action' },
            { key: 'motion', label: 'Motion' },
            { key: 'no_huddle', label: 'No Huddle' },
            { key: 'screen', label: 'Screens' },
            { key: 'rpo', label: 'RPOs' },
            { key: 'qb_out_pocket', label: 'QB Out of Pocket' },
            { key: 'blitz', label: 'vs. Blitz' } // Note: This might be defense later
        ];

        // Calculate average EPA and Success Rate across all situations for scatter plot context
        const situationAverages = situations.map(situation => {
            if (!games.length) return { name: situation.label, epa: 0, success: 0 };
            let epaSum = 0, successSum = 0, count = 0;
            games.forEach(game => {
                const prefix = getTeamPrefix(game);
                const epaKey = `${prefix}offense_epa_per_play_${situation.key}`;
                const successKey = `${prefix}offense_success_rate_${situation.key}`;
                if (game[epaKey] != null && game[successKey] != null) { // Check for null/undefined
                    epaSum += parseFloat(game[epaKey]);
                    successSum += parseFloat(game[successKey]);
                    count++;
                }
            });
            return {
                name: situation.label,
                epa: count > 0 ? epaSum / count : 0,
                success: count > 0 ? successSum / count : 0,
            };
        });

        const avgEpaOverall = situationAverages.reduce((sum, s) => sum + s.epa, 0) / situationAverages.length;
        const avgSuccessOverall = situationAverages.reduce((sum, s) => sum + s.success, 0) / situationAverages.length;

        return (
            <div className="space-y-6">
                {/* Situational EPA/Play Trends Card */}
                <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">Situational EPA/Play Trends</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        {situations.map(situation => {
                            const avgData = situationAverages.find(s => s.name === situation.label) || { epa: 0 }; // Get pre-calculated avg
                            const trendData = getSituationalTrendsData(situation.key);
                            
                            return (
                                <div key={situation.key}>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h4 className="text-md font-medium text-gray-300">{situation.label}</h4>
                                        <span className="text-xs text-gray-400">Avg EPA: {avgData.epa.toFixed(3)}</span>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={trendData}
                                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }} // Adjusted margins
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fill: '#9ca3af', fontSize: 9 }} 
                                                    interval={Math.ceil(trendData.length / 6)} // Reduce tick overlap
                                                    tickFormatter={(label) => label.replace('Week ', 'W').split(' vs ')[0]} // Shorten labels
                                                />
                                                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                                                    labelStyle={{ color: '#e5e7eb', fontSize: '12px', marginBottom: '4px' }}
                                                    itemStyle={{ color: '#d1d5db', fontSize: '11px' }}
                                                    formatter={(value, name, props) => [`${value.toFixed(3)}`, `EPA/Play (${props.payload.name})`]}
                                                    labelFormatter={(label) => ``} // Remove default label
                                                />
                                                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                                                <Line
                                                    type="monotone"
                                                    dataKey="value"
                                                    name="EPA/Play"
                                                    stroke={getTeamColor(abbr)}
                                                    strokeWidth={2}
                                                    dot={{ fill: getTeamColor(abbr), r: 3 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* EPA vs. Success Rate Scatter Plot Card */}
                <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">EPA vs. Success Rate by Situation</h3>
                    <div className="w-full h-[550px] pr-4"> {/* Added padding right */} 
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                                margin={{ top: 20, right: 20, bottom: 50, left: 20 }} // Adjusted margins
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                                <XAxis
                                    type="number"
                                    dataKey="epa"
                                    name="EPA/Play"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    domain={['dataMin - 0.05', 'dataMax + 0.05']} // Add padding to domain
                                    label={{ value: 'Avg. EPA/Play per Situation', position: 'insideBottom', fill: '#9ca3af', dy: 20, fontSize: 11 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="success"
                                    name="Success Rate (%)"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    unit="%"
                                    domain={['dataMin - 5', 'dataMax + 5']} // Add padding to domain
                                    label={{ value: 'Avg. Success Rate (%) per Situation', angle: -90, position: 'insideLeft', fill: '#9ca3af', dx: -10, fontSize: 11 }}
                                />
                                
                                {/* Dynamic Reference Lines for Averages */}
                                <ReferenceLine x={avgEpaOverall} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `Avg EPA (${avgEpaOverall.toFixed(3)})`, fill: '#a78bfa', fontSize: 9, position: 'top' }} />
                                <ReferenceLine y={avgSuccessOverall} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `Avg Success (${avgSuccessOverall.toFixed(1)}%)`, fill: '#a78bfa', fontSize: 9, position: 'right' }} />
                                
                                <RechartsTooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px' }}
                                    itemStyle={{ fontSize: '11px' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg text-xs">
                                                    <p className="font-bold text-gray-100 mb-1">{data.name}</p>
                                                    <p className="text-blue-400">EPA/Play: {data.epa.toFixed(3)}</p>
                                                    <p className="text-green-400">Success Rate: {data.success.toFixed(1)}%</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter
                                    name="Situations"
                                    data={situationAverages} // Use pre-calculated averages
                                    fill={getTeamColor(abbr)}
                                    shape={props => {
                                        const { cx, cy, payload } = props;
                                        return (
                                            <g className="cursor-pointer"> {/* Removed hover:scale-110 */}
                                                <circle cx={cx} cy={cy} r={7} fill={getTeamColor(abbr)} fillOpacity={0.7} stroke="#fff" strokeWidth={1} />
                                                <text x={cx} y={cy - 12} textAnchor="middle" fill="#d1d5db" fontSize={9} className="pointer-events-none">
                                                    {payload.name}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Quadrant Explanation - Styled and Integrated */}
                    <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-3">
                         <p className="text-center mb-2">Quadrants relative to this team's average situational performance (purple lines).</p>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="text-center p-1.5 bg-gray-700/50 rounded border border-gray-600/50">
                                <span className="block font-semibold text-gray-200">Top Right</span>
                                <span>Efficient & Consistent</span>
                            </div>
                            <div className="text-center p-1.5 bg-gray-700/50 rounded border border-gray-600/50">
                                <span className="block font-semibold text-gray-200">Top Left</span>
                                <span>Inefficient but Consistent</span>
                            </div>
                            <div className="text-center p-1.5 bg-gray-700/50 rounded border border-gray-600/50">
                                <span className="block font-semibold text-gray-200">Bottom Left</span>
                                <span>Inefficient & Inconsistent</span>
                            </div>
                             <div className="text-center p-1.5 bg-gray-700/50 rounded border border-gray-600/50">
                                <span className="block font-semibold text-gray-200">Bottom Right</span>
                                <span>Efficient but Inconsistent</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    // Render Tendencies Tab - ENHANCED v3 (Aligned with Overview Styling)
    const renderTendencies = () => {
        if (!team || !allTeams.length) return null; // Ensure data is loaded

        // Define metrics with configuration - Adding Run/Pass rates here
        const offensiveTendencies = [
            { key: 'offense_run_play_rate', label: 'Run Play Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_pass_play_rate', label: 'Pass Play Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_motion_rate', label: 'Motion Usage', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_pa_rate', label: 'Play Action Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_no_huddle_rate', label: 'No Huddle Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_screen_rate', label: 'Screen Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_rpo_rate', label: 'RPO Rate', unit: '%', precision: 1, isDefensive: false },
            { key: 'offense_qb_out_pocket_rate', label: 'QB Out Pocket Rate', unit: '%', precision: 1, isDefensive: false }
        ];

        const defensiveTendencies = [
            { key: 'defense_blitz_rate', label: 'Blitz Rate', unit: '%', precision: 1, isDefensive: true },
            { key: 'defense_sack_rate', label: 'Sack Rate', unit: '%', precision: 1, isDefensive: false }, // Higher is better for defense sack rate
            { key: 'defense_int_rate', label: 'Interception Rate', unit: '%', precision: 1, isDefensive: false }, // Higher is better for defense int rate
            { key: 'defense_in_the_box_avg', label: 'Avg. Players In Box', unit: '', precision: 2, isDefensive: true }, // Not a percentage
            { key: 'defense_pass_rushers_avg', label: 'Avg. Pass Rushers', unit: '', precision: 2, isDefensive: true } // Not a percentage
        ];
        
        const situationalPerformance = [
             { key: 'offense_epa_per_play_late_down', label: 'Late Down EPA/Play', unit: '', precision: 3, isDefensive: false, isEpa: true },
             { key: 'offense_success_rate_late_down', label: 'Late Down Success %', unit: '%', precision: 1, isDefensive: false, isEpa: false },
             { key: 'offense_epa_per_play_blitz', label: 'vs. Blitz EPA/Play', unit: '', precision: 3, isDefensive: false, isEpa: true },
             { key: 'offense_success_rate_blitz', label: 'vs. Blitz Success %', unit: '%', precision: 1, isDefensive: false, isEpa: false },
         ];

        // Pre-calculate averages, percentiles, and rankings
        const allMetrics = [...offensiveTendencies, ...defensiveTendencies, ...situationalPerformance];
        const calculatedTendencies = allMetrics.map(item => {
            const value = parseFloat(team[item.key]);
            const allValues = allTeams.map(t => parseFloat(t[item.key]));
            
            // Calculate Rank
            const sortedTeams = [...allTeams].sort((a, b) => {
                const valA = parseFloat(a[item.key]) || (item.isDefensive ? Infinity : -Infinity);
                const valB = parseFloat(b[item.key]) || (item.isDefensive ? Infinity : -Infinity);
                return item.isDefensive ? valA - valB : valB - valA;
            });
            const rank = sortedTeams.findIndex(t => t.team_abbr === team.team_abbr) + 1;
            
            const percentile = calculatePercentile(value, allValues, item.isDefensive);
            
            return { 
                ...item, 
                value, 
                percentile,
                rank,
                total: allTeams.length
            };
        });

        const getTendencyData = (key) => calculatedTendencies.find(t => t.key === key) || {};

        // Helper function to render a single metric block (like in Overview)
        const renderMetricBlock = (metricKey) => {
            const data = getTendencyData(metricKey);
            if (!data) return null;

            // Get the gradient class string for the bar
            const barGradient = getPercentileGradient(data.percentile, data.isDefensive);

            // Tooltip logic (keep structure, but tendencies don't have defined tooltips currently)
            const tooltipText = null; // No tooltips defined for tendencies yet

            return (
                 <div key={data.key}>
                    <div className="flex justify-between items-center text-sm mb-1">
                         {/* Label (with potential future tooltip structure) */}
                         {tooltipText ? (
                             <div className="group relative flex items-center space-x-1">
                                 <span className="text-gray-400 font-medium cursor-help">{data.label}</span>
                                 {/* Potential Info Icon */}
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 transition-colors duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                 </svg>
                                 {/* Potential Tooltip Content */}
                                 <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700 pointer-events-none">
                                     {tooltipText}
                                     <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-gray-900 dark:border-t-gray-700"></div>
                                 </span>
                             </div>
                         ) : (
                             <span className="text-gray-400 font-medium">{data.label}</span>
                         )}
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${getPercentileColorClass(data.percentile, data.isDefensive)}`}>
                            Rank {data.rank}/{data.total}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-100 mb-2"> {/* Added mb-2 */}
                        {data.value != null ? `${data.value.toFixed(data.precision)}${data.unit}` : 'N/A'}
                    </p>
                    {/* --- Bar Chart Representation (like Overview) --- */}
                    <div 
                        className="h-3 w-full bg-gray-700 rounded overflow-hidden border border-gray-600/50"
                        title={`${data.percentile}th Percentile`}
                    >
                        <div 
                            className={`h-full rounded bg-gradient-to-r ${barGradient} transition-all duration-300 ease-out`}
                            style={{ width: `${data.percentile}%` }}
                        ></div>
                    </div>
                    {/* --- End Bar Chart --- */}
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Offensive Tendencies Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Offensive Tendencies</h3>
                        <div className="space-y-4">
                            {offensiveTendencies.map(item => renderMetricBlock(item.key))}
                        </div>
                    </div>
                </div>

                 {/* Defensive Tendencies Card */}
                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                         <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Defensive Tendencies</h3>
                         <div className="space-y-4">
                            {defensiveTendencies.map(item => renderMetricBlock(item.key))}
                        </div>
                    </div>
                </div>

                 {/* Situational Performance Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-850 p-4 rounded-lg border border-gray-700">
                         <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Key Situational Performance</h3>
                         <div className="space-y-4">
                             {situationalPerformance.map(item => renderMetricBlock(item.key))}
                         </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 w-24 bg-gray-700 rounded mb-6"></div>
                    <div className="h-16 rounded-lg mb-6 bg-gray-700"></div>
                    <div className="h-32 rounded-lg bg-gray-700 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-40 bg-gray-700 rounded-lg"></div>
                        <div className="h-40 bg-gray-700 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="bg-red-900 border border-red-700 text-white p-4 rounded-lg">
                    <h3 className="font-bold text-xl mb-2">Error</h3>
                    <p>{error}</p>
                    <Link to="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
                        ← Back to Teams
                    </Link>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="bg-yellow-900 border border-yellow-700 text-white p-4 rounded-lg">
                    <h3 className="font-bold text-xl mb-2">Team Not Found</h3>
                    <p>Could not find team with abbreviation: {abbr}</p>
                    <Link to="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
                        ← Back to Teams
                    </Link>
                </div>
            </div>
        );
    }

    // Calculate team record and division standing
    const record = getTeamRecord();
    const recordString = `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ''}`;
    
    const divisionStanding = getDivisionStanding();
    const divisionString = `${divisionStanding.rank}${
        divisionStanding.rank === 1 ? 'st' : 
        divisionStanding.rank === 2 ? 'nd' : 
        divisionStanding.rank === 3 ? 'rd' : 'th'
    } in ${team.team_division || 'Division'}`;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Ensure Back to Teams Link points to "/teams" */}
            <Link to="/teams" className="text-blue-400 underline mb-6 inline-block">
                ← Back to Teams
            </Link>

            {/* Enhanced Team Header */}
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
                {/* Color Banner */}
                <div 
                    className="h-3 w-full" 
                    style={{ backgroundColor: getTeamColor(abbr) }}
                ></div>
                
                <div className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Team Logo */}
                        <img 
                            src={getTeamLogo(team)}
                            alt={`${team.team_name || team.team_abbr} logo`}
                            className="w-28 h-28 object-contain bg-white p-2 rounded-lg shadow-md"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=N/A'; }}
                        />
                        
                        {/* Team Info */}
                        <div className="flex-grow text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold mb-1">{team.team_name || abbr}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                                {team.team_division && team.team_conference && (
                                    <span className="text-sm bg-gray-700 px-3 py-1 rounded-full">
                                        {team.team_conference} {team.team_division} • {divisionString}
                                    </span>
                                )}
                            </div>
                            
                            {/* Team Rankings */}
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                {Object.entries(teamRankings).map(([key, data]) => {
                                    const isGood = data.rank <= Math.ceil(data.total * 0.3); // Top 30%
                                    const isBad = data.rank >= Math.ceil(data.total * 0.7);  // Bottom 30%
                                    
                                    // Only show key rankings in header
                                    if (!['offensive_ppg', 'defensive_ppg', 'offense_epa_per_play', 'defense_epa_per_play'].includes(key)) {
                                        return null;
                                    }
                                    
                        return (
                                        <div key={key} className="text-center px-1 py-1 rounded bg-gray-750">
                                            <div className="font-medium">{data.label}</div>
                                            <div className={`text-lg font-bold ${
                                                isGood ? 'text-green-400' : isBad ? 'text-red-400' : ''
                                            }`}>
                                                {data.rank}<span className="text-xs text-gray-400">/{data.total}</span>
                                            </div>
                                        </div>
                        );
                    })}
                </div>
            </div>

                        {/* Quick Links */}
                        <div className="shrink-0">
                            <Link
                                to={`/team/${abbr}/players`}
                                className="block text-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-2"
                            >
                                Team Roster
                            </Link>
                            <a
                                href={team.team_website || `https://www.nfl.com/teams/${abbr.toLowerCase()}`}
                                className="block text-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                Official Site
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex flex-wrap space-x-1 mb-6 border-b border-gray-700">
                {[
                    { id: 'overview', label: 'Team Overview' },
                    { id: 'games', label: 'Game Analysis' },
                    { id: 'situations', label: 'Situational Analysis' },
                    { id: 'tendencies', label: 'Team Tendencies' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 font-medium ${
                            activeTab === tab.id 
                                ? 'border-b-2 border-blue-500 text-blue-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'games' && renderGames()}
                {activeTab === 'situations' && renderSituations()}
                {activeTab === 'tendencies' && renderTendencies()}
            </div>
        </div>
    );
};

export default TeamDetail;

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    ZAxis,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ReferenceLine,
    ReferenceArea
} from 'recharts';
import { fetchPlayers } from '../api/api'; // <-- ADD IMPORT

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

// Position-specific configurations for stats
const POSITION_CONFIG = {
    QB: {
        primaryStats: [
            { key: 'passing_yards', label: 'Passing Yards' },
            { key: 'passing_tds', label: 'Passing TDs' },
            { key: 'completion_percentage', label: 'Completion %' },
            { key: 'interceptions', label: 'Interceptions' }
        ],
        secondaryStats: [
            { key: 'passer_rating', label: 'Passer Rating' },
            { key: 'qbr', label: 'QBR' },
            { key: 'epa_per_play', label: 'EPA/Play' },
            { key: 'cpoe', label: 'CPOE' },
            { key: 'any_a', label: 'ANY/A' }
        ],
        color: '#4299E1' // Blue
    },
    RB: {
        primaryStats: [
            { key: 'rushing_yards', label: 'Rushing Yards' },
            { key: 'rushing_tds', label: 'Rushing TDs' },
            { key: 'yards_per_carry', label: 'Yds/Carry' },
            { key: 'carries', label: 'Carries' }
        ],
        secondaryStats: [
            { key: 'epa_per_rush', label: 'EPA/Rush' },
            { key: 'rush_yards_oe_per_att', label: 'Yards Over Expected/Att' },
            { key: 'rush_pct_over_expected', label: 'Rush % Over Expected' },
            { key: 'percent_attempts_gte_eight_defenders', label: '% vs 8+ Defenders' }
        ],
        color: '#48BB78' // Green
    },
    WR: {
        primaryStats: [
            { key: 'receiving_yards', label: 'Receiving Yards' },
            { key: 'receptions', label: 'Receptions' },
            { key: 'receiving_tds', label: 'Receiving TDs' },
            { key: 'yards_per_target', label: 'Yards/Target' }
        ],
        secondaryStats: [
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'racr', label: 'RACR' },
            { key: 'wopr', label: 'WOPR' },
            { key: 'yac_oe', label: 'YAC Over Expected' },
            { key: 'avg_separation', label: 'Avg Separation' }
        ],
        color: '#F6AD55' // Orange
    },
    TE: {
        primaryStats: [
            { key: 'receiving_yards', label: 'Receiving Yards' },
            { key: 'receptions', label: 'Receptions' },
            { key: 'receiving_tds', label: 'Receiving TDs' },
            { key: 'yards_per_target', label: 'Yards/Target' }
        ],
        secondaryStats: [
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'racr', label: 'RACR' },
            { key: 'wopr', label: 'WOPR' },
            { key: 'yac_oe', label: 'YAC Over Expected' }
        ],
        color: '#9F7AEA' // Purple
    }
};

// Chart colors
const CHART_COLORS = ['#4299E1', '#48BB78', '#F6AD55', '#FC8181', '#B794F4', '#90CDF4'];

// Calculate percentile for a stat
const calculatePercentile = (value, allValues) => {
    if (!allValues || !allValues.length || value === null || value === undefined) return 0;
    const filteredValues = allValues.filter(v => v !== null && v !== undefined);
    if (!filteredValues.length) return 0;
    
    const sortedValues = [...filteredValues].sort((a, b) => a - b);
    const index = sortedValues.findIndex(v => v >= value);
    return Math.round((index / sortedValues.length) * 100);
};

// Helper: Get percentile color class - Matched exactly with PlayerRankings.jsx and TeamList.jsx
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

// Helper: Get percentile gradient for bars - Matched exactly with PlayerRankings.jsx and TeamList.jsx
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

// Get player position group
const getPositionGroup = (position) => {
    if (['QB'].includes(position)) return 'QB';
    if (['RB', 'FB', 'HB'].includes(position)) return 'RB';
    if (['WR'].includes(position)) return 'WR';
    if (['TE'].includes(position)) return 'TE';
    return null;
};

// Define position sort order
const positionSortOrder = {
    QB: 1,
    RB: 2,
    WR: 3,
    TE: 4
};

// Helper function to sort players initially: Position Group -> Key Stat -> Name
const sortPlayersByPosition = (playersToSort) => {
    return [...playersToSort].sort((a, b) => {
        const groupA = getPositionGroup(a.position);
        const groupB = getPositionGroup(b.position);
        
        const priorityA = positionSortOrder[groupA] || 99; 
        const priorityB = positionSortOrder[groupB] || 99;
        
        // 1. Sort by Position Group Priority
        if (priorityA !== priorityB) {
            return priorityA - priorityB; 
        }
        
        // 2. Sort by Key Stat within Primary Groups (Descending)
        let keyStatA = 0;
        let keyStatB = 0;
        let statKey = null;
        
        if (groupA === 'QB') statKey = 'passing_yards';
        else if (groupA === 'RB') statKey = 'rushing_yards';
        else if (groupA === 'WR' || groupA === 'TE') statKey = 'receiving_yards';

        if (statKey) {
            keyStatA = parseFloat(a[statKey]) || 0;
            keyStatB = parseFloat(b[statKey]) || 0;
            
            if (keyStatA !== keyStatB) {
                return keyStatB - keyStatA; // Descending order for yards
            }
        }
        
        // 3. Fallback to alphabetical sort by name
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
    });
};

// Get color for a position
const getPositionColor = (position) => {
    const group = getPositionGroup(position);
    return group ? POSITION_CONFIG[group]?.color : '#718096';
};

const PlayerList = () => {
    const { abbr } = useParams();
    const [players, setPlayers] = useState([]);
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards', 'stats', 'matrix', 'comparison'
    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [positionFilter, setPositionFilter] = useState('All');
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [statOption, setStatOption] = useState('primary'); // 'primary' or 'advanced'
    const [expandedPlayers, setExpandedPlayers] = useState({}); // Track expanded player cards

    useEffect(() => {
        setLoading(true); // Set loading at the start
        setError(null);

        fetchPlayers() // <-- Use imported function
            .then((res) => {
                // Ensure res.data is an array before filtering
                const allFetchedPlayers = Array.isArray(res.data) ? res.data : [];
                setAllPlayers(allFetchedPlayers); // Store all players if needed for context

                // Filter for the specific team using abbr from useParams
                const teamPlayers = allFetchedPlayers.filter(
                    (player) => player.team?.toUpperCase() === abbr.toUpperCase()
                );

                // Apply initial sort by position
                const initiallySortedPlayers = sortPlayersByPosition(teamPlayers);

                setPlayers(initiallySortedPlayers);
                setFilteredPlayers(initiallySortedPlayers); // Set initial view

                if (teamPlayers.length === 0) {
                    console.warn(`⚠️ No players found for team "${abbr}"`);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch players:', err.message);
                setError('Could not load players'); // Set error state
            })
            .finally(() => {
                setLoading(false); // Ensure loading is set to false
            });

        // Original logic commented out
        /*
        axios
            .get('http://localhost:5000/api/players')
            .then((res) => {
                const teamPlayers = res.data.filter(
                    (player) => player.team?.toUpperCase() === abbr.toUpperCase()
                );
                
                const initiallySortedPlayers = sortPlayersByPosition(teamPlayers);
                
                setPlayers(initiallySortedPlayers);
                setFilteredPlayers(initiallySortedPlayers); 
                setAllPlayers(res.data); 
                setLoading(false);

                if (teamPlayers.length === 0) {
                    console.warn(`⚠️ No players found for team "${abbr}"`);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch players:', err.message);
                setError('Could not load players');
                setLoading(false);
            });
        */
    }, [abbr]); // Keep abbr dependency

    // Update filtered players when search, position filter, or sort changes
    useEffect(() => {
        let filtered = [...players]; // Start with the initially position-sorted list
        
        // Apply position filter
        if (positionFilter !== 'All') {
            filtered = filtered.filter((player) => {
                const group = getPositionGroup(player.position);
                return group === positionFilter;
            });
        }
        
        // Apply search filter
        if (search) {
            filtered = filtered.filter((player) =>
                player.name?.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        // Apply user-defined sorting if active, otherwise maintain position sort
        if (sortBy) {
            filtered = filtered.sort((a, b) => {
                let aVal = a[sortBy] || 0;
                let bVal = b[sortBy] || 0;
                
                // Handle numeric conversion safely
                aVal = !isNaN(parseFloat(aVal)) ? parseFloat(aVal) : aVal;
                bVal = !isNaN(parseFloat(bVal)) ? parseFloat(bVal) : bVal;
                
                // Special case for interceptions (lower is better)
                if (sortBy === 'interceptions') {
                     // Check if values are numbers before subtracting
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                         return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                     } else {
                         // Fallback for non-numeric or mixed types
                         return 0; 
                     }
                }
                 
                // General numeric sort
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                     return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                 } 
                 
                 // Fallback for string or other types (optional: implement localeCompare if needed)
                return 0; // Default: maintain current order if types mismatch or aren't numbers
            });
        } 
        // No else needed: If sortBy is empty, 'filtered' retains the position sort from the 'players' state
        
        setFilteredPlayers(filtered);
    }, [players, search, positionFilter, sortBy, sortOrder]); // Keep 'players' dependency

    const handleSearch = (e) => {
        setSearch(e.target.value);
    };
    
    const handleSortChange = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };
    
    const handlePositionFilter = (position) => {
        setPositionFilter(position);
    };
    
    const togglePlayerSelection = (player) => {
        if (selectedPlayers.find(p => p.gsis_id === player.gsis_id)) {
            setSelectedPlayers(selectedPlayers.filter(p => p.gsis_id !== player.gsis_id));
        } else if (selectedPlayers.length < 3) {
            setSelectedPlayers([...selectedPlayers, player]);
        }
    };
    
    // Get all relevant stats for a player based on position and stat option
    const getPlayerStats = (player) => {
        const posGroup = getPositionGroup(player.position);
        if (!posGroup) return [];
        
        const statsList = statOption === 'primary' 
            ? POSITION_CONFIG[posGroup]?.primaryStats 
            : POSITION_CONFIG[posGroup]?.secondaryStats;
            
        return statsList || [];
    };
    
    // Generate position distribution data for pie chart
    const generatePositionData = () => {
        const counts = {};
        
        players.forEach(player => {
            const pos = player.position;
            counts[pos] = (counts[pos] || 0) + 1;
        });
        
        return Object.entries(counts).map(([position, count]) => ({
            name: position,
            value: count
        }));
    };
    
    // Generate comparison data for radar chart
    const generateComparisonData = () => {
        if (selectedPlayers.length === 0) return [];
        
        // Find common stats to compare
        const firstPos = getPositionGroup(selectedPlayers[0].position);
        if (!firstPos || selectedPlayers.some(p => getPositionGroup(p.position) !== firstPos)) {
            // If players have different positions, use a generic set of stats
            return [
                { key: 'epa_per_play', label: 'EPA/Play' },
                { key: 'efficiency', label: 'Efficiency' }
            ].map(metric => {
                const result = { metric: metric.label };
                
                // Get all values to normalize
                const allValues = allPlayers
                    .filter(p => p[metric.key] !== null && p[metric.key] !== undefined)
                    .map(p => parseFloat(p[metric.key]) || 0);
                    
                const maxVal = Math.max(...allValues);
                const minVal = Math.min(...allValues);
                
                // Add league average (50th percentile)
                result.leagueAvg = 50;
                
                selectedPlayers.forEach((player, idx) => {
                    const value = parseFloat(player[metric.key]) || 0;
                    result[`player${idx}`] = maxVal > minVal 
                        ? ((value - minVal) / (maxVal - minVal) * 100) 
                        : 50;
                    result[`player${idx}Name`] = player.name;
                });
                
                return result;
            });
        }
        
        // If all players have the same position, use position-specific stats
        const metrics = statOption === 'primary'
            ? POSITION_CONFIG[firstPos].primaryStats
            : POSITION_CONFIG[firstPos].secondaryStats;
            
        return metrics.map(metric => {
            const result = { metric: metric.label };
            
            // Get all values from players with the same position for normalization
            const positionPlayers = allPlayers.filter(p => getPositionGroup(p.position) === firstPos);
            const allValues = positionPlayers
                .filter(p => p[metric.key] !== null && p[metric.key] !== undefined)
                .map(p => parseFloat(p[metric.key]) || 0);
                
            const maxVal = Math.max(...allValues);
            const minVal = Math.min(...allValues);
            
            // Add league average 
            // For standard metrics, this would be 50
            // But for interceptions and other metrics where lower is better, we invert
            const isNegativeStat = metric.key === 'interceptions';
            result.leagueAvg = isNegativeStat ? 50 : 50; // Center of the radar chart 
            
            selectedPlayers.forEach((player, idx) => {
                let value = parseFloat(player[metric.key]) || 0;
                
                // Special case for interceptions (lower is better)
                if (isNegativeStat) {
                    result[`player${idx}`] = maxVal > minVal 
                        ? 100 - ((value - minVal) / (maxVal - minVal) * 100)
                        : 50;
                } else {
                    result[`player${idx}`] = maxVal > minVal 
                        ? ((value - minVal) / (maxVal - minVal) * 100)
                        : 50;
                }
                result[`player${idx}Name`] = player.name;
            });
            
            return result;
        });
    };
    
    // Generate scatter plot data for visualizing player distribution
    const generateScatterData = () => {
        // First get position groups
        const posGroups = {};
        
        filteredPlayers.forEach(player => {
            const group = getPositionGroup(player.position);
            if (group) {
                if (!posGroups[group]) posGroups[group] = [];
                posGroups[group].push(player);
            }
        });
        
        // Next, create scatter data by position
        return Object.entries(posGroups).flatMap(([group, players]) => {
            const config = POSITION_CONFIG[group];
            if (!config) return [];
            
            // Select x and y metrics based on position
            const xMetric = config.primaryStats[0].key;
            const yMetric = config.primaryStats[1].key;
            
            return players.map(player => ({
                x: parseFloat(player[xMetric]) || 0,
                y: parseFloat(player[yMetric]) || 0,
                z: 50, // Size
                name: player.name,
                position: player.position,
                group,
                color: config.color,
                player
            }));
        });
    };

    // Toggle expansion state for a specific player card
    const toggleCardExpansion = (playerId) => {
        setExpandedPlayers(prev => ({
            ...prev, 
            [playerId]: !prev[playerId]
        }));
    };

    if (loading) return <p className="p-6">Loading players...</p>;
    if (error) return <p className="text-red-500 p-6">{error}</p>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">{abbr} Players</h2>
                <Link to="/" className="text-blue-400 underline">← Back to Teams</Link>
            </div>

            {/* View mode toggle */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                        Player Cards
                    </button>
                    <button 
                        onClick={() => setViewMode('stats')}
                        className={`px-3 py-1 rounded ${viewMode === 'stats' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                        Position Stats
                    </button>
                    <button 
                        onClick={() => setViewMode('matrix')}
                        className={`px-3 py-1 rounded ${viewMode === 'matrix' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                        Player Matrix
                    </button>
                    <button 
                        onClick={() => setViewMode('comparison')}
                        className={`px-3 py-1 rounded ${viewMode === 'comparison' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                        Comparison ({selectedPlayers.length}/3)
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search players by name..."
                    value={search}
                    onChange={handleSearch}
                    className="p-2 rounded bg-gray-700 text-white w-full sm:w-1/2"
                />

                <div className="flex space-x-2">
                    <select
                        className="p-2 rounded bg-gray-700 text-white"
                        value={positionFilter}
                        onChange={(e) => handlePositionFilter(e.target.value)}
                    >
                        <option value="All">All Positions</option>
                        <option value="QB">Quarterbacks</option>
                        <option value="RB">Running Backs</option>
                        <option value="WR">Wide Receivers</option>
                        <option value="TE">Tight Ends</option>
                    </select>

                <select
                        className="p-2 rounded bg-gray-700 text-white"
                        onChange={(e) => handleSortChange(e.target.value)}
                >
                    <option value="">Sort by...</option>
                    <option value="passing_yards">Passing Yards</option>
                    <option value="rushing_yards">Rushing Yards</option>
                    <option value="receiving_yards">Receiving Yards</option>
                    <option value="epa_per_play">EPA per Play</option>
                </select>
                    
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 bg-gray-700 rounded"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Player Comparison View */}
            {viewMode === 'comparison' && (
                <div className="bg-gray-800 p-6 rounded-lg mb-8">
                    <h3 className="text-xl font-semibold mb-4">Player Comparison</h3>
                    
                    {selectedPlayers.length === 0 ? (
                        <p className="text-gray-400">Select up to 3 players to compare using the toggle button on player cards.</p>
                    ) : (
                        <>
                            <div className="flex mb-6 space-x-8 justify-center">
                                {selectedPlayers.map((player) => (
                                    <div key={player.gsis_id} className="flex flex-col items-center">
                                        <div className="relative">
                                            {player.headshot_url ? (
                                    <img
                                        src={player.headshot_url}
                                        alt={player.name}
                                                    className="w-20 h-20 rounded-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center">
                                                    <span className="text-gray-300 text-xl">{player.name.split(' ').map(n => n[0]).join('')}</span>
                                                </div>
                                            )}
                                            <div 
                                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                                style={{ backgroundColor: getPositionColor(player.position) }}
                                            >
                                                {player.position}
                                            </div>
                                        </div>
                                        <p className="font-semibold mt-2">{player.name}</p>
                                        <button 
                                            onClick={() => togglePlayerSelection(player)}
                                            className="text-xs text-red-400 mt-1"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {selectedPlayers.length >= 2 && (
                                <>
                                    <div className="w-full h-96 mb-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart 
                                                outerRadius={150} 
                                                data={generateComparisonData()}
                                            >
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="metric" tick={{ fill: 'white' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'white' }} />
                                                
                                                {/* Add league average as a baseline reference */}
                                                <Radar 
                                                    name="League Average" 
                                                    dataKey="leagueAvg" 
                                                    stroke="#8884d8" 
                                                    fill="#8884d8" 
                                                    fillOpacity={0.2} 
                                                />
                                                
                                                {selectedPlayers.map((player, idx) => (
                                                    <Radar 
                                                        key={player.gsis_id}
                                                        name={player.name} 
                                                        dataKey={`player${idx}`} 
                                                        stroke={getPositionColor(player.position)} 
                                                        fill={getPositionColor(player.position)} 
                                                        fillOpacity={0.5} 
                                                    />
                                                ))}
                                                
                                                <Legend 
                                                    verticalAlign="bottom"
                                                    wrapperStyle={{ paddingTop: '20px' }}
                                                />
                                                <RechartsTooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="overflow-x-auto mb-6">
                                        <div className="mb-3 text-sm text-gray-400">
                                            <span className="inline-block w-3 h-3 bg-green-500 mr-1 rounded-sm"></span> Above Average
                                            <span className="inline-block ml-4 w-3 h-3 bg-red-500 mr-1 rounded-sm"></span> Below Average
                                            <span className="inline-block ml-4 text-xs">Numbers in parentheses show percentile rank</span>
                                        </div>
                                        
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3">Stat</th>
                                                    <th className="px-4 py-3">League Avg</th>
                                                    {selectedPlayers.map(player => (
                                                        <th key={player.gsis_id} className="px-4 py-3">{player.name}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Get stats from the first player's position */}
                                                {getPlayerStats(selectedPlayers[0]).map(stat => {
                                                    const posGroup = getPositionGroup(selectedPlayers[0].position);
                                                    // Get all players with same position group
                                                    const positionPlayers = allPlayers.filter(p => getPositionGroup(p.position) === posGroup);
                                                    // Get all values for this stat from those players
                                                    const allValues = positionPlayers
                                                        .filter(p => p[stat.key] != null)
                                                        .map(p => parseFloat(p[stat.key]) || 0);
                                                    
                                                    // Calculate league average
                                                    const leagueAvg = allValues.length 
                                                        ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length 
                                                        : 0;
                                                    
                                                    // Determine if this is a "negative" stat (lower is better)
                                                    const isNegativeStat = stat.key === 'interceptions';
                                                    
                                                    return (
                                                        <tr key={stat.key} className="border-b border-gray-700">
                                                            <td className="px-4 py-3 font-medium">{stat.label}</td>
                                                            <td className="px-4 py-3 text-gray-400">
                                                                {['rushing_yards', 'rushing_tds', 'carries', 'passing_yards', 'passing_tds', 'interceptions', 'receiving_yards', 'receiving_tds', 'receptions'].includes(stat.key)
                                                                    ? parseInt(leagueAvg) 
                                                                    : leagueAvg.toFixed(1)}
                                                            </td>
                                                            {selectedPlayers.map(player => {
                                                                const value = parseFloat(player[stat.key]) || 0;
                                                                const percentile = calculatePercentile(value, allValues);
                                                                
                                                                // Determine if this value is good compared to league average
                                                                const isAboveAvg = isNegativeStat ? value < leagueAvg : value > leagueAvg;
                                                                const isBelowAvg = isNegativeStat ? value > leagueAvg : value < leagueAvg;
                                                                const textColorClass = isAboveAvg ? 'text-green-400' : isBelowAvg ? 'text-red-400' : '';
                                                                
                                                                // Format specific stats as integers
                                                                const displayValue = ['rushing_yards', 'rushing_tds', 'carries', 'passing_yards', 'passing_tds', 'interceptions', 'receiving_yards', 'receiving_tds', 'receptions'].includes(stat.key)
                                                                    ? (player[stat.key] != null ? parseInt(player[stat.key]) : '-')
                                                                    : (player[stat.key] != null ? player[stat.key] : '-');
                                                                
                                                                return (
                                                                    <td key={player.gsis_id} className={`px-4 py-3 ${textColorClass}`}>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {displayValue}
                                                                            </span>
                                                                            <span className="text-xs text-gray-400">
                                                                                ({percentile}%)
                                                                            </span>
                                                                        </div>
                                                                        {/* Percentile bar with gradient matching team style */}
                                                                        <div className="w-full bg-gray-700 h-1 mt-1 rounded-full">
                                                                            <div 
                                                                                className={`h-1 rounded-full bg-gradient-to-r ${getPercentileGradient(percentile, isNegativeStat)}`}
                                                                                style={{ width: `${percentile}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Performance Difference Analysis */}
                                    {selectedPlayers.length === 2 && (
                                        <div className="bg-gray-700 p-4 rounded">
                                            <h4 className="text-lg font-medium mb-3">Head-to-Head Analysis</h4>
                                            <div className="space-y-4">
                                                {getPlayerStats(selectedPlayers[0]).map(stat => {
                                                    const player1Value = parseFloat(selectedPlayers[0][stat.key]) || 0;
                                                    const player2Value = parseFloat(selectedPlayers[1][stat.key]) || 0;
                                                    
                                                    // Determine if this is a "negative" stat (lower is better)
                                                    const isNegativeStat = stat.key === 'interceptions';
                                                    
                                                    // Calculate the difference
                                                    let diff = player1Value - player2Value;
                                                    
                                                    // Determine who is better
                                                    let player1Better = isNegativeStat ? diff < 0 : diff > 0;
                                                    
                                                    // Calculate what percentage better the leading player is
                                                    const denominator = Math.max(Math.abs(player1Value), Math.abs(player2Value), 1);
                                                    const percentDiff = Math.abs(diff) / denominator * 100;
                                                    
                                                    return (
                                                        <div key={stat.key}>
                                                            <div className="flex justify-between mb-1">
                                                                <span className="font-medium">{stat.label}</span>
                                                                <span className="text-sm">
                                                                    {Math.abs(diff).toFixed(1)} {isNegativeStat ? 'fewer' : 'more'} 
                                                                    {' '}({percentDiff.toFixed(0)}% {player1Better ? 'advantage' : 'deficit'})
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-gray-600 h-2 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${player1Better ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    style={{ 
                                                                        width: `${percentDiff > 100 ? 100 : percentDiff}%`,
                                                                        marginLeft: player1Better ? '50%' : `${50 - (percentDiff > 100 ? 100 : percentDiff)}%`
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex justify-between text-xs mt-1 text-gray-400">
                                                                <span>{selectedPlayers[1].name}</span>
                                                                <span>{selectedPlayers[0].name}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
            
            {/* Position Stats View */}
            {viewMode === 'stats' && (
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Position Analysis</h3>
                        
                        {/* Advanced/Primary Stats toggle buttons removed */}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Enhanced Position Distribution Pie Chart */}
                        <div className="bg-gray-850 p-5 rounded-xl border border-gray-700/50 shadow-md">
                            <h4 className="text-lg font-medium mb-4 text-gray-200 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                </svg>
                                Roster Composition
                            </h4>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={generatePositionData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            paddingAngle={2}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {generatePositionData().map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={getPositionColor(entry.name) || CHART_COLORS[index % CHART_COLORS.length]} 
                                                    stroke="rgba(0,0,0,0.2)"
                                                    strokeWidth={1}
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            formatter={(value, name) => [`${value} Players`, `${name}`]}
                                            contentStyle={{ 
                                                backgroundColor: '#1e293b', 
                                                borderRadius: '8px', 
                                                border: '1px solid #475569',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 mt-2">
                                {Object.entries(POSITION_CONFIG).map(([pos, config]) => {
                                    const posCount = players.filter(p => getPositionGroup(p.position) === pos).length;
                                    return (
                                        <div key={pos} className="flex items-center" title={`${pos}: ${posCount} players`}>
                                            <div 
                                                className="w-3 h-3 rounded-full mr-1" 
                                                style={{ backgroundColor: getPositionColor(pos) }}
                                            ></div>
                                            <span className="text-xs text-gray-300">{pos}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Enhanced Position Summary Stats */}
                        <div className="bg-gray-850 p-5 rounded-xl border border-gray-700/50 shadow-md">
                            <h4 className="text-lg font-medium mb-4 text-gray-200 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Position Overview
                            </h4>
                            <div className="space-y-4">
                                {Object.entries(POSITION_CONFIG).map(([pos, config]) => {
                                    const positionPlayers = players.filter(p => getPositionGroup(p.position) === pos);
                                    if (positionPlayers.length === 0) return null;
                                    
                                    // Sort by primary stat for this position
                                    const statKey = config.primaryStats?.[0]?.key;
                                    const sortedPlayers = [...positionPlayers]
                                        .sort((a, b) => (parseFloat(b[statKey]) || 0) - (parseFloat(a[statKey]) || 0));
                                    
                                    // Calculate average
                                    const validValues = positionPlayers
                                        .map(p => parseFloat(p[statKey]) || null)
                                        .filter(v => v !== null);
                                    const avgValue = validValues.length 
                                        ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length 
                                        : 0;
                                    
                                    return (
                                        <div 
                                            key={pos} 
                                            className="bg-gray-800 p-4 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors shadow-sm hover:shadow"
                                            style={{ borderLeftWidth: '3px', borderLeftColor: getPositionColor(pos) }}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center">
                                                    <span className="font-medium text-gray-200">{pos}</span>
                                                    <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs text-gray-300">{positionPlayers.length} players</span>
                                                </div>
                                                <button
                                                    onClick={() => handlePositionFilter(pos)}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    View All →
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">Top Player</div>
                                                    <div className="flex items-center">
                                                        {sortedPlayers.length > 0 && (
                                                            <>
                                                                <div 
                                                                    className="w-6 h-6 rounded-full bg-gray-700 mr-2 flex items-center justify-center overflow-hidden" 
                                                                    title={sortedPlayers[0].name}
                                                                >
                                                                    {sortedPlayers[0].headshot_url ? (
                                                                        <img 
                                                                            src={sortedPlayers[0].headshot_url} 
                                                                            alt={sortedPlayers[0].name}
                                                                            className="w-full h-full object-cover" 
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = `https://via.placeholder.com/60?text=${sortedPlayers[0].name.split(' ')[0][0]}`;
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        sortedPlayers[0].name.split(' ')[0][0]
                                                                    )}
                                                                </div>
                                                                <span className="text-sm text-gray-200">{sortedPlayers[0].name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">
                                                        Avg. {config.primaryStats?.[0]?.label || 'Stat'}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="text-base font-medium text-gray-200">
                                                            {avgValue.toFixed(statKey?.includes('percentage') || statKey?.includes('rate') ? 1 : 0)}
                                                        </span>
                                                        {sortedPlayers.length > 0 && (
                                                            <span className="text-xs text-gray-400 ml-2">
                                                                (Best: {parseFloat(sortedPlayers[0][statKey] || 0).toFixed(statKey?.includes('percentage') || statKey?.includes('rate') ? 1 : 0)})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    {/* Enhanced Position-specific Charts */}
                    <h4 className="text-lg font-medium mb-4 text-gray-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Top Performers by Position
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(POSITION_CONFIG).map(([pos, config]) => {
                            const positionPlayers = filteredPlayers.filter(p => getPositionGroup(p.position) === pos);
                            if (positionPlayers.length === 0) return null;
                            
                            // Get the appropriate stat list based on the selected option
                            const statList = config.primaryStats;
                            if (!statList || statList.length === 0) return null;
                            
                            // Use the first stat in the list
                            const statConfig = statList[0];
                            
                            // Sort by this stat
                            const sortedPlayers = [...positionPlayers]
                                .sort((a, b) => (parseFloat(b[statConfig.key]) || 0) - (parseFloat(a[statConfig.key]) || 0))
                                .slice(0, 5); // Top 5 players
                            
                            const chartData = sortedPlayers.map(player => ({
                                name: player.name.split(' ').pop() || player.name, // Last name or full name if split fails
                                fullName: player.name,
                                value: parseFloat(player[statConfig.key]) || 0,
                                jersey: player.jersey_number || '',
                                headshot: player.headshot_url
                            }));
                            
                            return (
                                <div key={pos} className="bg-gray-850 p-5 rounded-xl border border-gray-700/50 shadow-md">
                                    <h4 className="text-base font-medium mb-3 text-gray-200 flex justify-between items-center">
                                        <div>
                                            <span 
                                                className="inline-block w-3 h-3 rounded-full mr-2" 
                                                style={{ backgroundColor: getPositionColor(pos) }}
                                            ></span>
                                            Top {pos}s by {statConfig.label}
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {positionPlayers.length} total
                                        </span>
                                    </h4>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={chartData} 
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, bottom: 20, left: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#374151" />
                                                <XAxis 
                                                    type="number" 
                                                    tick={{ fill: '#D1D5DB' }} 
                                                    axisLine={{ stroke: '#4B5563' }}
                                                    tickLine={{ stroke: '#4B5563' }}
                                                />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    tick={{ fill: '#D1D5DB' }} 
                                                    width={60}
                                                    axisLine={{ stroke: '#4B5563' }}
                                                    tickLine={{ stroke: '#4B5563' }}
                                                />
                                                <RechartsTooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg">
                                                                    <p className="font-medium text-gray-200">{data.fullName}</p>
                                                                    <div className="flex items-center mt-1">
                                                                        <span className="text-blue-400 font-medium">{statConfig.label}:</span>
                                                                        <span className="ml-1 text-gray-300">{data.value}</span>
                                                                    </div>
                                                                    {data.jersey && (
                                                                        <div className="mt-1 text-xs text-gray-400">
                                                                            Jersey: #{data.jersey}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    fill={getPositionColor(pos)} 
                                                    fillOpacity={0.8}
                                                    stroke={getPositionColor(pos)}
                                                    strokeWidth={1}
                                                    strokeOpacity={1}
                                                    radius={[0, 4, 4, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Player Matrix View */}
            {viewMode === 'matrix' && (
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2">Player Performance Matrix</h3>
                            <p className="text-sm text-gray-400 max-w-2xl">
                                This visualization maps players based on their primary and secondary metrics. Identify standout performers, 
                                compare players, and discover hidden gems by exploring each quadrant.
                            </p>
                        </div>
                        
                        <div className="mt-4 md:mt-0">
                            <select
                                className="p-2 rounded bg-gray-700 text-white border border-gray-600 text-sm"
                                onChange={(e) => handlePositionFilter(e.target.value)}
                                value={positionFilter}
                            >
                                <option value="All">All Positions</option>
                                <option value="QB">Quarterbacks</option>
                                <option value="RB">Running Backs</option>
                                <option value="WR">Wide Receivers</option>
                                <option value="TE">Tight Ends</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <div className="lg:col-span-3 bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-base font-medium text-gray-300 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Matrix Analysis
                            </h4>
                            <p className="text-xs text-gray-400 mb-2">
                                Players are plotted on two primary performance metrics, with position indicated by color. Each quadrant represents a performance profile, 
                                with the top-right containing players exceeding position averages in both metrics.
                            </p>
                            <p className="text-xs text-gray-400">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1 align-middle"></span> Click on dots to add players to your comparison.
                                <span className="inline-block ml-3 text-xs"><span className="text-blue-400">Selected</span> players have rings around them.</span>
                            </p>
                        </div>
                        
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-base font-medium text-gray-300 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Quadrant Legend
                            </h4>
                            <div className="grid grid-cols-1 gap-2 mt-2 text-xs">
                                <div className="flex items-center p-1.5 bg-emerald-900/40 rounded-md border border-emerald-900/60">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-sm mr-2"></div>
                                    <span>Elite (High both metrics)</span>
                                </div>
                                <div className="flex items-center p-1.5 bg-lime-900/40 rounded-md border border-lime-900/60">
                                    <div className="w-3 h-3 bg-lime-400 rounded-sm mr-2"></div>
                                    <span>Emerging (High Y, Low X)</span>
                                </div>
                                <div className="flex items-center p-1.5 bg-amber-900/40 rounded-md border border-amber-900/60">
                                    <div className="w-3 h-3 bg-amber-400 rounded-sm mr-2"></div>
                                    <span>Established (High X, Low Y)</span>
                                </div>
                                <div className="flex items-center p-1.5 bg-orange-900/40 rounded-md border border-orange-900/60">
                                    <div className="w-3 h-3 bg-orange-500 rounded-sm mr-2"></div>
                                    <span>Developing (Low both metrics)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full h-[600px] bg-gray-850 p-3 sm:p-6 rounded-xl border border-gray-700/50 shadow-md">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                                margin={{ top: 20, right: 30, bottom: 60, left: 50 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                    type="number" 
                                    dataKey="x" 
                                    name="Primary Stat" 
                                    tick={{ fill: 'white' }}
                                    label={{ 
                                        value: 'Primary Metric (varies by position)', 
                                        position: 'bottom', 
                                        fill: 'white',
                                        offset: 10
                                    }}
                                    domain={['dataMin - 5', 'dataMax + 5']}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="y" 
                                    name="Secondary Stat" 
                                    tick={{ fill: 'white' }}
                                    label={{ 
                                        value: 'Secondary Metric (varies by position)', 
                                        angle: -90, 
                                        position: 'left', 
                                        fill: 'white' 
                                    }} 
                                    domain={['dataMin - 5', 'dataMax + 5']}
                                />
                                <ZAxis type="number" dataKey="z" range={[40, 80]} />
                                
                                {/* Add quadrant coloring based on position averages */}
                                {Object.entries(POSITION_CONFIG).map(([pos, config]) => {
                                    const posData = generateScatterData().filter(d => d.group === pos);
                                    if (posData.length === 0) return null;
                                    
                                    // Calculate average X and Y values for this position
                                    const avgX = posData.reduce((sum, d) => sum + d.x, 0) / posData.length;
                                    const avgY = posData.reduce((sum, d) => sum + d.y, 0) / posData.length;
                                    const maxX = Math.max(...posData.map(d => d.x));
                                    const maxY = Math.max(...posData.map(d => d.y));
                                    
                                    // Create reference areas for quadrants with subtle colors
                                    return (
                                        <React.Fragment key={`quadrants-${pos}`}>
                                            {/* Elite Quadrant - top right */}
                                            <ReferenceArea 
                                                x1={avgX} 
                                                x2={maxX * 1.1} 
                                                y1={avgY} 
                                                y2={maxY * 1.1}
                                                fill="#10B981"
                                                fillOpacity={0.05}
                                                stroke="#10B981"
                                                strokeOpacity={0.3}
                                                strokeWidth={1}
                                                strokeDasharray="3 3"
                                            />
                                            
                                            {/* Emerging - top left */}
                                            <ReferenceArea 
                                                x1={0} 
                                                x2={avgX} 
                                                y1={avgY} 
                                                y2={maxY * 1.1}
                                                fill="#A3E635"
                                                fillOpacity={0.05}
                                                stroke="#A3E635"
                                                strokeOpacity={0.3}
                                                strokeWidth={1}
                                                strokeDasharray="3 3"
                                            />
                                            
                                            {/* Established - bottom right */}
                                            <ReferenceArea 
                                                x1={avgX} 
                                                x2={maxX * 1.1} 
                                                y1={0}
                                                y2={avgY}
                                                fill="#F59E0B"
                                                fillOpacity={0.05}
                                                stroke="#F59E0B"
                                                strokeOpacity={0.3}
                                                strokeWidth={1}
                                                strokeDasharray="3 3"
                                            />
                                            
                                            {/* Developing - bottom left */}
                                            <ReferenceArea 
                                                x1={0} 
                                                x2={avgX} 
                                                y1={0}
                                                y2={avgY}
                                                fill="#F97316"
                                                fillOpacity={0.05}
                                                stroke="#F97316"
                                                strokeOpacity={0.3}
                                                strokeWidth={1}
                                                strokeDasharray="3 3"
                                            />
                                            
                                            {/* Reference lines showing position averages */}
                                            <ReferenceLine
                                                x={avgX}
                                                stroke={config.color}
                                                strokeDasharray="3 3"
                                                strokeOpacity={0.7}
                                                label={{
                                                    value: `${pos} Avg`,
                                                    fill: config.color,
                                                    fontSize: 12,
                                                    position: 'insideBottom'
                                                }}
                                            />
                                            <ReferenceLine
                                                y={avgY}
                                                stroke={config.color}
                                                strokeDasharray="3 3"
                                                strokeOpacity={0.7}
                                                label={{
                                                    value: `${pos} Avg`,
                                                    fill: config.color, 
                                                    fontSize: 12,
                                                    position: 'insideLeft'
                                                }}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                
                                <RechartsTooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            const pos = getPositionGroup(data.position);
                                            const config = POSITION_CONFIG[pos];
                                            
                                            // Calculate percentiles
                                            const positionPlayers = allPlayers.filter(p => getPositionGroup(p.position) === pos);
                                            const xValues = positionPlayers.map(p => parseFloat(p[config?.primaryStats[0].key]) || 0);
                                            const yValues = positionPlayers.map(p => parseFloat(p[config?.primaryStats[1].key]) || 0);
                                            
                                            const xPercentile = calculatePercentile(data.x, xValues);
                                            const yPercentile = calculatePercentile(data.y, yValues);
                                            
                                            // Determine quadrant and color based on position averages
                                            const posData = generateScatterData().filter(d => d.group === pos);
                                            const avgX = posData.length ? posData.reduce((sum, d) => sum + d.x, 0) / posData.length : 0;
                                            const avgY = posData.length ? posData.reduce((sum, d) => sum + d.y, 0) / posData.length : 0;
                                            
                                            let quadrantName, quadrantColor;
                                            if (data.x >= avgX && data.y >= avgY) {
                                                quadrantName = "Elite";
                                                quadrantColor = "#10B981"; // emerald-500
                                            } else if (data.x < avgX && data.y >= avgY) {
                                                quadrantName = "Emerging";
                                                quadrantColor = "#A3E635"; // lime-400
                                            } else if (data.x >= avgX && data.y < avgY) {
                                                quadrantName = "Established";
                                                quadrantColor = "#F59E0B"; // amber-500
                                            } else {
                                                quadrantName = "Developing";
                                                quadrantColor = "#F97316"; // orange-500
                                            }
                                            
                                            // Get the headshot URL with fallback
                                            const getHeadshotUrl = (player) => {
                                                if (player.headshot_url) return player.headshot_url;
                                                return `https://via.placeholder.com/50?text=${player.name.split(' ')[0][0]}${player.name.split(' ').length > 1 ? player.name.split(' ')[1][0] : ''}`;
                                            };
                                            
                                            return (
                                                <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg shadow-lg max-w-xs">
                                                    <div className="flex items-center mb-3">
                                                        <div className="relative mr-3 flex-shrink-0">
                                                            <img 
                                                                src={getHeadshotUrl(data.player)}
                                                                alt={data.name}
                                                                className="w-12 h-12 rounded-full object-cover bg-gray-700"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = `https://via.placeholder.com/50?text=${data.name.split(' ')[0][0]}${data.name.split(' ').length > 1 ? data.name.split(' ')[1][0] : ''}`;
                                                                }}
                                                            />
                                                            <div 
                                                                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800"
                                                                style={{ backgroundColor: data.color }}
                                                            >
                                                                {data.position}
                                                    </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-base text-white">{data.name}</h4>
                                                            <p className="text-xs text-gray-400">
                                                                {data.position} · {data.player.team}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-2 mb-3 rounded-md border" style={{ 
                                                        borderColor: quadrantColor,
                                                        backgroundColor: `${quadrantColor}20` 
                                                    }}>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-medium" style={{ color: quadrantColor }}>{quadrantName} Player</span>
                                                            <div className="flex items-center text-xs text-gray-400">
                                                                {selectedPlayers.some(p => p.gsis_id === data.player.gsis_id) ? (
                                                                    <span className="flex items-center text-blue-400">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                        Selected
                                                                    </span>
                                                                ) : (
                                                                    <span>Click to select</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mb-2">
                                                        <div>
                                                            <p className="text-xs text-gray-400 mb-1">{config?.primaryStats[0].label}</p>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">{Number(data.x).toFixed(1)}</span>
                                                                <span className="text-xs text-gray-400">{xPercentile}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-700 h-1 mt-1 rounded-full">
                                                                <div className={`h-full rounded-full bg-gradient-to-r ${getPercentileGradient(xPercentile)}`} 
                                                                    style={{ width: `${xPercentile}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-400 mb-1">{config?.primaryStats[1].label}</p>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">{Number(data.y).toFixed(1)}</span>
                                                                <span className="text-xs text-gray-400">{yPercentile}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-700 h-1 mt-1 rounded-full">
                                                                <div className={`h-full rounded-full bg-gradient-to-r ${getPercentileGradient(yPercentile)}`}
                                                                    style={{ width: `${yPercentile}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-center mt-2">
                                                        <button 
                                                            className="text-xs py-1 px-3 bg-gray-700 hover:bg-gray-600 rounded text-blue-400 transition-colors"
                                                            onClick={() => togglePlayerSelection(data.player)}
                                                        >
                                                            {selectedPlayers.some(p => p.gsis_id === data.player.gsis_id) 
                                                                ? "Remove from comparison"
                                                                : "Add to comparison"}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                
                                {/* Position group scatter plots with custom rendering */}
                                {Object.entries(POSITION_CONFIG).map(([pos, config]) => {
                                    const posData = generateScatterData().filter(d => d.group === pos);
                                    if (posData.length === 0) return null;
                                    
                                    // Calculate statistics for annotations
                                    const avgX = posData.reduce((sum, d) => sum + d.x, 0) / posData.length;
                                    const avgY = posData.reduce((sum, d) => sum + d.y, 0) / posData.length;
                                    
                                    return (
                                        <Scatter 
                                            key={pos}
                                            name={pos} 
                                            data={posData} 
                                            fill={config.color}
                                            stroke="#fff"
                                            strokeWidth={0.5}
                                            shape={(props) => {
                                                const { cx, cy, payload } = props;
                                                
                                                // Check if player is selected
                                                const isSelected = selectedPlayers.some(p => p.gsis_id === payload.player.gsis_id);
                                                
                                                // Determine quadrant color
                                                let quadrantColor;
                                                if (payload.x >= avgX && payload.y >= avgY) {
                                                    quadrantColor = '#10B981'; // Elite - emerald-500
                                                } else if (payload.x < avgX && payload.y >= avgY) {
                                                    quadrantColor = '#A3E635'; // Emerging - lime-400
                                                } else if (payload.x >= avgX && payload.y < avgY) {
                                                    quadrantColor = '#F59E0B'; // Established - amber-400
                                                } else {
                                                    quadrantColor = '#F97316'; // Developing - orange-500
                                                }
                                                
                                                return (
                                                    <g>
                                                        {/* Highlight circle for selected players */}
                                                        {isSelected && (
                                                        <circle 
                                                            cx={cx} 
                                                            cy={cy} 
                                                                r={10} 
                                                                fill="transparent"
                                                                stroke="#3B82F6"
                                                            strokeWidth={2}
                                                                strokeDasharray="2 2"
                                                            />
                                                        )}
                                                        
                                                        {/* Main circle with quadrant color */}
                                                        <circle 
                                                            cx={cx} 
                                                            cy={cy} 
                                                            r={isSelected ? 7 : 6} 
                                                            fill={quadrantColor}
                                                            stroke={isSelected ? "#fff" : "rgba(255,255,255,0.4)"}
                                                            strokeWidth={isSelected ? 1.5 : 0.5}
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                filter: isSelected ? 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))' : 'none',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onClick={() => togglePlayerSelection(payload.player)}
                                                            className="hover:opacity-90"
                                                        />
                                                        
                                                        {/* Position indicator in center */}
                                                        <text
                                                            x={cx}
                                                            y={cy}
                                                            textAnchor="middle"
                                                            dominantBaseline="middle"
                                                            style={{
                                                                fontSize: '7px',
                                                                fontWeight: 'bold',
                                                                fill: '#fff',
                                                                pointerEvents: 'none'
                                                            }}
                                                        >
                                                            {payload.position}
                                                        </text>
                                                    </g>
                                                );
                                            }}
                                        />
                                    );
                                })}
                                
                                {/* Render a custom Legend with better positioning */}
                                <Legend
                                    payload={
                                        Object.entries(POSITION_CONFIG).map(([pos, config]) => ({
                                            value: pos,
                                            type: 'circle',
                                            id: pos,
                                            color: config.color
                                        }))
                                    }
                                    formatter={(value, entry) => (
                                        <span style={{ color: 'white', marginLeft: '5px' }}>{value}</span>
                                    )}
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ 
                                        bottom: -20,
                                        paddingTop: 20,
                                        marginTop: 20,
                                        position: 'relative'
                                    }}
                                    height={36}
                                    iconSize={10}
                                    margin={{ top: 15, left: 0, right: 0, bottom: 0 }}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Selected Players for Comparison */}
                    {selectedPlayers.length > 0 && (
                        <div className="mt-6 bg-gray-850 p-4 rounded-xl border border-gray-700/50 shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-base font-medium text-gray-300 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Selected Players ({selectedPlayers.length}/3)
                                </h4>
                                <button
                                    onClick={() => setSelectedPlayers([])}
                                    className="text-xs py-1 px-3 bg-gray-700 hover:bg-gray-600 rounded text-red-400 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                {selectedPlayers.map(player => {
                                    const posGroup = getPositionGroup(player.position);
                                    const positionColor = getPositionColor(player.position);
                                    
                                    return (
                                        <div key={player.gsis_id} className="flex flex-col items-center bg-gray-800 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all duration-200 hover:shadow-md">
                                            <div className="relative">
                                                {player.headshot_url ? (
                                                    <img
                                                        src={player.headshot_url}
                                                        alt={player.name}
                                                        className="w-16 h-16 rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://via.placeholder.com/64?text=${player.name.split(' ')[0][0]}${player.name.split(' ').length > 1 ? player.name.split(' ')[1][0] : ''}`;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                                                        <span className="text-xl text-gray-400 font-bold">
                                                            {player.name.split(' ')[0][0]}{player.name.split(' ').length > 1 ? player.name.split(' ')[1][0] : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                <div 
                                                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800"
                                                    style={{ backgroundColor: positionColor }}
                                                >
                                                    {player.position}
                                                </div>
                                            </div>
                                            <span className="font-semibold mt-2 text-center">{player.name}</span>
                                            <div className="flex items-center mt-1">
                                                <span className="text-xs text-gray-400">{player.team}</span>
                                            </div>
                                            <button 
                                                onClick={() => togglePlayerSelection(player)}
                                                className="mt-2 text-xs py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-red-400 transition-colors flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                                
                                {/* Show comparison button when multiple players selected */}
                                {selectedPlayers.length >= 2 && (
                                    <div className="w-full mt-4 flex justify-center">
                                        <button
                                            onClick={() => setViewMode('comparison')}
                                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            Go to Detailed Comparison
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Player Cards View - ENHANCED With Expandable Cards */}
            {viewMode === 'cards' && (
                <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPlayers.length === 0 ? (
                            <div className="text-yellow-400 col-span-full text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-lg font-medium mb-1">No players match your search.</p>
                                <p className="text-sm text-gray-400">Try adjusting your filters or search term.</p>
                            </div>
                        ) : (
                            filteredPlayers
                                .filter(player => {
                                    // Hide players with no stats to display
                                    const posGroup = getPositionGroup(player.position);
                                    if (!posGroup || !POSITION_CONFIG[posGroup]) return false;
                                    
                                    // Check if player has any stats in their position group
                                    const stats = POSITION_CONFIG[posGroup].primaryStats;
                                    if (!stats || stats.length === 0) return false;
                                    
                                    // Check if player has at least one non-null stat value
                                    return stats.some(stat => player[stat.key] != null);
                                })
                                .map((player) => {
                                const posGroup = getPositionGroup(player.position);
                                const isSelected = selectedPlayers.some(p => p.gsis_id === player.gsis_id);
                                const positionColor = getPositionColor(player.position);
                                const isExpanded = expandedPlayers[player.gsis_id] || false;
                                
                                // Calculate performance grade based on key metrics
                                const calculateGrade = (player, posGroup) => {
                                        if (!posGroup || !POSITION_CONFIG[posGroup]) return { grade: 'C', color: 'text-amber-400' };
                                    
                                    const stats = POSITION_CONFIG[posGroup].primaryStats;
                                    const percentiles = stats
                                        .filter(stat => player[stat.key] != null)
                                        .map(stat => {
                                            const allValues = allPlayers
                                                .filter(p => getPositionGroup(p.position) === posGroup && p[stat.key] != null)
                                                .map(p => parseFloat(p[stat.key]) || 0);
                                            
                                            let percentile = calculatePercentile(parseFloat(player[stat.key]) || 0, allValues);
                                            // Invert for negative stats
                                            if (stat.key === 'interceptions') percentile = 100 - percentile;
                                            return percentile;
                                        });
                                    
                                        if (percentiles.length === 0) return { grade: 'C', color: 'text-amber-400' };
                                    
                                    const avgPercentile = percentiles.reduce((sum, p) => sum + p, 0) / percentiles.length;
                                    
                                        // Match the updated color scheme with getPercentileColorClass
                                        if (avgPercentile >= 90) return { grade: 'A+', color: 'text-emerald-500' };
                                        if (avgPercentile >= 80) return { grade: 'A', color: 'text-emerald-400' };
                                        if (avgPercentile >= 70) return { grade: 'B+', color: 'text-green-400' };
                                        if (avgPercentile >= 60) return { grade: 'B', color: 'text-lime-400' };
                                        if (avgPercentile >= 50) return { grade: 'C+', color: 'text-amber-300' };
                                        if (avgPercentile >= 40) return { grade: 'C', color: 'text-amber-400' };
                                        if (avgPercentile >= 30) return { grade: 'D+', color: 'text-orange-400' };
                                        if (avgPercentile >= 20) return { grade: 'D', color: 'text-orange-500' };
                                        if (avgPercentile >= 10) return { grade: 'F+', color: 'text-orange-600' };
                                        return { grade: 'F', color: 'text-red-500' };
                                };
                                
                                const performance = calculateGrade(player, posGroup);

                                const renderStatBlock = (statType, heading) => {
                                    if (!posGroup || !POSITION_CONFIG[posGroup]) return null;
                                    
                                    const stats = POSITION_CONFIG[posGroup][statType];
                                    if (!stats || stats.length === 0) return null;
                                    
                                    return (
                                        <div className="space-y-4">
                                            {heading && (
                                                    <h4 className="text-xs uppercase font-semibold text-gray-400 border-b border-gray-700/50 pb-2 flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                        {heading}
                                                    </h4>
                                            )}
                                                <div className="grid grid-cols-2 gap-4">
                                                {stats
                                                    .filter(stat => player[stat.key] != null)
                                                    .map(stat => {
                                                        // Calculate percentile
                                                        const allValues = allPlayers
                                                            .filter(p => getPositionGroup(p.position) === posGroup && p[stat.key] != null)
                                                            .map(p => parseFloat(p[stat.key]) || 0);
                                                            
                                                        const value = parseFloat(player[stat.key]) || 0;
                                                        const percentile = calculatePercentile(value, allValues);
                                                        
                                                        // For interceptions and other negative stats, invert the display logic but not percentile
                                                        const isNegativeStat = stat.key === 'interceptions';
                                                        const displayPercentile = isNegativeStat ? 100 - percentile : percentile;
                                                        
                                                        // Use shared helper function for percentile color
                                                        const percentileColorClass = getPercentileColorClass(displayPercentile);
                                                        const gradientClass = getPercentileGradient(displayPercentile);
                                                        
                                                        // Get the tier label based on percentile - matching team view
                                                        let tierLabel;
                                                        if (displayPercentile >= 90) tierLabel = 'Elite';
                                                            else if (displayPercentile >= 80) tierLabel = 'Great';
                                                            else if (displayPercentile >= 70) tierLabel = 'Very Good';
                                                            else if (displayPercentile >= 60) tierLabel = 'Above Avg';
                                                            else if (displayPercentile >= 50) tierLabel = 'Solid';
                                                        else if (displayPercentile >= 40) tierLabel = 'Average';
                                                            else if (displayPercentile >= 30) tierLabel = 'Below Avg';
                                                            else if (displayPercentile >= 20) tierLabel = 'Poor';
                                                            else if (displayPercentile >= 10) tierLabel = 'Very Poor';
                                                            else tierLabel = 'Terrible';
                                                            
                                                        return (
                                                                <div key={stat.key} className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 hover:border-gray-700 p-3.5 relative transition-all duration-150 shadow-sm hover:shadow group">
                                                                    {/* Header now stacked with label above instead of side-by-side */}
                                                                    <div className="mb-2">
                                                                        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium group-hover:text-gray-300 transition-colors truncate">
                                                                        {stat.label}
                                                                    </div>
                                                                </div>
                                                                
                                                                    {/* Value and percentile with tier label moved down */}
                                                                    <div className="flex items-end justify-between mb-2">
                                                                        <span className="text-2xl font-bold group-hover:text-white transition-colors">{player[stat.key]}</span>
                                                                        <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                                                                        {percentile}%
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Percentile bar with gradient matching team style */}
                                                                    <div className="mt-2 mb-2 w-full bg-gray-700/70 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                            className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
                                                                        style={{ 
                                                                            width: `${percentile}%`,
                                                                            transform: isNegativeStat ? 'scaleX(-1)' : 'none'
                                                                        }}
                                                                    />
                                                                </div>
                                                                    
                                                                    {/* Tier label now positioned at bottom */}
                                                                    <div className="flex justify-center">
                                                                        <div className={`text-xs px-2 py-0.5 rounded-full transition-colors ${percentileColorClass} text-center`}>
                                                                            {tierLabel}
                                                                        </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>
                                    );
                                };
                                
                                return (
                                    <div 
                                        key={player.gsis_id}
                                            className={`team-card bg-gray-850 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out ${isExpanded ? 'transform-none' : 'transform hover:-translate-y-1 focus:-translate-y-1'} flex flex-col overflow-hidden border ${isSelected ? 'border-blue-500' : 'border-gray-700/50 hover:border-gray-600'} outline-none`}
                                    >
                                        {/* Header with gradient background */}
                                        <div 
                                                className="relative p-5 flex items-center"
                                            style={{ 
                                                    background: `linear-gradient(to right, rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.7)), linear-gradient(to right, ${positionColor || '#4B5563'}, ${positionColor || '#4B5563'}90)` 
                                            }}
                                        >
                                            {/* Add/Remove Compare Button (positioned absolutely) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePlayerSelection(player);
                                                }}
                                                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                                                    isSelected 
                                                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' 
                                                            : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 hover:text-white'
                                                }`}
                                                title={isSelected ? "Remove from comparison" : "Add to comparison"}
                                                aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
                                            >
                                                {isSelected ? '−' : '+'}
                                            </button>

                                            {/* Player Image and Badge */}
                                                <div className="relative mr-4 flex-shrink-0">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shadow-md transform transition-transform duration-300 hover:scale-105">
                                                    <img 
                                                            src={player.headshot_url || `https://via.placeholder.com/80?text=${player.name.split(' ')[0][0]}${player.name.split(' ').length > 1 ? player.name.split(' ')[1][0] : ''}`}
                                                        alt={player.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                                e.target.src = `https://via.placeholder.com/80?text=${player.name.split(' ')[0][0]}${player.name.split(' ').length > 1 ? player.name.split(' ')[1][0] : ''}`;
                                                        }}
                                                    />
                                                </div>
                                                {/* Position Badge */}
                                                <div 
                                                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs text-white border-2 border-gray-850 shadow-md"
                                                    style={{ backgroundColor: positionColor }}
                                                >
                                                    {player.position}
                                                </div>
                                            </div>
                                            
                                            {/* Player Info */}
                                            <div className="flex-1">
                                                    <h3 className="font-bold text-xl text-white truncate leading-tight" title={player.name}>
                                                    {player.name}
                                                </h3>
                                                    <div className="text-sm text-gray-300 mt-1 flex items-center">
                                                        <span className="mr-2">{player.team}</span>
                                                        {player.jersey_number && (
                                                            <span className="px-1.5 py-0.5 bg-gray-700/80 rounded text-xs">#{player.jersey_number}</span>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Stats Content */}
                                            <div className="flex-1 p-5 bg-gray-850">
                                            {/* Key Stats based on Position Group */}
                                            {posGroup && (
                                                    <div className="space-y-6">
                                                    {/* Primary Stats */}
                                                    {renderStatBlock('primaryStats')}

                                                    {/* Advanced Stats (shown when expanded) */}
                                                    {isExpanded && renderStatBlock('secondaryStats', 'Advanced Stats')}
                                                    
                                                    {/* Expand/Collapse Button */}
                                                    {POSITION_CONFIG[posGroup]?.secondaryStats?.length > 0 && (
                                                        <button 
                                                            onClick={() => toggleCardExpansion(player.gsis_id)}
                                                                className={`w-full flex items-center justify-center p-2 text-xs text-gray-400 rounded-md transition-all duration-150 ${
                                                                    isExpanded 
                                                                        ? 'bg-gray-800/70 border border-gray-700/50 hover:bg-gray-700 hover:text-white mt-3' 
                                                                        : 'bg-gray-800/40 hover:bg-gray-700 hover:text-white border border-transparent hover:border-gray-700/50 mt-1'
                                                                }`}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                    </svg>
                                                                    Collapse Stats
                                                                </>
                                                            ) : (
                                                                <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                    Show Advanced Stats
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Footer with Profile Link */}
                                            <div className="bg-gray-800/60 p-3 border-t border-gray-700/50">
                                                <Link 
                                                    to={`/player/${player.gsis_id}`}
                                                    className="w-full flex justify-center items-center py-1.5 px-4 rounded bg-gray-700/60 hover:bg-gray-700 transition-colors group"
                                                >
                                                    <span className="text-sm text-blue-400 group-hover:text-blue-300 transition-colors font-medium">View Player Profile</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-blue-400 group-hover:text-blue-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* Card View Legend */}
                    {filteredPlayers.length > 0 && (
                        <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">Performance Grading Scale</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                                <div className="flex items-center">
                                    <span className="text-emerald-500 font-bold mr-2">A+</span>
                                    <span className="text-gray-400">Elite (90-100%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-emerald-400 font-bold mr-2">A</span>
                                    <span className="text-gray-400">Great (80-89%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-400 font-bold mr-2">B+</span>
                                    <span className="text-gray-400">Very Good (70-79%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-lime-400 font-bold mr-2">B</span>
                                    <span className="text-gray-400">Above Avg (60-69%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-amber-300 font-bold mr-2">C+</span>
                                    <span className="text-gray-400">Solid (50-59%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-amber-400 font-bold mr-2">C</span>
                                    <span className="text-gray-400">Average (40-49%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-orange-400 font-bold mr-2">D+</span>
                                    <span className="text-gray-400">Below Avg (30-39%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-orange-500 font-bold mr-2">D</span>
                                    <span className="text-gray-400">Poor (20-29%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-orange-600 font-bold mr-2">F+</span>
                                    <span className="text-gray-400">Very Poor (10-19%)</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-red-500 font-bold mr-2">F</span>
                                    <span className="text-gray-400">Terrible (0-9%)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerList;

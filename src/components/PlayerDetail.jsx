import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Tooltip from './Tooltip';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, CartesianGrid, Legend, Scatter, ScatterChart, ZAxis,
    ComposedChart, Area, Cell, ReferenceLine
} from 'recharts';
import { fetchPlayers } from '../api/api';

// Position-specific key metrics
const POSITION_METRICS = {
    QB: {
        primaryStats: ['passing_yards', 'passing_tds', 'completion_percentage', 'interceptions'],
        advancedStats: ['qbr', 'cpoe', 'any_a', 'epa_per_att', 'passer_rating'],
        radarStats: [
            { key: 'cpoe', label: 'CPOE' },
            { key: 'epa_per_att', label: 'EPA/Att' },
            { key: 'any_a', label: 'ANY/A' },
            { key: 'completion_percentage', label: 'Comp %' },
            { key: 'qbr', label: 'QBR' }
        ]
    },
    RB: {
        primaryStats: ['rushing_yards', 'rushing_tds', 'yards_per_carry', 'rushing_attempts'],
        advancedStats: ['rush_yards_oe_per_att', 'rush_pct_over_expected', 'epa_per_rush'],
        radarStats: [
            { key: 'yards_per_carry', label: 'YPC' },
            { key: 'rush_yards_oe_per_att', label: 'RYOE/Att' },
            { key: 'epa_per_rush', label: 'EPA/Rush' },
            { key: 'rush_pct_over_expected', label: '%Over Exp' }
        ]
    },
    WR: {
        primaryStats: ['receiving_yards', 'receptions', 'receiving_tds', 'targets'],
        advancedStats: ['yards_per_target', 'efficiency', 'wopr', 'avg_separation', 'yac_oe'],
        radarStats: [
            { key: 'yards_per_target', label: 'YPT' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'wopr', label: 'WOPR' },
            { key: 'avg_separation', label: 'Separation' },
            { key: 'yac_oe', label: 'YAC+' }
        ]
    },
    TE: {
        primaryStats: ['receiving_yards', 'receptions', 'receiving_tds', 'targets'],
        advancedStats: ['yards_per_target', 'efficiency', 'racr'],
        radarStats: [
            { key: 'yards_per_target', label: 'YPT' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'racr', label: 'RACR' }
        ]
    }
};

// Default stats for positions not in the mapping
const DEFAULT_STATS = {
    primaryStats: ['epa_per_play', 'snaps_played'],
    advancedStats: [],
    radarStats: []
};

// Colors for visualizations
const COLORS = {
    primary: '#60A5FA',
    secondary: '#F97316',
    tertiary: '#10B981',
    background: '#374151',
    text: '#F3F4F6',
    accent: '#8B5CF6',
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#F59E0B'
};

// Normalize value for radar chart (0-100 scale)
const normalizeValue = (value, max, min = 0) => {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
};

// Mock NFL data for games to simulate trends since we don't have per-game data
const MOCK_GAMES = [
    { week: 1 }, { week: 2 }, { week: 3 }, { week: 4 }, 
    { week: 5 }, { week: 6 }, { week: 7 }, { week: 8 },
    { week: 9 }, { week: 10 }, { week: 11 }, { week: 12 }
];

// Generate mock trend data based on player season stats
const generateMockTrendData = (player, stat, totalWeeks = 12) => {
    if (!player || player[stat] == null) return [];
    
    const seasonTotal = parseFloat(player[stat]);
    const avgPerGame = seasonTotal / totalWeeks;
    
    // Add some variance to make it look realistic
    return MOCK_GAMES.map((game, idx) => {
        const week = idx + 1;
        // Add random variance (±30%) while ensuring the overall average stays close to the real average
        const variance = Math.random() * 0.6 - 0.3; // -30% to +30%
        let weekValue = avgPerGame * (1 + variance);
        
        // Ensure non-negative values for stats that can't be negative
        weekValue = Math.max(0, weekValue);
        
        return {
            week: `Week ${week}`,
            value: parseFloat(weekValue.toFixed(2)),
            season_avg: parseFloat(avgPerGame.toFixed(2))
        };
    });
};

const PlayerDetail = () => {
    const { id } = useParams();
    const [player, setPlayer] = useState(null);
    const [positionPlayers, setPositionPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [leagueAverages, setLeagueAverages] = useState({});
    const [percentileRanks, setPercentileRanks] = useState({});
    const [trendMetric, setTrendMetric] = useState('');

    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchPlayers()
            .then(res => {
                const allFetchedPlayers = Array.isArray(res.data) ? res.data : [];
                
                const found = allFetchedPlayers.find(p => p.gsis_id === id);
                if (!found) throw new Error('Player not found in fetched data');
                
                const posPlayers = allFetchedPlayers.filter(p => p.position === found.position && 
                    (p.snaps_played == null || p.snaps_played >= 200));
                
                setPositionPlayers(posPlayers);
                
                const avgStats = {};
                const calculatedPercentiles = {};
                const metrics = [
                    ...(POSITION_METRICS[found.position]?.primaryStats || []),
                    ...(POSITION_METRICS[found.position]?.advancedStats || [])
                ];
                                
                metrics.forEach(metric => {
                    const values = posPlayers
                        .filter(p => p[metric] != null)
                        .map(p => Number(p[metric]));
                    
                    if (values.length > 0) {
                        const sum = values.reduce((a, b) => a + b, 0);
                        avgStats[metric] = sum / values.length;
                        
                        if (found[metric] != null) {
                            const sortedValues = [...values].sort((a, b) => a - b);
                            const playerValue = Number(found[metric]);
                            const idx = sortedValues.findIndex(v => v >= playerValue);
                            const percentile = Math.round((idx / sortedValues.length) * 100);
                            calculatedPercentiles[metric] = percentile;
                        }
                    }
                });
                
                setLeagueAverages(avgStats);
                setPercentileRanks(calculatedPercentiles);
                setPlayer(found);
                
                if (found.position === 'QB') {
                    setTrendMetric('passing_yards');
                } else if (found.position === 'RB') {
                    setTrendMetric('rushing_yards');
                } else if (found.position === 'WR' || found.position === 'TE') {
                    setTrendMetric('receiving_yards');
                } else {
                    const posConfig = POSITION_METRICS[found.position] || DEFAULT_STATS;
                    setTrendMetric(posConfig.primaryStats[0] || 'epa_per_play');
                }
            })
            .catch(err => {
                console.error('Error loading player data:', err.message);
                setError(`Failed to load player data: ${err.message}`);
            })
            .finally(() => setLoading(false));
    }, [id]);

    // Generate a grade from a percentile (A+ to F)
    const getGradeFromPercentile = (percentile) => {
        if (percentile >= 97) return 'A+';
        if (percentile >= 93) return 'A';
        if (percentile >= 90) return 'A-';
        if (percentile >= 87) return 'B+';
        if (percentile >= 83) return 'B';
        if (percentile >= 80) return 'B-';
        if (percentile >= 77) return 'C+';
        if (percentile >= 73) return 'C';
        if (percentile >= 70) return 'C-';
        if (percentile >= 67) return 'D+';
        if (percentile >= 63) return 'D';
        if (percentile >= 60) return 'D-';
        return 'F';
    };
    
    // Get color class based on grade
    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return 'text-green-400';
        if (grade.startsWith('B')) return 'text-teal-400';
        if (grade.startsWith('C')) return 'text-yellow-400';
        if (grade.startsWith('D')) return 'text-orange-400';
        return 'text-red-400';
    };

    if (loading) return <p className="p-6">Loading player data...</p>;
    if (error) return <p className="text-red-500 p-6">{error}</p>;

    const statDescriptions = {
        passing_yards: "Total yards thrown by the player.",
        rushing_yards: "Total rushing yards gained.",
        receiving_yards: "Total receiving yards gained.",
        receptions: "Total number of catches.",
        passing_tds: "Passing touchdowns.",
        rushing_tds: "Rushing touchdowns.",
        receiving_tds: "Receiving touchdowns.",
        epa_per_play: "Expected points added per play.",
        epa_per_att: "Expected points added per passing attempt.",
        epa_per_rush: "Expected points added per rush.",
        completion_percentage: "Pass completion percentage.",
        passer_rating: "Passer rating (NFL formula).",
        qbr: "ESPN's Total QBR score.",
        cpoe: "Completion percentage over expected.",
        any_a: "Adjusted net yards per attempt.",
        yards_per_carry: "Average yards gained per carry.",
        rush_yards_oe_per_att: "Rush yards over expected per attempt.",
        rush_pct_over_expected: "Rush attempts over expected in percentage.",
        percent_attempts_gte_eight_defenders: "% of rushes facing 8+ defenders.",
        efficiency: "Overall efficiency metric.",
        croe: "Catch rate over expected.",
        racr: "Receiver Air Conversion Ratio.",
        wopr: "Weighted Opportunity Rating.",
        yac_oe: "Yards after catch over expected.",
        avg_separation: "Average separation from nearest defender.",
        yards_per_target: "Average yards gained per target.",
        targets: "Number of times targeted by a pass.",
        rushing_attempts: "Number of rushing attempts.",
        passing_attempts: "Number of passing attempts."
    };

    // Get relevant metrics for player position
    const posConfig = POSITION_METRICS[player.position] || DEFAULT_STATS;
    
    // Prepare radar chart data
    const prepareRadarData = () => {
        const radarMetrics = posConfig.radarStats;
        if (!radarMetrics.length) return [];
        
        // Find max values for each metric
        const maxValues = {};
        radarMetrics.forEach(({ key }) => {
            const values = positionPlayers.filter(p => p[key] != null).map(p => Number(p[key]));
            maxValues[key] = values.length ? Math.max(...values) : 0;
        });
        
        return radarMetrics.map(({ key, label }) => {
            const value = Number(player[key]) || 0;
            const maxVal = maxValues[key];
            const normalized = normalizeValue(value, maxVal);
            
            return {
                stat: label,
                value: normalized,
                fullValue: value,
                leagueAvg: leagueAverages[key] || 0
            };
        });
    };
    
    // Prepare percentile chart data
    const preparePercentileData = () => {
        const selectedStats = [...posConfig.primaryStats, ...posConfig.advancedStats].slice(0, 8);
        
        return selectedStats.map(statKey => {
            // Calculate percentile
            const values = positionPlayers
                .filter(p => p[statKey] != null)
                .map(p => Number(p[statKey]));
            
            if (!values.length) return null;
            
            values.sort((a, b) => a - b);
            const playerValue = Number(player[statKey]) || 0;
            const index = values.findIndex(v => v >= playerValue);
            const percentile = Math.round((index / values.length) * 100);
            
            const label = statKey
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
                
            return {
                stat: label,
                statKey,
                percentile,
                value: playerValue,
                leagueAvg: leagueAverages[statKey] || 0
            };
        }).filter(Boolean);
    };
    
    // Comparison with other players at position
    const preparePlayerComparison = () => {
        const metrics = posConfig.primaryStats.slice(0, 2);
        if (!metrics.length) return [];
        
        return positionPlayers
            .filter(p => metrics.every(key => p[key] != null))
            .map(p => ({
                name: p.name,
                x: Number(p[metrics[0]]) || 0,
                y: Number(p[metrics[1]]) || 0,
                isSelected: p.gsis_id === player.gsis_id
            }))
            .sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0)); // Selected player appears last (on top)
    };
    
    // Prepare bar chart data for primary stats
    const primaryStatsChartData = posConfig.primaryStats.map(key => {
        const label = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
            
        const playerValue = Number(player[key]) || 0;
        const leagueAvg = leagueAverages[key] || 0;
        const diff = playerValue - leagueAvg;
        const percentDiff = leagueAvg ? (diff / leagueAvg) * 100 : 0;
        
        return { 
            stat: label,
            statKey: key,
            value: playerValue,
            leagueAvg: leagueAvg,
            diff: diff,
            percentDiff: percentDiff
        };
    });

    // Prepare the headshot URL with fallback mechanism
    const getReliableHeadshotUrl = (player) => {
        if (player.headshot_url && player.headshot_url.trim() !== '') {
            return player.headshot_url;
        }
        
        if (player.gsis_id) {
            return `https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/yy4seib4h9fctzw3epvf/${player.gsis_id}`;
        }
        
        return null;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Link
                to={`/team/${player.team}/players`}
                className="text-blue-400 underline mb-6 inline-block"
            >
                ← Back to Players
            </Link>

            <div className="bg-gray-800 p-6 rounded shadow mb-8">
                <div className="flex flex-wrap items-center mb-6">
                {/* Player Headshot */}
                    <div className="mr-6 mb-4">
                        {player.headshot_url ? (
                    <img
                                src={getReliableHeadshotUrl(player)}
                        alt={player.name}
                                className="w-48 h-48 object-cover rounded-lg shadow-lg"
                                onError={(e) => {
                                    console.error(`Failed to load headshot for player detail ${player.name}`);
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                            />
                        ) : (
                            <div className="w-48 h-48 bg-gray-700 flex items-center justify-center rounded-lg shadow-lg">
                                <span className="text-4xl font-bold text-gray-400">
                                    {player.name.split(' ').map(n => n[0]).join('')}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1">
                        <h2 className="text-4xl font-bold mb-2">{player.name}</h2>
                        <div className="flex flex-wrap text-lg mb-4">
                            <p className="mr-4 bg-blue-600 px-3 py-1 rounded-full">
                                {player.position}
                            </p>
                            <p className="mr-4 bg-gray-700 px-3 py-1 rounded-full">
                                {player.team}
                            </p>
                            {player.injured_reserve && (
                                <p className="mr-4 bg-red-600 px-3 py-1 rounded-full">IR</p>
                            )}
                        </div>
                        
                        {/* Overall Grade & Key Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                            {/* Overall Player Grade */}
                            <div className="bg-gray-700 p-3 rounded-lg col-span-1 text-center">
                                <p className="text-gray-400 text-sm">Overall Grade</p>
                                <div className="flex flex-col items-center">
                                    {percentileRanks[posConfig.primaryStats[0]] && (
                                        <>
                                            <p className={`text-4xl font-bold ${getGradeColor(getGradeFromPercentile(percentileRanks[posConfig.primaryStats[0]]))}`}>
                                                {getGradeFromPercentile(percentileRanks[posConfig.primaryStats[0]])}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {percentileRanks[posConfig.primaryStats[0]]}th percentile
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        
                            {/* Key Stats */}
                            {posConfig.primaryStats.slice(0, 4).map(statKey => {
                                if (player[statKey] == null) return null;
                                
                                const label = statKey
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, char => char.toUpperCase());
                                    
                                const isNegativeStat = statKey === 'interceptions';
                                const percentile = percentileRanks[statKey] || 0;
                                
                                // If it's a negative stat like interceptions, invert the percentile
                                const displayPercentile = isNegativeStat ? 100 - percentile : percentile;
                                
                                return (
                                    <div key={statKey} className="bg-gray-700 p-3 rounded-lg">
                                        <p className="text-gray-400 text-sm">{label}</p>
                                        <div className="flex items-end justify-between">
                                            <p className="text-2xl font-bold">{player[statKey]}</p>
                                            <div className="text-right">
                                                <span className={`text-sm font-medium ${
                                                    displayPercentile > 70 ? 'text-green-400' : 
                                                    displayPercentile < 30 ? 'text-red-400' : 'text-yellow-400'
                                                }`}>
                                                    {displayPercentile}%
                                                </span>
                                                <div className="w-20 bg-gray-600 h-1 mt-1 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            displayPercentile > 70 ? 'bg-green-500' : 
                                                            displayPercentile < 30 ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`}
                                                        style={{ width: `${displayPercentile}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Tab navigation */}
                <div className="border-b border-gray-700 mb-6">
                    <nav className="flex space-x-4">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-3 border-b-2 font-medium text-sm ${
                                activeTab === 'overview' 
                                    ? 'border-blue-500 text-blue-500' 
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('advanced')}
                            className={`py-2 px-3 border-b-2 font-medium text-sm ${
                                activeTab === 'advanced' 
                                    ? 'border-blue-500 text-blue-500' 
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Advanced Metrics
                        </button>
                        <button 
                            onClick={() => setActiveTab('comparison')}
                            className={`py-2 px-3 border-b-2 font-medium text-sm ${
                                activeTab === 'comparison' 
                                    ? 'border-blue-500 text-blue-500' 
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Position Ranking
                        </button>
                    </nav>
                </div>
                
                {/* Tab content */}
                {activeTab === 'overview' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Performance Summary */}
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3">Performance Summary</h3>
                                <p className="text-sm text-gray-300 mb-4">
                                    {player.name} is currently ranked {
                                        positionPlayers
                                            .sort((a, b) => (Number(b[posConfig.primaryStats[0]]) || 0) - (Number(a[posConfig.primaryStats[0]]) || 0))
                                            .findIndex(p => p.gsis_id === player.gsis_id) + 1
                                    } out of {positionPlayers.length} {player.position}s in {posConfig.primaryStats[0].replace(/_/g, ' ')}.
                                </p>
                                
                                <div className="space-y-3">
                                    {primaryStatsChartData.slice(0, 3).map(stat => {
                                        const percentile = percentileRanks[stat.statKey] || 0;
                                        const isGood = stat.value > stat.leagueAvg;
                                        // Special case for interceptions (lower is better)
                                        const isNegativeStat = stat.statKey === 'interceptions';
                                        const evaluationText = isNegativeStat 
                                            ? (stat.value < stat.leagueAvg ? 'better than' : 'worse than')
                                            : (stat.value > stat.leagueAvg ? 'better than' : 'below');
                                        
                                        return (
                                            <div key={stat.stat} className="bg-gray-800 p-3 rounded">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium">{stat.stat}</span>
                                                    <div className="flex items-center">
                                                        <span className="text-sm mr-2">{stat.value}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            isNegativeStat
                                                                ? (stat.value < stat.leagueAvg ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300')
                                                                : (stat.value > stat.leagueAvg ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300')
                                                        }`}>
                                                            {Math.abs(stat.percentDiff).toFixed(1)}% {evaluationText} avg
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center mt-2">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full relative">
                                                        <div 
                                                            className="absolute h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${percentile}%` }}
                                                        ></div>
                                                        <div 
                                                            className="absolute h-4 w-0.5 bg-yellow-500 top-1/2 transform -translate-y-1/2"
                                                            style={{ left: `${leagueAverages[stat.statKey] / (Math.max(...positionPlayers.map(p => Number(p[stat.statKey]) || 0)) || 1) * 100}%` }}
                                                            title="League Average"
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs text-gray-400">{percentile}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Season Trends */}
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3">Season Trends</h3>
                                
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm text-gray-400">Select metric to visualize:</p>
                                    <select 
                                        value={trendMetric} 
                                        onChange={(e) => setTrendMetric(e.target.value)}
                                        className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
                                    >
                                        {posConfig.primaryStats.map(stat => (
                                            <option key={stat} value={stat}>
                                                {stat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="w-full h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={generateMockTrendData(player, trendMetric)}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                            <XAxis 
                                                dataKey="week" 
                                                tick={{ fontSize: 12, fill: '#fff' }}
                                            />
                                            <YAxis tick={{ fontSize: 12, fill: '#fff' }} />
                                            <RechartTooltip 
                                                formatter={(value) => [value, trendMetric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())]}
                                            />
                                            <ReferenceLine 
                                                y={leagueAverages[trendMetric] || 0} 
                                                stroke={COLORS.accent} 
                                                strokeDasharray="3 3"
                                                label={{ 
                                                    value: 'League Avg', 
                                                    fill: COLORS.accent, 
                                                    position: 'insideBottomRight'
                                                }}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                name={trendMetric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                stroke={COLORS.primary}
                                                activeDot={{ r: 8 }}
                                                strokeWidth={2}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="season_avg"
                                                name="Season Average"
                                                stroke={COLORS.tertiary}
                                                strokeDasharray="5 5"
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="mt-2 text-xs text-gray-400 text-center">* This is a projected trend based on season totals.</p>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-semibold mb-4">Primary Statistics</h3>
                        
                        {/* Primary Stats Chart */}
                        <div className="w-full h-80 mb-6">
                            <ResponsiveContainer>
                                <ComposedChart 
                                    data={primaryStatsChartData} 
                                    margin={{ top: 20, right: 30, bottom: 40, left: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis 
                                        dataKey="stat" 
                                        tick={{ fontSize: 12, fill: '#fff' }} 
                                        angle={-45}
                                        textAnchor="end"
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: '#fff' }} />
                                    <RechartTooltip
                                        formatter={(value, name, props) => {
                                            if (name === 'League Avg') return [value.toLocaleString(), name];
                                            if (name === 'Player Value') {
                                                const stat = props.payload;
                                                return [
                                                    value.toLocaleString(), 
                                                    `${name} (${stat.percentDiff > 0 ? '+' : ''}${stat.percentDiff.toFixed(1)}% vs. avg)`
                                                ];
                                            }
                                            return [value.toLocaleString(), name];
                                        }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill={COLORS.primary}
                                        name="Player Value"
                                    />
                                    <Line 
                                        type="monotone"
                                        dataKey="leagueAvg"
                                        name="League Avg"
                                        stroke={COLORS.accent}
                                        strokeWidth={2}
                                        dot={{ fill: COLORS.accent, r: 4 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        
                        {/* Performance Radar Chart */}
                        {posConfig.radarStats.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Performance Profile</h3>
                                <div className="w-full h-80 mb-6">
                                    <ResponsiveContainer>
                                        <RadarChart data={prepareRadarData()}>
                                            <PolarGrid stroke="#444" />
                                            <PolarAngleAxis 
                                                dataKey="stat" 
                                                tick={{ fill: COLORS.text, fontSize: 12 }}
                                            />
                                            <PolarRadiusAxis 
                                                angle={90} 
                                                domain={[0, 100]} 
                                                tick={{ fill: COLORS.text }}
                                            />
                                            <Radar
                                                name="Performance"
                                                dataKey="value"
                                                stroke={COLORS.primary}
                                                fill={COLORS.primary}
                                                fillOpacity={0.6}
                                            />
                                            <RechartTooltip
                                                formatter={(value, name, props) => {
                                                    return [`${props.payload.fullValue.toFixed(2)} (${value}th percentile)`, props.payload.stat];
                                                }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'advanced' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-4">Advanced Metrics Explained</h3>
                                <p className="text-sm text-gray-300 mb-4">
                                    Advanced metrics provide deeper insights into player performance beyond traditional statistics. They help identify true impact and efficiency.
                                </p>
                                
                                <div className="space-y-2">
                                    {posConfig.advancedStats.map(stat => {
                                        if (!player[stat]) return null;
                                        
                                        const label = stat
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, (char) => char.toUpperCase());
                                            
                                        return (
                                            <div key={stat} className="bg-gray-800 p-3 rounded">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-medium">{label}</span>
                                                    <span>{player[stat]}</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{statDescriptions[stat] || 'No description available'}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-4">Performance Interpretation</h3>
                                
                                {/* Performance Summary for position type */}
                                {player.position === 'QB' && (
                                    <div className="space-y-3">
                                        <p className="text-sm">
                                            <span className="font-bold">{player.name}</span> is a quarterback with a 
                                            <span className={player.epa_per_att > 0 ? ' text-green-400 font-semibold' : ' text-red-400 font-semibold'}>
                                                {player.epa_per_att > 0 ? ' positive' : ' negative'} EPA/Att
                                            </span> of {player.epa_per_att}, 
                                            placing them in the <span className="font-semibold">{percentileRanks.epa_per_att || 0}th</span> percentile among QBs.
                                        </p>
                                        <p className="text-sm">
                                            Their CPOE of {player.cpoe || 'N/A'} indicates they are 
                                            {player.cpoe > 0 ? ' completing passes above expectation' : ' struggling with accuracy relative to expectation'}.
                                        </p>
                                        <p className="text-sm">
                                            With a QBR of {player.qbr || 'N/A'} and ANY/A of {player.any_a || 'N/A'}, 
                                            {(() => {
                                                if (player.qbr > 65) return " they are performing at an elite level.";
                                                if (player.qbr > 50) return " they are performing above average.";
                                                if (player.qbr > 40) return " they are performing at an average level.";
                                                return " they may be struggling to produce efficiently.";
                                            })()}
                                        </p>
                                    </div>
                                )}
                                
                                {player.position === 'RB' && (
                                    <div className="space-y-3">
                                        <p className="text-sm">
                                            <span className="font-bold">{player.name}</span> is a running back with a rushing yards over expected per attempt of
                                            <span className={player.rush_yards_oe_per_att > 0 ? ' text-green-400 font-semibold' : ' text-red-400 font-semibold'}>
                                                {player.rush_yards_oe_per_att > 0 ? ' positive' : ' negative'} {player.rush_yards_oe_per_att || 'N/A'}
                                            </span>, 
                                            placing them in the <span className="font-semibold">{percentileRanks.rush_yards_oe_per_att || 0}th</span> percentile.
                                        </p>
                                        <p className="text-sm">
                                            Their EPA per rush of {player.epa_per_rush || 'N/A'} suggests they are 
                                            {player.epa_per_rush > 0 ? ' adding positive value on rushing plays' : ' not adding significant value on rushing plays relative to expectation'}.
                                        </p>
                                        <p className="text-sm">
                                            {player.percent_attempts_gte_eight_defenders ? 
                                                `They face 8+ defenders in the box on ${player.percent_attempts_gte_eight_defenders}% of their carries, indicating defenses are ${parseInt(player.percent_attempts_gte_eight_defenders) > 25 ? 'often keying on the run' : 'respecting the pass game'}.` : ''}
                                        </p>
                                    </div>
                                )}
                                
                                {(player.position === 'WR' || player.position === 'TE') && (
                                    <div className="space-y-3">
                                        <p className="text-sm">
                                            <span className="font-bold">{player.name}</span> has a yards per target of <span className="font-semibold">{player.yards_per_target || 'N/A'}</span>, 
                                            placing them in the <span className="font-semibold">{percentileRanks.yards_per_target || 0}th</span> percentile among {player.position}s.
                                        </p>
                                        <p className="text-sm">
                                            Their WOPR (Weighted Opportunity Rating) of {player.wopr || 'N/A'} indicates 
                                            {player.wopr > 0.5 ? " they are a primary receiving option." : player.wopr > 0.3 ? " they have a significant role in the offense." : " they play a complementary role in the passing game."} 
                                        </p>
                                        <p className="text-sm">
                                            With YAC over expected of {player.yac_oe || 'N/A'}, they
                                            {player.yac_oe > 0 ? ` excel at gaining yards after catch beyond what's expected.` : ` are mostly gaining expected yards after catch.`}
                                            {player.avg_separation ? ` Average separation of ${player.avg_separation} yards shows ${parseFloat(player.avg_separation) > 3 ? 'good ability to create space' : 'they rely on contested catches'}.` : ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Percentile Bars Chart */}
                        <div className="w-full mb-6">
                            <h4 className="text-lg font-medium mb-4">Percentile Ranking vs. Position</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {preparePercentileData().map(item => (
                                    <div key={item.stat} className="bg-gray-700 p-4 rounded">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium">{item.stat}</span>
                                            <div className="flex items-center">
                                                <span className="text-sm mr-2">{item.value.toFixed(2)}</span>
                                                <div className="px-2 py-0.5 rounded text-xs font-semibold text-center" style={{
                                                    backgroundColor: item.percentile > 80 ? '#065f46' : 
                                                                    item.percentile > 60 ? '#047857' : 
                                                                    item.percentile > 40 ? '#92400e' : 
                                                                    item.percentile > 20 ? '#b45309' : '#991b1b',
                                                    color: 'white',
                                                    minWidth: '40px'
                                                }}>
                                                    {item.percentile}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-600 rounded-full h-2.5 relative">
                                            {/* League average marker */}
                                            <div 
                                                className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
                                                style={{ 
                                                    left: `${(item.leagueAvg / Math.max(...positionPlayers.map(p => parseFloat(p[item.statKey]) || 0))) * 100}%`,
                                                    zIndex: 10
                                                }}
                                                title={`League Avg: ${item.leagueAvg.toFixed(2)}`}
                                            ></div>
                                            
                                            {/* Percentile bar */}
                                            <div 
                                                className="bg-blue-500 h-2.5 rounded-full" 
                                                style={{ width: `${item.percentile}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-gray-400">
                                            <span>0%</span>
                                            <div className="flex space-x-1">
                                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                <span>League Avg: {item.leagueAvg.toFixed(2)}</span>
                                            </div>
                                            <span>100%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Efficiency Breakdown */}
                        <div className="bg-gray-700 p-4 rounded mb-6">
                            <h4 className="text-lg font-medium mb-4">Efficiency Analysis</h4>
                            
                            {player.position === 'QB' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Completion % vs CPOE</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.completion_percentage}%</p>
                                                <p className="text-sm">Actual</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">vs</div>
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${parseFloat(player.cpoe) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parseFloat(player.cpoe) > 0 ? '+' : ''}{player.cpoe}%
                                                </p>
                                                <p className="text-sm">vs Expected</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">EPA vs League</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${parseFloat(player.epa_per_att) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {player.epa_per_att}
                                                </p>
                                                <p className="text-sm">EPA/Att</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">vs</div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-300">
                                                    {leagueAverages.epa_per_att ? leagueAverages.epa_per_att.toFixed(2) : 'N/A'}
                                                </p>
                                                <p className="text-sm">League Avg</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Overall Efficiency</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.any_a || 'N/A'}</p>
                                                <p className="text-sm">ANY/A</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">+</div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.qbr || 'N/A'}</p>
                                                <p className="text-sm">QBR</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {player.position === 'RB' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Yards vs Expected</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.yards_per_carry}</p>
                                                <p className="text-sm">Yards/Carry</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">vs</div>
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${parseFloat(player.rush_yards_oe_per_att) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parseFloat(player.rush_yards_oe_per_att) > 0 ? '+' : ''}{player.rush_yards_oe_per_att}
                                                </p>
                                                <p className="text-sm">RYOE/Att</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Success Rate</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.rush_pct_over_expected || 'N/A'}%</p>
                                                <p className="text-sm">% Over Exp</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">EPA/Rush</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${parseFloat(player.epa_per_rush) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {player.epa_per_rush}
                                                </p>
                                                <p className="text-sm">EPA/Rush</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">vs</div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-300">
                                                    {leagueAverages.epa_per_rush ? leagueAverages.epa_per_rush.toFixed(2) : 'N/A'}
                                                </p>
                                                <p className="text-sm">League Avg</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {(player.position === 'WR' || player.position === 'TE') && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Yards Efficiency</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.yards_per_target}</p>
                                                <p className="text-sm">Yards/Target</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">+</div>
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${parseFloat(player.yac_oe) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parseFloat(player.yac_oe) > 0 ? '+' : ''}{player.yac_oe || 'N/A'}
                                                </p>
                                                <p className="text-sm">YAC Over Exp</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Route Running</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.avg_separation || 'N/A'}</p>
                                                <p className="text-sm">Avg Separation</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 p-3 rounded text-center">
                                        <p className="text-sm text-gray-400 mb-1">Usage & Importance</p>
                                        <div className="flex justify-center items-center h-16">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.wopr || 'N/A'}</p>
                                                <p className="text-sm">WOPR</p>
                                            </div>
                                            <div className="mx-3 text-gray-500">+</div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{player.racr || 'N/A'}</p>
                                                <p className="text-sm">RACR</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'comparison' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3">Position Ranking Summary</h3>
                                <p className="text-sm text-gray-300 mb-4">
                                    {player.name} ranks among {positionPlayers.length} qualified {player.position}s in the NFL. The charts and tables below show how they compare to their peers.
                                </p>
                                
                                <div className="space-y-3">
                                    {posConfig.primaryStats.slice(0, 3).map(statKey => {
                                        // Calculate rank for this stat
                                        const sortedPlayers = [...positionPlayers].sort((a, b) => {
                                            // For interceptions and other negative stats, lower is better
                                            const isNegativeStat = statKey === 'interceptions';
                                            
                                            if (isNegativeStat) {
                                                return (Number(a[statKey]) || 0) - (Number(b[statKey]) || 0);
                                            }
                                            return (Number(b[statKey]) || 0) - (Number(a[statKey]) || 0);
                                        });
                                        
                                        const playerRank = sortedPlayers.findIndex(p => p.gsis_id === player.gsis_id) + 1;
                                        const rankText = `${playerRank}${
                                            playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th'
                                        } of ${positionPlayers.length}`;
                                        
                                        // Format the stat label
                                        const label = statKey
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, (char) => char.toUpperCase());
                                        
                                        // Calculate percentile
                                        const percentile = percentileRanks[statKey] || 0;
                                        const isNegativeStat = statKey === 'interceptions';
                                        const displayPercentile = isNegativeStat ? 100 - percentile : percentile;
                                        
                                        return (
                                            <div key={statKey} className="bg-gray-800 p-3 rounded">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">{label}</span>
                                                    <div className="flex items-center">
                                                        <span className="text-sm mr-2">{player[statKey]}</span>
                                                        <div 
                                                            className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                                                            style={{
                                                                backgroundColor: percentile > 90 ? '#047857' : // dark green
                                                                                percentile > 75 ? '#059669' : // green
                                                                                percentile > 50 ? '#92400e' : // dark orange
                                                                                percentile > 25 ? '#b45309' : // orange
                                                                                '#991b1b', // red
                                                            }}
                                                        >
                                                            {rankText}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${displayPercentile}%`,
                                                                backgroundColor: displayPercentile > 75 ? '#10B981' : 
                                                                                displayPercentile > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{displayPercentile}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Percentile Distribution */}
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3">Performance Distribution</h3>
                                <p className="text-sm text-gray-300 mb-4">
                                    This chart shows where {player.name} ranks among all {player.position}s in their primary statistics.
                                </p>
                                
                                {/* Elite, Above Average, Average, Below Average, Poor ranking system */}
                                <div className="grid grid-cols-5 gap-1 mb-4">
                                    {['Elite', 'Above Avg', 'Average', 'Below Avg', 'Poor'].map((tier, idx) => (
                                        <div key={tier} className="text-center">
                                            <div 
                                                className="h-1.5 w-full rounded-sm mb-1"
                                                style={{
                                                    backgroundColor: idx === 0 ? '#10B981' : // green
                                                                    idx === 1 ? '#34D399' : // light green
                                                                    idx === 2 ? '#F59E0B' : // yellow
                                                                    idx === 3 ? '#F97316' : // orange
                                                                    '#EF4444', // red
                                                }}
                                            ></div>
                                            <span className="text-xs text-gray-400">{tier}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Performance areas */}
                                <div className="space-y-4">
                                    {/* QB-specific performance areas */}
                                    {player.position === 'QB' && (
                                        <>
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Passing Accuracy</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.completion_percentage || 0}%`,
                                                                backgroundColor: (percentileRanks.completion_percentage || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.completion_percentage || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.completion_percentage || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Passing Efficiency</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.passer_rating || 0}%`,
                                                                backgroundColor: (percentileRanks.passer_rating || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.passer_rating || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.passer_rating || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Advanced Metrics</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.epa_per_att || 0}%`,
                                                                backgroundColor: (percentileRanks.epa_per_att || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.epa_per_att || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.epa_per_att || 0}%</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* RB-specific performance areas */}
                                    {player.position === 'RB' && (
                                        <>
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Volume</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.rushing_attempts || 0}%`,
                                                                backgroundColor: (percentileRanks.rushing_attempts || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.rushing_attempts || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.rushing_attempts || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Efficiency</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.yards_per_carry || 0}%`,
                                                                backgroundColor: (percentileRanks.yards_per_carry || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.yards_per_carry || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.yards_per_carry || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Advanced Metrics</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.rush_yards_oe_per_att || 0}%`,
                                                                backgroundColor: (percentileRanks.rush_yards_oe_per_att || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.rush_yards_oe_per_att || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.rush_yards_oe_per_att || 0}%</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* WR/TE-specific performance areas */}
                                    {(player.position === 'WR' || player.position === 'TE') && (
                                        <>
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Volume</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.targets || 0}%`,
                                                                backgroundColor: (percentileRanks.targets || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.targets || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.targets || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Efficiency</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.yards_per_target || 0}%`,
                                                                backgroundColor: (percentileRanks.yards_per_target || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.yards_per_target || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.yards_per_target || 0}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-3 rounded">
                                                <p className="text-sm font-medium mb-2">Advanced Metrics</p>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-600 h-2 rounded-full">
                                                        <div 
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${percentileRanks.wopr || 0}%`,
                                                                backgroundColor: (percentileRanks.wopr || 0) > 75 ? '#10B981' : 
                                                                                (percentileRanks.wopr || 0) > 50 ? '#F59E0B' : 
                                                                                '#EF4444',
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="ml-2 text-xs">{percentileRanks.wopr || 0}%</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Scatter Plot Comparison */}
                        {posConfig.primaryStats.length >= 2 && (
                            <div className="bg-gray-700 p-4 rounded-lg mb-6">
                                <h3 className="text-xl font-semibold mb-3">Position Comparison Plot</h3>
                                <p className="text-sm text-gray-300 mb-3">
                                    This chart plots all {player.position}s by {
                                        posConfig.primaryStats[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                    } and {
                                        posConfig.primaryStats[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                    }. {player.name} is highlighted in blue.
                                </p>
                                
                                <div className="w-full h-96">
                    <ResponsiveContainer>
                                        <ScatterChart
                                            margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                                        >
                                            <CartesianGrid stroke="#444" />
                                            <XAxis 
                                                type="number" 
                                                dataKey="x" 
                                                name={posConfig.primaryStats[0]
                                                    .replace(/_/g, ' ')
                                                    .replace(/\b\w/g, char => char.toUpperCase())} 
                                                tick={{ fill: COLORS.text }}
                                                label={{ 
                                                    value: posConfig.primaryStats[0]
                                                        .replace(/_/g, ' ')
                                                        .replace(/\b\w/g, char => char.toUpperCase()), 
                                                    position: 'bottom',
                                                    fill: COLORS.text
                                                }}
                                            />
                                            <YAxis 
                                                type="number" 
                                                dataKey="y" 
                                                name={posConfig.primaryStats[1]
                                                    .replace(/_/g, ' ')
                                                    .replace(/\b\w/g, char => char.toUpperCase())} 
                                                tick={{ fill: COLORS.text }}
                                                label={{ 
                                                    value: posConfig.primaryStats[1]
                                                        .replace(/_/g, ' ')
                                                        .replace(/\b\w/g, char => char.toUpperCase()), 
                                                    angle: -90,
                                                    position: 'left',
                                                    fill: COLORS.text
                                                }}
                                            />
                                            
                                            {/* Add reference lines for league averages */}
                                            <ReferenceLine 
                                                x={leagueAverages[posConfig.primaryStats[0]] || 0} 
                                                stroke="#F59E0B" 
                                                strokeDasharray="3 3"
                                                label={{ 
                                                    value: 'League Avg', 
                                                    position: 'right', 
                                                    fill: '#F59E0B'
                                                }}
                                            />
                                            <ReferenceLine 
                                                y={leagueAverages[posConfig.primaryStats[1]] || 0} 
                                                stroke="#F59E0B" 
                                                strokeDasharray="3 3"
                                                label={{ 
                                                    value: 'League Avg', 
                                                    position: 'top', 
                                                    fill: '#F59E0B'
                                                }}
                                            />
                                            
                                            <RechartTooltip 
                                                cursor={{ strokeDasharray: '3 3' }}
                                                formatter={(value, name, props) => [value, name]}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-gray-800 border border-gray-600 p-2 rounded">
                                                                <p className="font-semibold">{payload[0].payload.name}</p>
                                                                <p>{`${payload[0].name}: ${payload[0].value}`}</p>
                                                                <p>{`${payload[1].name}: ${payload[1].value}`}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Scatter 
                                                name="Players" 
                                                data={preparePlayerComparison()} 
                                                fill={COLORS.secondary}
                                            >
                                                {preparePlayerComparison().map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`}
                                                        fill={entry.isSelected ? COLORS.primary : COLORS.secondary}
                                                        r={entry.isSelected ? 8 : 5}
                                                    />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                                <p className="text-xs text-gray-400 text-center mt-2">Players in the top-right quadrant have higher than average stats in both metrics</p>
                            </div>
                        )}
                        
                        {/* Position Rankings Table */}
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="text-xl font-semibold mb-3">Top 15 {player.position}s</h3>
                            <p className="text-sm text-gray-300 mb-3">Rankings based on {
                                posConfig.primaryStats[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                            }.</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3">Rank</th>
                                            <th className="px-4 py-3">Player</th>
                                            <th className="px-4 py-3">Team</th>
                                            {posConfig.primaryStats.slice(0, 3).map(stat => (
                                                <th key={stat} className="px-4 py-3">
                                                    {stat.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                                </th>
                                            ))}
                                            {posConfig.advancedStats.slice(0, 2).map(stat => (
                                                <th key={stat} className="px-4 py-3">
                                                    {stat.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {positionPlayers
                                            .sort((a, b) => {
                                                const stat = posConfig.primaryStats[0];
                                                const isNegativeStat = stat === 'interceptions';
                                                
                                                if (isNegativeStat) {
                                                    return (Number(a[stat]) || 0) - (Number(b[stat]) || 0);
                                                }
                                                return (Number(b[stat]) || 0) - (Number(a[stat]) || 0);
                                            })
                                            .slice(0, 15)
                                            .map((p, idx) => (
                                                <tr 
                                                    key={p.gsis_id} 
                                                    className={`border-b border-gray-700 ${p.gsis_id === player.gsis_id ? 'bg-blue-900 bg-opacity-30' : ''}`}
                                                >
                                                    <td className="px-4 py-3">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {p.gsis_id === player.gsis_id ? (
                                                            <span className="flex items-center">
                                                                {p.name}
                                                                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                                            </span>
                                                        ) : p.name}
                                                    </td>
                                                    <td className="px-4 py-3">{p.team}</td>
                                                    {posConfig.primaryStats.slice(0, 3).map(stat => (
                                                        <td key={`${p.gsis_id}-${stat}`} className="px-4 py-3">
                                                            {p[stat] != null ? Number(p[stat]).toLocaleString() : '-'}
                                                        </td>
                                                    ))}
                                                    {posConfig.advancedStats.slice(0, 2).map(stat => (
                                                        <td key={`${p.gsis_id}-${stat}`} className="px-4 py-3">
                                                            {p[stat] != null ? Number(p[stat]).toFixed(2) : '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* All Stats Grid with Tooltips */}
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">All Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {Object.entries(player).map(([key, value]) => {
                        if (
                            value == null ||
                            ['gsis_id', 'name', 'headshot_url', 'position', 'team', 'injured_reserve', 'pfr_id'].includes(key)
                        ) {
                            return null;
                        }

                        const label = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (char) => char.toUpperCase());

                        return (
                            <Tooltip
                                key={key}
                                label={`${label}: ${value}`}
                                description={statDescriptions[key] || 'No description available'}
                            />
                        );
                    })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;
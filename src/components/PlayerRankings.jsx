import React, { useEffect, useState, PureComponent, useRef } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    LineChart,
    Line,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    Tooltip as RechartsTooltip,
    Cell,
    ReferenceLine,
    ReferenceArea,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Tooltip from './Tooltip';
import { Link } from 'react-router-dom';
import { fetchPlayers } from '../api/api'; // <-- ADD IMPORT

// NFL team colors (Adding this definition)
const TEAM_COLORS = {
    ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D', 
    CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00', 
    DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB: '#203731', 
    HOU: '#03202F', IND: '#002C5F', JAX: '#101820', KC: '#E31837', 
    LV: '#000000', LAC: '#0080C6', LAR: '#003594', MIA: '#008E97', 
    MIN: '#4F2683', NE: '#002244', NO: '#D3BC8D', NYG: '#0B2265', 
    NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612', SEA: '#002244', 
    SF: '#AA0000', TB: '#D50A0A', TEN: '#0C2340', WAS: '#773141'
};

// Performance tier definitions
const PERFORMANCE_TIERS = {
  'Elite': { color: 'text-green-400', description: 'Among the best in the league', thresholdPercentile: 90 },
  'Great': { color: 'text-emerald-400', description: 'Significantly above average', thresholdPercentile: 80 },
  'Above Avg': { color: 'text-blue-400', description: 'Better than most starters', thresholdPercentile: 65 },
  'Average': { color: 'text-gray-300', description: 'Typical starter performance', thresholdPercentile: 45 },
  'Below Avg': { color: 'text-yellow-300', description: 'Struggling in key areas', thresholdPercentile: 30 },
  'Poor': { color: 'text-orange-400', description: 'Major performance concerns', thresholdPercentile: 15 },
  'Very Poor': { color: 'text-red-400', description: 'Significant underperformance', thresholdPercentile: 0 }
};

// Modify the POSITION_CONFIG to include richer descriptions and category organization
const POSITION_CONFIG = {
    QB: {
        label: 'Quarterbacks',
        metrics: [
            { key: 'passing_yards', label: 'Passing Yards', category: 'Volume' },
            { key: 'completion_percentage', label: 'Completion %', category: 'Efficiency' },
            { key: 'qbr', label: 'Total QBR', category: 'Overall' },
            { key: 'epa_per_play', label: 'EPA/Play', category: 'Advanced' },
            { key: 'epa_per_att', label: 'EPA/Attempt', category: 'Advanced' },
            { key: 'passing_tds', label: 'Passing TDs', category: 'Volume' },
            { key: 'interceptions', label: 'Interceptions', isNegative: true, category: 'Mistakes' }
        ],
        advancedMetrics: [
            { key: 'passer_rating', label: 'Passer Rating', category: 'Overall' },
            { key: 'qbr', label: 'QBR', category: 'Overall' },
            { key: 'cpoe', label: 'CPOE', category: 'Accuracy' },
            { key: 'any_a', label: 'ANY/A', category: 'Efficiency' },
            { key: 'epa_per_play', label: 'EPA/Play', category: 'Advanced' }
        ],
        description: "Quarterback metrics focus on passing efficiency, decision-making, and overall contribution to team success."
    },
    RB: {
        label: 'Running Backs',
        metrics: [
            { key: 'rushing_yards', label: 'Rushing Yards' },
            { key: 'yards_per_carry', label: 'Yds/Carry' },
            { key: 'rushing_tds', label: 'Rushing TDs' }
        ],
        advancedMetrics: [
            { key: 'rush_yards_oe_per_att', label: 'Yards Over Expected/Att' },
            { key: 'rush_pct_over_expected', label: 'Rush % Over Expected' },
            { key: 'percent_attempts_gte_eight_defenders', label: '% vs 8+ Defenders' }
        ],
        description: "Running back metrics evaluate ball-carrying efficiency, ability to create beyond what's blocked, and contribution to the offensive success."
    },
    WR: {
        label: 'Wide Receivers',
        metrics: [
            { key: 'receiving_yards', label: 'Receiving Yards' },
            { key: 'receptions', label: 'Receptions' },
            { key: 'receiving_tds', label: 'Receiving TDs' }
        ],
        advancedMetrics: [
            { key: 'yards_per_target', label: 'Yards/Target' },
            { key: 'racr', label: 'RACR' },
            { key: 'wopr', label: 'WOPR' },
            { key: 'yac_oe', label: 'YAC Over Expected' },
            { key: 'avg_separation', label: 'Avg Separation' }
        ],
        description: "Wide receiver metrics focus on receiving production, route running ability, and yards after catch contribution."
    },
    TE: {
        label: 'Tight Ends',
        metrics: [
            // { key: 'receiving_yards', label: 'Receiving Yards' }, // Keep or remove from basic if desired
            // { key: 'receptions', label: 'Receptions' }, // Keep or remove from basic if desired
            { key: 'receiving_tds', label: 'Receiving TDs' } // Keeping TDs as basic
        ],
        advancedMetrics: [
            { key: 'receiving_yards', label: 'Receiving Yards' }, // Added
            { key: 'receptions', label: 'Receptions' }, // Added
            { key: 'yards_per_target', label: 'Yards/Target' },
            { key: 'racr', label: 'RACR' },
        ],
        description: "Tight end metrics evaluate dual-threat capabilities as both blockers and receivers in the passing game."
    }
};

// Colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Minimum thresholds to avoid small-sample outliers
const MIN_SNAP_THRESHOLD = 200;  // lowered threshold
const MIN_PASS_ATTEMPTS = 50;    // for completion %, QBR

// Performance grade based on percentile
const getPerformanceGrade = (percentile, isNegativeStat = false) => {
    // For negative stats like interceptions, lower is better
    const adjustedPercentile = isNegativeStat ? 100 - percentile : percentile;
    
    if (adjustedPercentile >= 90) return { grade: 'Elite', color: 'text-green-400' };
    if (adjustedPercentile >= 80) return { grade: 'Great', color: 'text-green-300' };
    if (adjustedPercentile >= 65) return { grade: 'Above Avg', color: 'text-blue-400' };
    if (adjustedPercentile >= 45) return { grade: 'Average', color: 'text-gray-300' };
    if (adjustedPercentile >= 30) return { grade: 'Below Avg', color: 'text-yellow-300' };
    if (adjustedPercentile >= 15) return { grade: 'Poor', color: 'text-orange-400' };
    return { grade: 'Very Poor', color: 'text-red-400' };
};

// Calculate percentile for a stat
const calculatePercentile = (value, allValues, isNegativeStat = false) => {
    // Updated version from TeamDetail/TeamList
    const numericValues = allValues
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v)); // Filter out NaN values

    if (!numericValues.length) return 0;
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 0; // Handle case where the specific player value is not numeric
    
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    let index = sortedValues.findIndex(v => v >= value);
    
    if (index === -1) index = sortedValues.length; // If value is highest, it's 100th percentile
    
    let percentile = Math.round((index / sortedValues.length) * 100);
    
    // Adjust percentile based on index edge cases
    if (index === 0 && sortedValues.length > 1) {
        percentile = Math.round((1 / sortedValues.length) * 100); // Assign minimum percentile if it's the lowest value
    }

    // Inversion is handled by the display logic now
    return isNegativeStat ? 100 - percentile : percentile;
};

// Get player position group (Adding this helper)
const getPositionGroup = (position) => {
    if (!position) return null;
    // Consolidated RB group
    if (['RB', 'FB', 'HB'].includes(position.toUpperCase())) return 'RB';
    // Return position directly for others defined in POSITION_CONFIG
    if (POSITION_CONFIG[position.toUpperCase()]) return position.toUpperCase();
    return null; // Return null for positions not explicitly grouped
};

// Helper to get gradient color based on percentile
const getPercentileColorClass = (percentile, isDefensive = false) => {
    // Renamed isDefensive to match TeamDetail/List, but applies to isNegativeStat here
    const p = isDefensive ? 100 - percentile : percentile;
    
    // More subtle transitions between colors
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
    // Renamed isDefensive to match TeamDetail/List, but applies to isNegativeStat here
    const p = isDefensive ? 100 - percentile : percentile;
    
    // More subtle transitions between colors
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

// Get player headshot with error handling
const getPlayerHeadshot = (player, size = 'small') => {
    if (!player) return null;
    
    const sizeDimension = size === 'large' ? 'w-24 h-24' : 'w-16 h-16';
    const sizeStyle = { width: size === 'large' ? '6rem' : '4rem', height: size === 'large' ? '6rem' : '4rem' };
    
    // Try to load from multiple potential sources with fallbacks
    if (player.headshot_url) {
        return (
            <img
                src={player.headshot_url}
                alt={player.name}
                className={`${sizeDimension} rounded-full object-cover`}
                style={sizeStyle}
                onError={(e) => {
                    console.error(`Failed to load headshot for ${player.name}: ${player.headshot_url}`);
                    e.target.onerror = null;
                    
                    // Try NFL.com image if available
                    if (player.gsis_id) {
                        const nflUrl = `https://static.www.nfl.com/image/private/t_player_profile_landscape/f_auto/league/yy4seib4h9fctzw3epvf/${player.gsis_id}`;
                        console.log(`Trying NFL.com image: ${nflUrl}`);
                        e.target.src = nflUrl;
                    } else {
                        // Fallback to initial placeholder
                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                    }
                }}
            />
        );
    }
    
    // If no image URL, use initials placeholder
    return (
        <div className={`${sizeDimension} rounded-full bg-gray-600 flex items-center justify-center`} style={sizeStyle}>
            <span className="text-gray-300">{player.name.split(' ').map(n => n[0]).join('')}</span>
        </div>
    );
};

// --- Custom Dot Component for Line Chart with Zoomed Headshots ---
class PlayerHeadshotDot extends PureComponent {
    render() {
        const { cx, cy, payload } = this.props;
        const headshotUrl = payload?.headshot || 'https://via.placeholder.com/40?text=N/A';
        const dotSize = 30; // The final size of the circular dot on the chart
        const uniqueId = `dot-pattern-${payload?.id || Math.random().toString(36).substring(7)}`;

        // --- Zoom Logic --- 
        // Increase image size within the pattern (e.g., 200% for a 100% zoom effect)
        const imageScale = 2.0; // Changed from 1.5 to 2.0
        const imageWidth = dotSize * imageScale;
        const imageHeight = dotSize * imageScale;
        // Calculate offsets to center the zoomed image within the dot area
        const imageXOffset = (dotSize - imageWidth) / 2;
        const imageYOffset = (dotSize - imageHeight) / 2;
        // --- End Zoom Logic ---

        const handleError = (e) => {
            // Find the corresponding image element within the pattern to change its href
            const patternImage = document.getElementById(`${uniqueId}-img`);
            if (patternImage) {
                 patternImage.setAttribute('href', 'https://via.placeholder.com/40?text=N/A');
            }
            console.warn(`Failed to load headshot for dot: ${payload?.fullName}`);
        };

        return (
            // We need to render the pattern definition *and* the shape that uses it.
            // Using a <g> container allows placing the defs nearby, but defs are global.
            <g>
                <defs>
                    <pattern id={uniqueId} patternUnits="objectBoundingBox" width="100%" height="100%">
                        {/* The image inside the pattern is scaled and offset */}
                        <image 
                            id={`${uniqueId}-img`} // ID for error handling
                            href={headshotUrl} 
                            x={imageXOffset} 
                            y={imageYOffset} 
                            width={imageWidth} 
                            height={imageHeight}
                            onError={handleError} 
                        />
                    </pattern>
                </defs>
                {/* The visible circle filled with the pattern */}
                <circle 
                    cx={cx} 
                    cy={cy} 
                    r={dotSize / 2} 
                    fill={`url(#${uniqueId})`} 
                />
            </g>
        );
    }
}
// ------------------------------------------------------------------

// Add this helper function before the PlayerRankings component
const PlayerPerformanceBadge = ({ percentile, isNegativeStat = false }) => {
    const adjustedPercentile = isNegativeStat ? 100 - percentile : percentile;
    let tier = '';
    let color = '';
    
    // Find the appropriate tier
    for (const [tierName, { thresholdPercentile, color: tierColor }] of Object.entries(PERFORMANCE_TIERS)) {
        if (adjustedPercentile >= thresholdPercentile) {
            tier = tierName;
            color = tierColor;
            break;
        }
    }
    
    return (
        <div className="flex items-center">
            <span className={`font-semibold ${color}`}>{tier}</span>
            <span className="text-xs text-gray-400 ml-1">({percentile}%)</span>
        </div>
    );
};

// First, let's add a PerformanceTierLegend component to display in the header
// const PerformanceTierLegend = () => { ... } // Keep if needed elsewhere, otherwise can remove

export default function PlayerRankings() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('stats'); // Changed to 'stats' and 'comparison'
    const [selectedStats, setSelectedStats] = useState(
        Object.fromEntries(
            Object.entries(POSITION_CONFIG).map(([pos, cfg]) => {
                // Default to EPA/Play for QB, first metric for others
                const defaultMetric = pos === 'QB' ? 'epa_per_play' : cfg.metrics[0]?.key || cfg.advancedMetrics[0]?.key || null;
                return [pos, defaultMetric];
            })
        )
    );
    // We'll still keep track of selected stats for the chart display
    const [comparisonPlayers, setComparisonPlayers] = useState([]);
    const [expandedPosition, setExpandedPosition] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [season, setSeason] = useState('2024');
    // Add state for active position, defaulting to QB
    const [activePosition, setActivePosition] = useState("QB");
    const [expandedCards, setExpandedCards] = useState(new Set());

    // Create refs for each position section - keeping this for possible future use
    const positionRefs = useRef({});

    // Initialize refs object for each position
    useEffect(() => {
        // Create refs for each position if they don't exist
        Object.keys(POSITION_CONFIG).forEach(pos => {
            if (!positionRefs.current[pos]) {
                positionRefs.current[pos] = React.createRef();
            }
        });
    }, []);

    // Updated to set active position instead of scrolling
    const handlePositionChange = (position) => {
        setActivePosition(position);
    };

    useEffect(() => {
        setLoading(true); // Set loading at start
        
        fetchPlayers() // <-- Use imported function
            .then(res => {
                // Ensure the response data is an array before setting state
                if (Array.isArray(res.data)) {
                    setPlayers(res.data);
                } else {
                    console.error('API did not return an array for players:', res.data);
                    setPlayers([]); // Set to empty array on unexpected response
                    // Optionally set an error state here as well
                }
            })
            .catch(err => {
                 console.error('Fetch players failed:', err); // Log full error
                 setPlayers([]); // Set to empty array on error
                 // Optionally set an error state here
             })
            .finally(() => setLoading(false));
             
        // Original logic commented out
        /*
        axios
            .get('http://localhost:5000/api/players')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setPlayers(res.data);
                } else {
                    console.error('API did not return an array for players:', res.data);
                    setPlayers([]); 
                }
            })
            .catch(err => {
                 console.error('Fetch players failed:', err);
                 setPlayers([]); 
             })
            .finally(() => setLoading(false));
        */
    }, []); // Fetch only once on mount

    if (loading) return (
        <div className="p-6 flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading player rankings...</p>
        </div>
    );

    const togglePlayerComparison = (player) => {
        if (comparisonPlayers.find(p => p.gsis_id === player.gsis_id)) {
            setComparisonPlayers(comparisonPlayers.filter(p => p.gsis_id !== player.gsis_id));
        } else if (comparisonPlayers.length < 3) {
            setComparisonPlayers([...comparisonPlayers, player]);
        }
    };

    // Helper to combine basic and advanced metrics for each position
    const getCombinedMetrics = (position) => {
        const cfg = POSITION_CONFIG[position];
        if (!cfg) return [];

        // Create a combined unique list of metrics to avoid duplicates
        const basicKeys = cfg.metrics.map(m => m.key);
        const combinedMetrics = [...cfg.metrics];
        
        // Add advanced metrics that aren't already in basic metrics
        cfg.advancedMetrics.forEach(metric => {
            if (!basicKeys.includes(metric.key)) {
                combinedMetrics.push(metric);
            }
        });
        
        return combinedMetrics;
    };

    const byPosition = Object.entries(POSITION_CONFIG).map(([pos, cfg]) => {
        // Use the selected primary metric for the chart
        const metricKey = selectedStats[pos];
        const allMetrics = getCombinedMetrics(pos);
        const metricConfig = allMetrics.find(m => m.key === metricKey);
        const isNegativeStat = metricConfig?.isNegative || false;
        
        // Initial Filtering: Position, Snaps, Search, AND position-specific thresholds
        let group = players.filter(p => {
            const isCorrectPosition = p.position === pos;
            if (!isCorrectPosition) return false;
            
            // Apply Thresholds
            if (pos === 'QB') {
                const meetsPassingThreshold = p.passing_yards != null && parseInt(p.passing_yards) > 1000;
                if (!meetsPassingThreshold) return false;
            }
            if (pos === 'RB') {
                 const meetsRushingThreshold = p.rushing_yards != null && parseInt(p.rushing_yards) > 500;
                 if (!meetsRushingThreshold) return false;
            }
            if (pos === 'WR') {
                 const meetsReceivingThreshold = p.receiving_yards != null && parseInt(p.receiving_yards) > 500;
                 if (!meetsReceivingThreshold) return false;
            }
            if (pos === 'TE') {
                 const meetsReceivingThresholdTE = p.receiving_yards != null && parseInt(p.receiving_yards) > 300;
                 if (!meetsReceivingThresholdTE) return false;
            }
            
            // Standard filters
            const meetsSnapThreshold = (p.snaps_played == null || p.snaps_played >= MIN_SNAP_THRESHOLD);
            const matchesSearch = (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return meetsSnapThreshold && matchesSearch;
        });

        // require minimum pass attempts only for specific QB pass metrics (applied AFTER yardage threshold)
        if (pos === 'QB' && ['completion_percentage', 'qbr', 'epa_per_att'].includes(metricKey)) {
            group = group.filter(p =>
                p.passing_attempts == null || p.passing_attempts >= MIN_PASS_ATTEMPTS
            );
        }

        // Calculate percentiles relative to ALL players at this position (BEFORE yardage filtering)
        const allPositionalPlayers = players.filter(player => player.position === pos);
        const allValues = allPositionalPlayers.map(p => parseFloat(p[metricKey]) || 0);
            
        // Calculate league average for reference line
        const leagueAvg = allValues.length > 0 
            ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length 
            : 0;

        // Sort the QUALIFIED group
        const sortedGroup = group.sort((a, b) => {
            const aVal = a[metricKey] || 0;
            const bVal = b[metricKey] || 0;
            return isNegativeStat ? aVal - bVal : bVal - aVal;
        });

        // --- Conditional Display Logic based on Position --- 
        let playersToDisplay;
        let showExpandButton = false; 
        let expandButtonText = '';
        const initialDisplayLimit = 5; 

        if (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') {
            const qualifyingPlayers = sortedGroup; // Already filtered by threshold
            const initialDisplay = qualifyingPlayers.slice(0, initialDisplayLimit);
            const expandedDisplay = qualifyingPlayers;
            playersToDisplay = (expandedPosition === pos) ? expandedDisplay : initialDisplay;
            showExpandButton = qualifyingPlayers.length > initialDisplayLimit;
            expandButtonText = expandedPosition === pos 
                ? `Show Top 5` 
                : `Show All ${qualifyingPlayers.length} Qualifying ${pos}s`;
        }
        // --- End Conditional Display Logic ---

        // Slice for chart (top 10 of the filtered & sorted group)
        const topPlayersForChart = sortedGroup.slice(0, 10);
            
        // Create chart data using top 10 qualified players
        const chartData = topPlayersForChart.map((p, idx) => {
             const percentile = calculatePercentile(parseFloat(p[metricKey]) || 0, allValues, isNegativeStat);
             return { 
            name: p.name.split(' ')[1] || p.name,
                 fullName: p.name,
                 value: +p[metricKey] || 0,
                 headshot: p.headshot_url,
                 rank: idx + 1,
                 percentile: percentile, 
                 id: p.gsis_id
             };
        });

        // Create radar data for top 3 using PERCENTILES
        const radarData = [];
        // Use topPlayersForChart (top 10 qualified) to get the top 3 for the radar
        const top3Players = topPlayersForChart.slice(0, 3);
        
        if (allMetrics && top3Players.length > 0) {
            allMetrics.forEach(metric => {
                const result = { metric: metric.label };
                const isNegative = metric.isNegative || false;

                // Get all values for this metric from the relevant comparison group (all qualified players)
                const allValuesForMetric = sortedGroup // Use the already sorted+filtered group
                    .map(p => parseFloat(p[metric.key]))
                    .filter(v => v !== null && !isNaN(v));

                // Calculate percentile for each of the top 3 players
                top3Players.forEach((player, idx) => {
                    const value = parseFloat(player[metric.key]);
                    const percentile = calculatePercentile(value, allValuesForMetric, isNegative);
                    result[`player${idx + 1}`] = percentile; // Assign the calculated percentile (0-100)
                    result[`player${idx + 1}Name`] = player.name; // Keep name for tooltip
                });
                
                radarData.push(result);
            });
        }

        // Return necessary data including allPositionalPlayers
        return { pos, cfg, allMetrics, playersToDisplay, chartData, metricKey, radarData, leagueAvg, isNegativeStat, showExpandButton, expandButtonText, allValues, allPositionalPlayers }; 
    });

    // Add a function to toggle card expansion
    const toggleCardExpansion = (playerId) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else {
                newSet.add(playerId);
            }
            return newSet;
        });
    };

    // Render stat block function - adapted from PlayerList.jsx for consistency
    const renderStatBlock = (player, stats, allPlayersAtPosition, heading = null) => {
        if (!stats || stats.length === 0) return null;
        const posGroup = getPositionGroup(player.position);
        
        return (
            <div className="space-y-4">
                {heading && (
                    <h4 className="text-xs uppercase font-semibold text-gray-400 border-b border-gray-700/50 pb-2 flex items-center">
                        {/* Optional Icon can go here */}
                        {heading}
                    </h4>
                )}
                <div className="grid grid-cols-2 gap-4">
                    {stats
                        .filter(stat => player[stat.key] != null)
                        .map(stat => {
                            const allValues = allPlayersAtPosition
                                .filter(p => p[stat.key] != null)
                                .map(p => parseFloat(p[stat.key]) || 0);
                                
                            const value = parseFloat(player[stat.key]) || 0;
                            // Calculate percentile (pass isNegative directly)
                            const percentile = calculatePercentile(value, allValues, stat.isNegative || false);
                            
                            // Use the raw percentile for coloring and gradient
                            const percentileColorClass = getPercentileColorClass(percentile, stat.isNegative || false);
                            const gradientClass = getPercentileGradient(percentile, stat.isNegative || false);
                            
                            // Determine tier label based on the raw percentile
                            let tierLabel;
                            const p = stat.isNegative ? 100 - percentile : percentile;
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
                                <div key={stat.key} className="bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 hover:border-gray-700 p-3.5 relative transition-all duration-150 shadow-sm hover:shadow group">
                                    {/* Header */}
                                    <div className="mb-2">
                                        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium group-hover:text-gray-300 transition-colors truncate">
                                            {stat.label}
                                        </div>
                                    </div>
                                    
                                    {/* Value and percentile */}
                                    <div className="flex items-end justify-between mb-2">
                                        <span className="text-2xl font-bold group-hover:text-white transition-colors">
                                            {/* Format based on precision or default */} 
                                            {value.toFixed(stat.precision ?? (stat.key.includes('percentage') || stat.key.includes('rate') ? 1 : 0))}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                                            {percentile}%
                                        </span>
                                    </div>
                                    
                                    {/* Percentile bar */}
                                    <div className="mt-2 mb-2 w-full bg-gray-700/70 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
                                            style={{ width: `${percentile}%` }}
                                        />
                                    </div>
                                    
                                    {/* Tier label */}
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
        <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-950">
            <div className="flex flex-col space-y-6">
                {/* Enhanced header with visual hierarchy */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-gray-800">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                        NFL Player Rankings
                    </h1>
                    <p className="text-lg text-gray-400 mt-2">
                        Performance analysis for the {season} season
                    </p>
                    <div className="text-sm text-gray-500 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Players must meet minimum snap thresholds to qualify</span>
                    </div>
                </div>
                
                {/* Enhanced search and filter section */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900 rounded-xl p-4 shadow-lg">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 p-2 bg-gray-800 rounded-lg border border-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label="Search players"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setViewMode('stats')}
                            className={`px-3 py-1 rounded-lg flex items-center ${viewMode === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            aria-pressed={viewMode === 'stats'}
                            aria-label="View player stats"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Stats View
                        </button>
                        <button 
                            onClick={() => setViewMode('comparison')}
                            className={`px-3 py-1 rounded-lg flex items-center ${viewMode === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            aria-pressed={viewMode === 'comparison'}
                            aria-label="Compare selected players"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Compare ({comparisonPlayers.length}/3)
                        </button>
                    </div>
                </div>
                
                {/* Improved position selection with icons and visual enhancements */}
                <div className="bg-gray-900 rounded-xl p-2 shadow-lg">
                    <h2 className="text-sm uppercase tracking-wider font-medium text-gray-400 ml-3 mb-3">Position</h2>
                    <div className="flex flex-wrap gap-2 px-2">
                        {Object.entries(POSITION_CONFIG).map(([pos, cfg]) => (
                            <motion.button
                                key={pos}
                                onClick={() => handlePositionChange(pos)}
                                className={`
                                    px-4 py-2.5 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500
                                    transition-colors duration-200 flex-grow sm:flex-grow-0 w-full sm:w-auto
                                    ${activePosition === pos 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}
                                `}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                aria-pressed={activePosition === pos}
                                aria-label={`View ${cfg.label}`}
                            >
                                <div className="flex items-center justify-center">
                                    <span className="font-medium">{pos}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Add the performance tier legend */}
                {/* const PerformanceTierLegend = () => { ... } // Keep if needed elsewhere, otherwise can remove */}
            </div>
            
            {/* Enhanced Player Comparison View */}
            {viewMode === 'comparison' && (
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Player Comparison</h2>
                        
                        {comparisonPlayers.length > 0 && (
                            <button 
                                onClick={() => setComparisonPlayers([])}
                                className="mt-2 md:mt-0 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center"
                                aria-label="Clear all players"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear All
                            </button>
                        )}
                    </div>
                    
                    {comparisonPlayers.length === 0 ? (
                        <div className="text-center py-12 bg-gray-900 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-gray-400 text-lg mb-2">No players selected for comparison</p>
                            <p className="text-gray-500 max-w-lg mx-auto">Select up to 3 players to compare by clicking the "+" button on player cards. You can compare players across different positions.</p>
                            
                            {/* Add suggestion chips */}
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                <div className="text-sm font-medium text-gray-400 w-full mb-1">Try comparing top players:</div>
                                {byPosition
                                    .filter(({ pos }) => pos === activePosition)
                                    .map(({ playersToDisplay }) => (
                                        playersToDisplay.slice(0, 3).map(player => (
                                            <button 
                                                key={player.gsis_id}
                                                onClick={() => togglePlayerComparison(player)}
                                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm flex items-center"
                                            >
                                                <span>{player.name}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </button>
                                        ))
                                    ))
                                }
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Player cards in comparison view */}
                            <div className="flex flex-wrap mb-6 gap-4 justify-center">
                                {comparisonPlayers.map(player => (
                                    <motion.div 
                                        key={player.gsis_id} 
                                        className="flex flex-col items-center bg-gray-700 p-3 rounded-lg"
                                        whileHover={{ y: -5 }}
                                    >
                                        {getPlayerHeadshot(player, 'large')}
                                        <span className="font-semibold mt-2 text-center">{player.name}</span>
                                        <div className="flex items-center mt-1">
                                            <span className="text-sm text-gray-400 mr-2">{player.position}</span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full">{player.team}</span>
                                        </div>
                                        <button 
                                            onClick={() => togglePlayerComparison(player)}
                                            className="mt-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-red-300 flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Remove
                                        </button>
                                    </motion.div>
                                ))}
                                
                                {/* Add more players slot */}
                                {comparisonPlayers.length < 3 && (
                                    <div className="flex flex-col items-center justify-center bg-gray-700 p-3 rounded-lg w-24 h-24 border-2 border-dashed border-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-xs text-gray-500 mt-2 text-center">Add More Players</span>
                                    </div>
                                )}
                            </div>
                            
                            {comparisonPlayers.length >= 2 && (
                                <>
                                    {/* Enhanced radar chart with context */}
                                    <div className="bg-gray-900 rounded-lg p-4 mb-6">
                                        <h3 className="text-lg font-semibold mb-2">Performance Profile Comparison</h3>
                                        <p className="text-sm text-gray-400 mb-4">Radar visualization shows relative performance percentiles across key metrics</p>
                                        
                                        <div className="w-full h-96">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart 
                                                    outerRadius={120} 
                                                    width={730} 
                                                    height={350} 
                                                    data={generateComparisonData()}
                                                    margin={{ top: 10, right: 30, bottom: 30, left: 30 }}
                                                >
                                                    <PolarGrid />
                                                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'white', fontSize: 12 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'white' }} />
                                                    
                                                    {/* Add a reference area for league average */}
                                                    <Radar 
                                                        name="League Average" 
                                                        dataKey="leagueAvg" 
                                                        stroke="#718096" 
                                                        fill="#718096" 
                                                        fillOpacity={0.1} 
                                                        strokeDasharray="3 3"
                                                    />
                                                    
                                                    {comparisonPlayers.map((player, idx) => (
                                                        <Radar 
                                                            key={player.gsis_id}
                                                            name={player.name} 
                                                            dataKey={`player${idx + 1}`} 
                                                            stroke={COLORS[idx]} 
                                                            fill={COLORS[idx]} 
                                                            fillOpacity={0.5} 
                                                        />
                                                    ))}
                                                    
                                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                                    <RechartsTooltip content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-gray-800 p-3 rounded border border-gray-700 shadow-lg">
                                                                    <p className="font-semibold">{data.metric}</p>
                                                                    <div className="mt-2 space-y-1">
                                                                        {payload.map((entry, index) => (
                                                                            <div key={`item-${index}`} className="flex items-center">
                                                                                <div className="w-3 h-3 mr-2" style={{ backgroundColor: entry.color }}></div>
                                                                                <span className="text-sm">{entry.name}: {entry.value}%</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    
                                    {/* Detailed side-by-side metrics comparison */}
                                    <div className="bg-gray-900 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold mb-2">Detailed Metrics Comparison</h3>
                                        <p className="text-sm text-gray-400 mb-4">Side-by-side comparison of key metrics with league context</p>
                                        
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-800">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Metric</th>
                                                        <th className="px-4 py-2 text-center">League Avg</th>
                                                        {comparisonPlayers.map(player => (
                                                            <th key={player.gsis_id} className="px-4 py-2 text-center">
                                                                {player.name.split(' ')[1] || player.name}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {generateDetailedComparisonData().map((row, index) => (
                                                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-850' : 'bg-gray-900'}>
                                                            <td className="px-4 py-2 font-medium">{row.metricLabel}</td>
                                                            <td className="px-4 py-2 text-center text-gray-400">{row.leagueAvg?.toFixed(2) || '-'}</td>
                                                            {comparisonPlayers.map((player, idx) => {
                                                                const playerValue = row[`player${idx + 1}Value`];
                                                                const playerPercentile = row[`player${idx + 1}Percentile`];
                                                                const isAboveAverage = playerValue > row.leagueAvg;
                                                                const isWholeNumberStat = ['interceptions', 'passing_yards', 'passing_tds', 'rushing_yards', 'rushing_tds', 'receiving_yards', 'receiving_tds', 'receptions'].includes(row.metric);
                                                                
                                                                return (
                                                                    <td key={player.gsis_id} className="px-4 py-2 text-center">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={isAboveAverage ? 'text-green-400' : 'text-red-400'}>
                                                                                {playerValue != null 
                                                                                    ? (isWholeNumberStat ? parseInt(playerValue) : playerValue.toFixed(2)) 
                                                                                    : '-'}
                                                                            </span>
                                                                            {playerPercentile !== undefined && (
                                                                                <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
                                                                                    <div 
                                                                                        className={`h-1 ${
                                                                                            playerPercentile >= 80 ? 'bg-green-500' : 
                                                                                            playerPercentile >= 60 ? 'bg-blue-500' :
                                                                                            playerPercentile >= 40 ? 'bg-gray-500' :
                                                                                            playerPercentile >= 20 ? 'bg-orange-500' : 'bg-red-500'
                                                                                        }`}
                                                                                        style={{ width: `${playerPercentile}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Position Rankings - Modified to only show active position and show all stats */}
            {viewMode === 'stats' && byPosition
                .filter(({ pos }) => pos === activePosition)
                .map(({ pos, cfg, allMetrics, playersToDisplay, chartData, metricKey, radarData, leagueAvg, isNegativeStat, showExpandButton, expandButtonText, allValues, allPositionalPlayers }) => (
                <section 
                    key={pos} 
                    ref={positionRefs.current[pos]}
                    id={`position-${pos}`}
                    className={`bg-gray-900 rounded-lg p-6 shadow-lg transition-all duration-300 ${expandedPosition === pos ? 'ring-2 ring-blue-500' : ''}`}
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-4">
                        <div>
                            <h2 className="text-2xl font-bold">{cfg.label}</h2>
                            {expandedPosition === pos && (
                                <p className="text-sm text-gray-400 mt-1">{cfg.description}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={selectedStats[pos]}
                                onChange={e => {
                                    setSelectedStats(prev => ({ ...prev, [pos]: e.target.value }))
                                }}
                                className="p-2 bg-gray-800 text-white rounded shadow border border-gray-700"
                            >
                                {allMetrics.map(m => (
                                <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                        </select>
                            
                            {/* Conditionally render the button with dynamic text */}
                            {showExpandButton && ( 
                                <button 
                                    onClick={() => setExpandedPosition(expandedPosition === pos ? null : pos)}
                                    className="bg-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-600 transition"
                                >
                                    {expandButtonText} 
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Line chart for selected metric with Headshot Dots */}
                    <div className="w-full h-80 mb-6"> 
                        <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 30, right: 30, bottom: 70, left: 30 }}> 
                                <XAxis 
                                    dataKey="fullName" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={70}
                                    tick={{ fill: '#fff', fontSize: 12 }}
                                    interval={0} 
                                />
                                <YAxis 
                                    tick={{ fill: '#fff' }} 
                                    domain={['auto', 'auto']} 
                                />
                                
                                {/* Add reference line for league average */}
                                <ReferenceLine 
                                    y={leagueAvg} 
                                    stroke="#718096" 
                                    strokeDasharray="3 3" 
                                    label={{ 
                                        value: 'League Avg', 
                                        position: 'right', 
                                        fill: '#718096',
                                        fontSize: 12
                                    }} 
                                />
                                
                                {/* Add reference areas for performance tiers */}
                                <ReferenceArea y1={isNegativeStat ? 0 : leagueAvg * 1.3} y2={isNegativeStat ? leagueAvg * 0.7 : 'auto'} fill="#2d3748" fillOpacity={0.2} label={{ value: 'Elite Zone', position: 'insideTopRight', fill: '#68d391', fontSize: 12 }} />
                                
                                <RechartsTooltip 
                                    content={({ active, payload }) => { 
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            const { grade, color } = getPerformanceGrade(data.percentile, isNegativeStat);
                                            const metricLabel = allMetrics.find(m => m.key === metricKey)?.label || metricKey;
                                            return (
                                                <div className="bg-gray-800 p-3 rounded border border-gray-700 shadow-lg">
                                                    <p className="font-bold text-lg">{data.fullName}</p>
                                                    <p className="mt-1">{`${metricLabel}: ${data.value}`}</p>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-sm">Rank: #{data.rank}</span>
                                                        <span className={`text-sm font-bold ${color}`}>{grade} ({data.percentile}%)</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-blue-500 h-1.5 rounded-full" 
                                                            style={{ width: `${data.percentile}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={TEAM_COLORS[pos] || "#8884d8"} 
                                    strokeWidth={2} 
                                    activeDot={{ r: 8 }} 
                                    dot={<PlayerHeadshotDot />} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar chart for top 3 players if expanded */}
                    {expandedPosition === pos && radarData.length > 0 && (
                        <div className="w-full h-96 mb-6">
                            <h3 className="text-xl font-semibold mb-4">Top 3 Players Comparison</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart 
                                    outerRadius={120} 
                                    width={730} 
                                    height={350} 
                                    data={radarData}
                                    margin={{ top: 10, right: 30, bottom: 30, left: 30 }}
                                >
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'white' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'white' }} />
                                    
                                    <Radar name={radarData[0]?.player1Name} dataKey="player1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
                                    {radarData[0]?.player2Name && (
                                        <Radar name={radarData[0]?.player2Name} dataKey="player2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.5} />
                                    )}
                                    {radarData[0]?.player3Name && (
                                        <Radar name={radarData[0]?.player3Name} dataKey="player3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.5} />
                                    )}
                                    
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                    <RechartsTooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Player cards grid with progressive disclosure */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> 
                        <AnimatePresence>
                            {playersToDisplay.map((p, i) => {
                                const rank = i + 1;
                                const playerId = p.gsis_id;
                                const isExpanded = expandedCards.has(playerId);
                                
                                // Calculate main metric details
                                const value = parseFloat(p[metricKey]) || 0;
                                const metricPercentile = calculatePercentile(value, allValues, isNegativeStat);
                                const isMetricNegative = isNegativeStat;
                                const percentileColorClass = getPercentileColorClass(metricPercentile, isMetricNegative);
                                const barGradient = getPercentileGradient(metricPercentile, isMetricNegative);
                                const posGroup = getPositionGroup(p.position);
                                const isSelected = comparisonPlayers.some(player => player.gsis_id === p.gsis_id);
                                const metricLabel = allMetrics.find(m => m.key === metricKey)?.label || metricKey;

                                return (
                                    <motion.div
                                        key={p.gsis_id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="h-full"
                                    >
                                        {/* Enhanced card with progressive disclosure */}
                                        <motion.div 
                                            className={`h-full bg-gray-800 rounded-xl shadow-lg transition-all duration-300 
                                                ${isSelected ? 'ring-2 ring-blue-500' : 'border border-gray-700'}
                                                ${isExpanded ? 'scale-102 shadow-xl z-10' : 'hover:shadow-xl'}`
                                            }
                                            whileHover={{ y: -5 }}
                                            initial={false}
                                            animate={{ 
                                                height: 'auto',
                                                transition: { duration: 0.3 }
                                            }}
                                        >
                                            {/* Card header - Always visible */}
                                            <div className="p-4 cursor-pointer" onClick={() => toggleCardExpansion(playerId)}>
                                                <div className="flex items-start">
                                                    {/* Headshot with better error handling */}
                                                    <div className="mr-4 flex-shrink-0">
                                                        {getPlayerHeadshot(p)}
                                                    </div>
                                                    
                                                    {/* Name and basic details */}
                                                    <div className="flex-1 min-w-0"> 
                                                        <Link to={`/player/${p.gsis_id}`} className="block" onClick={e => e.stopPropagation()}> {/* Prevent card toggle on link click */}
                                                            <h4 className="text-base font-semibold truncate hover:text-blue-400 transition" title={p.name}>
                                                                {p.name}
                                                            </h4>
                                                        </Link>
                                                        <div className="flex items-center text-sm text-gray-400 mt-0.5">
                                                            <span>{p.position}</span>
                                                            <span className="mx-1">•</span>
                                                            <span>{p.team}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-shrink-0 ml-2 space-x-1">
                                                        {/* Compare toggle button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); togglePlayerComparison(p); }}
                                                            className={`p-1.5 rounded-full transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                                            title={isSelected ? "Remove from comparison" : "Add to comparison"}
                                                            aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                {isSelected ? (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                ) : (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /> 
                                                                )}
                                                            </svg>
                                                        </button>
                                                        
                                                        {/* Expand toggle button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleCardExpansion(playerId); }}
                                                            className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300"
                                                            title={isExpanded ? "Show less" : "Show more"}
                                                            aria-label={isExpanded ? "Show less" : "Show more"}
                                                            aria-expanded={isExpanded}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Main Stat - Consistent Styling */} 
                                                {posGroup && (
                                                    <div className="mt-3">
                                                        <div className="flex justify-between items-center text-sm mb-1">
                                                            <span className="text-gray-400 font-medium">{metricLabel}</span>
                                                            {/* Percentile Badge */}
                                                            <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${percentileColorClass}`}>
                                                                {metricPercentile}th
                                                            </span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-gray-100 mb-2">
                                                            {value != null 
                                                                ? ['interceptions', 'passing_yards', 'passing_tds', 'rushing_yards', 'rushing_tds', 'receiving_yards', 'receiving_tds', 'receptions'].includes(metricKey) 
                                                                    ? parseInt(value) // Display as integer
                                                                    : value.toFixed(allMetrics.find(m => m.key === metricKey)?.precision ?? 2) // Use defined precision or default
                                                                : 'N/A'}
                                                        </p>
                                                        {/* --- Percentile Bar --- */}
                                                        <div 
                                                            className="h-3 w-full bg-gray-700 rounded overflow-hidden border border-gray-600/50"
                                                            title={`${metricPercentile}th Percentile`}
                                                        >
                                                            <div 
                                                                className={`h-full rounded bg-gradient-to-r ${barGradient} transition-all duration-300 ease-out`}
                                                                style={{ width: `${metricPercentile}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Expanded content - visible only when expanded */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        className="px-4 pb-4"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {/* Categorical Stat Organization */}
                                                        <div className="mb-3">
                                                            <h5 className="text-sm font-medium text-gray-300 mb-2">Performance Overview</h5>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {/* Group metrics by category */}
                                                                {(() => {
                                                                    const metrics = allMetrics.slice(0, 8).filter(m => m.key !== metricKey);
                                                                    const categories = {};
                                                                    
                                                                    // Group metrics by category
                                                                    metrics.forEach(metric => {
                                                                        const category = metric.category || 'Other';
                                                                        if (!categories[category]) {
                                                                            categories[category] = [];
                                                                        }
                                                                        
                                                                        const statValue = p[metric.key];
                                                                        if (statValue === undefined || statValue === null) return;
                                                                        
                                                                        const allMetricValues = allPositionalPlayers
                                                                            .map(player => parseFloat(player[metric.key]) || 0)
                                                                            .filter(v => !isNaN(v));
                                                                            
                                                                        const statPercentile = calculatePercentile(
                                                                            parseFloat(statValue), 
                                                                            allMetricValues, 
                                                                            metric.isNegative || false
                                                                        );
                                                                        
                                                                        categories[category].push({
                                                                            ...metric,
                                                                            value: statValue,
                                                                            percentile: statPercentile
                                                                        });
                                                                    });
                                                                    
                                                                    // Render each metric in its category
                                                                    return Object.entries(categories).map(([category, categoryMetrics]) => (
                                                                        <React.Fragment key={category}>
                                                                            {categoryMetrics.map(metric => (
                                                                                <div key={metric.key} className="bg-gray-800 p-2 rounded border border-gray-700 hover:border-gray-500 transition">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-xs text-gray-400">{metric.label}</span>
                                                                                            <span className="text-base font-medium">{metric.value}</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className="text-xs text-gray-400">{category}</span>
                                                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded mt-1" 
                                                                                                style={{
                                                                                                    backgroundColor: metric.percentile >= 80 ? 'rgba(74, 222, 128, 0.2)' : 
                                                                                                                      metric.percentile >= 60 ? 'rgba(163, 230, 53, 0.2)' :
                                                                                                                      metric.percentile >= 40 ? 'rgba(250, 204, 21, 0.2)' :
                                                                                                                      metric.percentile >= 20 ? 'rgba(251, 146, 60, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                                                    color: metric.percentile >= 80 ? '#4ade80' : 
                                                                                                           metric.percentile >= 60 ? '#a3e635' :
                                                                                                           metric.percentile >= 40 ? '#facc15' :
                                                                                                           metric.percentile >= 20 ? '#fb923c' : '#ef4444'
                                                                                                }}
                                                                                            >
                                                                                                {metric.percentile}%
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </React.Fragment>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Player analysis summary */}
                                                        <div className="bg-gray-700 p-3 rounded-lg mt-3">
                                                            <h5 className="text-sm font-medium text-gray-300 mb-1">Analysis Summary</h5>
                                                            <p className="text-sm text-gray-300">
                                                                {p.name.split(' ')[0]} is performing at 
                                                                {metricPercentile >= 80 ? ' an elite level' : 
                                                                metricPercentile >= 60 ? ' an above average level' :
                                                                metricPercentile >= 40 ? ' an average level' :
                                                                metricPercentile >= 20 ? ' a below average level' : ' a poor level'} 
                                                                compared to other {p.position}s in {metricLabel.toLowerCase()}.
                                                                {metricPercentile >= 60 ? ' Consider this player a strong contributor.' : 
                                                                metricPercentile <= 30 ? ' This player is underperforming expectations.' : 
                                                                ' This player is performing close to league average.'}
                                                            </p>
                                                        </div>
                                                        
                                                        {/* View profile button */}
                                                        <Link 
                                                            to={`/player/${p.gsis_id}`}
                                                            className="w-full mt-3 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                                                        >
                                                            <span>View Full Profile</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </Link>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </section>
            ))}
        </div>
    );

    // Helper function to generate comparison data for radar chart using PERCENTILES
    function generateComparisonData() {
        if (comparisonPlayers.length < 2) return [];
        
        // Determine if players are comparable (same position group or general)
        const firstPosGroup = getPositionGroup(comparisonPlayers[0].position);
        const allSamePositionGroup = comparisonPlayers.every(
            p => getPositionGroup(p.position) === firstPosGroup
        );
        
        let metricsToCompare = [];
        let comparisonGroup = []; // All players to compare against for percentiles

        if (allSamePositionGroup && firstPosGroup) {
            // Use combined metrics if all players match
            metricsToCompare = getCombinedMetrics(firstPosGroup);
            comparisonGroup = players.filter(p => getPositionGroup(p.position) === firstPosGroup);
        } else {
            // Use generic stats for cross-position comparison
            metricsToCompare = [
                { key: 'epa_per_play', label: 'EPA/Play', isNegative: false }, 
                // Add other generic comparable stats if available, e.g., snaps
                 { key: 'snaps_played', label: 'Snaps Played', isNegative: false },
            ];
            comparisonGroup = players; // Compare against everyone
        }
        
        if (!metricsToCompare.length) return []; // No metrics found to compare

        // Calculate percentile for each selected player for each metric
        return metricsToCompare.map(metric => {
            const result = { 
                metric: metric.label, 
                leagueAvg: 50 
            };
            const isNegative = metric.isNegative || false;

            // Get all values for this metric from the relevant comparison group
            const allValuesForMetric = comparisonGroup
                .map(p => parseFloat(p[metric.key]))
                .filter(v => v !== null && !isNaN(v));

            comparisonPlayers.forEach((player, idx) => {
                const value = parseFloat(player[metric.key]);
                // Store the raw value for the detailed table
                result[`player${idx + 1}Value`] = isNaN(value) ? null : value;
                
                if (!isNaN(value)) {
                    const percentile = calculatePercentile(value, allValuesForMetric, isNegative);
                    
                    // Store percentile both ways - for the chart and for the detailed table
                    result[`player${idx + 1}`] = percentile; // This is what the radar chart needs
                    result[`player${idx + 1}Percentile`] = percentile;
                    
                    // Keep the name for tooltip (needed by the chart)
                    result[`player${idx + 1}Name`] = player.name;
                } else {
                    // Even if value is NaN, set a zero for the radar chart to avoid errors
                    result[`player${idx + 1}`] = 0;
                }
            });
            
            return result;
        });
    }

    // Add the helper function for detailed comparison data inside the PlayerRankings component
    function generateDetailedComparisonData() {
        if (comparisonPlayers.length < 1) return [];
        
        // Get the appropriate metrics to compare based on position group
        const firstPosGroup = getPositionGroup(comparisonPlayers[0].position);
        const allSamePositionGroup = comparisonPlayers.every(
            p => getPositionGroup(p.position) === firstPosGroup
        );
        
        let metricsToCompare = [];
        let allPlayersInGroup = [];
        
        if (allSamePositionGroup && firstPosGroup) {
            // Position-specific metrics for same position players
            metricsToCompare = getCombinedMetrics(firstPosGroup);
            allPlayersInGroup = players.filter(p => getPositionGroup(p.position) === firstPosGroup);
        } else {
            // Generic metrics for cross-position comparison
            metricsToCompare = [
                { key: 'epa_per_play', label: 'EPA/Play' },
                { key: 'snaps_played', label: 'Snaps Played' },
                // Add more generic metrics as available
            ];
            allPlayersInGroup = players;
        }
        
        return metricsToCompare.map(metric => {
            const result = { 
                metric: metric.key, 
                metricLabel: metric.label,
                isNegative: metric.isNegative || false 
            };
            
            // Calculate league average for this metric
            const allValues = allPlayersInGroup
                .map(p => parseFloat(p[metric.key]))
                .filter(v => v !== null && !isNaN(v));
            
            result.leagueAvg = allValues.length ? 
                allValues.reduce((sum, val) => sum + val, 0) / allValues.length : null;
            
            // Add every player's value and percentile
            comparisonPlayers.forEach((player, idx) => {
                const value = parseFloat(player[metric.key]);
                result[`player${idx + 1}Value`] = isNaN(value) ? null : value;
                
                if (!isNaN(value)) {
                    const percentile = calculatePercentile(value, allValues, metric.isNegative);
                    result[`player${idx + 1}Percentile`] = percentile;
                }
            });
            
            // Add leagueAvg so the radar chart can show league average
            result.leagueAvg = result.leagueAvg ? 50 : 0; // Center at 50% for visual balance
            
            return result;
        });
    }
}

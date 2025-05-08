import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Legend, 
  ScatterChart, 
  Scatter, 
  ZAxis,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  ReferenceLine
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTeams, fetchPlayers } from '../api/api';
import Tooltip from './Tooltip'; // Import the unified Tooltip component

// NFL team colors
const TEAM_COLORS = {
  ARI: "#97233F", ATL: "#A71930", BAL: "#241773", BUF: "#00338D", 
  CAR: "#0085CA", CHI: "#0B162A", CIN: "#FB4F14", CLE: "#311D00", 
  DAL: "#003594", DEN: "#FB4F14", DET: "#0076B6", GB: "#203731", 
  HOU: "#03202F", IND: "#002C5F", JAX: "#006778", KC: "#E31837", 
  LV: "#000000", LAC: "#0080C6", LAR: "#003594", MIA: "#008E97", 
  MIN: "#4F2683", NE: "#002244", NO: "#D3BC8D", NYG: "#0B2265", 
  NYJ: "#125740", PHI: "#004C54", PIT: "#FFB612", SF: "#AA0000", 
  SEA: "#002244", TB: "#D50A0A", TEN: "#0C2340", WAS: "#5A1414"
};

// NFL Team abbreviations to full names mapping (Adding this back)
const NFL_TEAMS = {
    'ARI': 'Arizona Cardinals',
    'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens',
    'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers',
    'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos',
    'DET': 'Detroit Lions',
    'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'KC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders',
    'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams',
    'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings',
    'NE': 'New England Patriots',
    'NO': 'New Orleans Saints',
    'NYG': 'New York Giants',
    'NYJ': 'New York Jets',
    'PHI': 'Philadelphia Eagles',
    'PIT': 'Pittsburgh Steelers',
    'SF': 'San Francisco 49ers',
    'SEA': 'Seattle Seahawks',
    'TB': 'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans',
    'WAS': 'Washington Commanders'
};

// NFL team locations for the map
const TEAM_LOCATIONS = [
  { abbr: "ARI", name: "Cardinals", coordinates: [-112.2625, 33.5275], color: "#97233F", conference: "NFC", division: "West" },
  { abbr: "ATL", name: "Falcons", coordinates: [-84.4009, 33.7553], color: "#A71930", conference: "NFC", division: "South" },
  { abbr: "BAL", name: "Ravens", coordinates: [-76.6227, 39.2780], color: "#241773", conference: "AFC", division: "North" },
  { abbr: "BUF", name: "Bills", coordinates: [-78.7870, 42.7738], color: "#00338D", conference: "AFC", division: "East" },
  { abbr: "CAR", name: "Panthers", coordinates: [-80.8527, 35.2258], color: "#0085CA", conference: "NFC", division: "South" },
  { abbr: "CHI", name: "Bears", coordinates: [-87.6167, 41.8625], color: "#0B162A", conference: "NFC", division: "North" },
  { abbr: "CIN", name: "Bengals", coordinates: [-84.5159, 39.0955], color: "#FB4F14", conference: "AFC", division: "North" },
  { abbr: "CLE", name: "Browns", coordinates: [-81.6995, 41.5061], color: "#311D00", conference: "AFC", division: "North" },
  { abbr: "DAL", name: "Cowboys", coordinates: [-97.0929, 32.7479], color: "#003594", conference: "NFC", division: "East" },
  { abbr: "DEN", name: "Broncos", coordinates: [-105.0200, 39.7439], color: "#FB4F14", conference: "AFC", division: "West" },
  { abbr: "DET", name: "Lions", coordinates: [-83.0459, 42.3400], color: "#0076B6", conference: "NFC", division: "North" },
  { abbr: "GB", name: "Packers", coordinates: [-88.0626, 44.5013], color: "#203731", conference: "NFC", division: "North" },
  { abbr: "HOU", name: "Texans", coordinates: [-95.4103, 29.6848], color: "#03202F", conference: "AFC", division: "South" },
  { abbr: "IND", name: "Colts", coordinates: [-86.1626, 39.7601], color: "#002C5F", conference: "AFC", division: "South" },
  { abbr: "JAX", name: "Jaguars", coordinates: [-81.6376, 30.3238], color: "#006778", conference: "AFC", division: "South" },
  { abbr: "KC", name: "Chiefs", coordinates: [-94.4839, 39.0489], color: "#E31837", conference: "AFC", division: "West" },
  { abbr: "LAC", name: "Chargers", coordinates: [-118.3392, 33.9535], color: "#0080C6", conference: "AFC", division: "West" },
  { abbr: "LAR", name: "Rams", coordinates: [-118.3392, 33.9535], color: "#003594", conference: "NFC", division: "West" },
  { abbr: "LV", name: "Raiders", coordinates: [-115.1833, 36.0907], color: "#000000", conference: "AFC", division: "West" },
  { abbr: "MIA", name: "Dolphins", coordinates: [-80.2388, 25.9579], color: "#008E97", conference: "AFC", division: "East" },
  { abbr: "MIN", name: "Vikings", coordinates: [-93.2580, 44.9735], color: "#4F2683", conference: "NFC", division: "North" },
  { abbr: "NE", name: "Patriots", coordinates: [-71.2643, 42.0909], color: "#002244", conference: "AFC", division: "East" },
  { abbr: "NO", name: "Saints", coordinates: [-90.0812, 29.9511], color: "#D3BC8D", conference: "NFC", division: "South" },
  { abbr: "NYG", name: "Giants", coordinates: [-74.0748, 40.8135], color: "#0B2265", conference: "NFC", division: "East" },
  { abbr: "NYJ", name: "Jets", coordinates: [-74.0748, 40.8135], color: "#125740", conference: "AFC", division: "East" },
  { abbr: "PHI", name: "Eagles", coordinates: [-75.1674, 39.9008], color: "#004C54", conference: "NFC", division: "East" },
  { abbr: "PIT", name: "Steelers", coordinates: [-80.0158, 40.4468], color: "#FFB612", conference: "AFC", division: "North" },
  { abbr: "SF", name: "49ers", coordinates: [-122.0375, 37.4032], color: "#AA0000", conference: "NFC", division: "West" },
  { abbr: "SEA", name: "Seahawks", coordinates: [-122.3316, 47.5952], color: "#002244", conference: "NFC", division: "West" },
  { abbr: "TB", name: "Buccaneers", coordinates: [-82.5033, 27.9758], color: "#D50A0A", conference: "NFC", division: "South" },
  { abbr: "TEN", name: "Titans", coordinates: [-86.7713, 36.1665], color: "#0C2340", conference: "AFC", division: "South" },
  { abbr: "WAS", name: "Commanders", coordinates: [-76.8644, 38.9076], color: "#5A1414", conference: "NFC", division: "East" },
];

// --- Team Logo Fallback Map (Copied from TeamList.jsx) ---
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
    'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png' // Note: WAS uses wsh
};

// --- Copied from TeamList.jsx ---
const getTeamLogo = (team) => {
    // Prioritize API fields (assuming team object might have these), then fall back to map
    return team.team_logo_espn || team.team_logo || logoFallbackMap[team.team_abbr] || 'https://via.placeholder.com/100?text=N/A';
};
// ---------------------------------

// Helper function to calculate percentile
const calculatePercentile = (value, allValues) => {
  if (!allValues.length) return 0;
  const sortedValues = [...allValues].sort((a, b) => a - b);
  const index = sortedValues.findIndex(v => v >= value);
  return Math.round((index / sortedValues.length) * 100);
};

// EPA Explanation Text
const epaExplanation = "Expected Points Added (EPA) measures the change in the expected points scored after a specific play. Positive EPA means the play increased scoring expectation; negative means it decreased.";

// Custom tooltip for charts - use renamed RechartsTooltip
const CustomTooltip = ({ active, payload, label, teamsData }) => {
  if (active && payload && payload.length) {
    const teamAbbr = payload[0].payload.name;
    const teamInfo = teamsData?.find(t => t.team_abbr === teamAbbr);
    const teamName = NFL_TEAMS[teamAbbr] || teamAbbr;
    const teamLogo = teamInfo ? getTeamLogo(teamInfo) : logoFallbackMap[teamAbbr];
    
    // Format values appropriately
    const formatValue = (name, value) => {
      if (name.toLowerCase().includes('epa')) {
        return value.toFixed(3);
      }
      return value.toFixed(1);
    };
    
    // Helper function to format label text for consistent casing
    const formatLabel = (label) => {
      if (typeof label === 'string') {
         if (label.toLowerCase().includes('offensive epa/play')) return 'Offensive EPA/Play';
         if (label.toLowerCase().includes('defensive epa/play')) return 'Defensive EPA/Play';
      }
      return label; // Return original if not a string or doesn't match
    };
    
    return (
      <div className="bg-gray-900/90 backdrop-blur-sm p-4 border border-gray-700 rounded-lg shadow-xl z-30"> {/* Added z-30 */} 
        <div className="flex items-center mb-3">
          {teamLogo && (
            <img 
              src={teamLogo} 
              alt={teamName} 
              className="w-6 h-6 mr-2 object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <p className="font-bold text-white">{teamName}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {payload.map((entry, index) => (
            <React.Fragment key={index}>
              <div className="text-xs text-gray-400 flex items-center">
                {formatLabel(entry.name)} {/* Apply label formatter */}
                {typeof entry.name === 'string' && entry.name.toLowerCase().includes('epa') && <Tooltip text={epaExplanation} />}
              </div>
              <div className="text-xs font-medium text-right" style={{ color: entry.color || '#10B981' }}>
                {formatValue(entry.name, entry.value)}
              </div>
            </React.Fragment>
          ))}
          
          {/* Additional stats */}
          {teamInfo && (
            <>
              <div className="text-xs text-gray-400 mt-2">Record:</div>
              <div className="text-xs font-medium text-right text-white mt-2">
                {teamInfo.wins}-{teamInfo.losses}{teamInfo.ties > 0 ? `-${teamInfo.ties}` : ''}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [animatingBars, setAnimatingBars] = useState(true);
  
  // Fetch team data
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ['teams', import.meta.env.VITE_DEFAULT_SEASON || '2024'],
    queryFn: () => fetchTeams(import.meta.env.VITE_DEFAULT_SEASON || '2024')
  });
  
  // Fetch player data
  const { data: playersData, isLoading: playersLoading, error: playersError } = useQuery({
    queryKey: ['players', { season: import.meta.env.VITE_DEFAULT_SEASON || '2024' }],
    queryFn: () => fetchPlayers({ season: import.meta.env.VITE_DEFAULT_SEASON || '2024' })
  });

  // Extract data arrays once loaded
  const teams = teamsData?.data;
  const players = playersData?.data;

  // Navigate to team detail page when clicking a team card
  const handleTeamClick = (teamAbbr) => {
    navigate(`/team/${teamAbbr}`);
  };

  // Navigate to player detail page
  const handlePlayerClick = (playerId) => {
    navigate(`/player/${playerId}`);
  };

  // Calculate derived metrics for visualizations AND leaderboards
  const getChartData = () => {
    if (!teams || !players) return { 
      scatterData: [], 
      teamLeaderboards: {}, 
      playerLeaderboards: {}, 
      avgOffEPA: 0, 
      avgDefEPA: 0 
    };
    
    // Calculate Averages
    let totalOffEPA = 0;
    let totalDefEPA = 0;
    teams.forEach(team => {
      totalOffEPA += parseFloat(team.offense_epa_per_play);
      totalDefEPA += parseFloat(team.defense_epa_per_play);
    });
    const avgOffEPA = teams.length > 0 ? totalOffEPA / teams.length : 0;
    const avgDefEPA = teams.length > 0 ? totalDefEPA / teams.length : 0;
    
    // Invert the average defensive EPA for the chart's Y-axis
    const avgDefEPAInverted = avgDefEPA * -1;
      
    const scatterData = teams.map(team => ({
      name: team.team_abbr,
      x: parseFloat(team.offense_epa_per_play),
      y: parseFloat(team.defense_epa_per_play) * -1,
      z: parseFloat(team.offensive_ppg) + (24 - parseFloat(team.defensive_ppg)),
      color: TEAM_COLORS[team.team_abbr] || '#666'
    }));

    const teamLeaderboards = {
      offensePPG: [...teams]
        .sort((a, b) => parseFloat(b.offensive_ppg) - parseFloat(a.offensive_ppg))
        .slice(0, 5)
        .map((team, idx) => ({
          rank: idx + 1,
          abbr: team.team_abbr,
          name: NFL_TEAMS[team.team_abbr] || team.team_abbr,
          logo: getTeamLogo(team),
          value: parseFloat(team.offensive_ppg).toFixed(1),
          metricLabel: "PPG"
        })),
      
      offenseEPA: [...teams]
        .sort((a, b) => parseFloat(b.offense_epa_per_play) - parseFloat(a.offense_epa_per_play))
        .slice(0, 5)
        .map((team, idx) => ({
          rank: idx + 1,
          abbr: team.team_abbr,
          name: NFL_TEAMS[team.team_abbr] || team.team_abbr,
          logo: getTeamLogo(team),
          value: parseFloat(team.offense_epa_per_play).toFixed(3),
          metricLabel: "Off EPA/Play"
        })),

      defensePPG: [...teams]
        .sort((a, b) => parseFloat(a.defensive_ppg) - parseFloat(b.defensive_ppg))
        .slice(0, 5)
        .map((team, idx) => ({
          rank: idx + 1,
          abbr: team.team_abbr,
          name: NFL_TEAMS[team.team_abbr] || team.team_abbr,
          logo: getTeamLogo(team),
          value: parseFloat(team.defensive_ppg).toFixed(1),
          metricLabel: "PPG Allowed"
        })),
      
      defenseEPA: [...teams]
        .sort((a, b) => parseFloat(a.defense_epa_per_play) - parseFloat(b.defense_epa_per_play))
        .slice(0, 5)
        .map((team, idx) => ({
          rank: idx + 1,
          abbr: team.team_abbr,
          name: NFL_TEAMS[team.team_abbr] || team.team_abbr,
          logo: getTeamLogo(team),
          value: parseFloat(team.defense_epa_per_play).toFixed(3),
          metricLabel: "Def EPA/Play"
        })),
    };

    const qbs = players.filter(p => p.position === 'QB' && p.passing_yards != null);
    const rbs = players.filter(p => p.position === 'RB' && p.rushing_yards != null);
    const wrs = players.filter(p => p.position === 'WR' && p.receiving_yards != null);

    const playerLeaderboards = {
        qbPassingYards: [...qbs]
            .sort((a, b) => parseFloat(b.passing_yards) - parseFloat(a.passing_yards))
            .slice(0, 5)
            .map((p, idx) => ({ rank: idx + 1, id: p.gsis_id, name: p.name, team: p.team, headshot: p.headshot_url, value: parseInt(p.passing_yards).toLocaleString(), metricLabel: "Passing Yards" })),
        rbYards: [...rbs]
            .sort((a, b) => parseFloat(b.rushing_yards) - parseFloat(a.rushing_yards))
            .slice(0, 5)
            .map((p, idx) => ({ rank: idx + 1, id: p.gsis_id, name: p.name, team: p.team, headshot: p.headshot_url, value: parseInt(p.rushing_yards).toLocaleString(), metricLabel: "Rush Yards" })),
        wrYards: [...wrs]
            .sort((a, b) => parseFloat(b.receiving_yards) - parseFloat(a.receiving_yards))
            .slice(0, 5)
            .map((p, idx) => ({ rank: idx + 1, id: p.gsis_id, name: p.name, team: p.team, headshot: p.headshot_url, value: parseInt(p.receiving_yards).toLocaleString(), metricLabel: "Rec Yards" }))
    };
    
    return { 
      scatterData, 
      teamLeaderboards, 
      playerLeaderboards, 
      avgOffEPA, 
      avgDefEPA: avgDefEPAInverted // Return the inverted average for the chart
    };
  };
  
  const { scatterData, teamLeaderboards, playerLeaderboards, avgOffEPA, avgDefEPA } = getChartData();

  // Combine loading states
  const isLoading = teamsLoading || playersLoading;
  // Combine error states (or prioritize one)
  const error = teamsError || playersError;

  // After data is loaded, trigger animation timeout
  useEffect(() => {
    if (teams && !teamsLoading) {
      // Set a timeout to ensure animation completes
      const timer = setTimeout(() => {
        setAnimatingBars(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [teams, teamsLoading]);

  // Helper function to render an animated bar chart for team leaders
  const renderTeamBarChart = (leaderboardData, metricLabel, colorStart, colorEnd, reverseOrder = false) => {
    if (!leaderboardData || leaderboardData.length === 0) return null;
    
    // Calculate the maximum value for scaling
    const maxValue = Math.max(...leaderboardData.map(item => parseFloat(item.value)));
    
    // Use data in its original order (already sorted by rank)
    const sortedData = [...leaderboardData];
    
    return (
      <div className="space-y-3 py-2">
        {sortedData.map((team, index) => {
          // Calculate width percentage
          const widthPercentage = (parseFloat(team.value) / maxValue) * 100;
          
          // Staggered animation delay - either from top to bottom or bottom to top
          const delay = reverseOrder ? 
            (sortedData.length - 1 - index) * 0.3 : // Animate from bottom to top (5 to 1)
            index * 0.3; // Animate from top to bottom (1 to 5)
          
          return (
            <div 
              key={`${team.abbr}-${metricLabel}`}
              className="relative"
              onClick={() => handleTeamClick(team.abbr)}
            >
              <div className="flex items-center justify-between mb-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden border border-gray-700">
                    <img 
                      src={team.logo} 
                      alt={`${team.name} logo`} 
                      className="w-6 h-6 object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                      loading="lazy"
                    />
                  </div>
                  <div className="text-sm font-medium text-white truncate max-w-[120px]" title={team.name}>
                    {team.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-green-400">{team.value}</div>
                  <div className="text-xs text-gray-400">{team.metricLabel}</div>
                </div>
              </div>
              
              {/* Bar background */}
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                {/* Animated bar */}
                <motion.div 
                  className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(to right, ${colorStart}, ${colorEnd})`,
                    originX: 0,
                    width: `${widthPercentage}%`
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: animatingBars ? 1 : 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay,
                    ease: "easeOut"
                  }}
                  custom={index}
                />
              </div>
              
              {/* Rank indicator */}
              <div 
                className="absolute -left-7 top-1 w-5 h-5 flex items-center justify-center font-bold text-xs text-gray-400 bg-gray-800/80 rounded-full"
              >
                {team.rank}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Skeleton Loader Components
  const LeaderboardSkeleton = () => (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
      <div className="p-4 h-[60px] bg-gray-700/50 animate-pulse"></div>
      <div className="p-3 h-[40px] bg-gray-600/50 animate-pulse"></div>
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-700"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              <div className="h-2 bg-gray-700 rounded w-full"></div>
            </div>
            <div className="w-12 h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
      <div className="p-3 h-[40px] bg-gray-600/50 animate-pulse mt-1"></div>
       <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-700"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              <div className="h-2 bg-gray-700 rounded w-full"></div>
            </div>
            <div className="w-12 h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const PlayerLeaderboardSkeleton = () => (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
      <div className="p-4 h-[60px] bg-gray-700/50 animate-pulse"></div>
      <div className="p-3 h-[40px] bg-gray-600/50 animate-pulse"></div>
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-700"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              <div className="h-2 bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="w-12 h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section Skeleton (Optional but good) */}
        <div className="mb-12 text-center py-16 animate-pulse">
          <div className="h-6 w-32 bg-gray-700 rounded-full mx-auto mb-3"></div>
          <div className="h-10 md:h-14 bg-gray-700 rounded w-3/4 mx-auto mb-6"></div>
          <div className="h-6 md:h-8 bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
          <div className="flex justify-center gap-4">
            <div className="h-12 w-36 bg-gray-700 rounded-md"></div>
            <div className="h-12 w-36 bg-gray-700 rounded-md"></div>
          </div>
        </div>

        {/* Leaderboard Skeletons */}
        <div className="mb-16">
          <div className="h-8 w-64 bg-gray-700 rounded mb-8 animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <LeaderboardSkeleton />
            <LeaderboardSkeleton />
          </div>
          
          <div className="h-8 w-64 bg-gray-700 rounded mb-8 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PlayerLeaderboardSkeleton />
            <PlayerLeaderboardSkeleton />
            <PlayerLeaderboardSkeleton />
          </div>
        </div>

        {/* Map and Scatterplot Skeletons (Simpler placeholders) */}
        <div className="h-[500px] bg-gray-800/70 rounded-xl mb-16 animate-pulse"></div>
        <div className="h-[500px] bg-gray-800/70 rounded-xl mb-16 animate-pulse"></div>
        
        {/* CTA Skeleton */}
        <div className="h-[400px] bg-gray-800/70 rounded-xl mb-8 animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-xl">Error loading data</p>
        <p className="text-gray-400">{error.message}</p>
      </div>
    );
  }

  // Helper function to render a TEAM leaderboard row with LOGO and FULL NAME
  const renderTeamLeaderboardRow = (item) => (
    <div 
      key={`${item.abbr}-${item.metricLabel}`}
      className="flex items-center p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
      onClick={() => handleTeamClick(item.abbr)}
    >
      <div className="w-6 h-6 flex items-center justify-center font-bold text-xs text-gray-400 mr-3 bg-gray-800/80 rounded-full">
        {item.rank}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden mr-3 border border-gray-700">
        <img 
          src={item.logo} 
          alt={`${item.name} logo`} 
          className="w-8 h-8 object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
          loading="lazy"
        />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-white text-sm truncate" title={item.name}>{item.name}</div>
        <div className="text-xs text-gray-400">{item.abbr}</div>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-lg font-bold text-green-400">{item.value}</div>
        <div className="text-xs text-gray-400">{item.metricLabel}</div>
      </div>
    </div>
  );

  // Helper function to render a PLAYER leaderboard row with HEADSHOT
  const renderPlayerLeaderboardRow = (item) => (
    <div 
      key={`${item.id}-${item.metricLabel}`}
      className="flex items-center p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
      onClick={() => handlePlayerClick(item.id)}
    >
      <div className="w-6 h-6 flex items-center justify-center font-bold text-xs text-gray-400 mr-3 bg-gray-800/80 rounded-full">
        {item.rank}
      </div>
      <div className="relative mr-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-900 border border-gray-700">
          <img 
            src={item.headshot || 'https://via.placeholder.com/150?text=No+Image'} 
            alt={`${item.name} headshot`} 
            className="w-10 h-10 object-cover"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image' }}
            loading="lazy"
          />
        </div>
        {item.team && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
            <img 
              src={logoFallbackMap[item.team] || 'https://via.placeholder.com/20?text=N/A'} 
              alt={`${item.team} logo`} 
              className="w-4 h-4 object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-white text-sm truncate" title={item.name}>{item.name}</div>
        <div className="text-xs text-gray-400">{item.team}</div>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-lg font-bold text-green-400">{item.value}</div>
        <div className="text-xs text-gray-400">{item.metricLabel}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <motion.div 
        className="mb-12 text-center relative py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Background Pattern - subtle grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 z-0"></div>
        
        {/* Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block mb-3 px-4 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium tracking-wide"
          >
            NFL SEASON {import.meta.env.VITE_DEFAULT_SEASON || '2024'}
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Sideline Metrics
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Comprehensive NFL analytics visualizing team and player performance
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex justify-center gap-4 flex-wrap"
          >
            <Link to="/teams" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-150 shadow-lg shadow-blue-500/20">
              Explore Teams
            </Link>
            <Link to="/rankings" className="px-6 py-3 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600 transition duration-150 border border-gray-600">
              Player Rankings
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Leaderboards */}
      <motion.div 
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">NFL Team Leaderboards</h2>
          <Link to="/teams" className="text-blue-400 hover:text-blue-300 transition flex items-center text-sm font-medium">
            View All Teams
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Offensive Team Leaders */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
            <div className="p-4 bg-gradient-to-r from-green-600/90 to-green-800/90">
              <h3 className="text-xl font-semibold text-white">
                Offensive Leaders
              </h3>
            </div>
            <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider">
              Points Per Game
            </div>
            <div className="p-6">
              {renderTeamBarChart(teamLeaderboards.offensePPG, "PPG", "#10B981", "#065F46", false)}
            </div>
            <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider mt-1">
              EPA per play <Tooltip text={epaExplanation} />
            </div>
            <div className="p-6">
              {renderTeamBarChart(teamLeaderboards.offenseEPA, "EPA/Play", "#10B981", "#065F46", false)}
            </div>
        </div>
          
          {/* Defensive Team Leaders */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
            <div className="p-4 bg-gradient-to-r from-blue-600/90 to-blue-800/90">
              <h3 className="text-xl font-semibold text-white">
                Defensive Leaders
              </h3>
            </div>
            <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider">
              Points Per Game Allowed
            </div>
            <div className="p-6">
              {renderTeamBarChart(teamLeaderboards.defensePPG, "PPG Allowed", "#3B82F6", "#1E40AF", true)}
            </div>
            <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider mt-1">
              EPA per play allowed <Tooltip text={epaExplanation} />
            </div>
            <div className="p-6">
              {renderTeamBarChart(teamLeaderboards.defenseEPA, "EPA/Play", "#3B82F6", "#1E40AF", true)}
            </div>
          </div>
        </div>
        
        {/* Player Leaderboards */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">NFL Player Leaderboards</h2>
          <Link to="/rankings" className="text-blue-400 hover:text-blue-300 transition flex items-center text-sm font-medium">
            View All Players
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* QB Leaders */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
                <div className="p-4 bg-gradient-to-r from-red-600/90 to-red-800/90">
                  <h3 className="text-xl font-semibold text-white">
                    QB Leaders
                  </h3>
                </div>
                <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider">
                    Passing Yards
                </div>
                <div className="divide-y divide-gray-700/50">
                  {playerLeaderboards.qbPassingYards?.map(renderPlayerLeaderboardRow)}
                </div>
            </div>

            {/* RB Leaders */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
                <div className="p-4 bg-gradient-to-r from-purple-600/90 to-purple-800/90">
                  <h3 className="text-xl font-semibold text-white">
                    RB Leaders
                  </h3>
                </div>
                <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider">
                    Rushing Yards
                </div>
                <div className="divide-y divide-gray-700/50">
                  {playerLeaderboards.rbYards?.map(renderPlayerLeaderboardRow)}
                </div>
            </div>

            {/* WR Leaders */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
                <div className="p-4 bg-gradient-to-r from-yellow-600/90 to-yellow-800/90">
                  <h3 className="text-xl font-semibold text-white">
                    WR Leaders
                  </h3>
                </div>
                <div className="p-3 bg-gray-700/70 font-semibold text-gray-300 uppercase text-sm tracking-wider">
                    Receiving Yards
                </div>
                <div className="divide-y divide-gray-700/50">
                  {playerLeaderboards.wrYards?.map(renderPlayerLeaderboardRow)}
                </div>
            </div>
        </div>

        <div className="text-center mt-6 text-gray-400 text-sm">
          <p>Click on any team or player to view detailed analytics. All stats from {import.meta.env.VITE_DEFAULT_SEASON || '2024'} season.</p>
        </div>
      </motion.div>

      {/* Team Performance Map */}
      <motion.div 
        className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-gray-700/50 mb-16 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            NFL Team Performance Map
          </h2>
          
          {/* Add conference filter toggle */}
          <div className="flex items-center space-x-2 text-sm">
            <button 
              className={`px-3 py-1 rounded transition-colors ${selectedTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setSelectedTab('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-1 rounded transition-colors ${selectedTab === 'afc' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setSelectedTab('afc')}
            >
              AFC
            </button>
            <button 
              className={`px-3 py-1 rounded transition-colors ${selectedTab === 'nfc' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setSelectedTab('nfc')}
            >
              NFC
            </button>
          </div>
        </div>

        <div className="h-[450px] w-full relative">
          {/* Enhanced Legend */}
          <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50 z-10 text-xs">
            <h4 className="font-bold text-white mb-2 text-center">Performance Guide</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
              <div className="text-gray-400">Conference:</div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full border-2 border-red-500 mr-2"></div>
                <span>AFC</span>
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 ml-4 mr-2"></div>
                <span>NFC</span>
              </div>
              
              <div className="text-gray-400">EPA Rating:</div>
              <div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>High EPA</span>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span>Medium EPA</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span>Negative EPA</span>
                </div>
              </div>
            </div>
            <div className="text-center text-gray-400 mt-2 border-t border-gray-700 pt-1">
              Circle size represents EPA value
            </div>
          </div>

          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 1000 }}
            style={{ width: "100%", height: "100%" }}
            className="bg-gray-900/20 rounded-lg"
          >
            {/* Add subtle division regions - REMOVED LABELS */}
            <Geographies geography="/assets/us-states.json">
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#27303f" // Slightly lighter fill (closer to gray-700/800)
                    stroke="#4b5563" // Slightly lighter stroke (gray-600)
                    strokeWidth={0.5}
                  />
                ))
              }
            </Geographies>
            
            {/* Division labels for context - REMOVED */}
            {/* 
            <g className="division-labels text-xs">
              <text x="160" y="90" fill="#666" fontSize={10} textAnchor="middle">NFC North</text>
              <text x="320" y="120" fill="#666" fontSize={10} textAnchor="middle">AFC East</text>
              <text x="160" y="220" fill="#666" fontSize={10} textAnchor="middle">AFC West</text>
              <text x="320" y="250" fill="#666" fontSize={10} textAnchor="middle">AFC South</text>
              <text x="80" y="150" fill="#666" fontSize={10} textAnchor="middle">NFC West</text>
              <text x="240" y="180" fill="#666" fontSize={10} textAnchor="middle">NFC East</text>
              <text x="240" y="280" fill="#666" fontSize={10} textAnchor="middle">NFC South</text>
            </g>
            */}
            
            {TEAM_LOCATIONS
              .filter(team => selectedTab === 'all' || 
                             (selectedTab === 'afc' && team.conference === 'AFC') || 
                             (selectedTab === 'nfc' && team.conference === 'NFC'))
              .map(team => {
                const teamData = teams?.find(t => t.team_abbr === team.abbr);
                const offEpa = teamData ? parseFloat(teamData.offense_epa_per_play) : 0;
                const wins = teamData?.wins || 0;
                const losses = teamData?.losses || 0;
                
                // Size marker based on EPA - higher EPA = larger marker
                const size = 8 + (offEpa > 0 ? offEpa * 100 : 0);
                
                // Color based on EPA value but keep team identity with border
                let markerColor = team.color;
                if (offEpa > 0.1) markerColor = "#10B981"; // Green for high
                else if (offEpa > 0) markerColor = "#F59E0B"; // Yellow for mid
                else markerColor = "#EF4444"; // Red for low
                
                // Conference-based border
                const borderColor = team.conference === 'AFC' ? '#EF4444' : '#3B82F6';
                
                return (
                  <Marker
                    key={team.abbr}
                    coordinates={team.coordinates}
                    onMouseEnter={() => setHoveredTeam(team)}
                    onMouseLeave={() => setHoveredTeam(null)}
                    onClick={() => handleTeamClick(team.abbr)}
                  >
                    {/* Team marker with conference-colored border */}
                    <circle
                      r={size + 2}
                      fill="transparent"
                      stroke={borderColor}
                      strokeWidth={2}
                      opacity={0.8}
                      style={{ cursor: 'pointer' }}
                    />
                    <circle
                      r={size}
                      fill={markerColor}
                      opacity={0.8}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    />
                    
                    {/* Team abbreviation label */}
                    <text
                      textAnchor="middle"
                      y={-size - 5}
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "8px",
                        fontWeight: "bold",
                        fill: "#FFFFFF",
                        pointerEvents: "none"
                      }}
                    >
                      {team.abbr}
                    </text>
                    
                    {/* Show record for larger teams (better performing) */}
                    {size > 12 && (
                      <text
                        textAnchor="middle"
                        y={size + 8}
                        style={{
                          fontFamily: "system-ui",
                          fontSize: "7px",
                          fill: "#FFF",
                          pointerEvents: "none"
                        }}
                      >
                        {wins}-{losses}
                      </text>
                    )}
                  </Marker>
                );
              })}
          </ComposableMap>
        </div>
        
        {/* Enhanced Team Info Overlay */}
        <motion.div
          className="mt-4 w-full flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: hoveredTeam ? 1 : 0, y: hoveredTeam ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          {hoveredTeam && teams && (
            <div className="p-4 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 flex items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden mr-4 border-2" style={{
                borderColor: hoveredTeam.conference === 'AFC' ? '#EF4444' : '#3B82F6'
              }}>
                <img 
                  src={logoFallbackMap[hoveredTeam.abbr]} 
                  alt={hoveredTeam.name} 
                  className="w-9 h-9 object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              
              <div>
                <div className="flex items-center">
                  <p className="font-bold text-base">{NFL_TEAMS[hoveredTeam.abbr]}</p>
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                    hoveredTeam.conference === 'AFC' ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>
                    {hoveredTeam.conference}
                  </span>
                </div>
                
                {/* Team stats */}
                {(() => {
                  const teamData = teams.find(t => t.team_abbr === hoveredTeam.abbr);
                  if (!teamData) return <p className="text-gray-400 text-sm">Stats not available</p>;
                  
                  return (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-1 text-sm">
                      <div className="text-gray-400">Record:</div>
                      <div>{teamData.wins}-{teamData.losses}{teamData.ties > 0 ? `-${teamData.ties}` : ''}</div>
                      
                      <div className="text-gray-400">Off EPA:</div>
                      <div>{parseFloat(teamData.offense_epa_per_play).toFixed(3)}</div>
                      
                      <div className="text-gray-400">Off PPG:</div>
                      <div>{parseFloat(teamData.offensive_ppg).toFixed(1)}</div>
                      
                      <div className="text-gray-400">Def EPA:</div>
                      <div>{parseFloat(teamData.defense_epa_per_play).toFixed(3)}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </motion.div>
        
        <div className="mt-6 text-sm text-gray-400 text-center">
          <p>Markers show offensive EPA/play and conference. Larger circles indicate better offensive performance.</p>
          <p className="mt-1">Click on any team to view detailed stats.</p>
        </div>
      </motion.div>

      {/* Offense vs Defense Scatter Plot */}
      <motion.div 
        className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-gray-700/50 mb-16" // REMOVED overflow-hidden
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            Offense vs Defense Performance vs League Average
            <Tooltip text={`Compares Offensive EPA/Play (X-axis) vs Defensive EPA/Play (Y-axis, inverted so higher is better). Dashed lines show league averages. Bubble size represents Point Differential. ${epaExplanation}`} />
          </h2>
        </div>

        {/* Quadrant labels based on AVERAGE lines */}
        <div className="relative z-10 h-[450px] w-full">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
            {/* Top-Left Quadrant */}
            <div className="flex items-end justify-start p-4">
              <div className="text-xs md:text-sm text-gray-200 bg-gray-900/80 backdrop-blur-sm rounded p-2 shadow-md border border-gray-700/50">
                <span className="block font-semibold mb-1 text-blue-400">Below Avg Offense / Above Avg Defense</span>
                <span className="text-xs text-gray-400">Struggling offense, strong D</span>
              </div>
            </div>
            {/* Top-Right Quadrant */}
            <div className="flex items-end justify-end p-4">
              <div className="text-xs md:text-sm text-gray-200 bg-gray-900/80 backdrop-blur-sm rounded p-2 shadow-md border border-gray-700/50">
                <span className="block font-semibold mb-1 text-green-400">Above Avg Offense / Above Avg Defense</span>
                <span className="text-xs text-gray-400">Well-rounded teams</span>
              </div>
            </div>
             {/* Bottom-Left Quadrant */}
            <div className="flex items-start justify-start p-4">
              <div className="text-xs md:text-sm text-gray-200 bg-gray-900/80 backdrop-blur-sm rounded p-2 shadow-md border border-gray-700/50">
                <span className="block font-semibold mb-1 text-red-400">Below Avg Offense / Below Avg Defense</span>
                <span className="text-xs text-gray-400">Needs improvement</span>
              </div>
            </div>
            {/* Bottom-Right Quadrant */}
            <div className="flex items-start justify-end p-4">
              <div className="text-xs md:text-sm text-gray-200 bg-gray-900/80 backdrop-blur-sm rounded p-2 shadow-md border border-gray-700/50">
                <span className="block font-semibold mb-1 text-yellow-400">Above Avg Offense / Below Avg Defense</span>
                <span className="text-xs text-gray-400">High scoring, weak D</span>
              </div>
            </div>
          </div>
          
          {/* REMOVED Background quadrant coloring 
          <div className="absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 opacity-10 pointer-events-none">
            <div className="bg-blue-500"></div>
            <div className="bg-green-500"></div>
            <div className="bg-red-500"></div>
            <div className="bg-yellow-500"></div>
          </div>
          */}
          
          {/* Chart container */}
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 60, left: 30 }}
            >
              {/* Ensure Tooltip has higher priority if needed */} 
              <RechartsTooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={(props) => <CustomTooltip {...props} teamsData={teams} />} 
                  wrapperStyle={{ zIndex: 50 }} // Explicitly set z-index on wrapper
              />
              {/* ... (CartesianGrid, Axes, ReferenceLines, Scatter, Cells) ... */}
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Offensive EPA/Play" 
                domain={['auto', 'auto']}
                tick={{ fill: '#D1D5DB' }}
                label={{ value: 'Offensive EPA/Play', position: 'bottom', fill: '#D1D5DB', dy: 25 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Defensive EPA/Play" 
                domain={['auto', 'auto']}
                tick={{ fill: '#D1D5DB' }}
                label={{ value: 'Defensive EPA/Play (Higher is Better)', angle: -90, position: 'left', fill: '#D1D5DB', dx: -20 }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 500]} />
              
              {/* Reference lines for averages ARE KEPT */}
              <ReferenceLine 
                y={avgDefEPA} 
                stroke="#9CA3AF" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ value: 'Avg Def EPA', position: 'insideTopRight', fill: '#9CA3AF', fontSize: 10, dy: -5, dx: 5 }}
              />
              <ReferenceLine 
                x={avgOffEPA} 
                stroke="#9CA3AF" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ value: 'Avg Off EPA', position: 'insideBottomRight', fill: '#9CA3AF', fontSize: 10, dy: 15, dx: 5 }}
              />
              
              <Scatter name="Teams" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    onClick={() => handleTeamClick(entry.name)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* ... (Legend Text) ... */}
      </motion.div>

      {/* ... Call to Action ... */}
      <motion.div 
        className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-xl p-10 border border-gray-700/50 text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <h2 className="text-3xl font-bold mb-4">Explore NFL Analytics</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Dive deeper into team details, player stats, and game breakdowns with our comprehensive tools.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-800 flex flex-col items-center hover:border-blue-500/30 transition duration-300 hover:shadow-lg">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Team Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">Compare team performance across multiple metrics and seasons.</p>
            <Link to="/teams" className="mt-auto px-4 py-2 bg-blue-600/80 hover:bg-blue-500 text-white text-sm font-medium rounded transition duration-150 w-full">
              View Teams
            </Link>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-800 flex flex-col items-center hover:border-green-500/30 transition duration-300 hover:shadow-lg">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Player Rankings</h3>
            <p className="text-gray-400 text-sm mb-4">Explore detailed player stats and performance rankings.</p>
            <Link to="/rankings" className="mt-auto px-4 py-2 bg-green-600/80 hover:bg-green-500 text-white text-sm font-medium rounded transition duration-150 w-full">
              View Rankings
            </Link>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-800 flex flex-col items-center hover:border-purple-500/30 transition duration-300 hover:shadow-lg">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Position Analysis</h3>
            <p className="text-gray-400 text-sm mb-4">Analyze performance data by position groups and trends.</p>
            <Link to="/rankings" className="mt-auto px-4 py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium rounded transition duration-150 w-full">
              View Players
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-400">
          <p>Stats and analysis powered by advanced NFL data. Updated weekly throughout the season.</p>
        </div>
      </motion.div>
    </div>
  );
}
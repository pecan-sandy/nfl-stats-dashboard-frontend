import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchPlayers, fetchTeams } from '../api/api'; // <-- ADD IMPORTS

// NFL Team abbreviations to full names mapping
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

export default function NavBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]); // New state for filtered results
    const [selectedSeason, setSelectedSeason] = useState('2024'); // Default to current season
    const location = useLocation();
    const navigate = useNavigate(); // Hook for navigation

    // State for search data
    const [searchPlayers, setSearchPlayers] = useState([]);
    const [searchTeams, setSearchTeams] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Fetch players and teams for search functionality
    useEffect(() => {
        const fetchSearchData = async () => {
            setSearchLoading(true);
            try {
                // Use imported functions
                const [playerRes, teamRes] = await Promise.all([
                    fetchPlayers(), 
                    fetchTeams()
                ]);
                const playersData = Array.isArray(playerRes?.data) ? playerRes.data : []; // Add safe access
                const teamsData = Array.isArray(teamRes?.data) ? teamRes.data : [];     // Add safe access
                setSearchPlayers(playersData);
                setSearchTeams(teamsData);
                console.log('Fetched players for search:', playersData.slice(0, 5)); 
                console.log('Fetched teams for search:', teamsData.slice(0, 5));   
            } catch (error) {
                console.error("Error fetching search data:", error.message); // Log message
            } finally {
                setSearchLoading(false);
            }
        };
        fetchSearchData();
        
        // Original logic commented out
        /*
         const fetchSearchData = async () => {
            setSearchLoading(true);
            try {
                const [playerRes, teamRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/players'), 
                    axios.get('http://localhost:5000/api/teams')
                ]);
                const playersData = playerRes.data || [];
                const teamsData = teamRes.data || [];
                setSearchPlayers(playersData);
                setSearchTeams(teamsData);
                console.log('Fetched players for search:', playersData.slice(0, 5)); 
                console.log('Fetched teams for search:', teamsData.slice(0, 5));   
            } catch (error) {
                console.error("Error fetching search data:", error);
            } finally {
                setSearchLoading(false);
            }
        };
        fetchSearchData();
        */
    }, []); // Fetch only once on mount

    // Close mobile menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Helper to determine if a route is active for styling
    const isActive = (path) => {
        // Handle root path specifically
        if (path === '/' && location.pathname === '/') return true; 
        // Check if the current path starts with the given path (for sections)
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        // Special case for root path when other sections are active
        if (path === '/' && (location.pathname.startsWith('/team') || location.pathname.startsWith('/player') || location.pathname.startsWith('/rankings'))) return false;
        if (path === '/' && location.pathname === '/') return true;
        
        return false;
    };
    
    // Updated search function that runs on each keystroke
    const handleSearchInput = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        // Don't search if query is empty or too short
        if (!query || query.length < 2 || searchLoading) {
            setSearchResults([]);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        
        // Find matching teams (by abbreviation OR full team name)
        const teamResults = searchTeams
            .filter(t => {
                const abbr = t.team_abbr?.toLowerCase() || '';
                // Get the full team name from our mapping, if available
                const fullTeamName = NFL_TEAMS[t.team_abbr]?.toLowerCase() || '';
                
                // Match if either the abbreviation or full name contains the query
                return abbr.includes(lowerQuery) || fullTeamName.includes(lowerQuery);
            })
            .map(team => ({
                id: team.team_abbr,
                name: NFL_TEAMS[team.team_abbr] || `Team: ${team.team_abbr}`, // Display full name if available
                type: 'team',
                route: `/team/${team.team_abbr}`
            }));
            
        // Find matching players (by name)
        const playerResults = searchPlayers
            .filter(p => {
                const name = p.name?.toLowerCase() || '';
                return name.includes(lowerQuery);
            })
            .slice(0, 8) // Limit to top 8 player matches
            .map(player => ({
                id: player.gsis_id,
                name: player.name,
                detail: `${player.position} - ${player.team}`,
                type: 'player',
                route: `/player/${player.gsis_id}`
            }));
            
        // Combine results (teams first, then players)
        setSearchResults([...teamResults, ...playerResults].slice(0, 10));
    };
    
    // Handle clicking on a search result
    const handleResultClick = (route) => {
        navigate(route);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <nav className="bg-gray-900 shadow-lg border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and brand */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                {/* Updated logo to sideline/football theme */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 4.5A2.5 2.5 0 014.5 2h11a2.5 2.5 0 012.5 2.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 15.5v-11zM4.5 4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-11z" />
                                    <path d="M5 5h2v2H5V5zm0 4h2v2H5V9zm0 4h2v2H5v-2zm4-8h2v2H9V5zm0 4h2v2H9V9zm0 4h2v2H9v-2zm4-8h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2z" />
                                </svg>
                                <span className="ml-2 text-white text-lg font-bold tracking-tight hidden sm:block">SIDELINE METRICS</span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop navigation links */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        {/* Dashboard Link (Homepage) - Updated Text */}
                        <Link 
                            to="/" 
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                isActive('/') 
                                    ? 'bg-green-600 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            Dashboard
                        </Link>
                        
                        {/* Team Analytics Dropdown */}
                        <div className="relative group">
                            <button className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                                isActive('/team') ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                            }`}>
                                Team Analytics
                                <svg className="ml-1 h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <div className="absolute left-0 pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 ease-in-out z-10">
                                <div className="rounded-md shadow-lg bg-gray-800 ring-1 ring-green-500 ring-opacity-5">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        {/* Updated Link Text */}
                                        <Link to="/teams" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" role="menuitem">
                                            Teams
                                        </Link>
                                        {/* Add links to specific team analytic views later */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Player Analytics Dropdown */}
                         <div className="relative group">
                            <button className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                                isActive('/rankings') || isActive('/player') ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                            }`}>
                                Player Analytics
                                <svg className="ml-1 h-4 w-4 fill-current" viewBox="0 0 20 20">
                                     <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                           <div className="absolute left-0 pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150 ease-in-out z-10">
                                <div className="rounded-md shadow-lg bg-gray-800 ring-1 ring-green-500 ring-opacity-5">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        <Link to="/rankings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" role="menuitem">
                                            Player Rankings
                                        </Link>
                                        {/* Add links to specific player analytic views later */}
                                    </div>
                                </div>
                           </div>
                        </div>
                    </div>

                    {/* Right side elements: Search, Season, Mobile Menu Toggle */}
                    <div className="flex items-center">
                         {/* Season selector - Updated Options */}
                         <div className="hidden md:block ml-4">
                             <select 
                                 value={selectedSeason} // Keep controlled for potential future use
                                 onChange={(e) => { /* Prevent changing for now */ 
                                     if(e.target.value === '2024') setSelectedSeason(e.target.value);
                                 }}
                                 className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-md focus:ring-green-500 focus:border-green-500 block py-1 px-2"
                                 aria-label="Select Season"
                             >
                                 <option value="2024">2024 Season</option>
                                 <option value="2023" disabled>2023 Season (N/A)</option>
                                 <option value="2022" disabled>2022 Season (N/A)</option>
                                 {/* Add more seasons as needed */}
                             </select>
                         </div>

                        {/* Desktop Search */}
                        <div className="hidden md:block ml-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                     <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                     </svg>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Search Player/Team..."
                                    value={searchQuery}
                                    onChange={handleSearchInput}
                                    className="block w-full pl-10 pr-3 py-1.5 border border-gray-700 rounded-md leading-5 bg-gray-800 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-700 focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                />
                                
                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                                        <ul className="py-1">
                                            {searchResults.map(result => (
                                                <li key={`${result.type}-${result.id}`} className="px-2">
                                                    <button
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex justify-between items-center"
                                                        onClick={() => handleResultClick(result.route)}
                                                    >
                                                        <span className="font-medium text-white">{result.name}</span>
                                                        {result.detail && (
                                                            <span className="text-xs text-gray-400">{result.detail}</span>
                                                        )}
                                                        {result.type === 'team' && (
                                                            <span className="text-xs text-gray-400">{result.id}</span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Mobile menu button */}
                        <div className="ml-4 md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                type="button"
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
                                aria-controls="mobile-menu"
                                aria-expanded={isOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {/* Icon when menu is closed */}
                                <svg className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {/* Icon when menu is open */}
                                <svg className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state */}
            <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {/* Updated Link Text */}
                    <Link
                        to="/"
                        className={`block px-3 py-2 rounded-md text-base font-medium ${
                            isActive('/') ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        Dashboard
                    </Link>
                    {/* Updated Link Text */}
                     <Link
                        to="/teams"
                        className={`block px-3 py-2 rounded-md text-base font-medium ${
                            isActive('/teams') ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        Teams
                    </Link>
                    <Link
                        to="/rankings"
                        className={`block px-3 py-2 rounded-md text-base font-medium ${
                             isActive('/rankings') || isActive('/player') ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        Player Rankings
                    </Link>
                    
                    {/* Mobile search */}
                     <div className="pt-2 px-3">
                         <input 
                            type="text" 
                            placeholder="Search Player/Team..."
                            value={searchQuery}
                            onChange={handleSearchInput}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                    </div>
                    
                    {/* Mobile season selector - Updated Options */}
                     <div className="pt-2 px-3">
                         <select
                            value={selectedSeason} // Keep controlled
                            onChange={(e) => { /* Prevent changing for now */ 
                                if(e.target.value === '2024') setSelectedSeason(e.target.value);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            aria-label="Select Season"
                        >
                             <option value="2024">2024 Season</option>
                             <option value="2023" disabled>2023 Season (N/A)</option>
                             <option value="2022" disabled>2022 Season (N/A)</option>
                         </select>
                    </div>
                    
                    {/* Mobile Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute left-3 right-3 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                            <ul className="py-1">
                                {searchResults.map(result => (
                                    <li key={`mobile-${result.type}-${result.id}`} className="px-2">
                                        <button
                                            className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex justify-between items-center"
                                            onClick={() => handleResultClick(result.route)}
                                        >
                                            <span className="font-medium text-white">{result.name}</span>
                                            {result.detail && (
                                                <span className="text-xs text-gray-400">{result.detail}</span>
                                            )}
                                            {result.type === 'team' && (
                                                <span className="text-xs text-gray-400">{result.id}</span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

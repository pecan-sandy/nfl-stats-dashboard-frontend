import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const GameDetail = () => {
    const { game_id } = useParams();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/games');
                const found = res.data.find((g) => g.game_id === game_id);
                if (!found) throw new Error('Game not found');
                setGame(found);
            } catch (err) {
                console.error('Error loading game:', err.message);
                setError('Failed to load game');
            } finally {
                setLoading(false);
            }
        };
        fetchGame();
    }, [game_id]);

    if (loading) return <p className="p-6">Loading game details...</p>;
    if (error) return <p className="text-red-500 p-6">{error}</p>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <Link to="/" className="text-blue-400 underline mb-6 inline-block">
                ← Back to Teams
            </Link>
            <Link to={`/team/${game.home_team_abbr}`} className="text-blue-400 underline mb-6 inline-block ml-4">
                ← Back to {game.home_team_abbr} Detail
            </Link>

            <div className="bg-gray-800 p-6 rounded shadow mb-8">
                <h2 className="text-3xl font-bold mb-2">Game: {game.game_id}</h2>
                <p className="mb-4">
                    <span className="font-semibold">Home:</span> {game.home_team_abbr} &nbsp;|
                    &nbsp;<span className="font-semibold">Away:</span> {game.away_team_abbr}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {Object.entries(game).map(([key, value]) => {
                        if (
                            value == null ||
                            ['game_id', 'home_team_abbr', 'away_team_abbr'].includes(key)
                        ) return null;

                        const label = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase());

                        return (
                            <p key={key}>
                                <strong>{label}:</strong> {value}
                            </p>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GameDetail;

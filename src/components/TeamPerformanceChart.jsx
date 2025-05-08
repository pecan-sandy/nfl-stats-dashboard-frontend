import React from 'react'
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts'

const TeamPerformanceChart = ({ games, abbr }) => {
    const data = games
        .sort((a, b) => a.game_id.localeCompare(b.game_id))
        .map(g => ({
            game: g.game_id.split('_').slice(1).join(' '),
            epa: g.home_team_abbr === abbr
                ? +g.home_offense_epa_per_play
                : +g.away_offense_epa_per_play
        }))

    return (
        <div className="w-full h-64">
            <ResponsiveContainer>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="game" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="epa" stroke="#4ADE80" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export default TeamPerformanceChart

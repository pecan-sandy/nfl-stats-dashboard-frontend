# Sideline Metrics

A comprehensive NFL analytics platform providing in-depth statistical analysis and visualization for teams, players, and games.

![Sideline Metrics Dashboard](https://sidelinemetrics.com)

## Overview

Sideline Metrics offers advanced NFL analytics through an intuitive, interactive dashboard. It combines traditional statistics with advanced metrics to provide insights for teams, players, and game performances.

## Features

- **Team Analytics**
  - Performance metrics with league averages and percentile rankings
  - Success rate analysis by play type and situation
  - EPA (Expected Points Added) breakdowns
  - Game-by-game performance tracking
  - Team comparison matrix

- **Player Analytics**
  - Position-specific performance metrics
  - Season stats with advanced metrics
  - Performance visualization with radar charts and bar graphs
  - Player comparison tools
  - Fantasy relevance indicators

- **Game Analysis**
  - Detailed game breakdowns
  - Play-by-play statistics
  - Situational success rates
  - In-game EPA trends

- **Historical Data**
  - Season-by-season comparisons
  - Historical trend analysis
  - Data from 2022-2024 NFL seasons

## Technology Stack

- React with Vite for frontend
- React Router for navigation
- TanStack Query for data fetching and caching
- Recharts for data visualization
- Tailwind CSS for styling
- Axios for API requests
- ESPN Fantasy API integration

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sideline-metrics.git
   cd sideline-metrics
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update API keys and endpoints

4. Start the development server:
   ```
   npm run dev
   ```

5. Build for production:
   ```
   npm run build
   ```

## API Integration

Sideline Metrics leverages multiple data sources:

- **Backend API**: Custom Node.js/Express backend service
- **ESPN API**: For fantasy football insights
- **Off-Tackle API**: For advanced NFL metrics

The application uses environment variables to configure API endpoints and authentication.

## Usage

### Team Analysis

Navigate to the Team Dashboard to view all NFL teams. Click on a team to access detailed metrics, including offense and defense efficiency, situational stats, and historical performance.

### Player Analysis

Use the Player Rankings to browse players by position. The player detail pages show comprehensive statistics, advanced metrics, game logs, and performance trends.

### Game Analysis

Access game details from team pages or the schedule view. Each game provides deep insights into performance, play calling, and key moments.

### Data Comparison

Use the comparison tools to evaluate multiple teams or players side by side with radar charts, bar graphs, and percentile indicators.

## Data Sources

- Team and player performance data from NFL official statistics
- Advanced metrics from Off-Tackle.com
- Fantasy statistics from ESPN API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- NFL for providing public statistics
- Off-Tackle.com for advanced metrics
- ESPN for fantasy data

---

&copy; 2024 Sideline Metrics | All Rights Reserved 
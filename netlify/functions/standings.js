const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const LEAGUE_ID = '1340599';
    const standingsUrl = `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`;
    
    try {
        const standingsResponse = await fetch(standingsUrl);
        const standingsData = await standingsResponse.json();
        const entries = standingsData.standings.results;
        
        const historyPromises = entries.map(entry => 
            fetch(`https://fantasy.premierleague.com/api/entry/${entry.entry}/history/`)
                .then(res => res.json())
                .catch(err => null)
        );
        
        const histories = await Promise.all(historyPromises);
        
        let maxGw = 0;
        histories.forEach(h => {
            if (h && h.current) {
                const max = h.current.reduce((acc, curr) => Math.max(acc, curr.event), 0);
                maxGw = Math.max(maxGw, max);
            }
        });
        
        const gwStandings = {};
        for (let gw = 1; gw <= maxGw; gw++) {
            const gwResults = [];
            entries.forEach((entry, idx) => {
                const history = histories[idx];
                if (!history || !history.current) return;
                
                const gwRecord = history.current.find(item => item.event === gw);
                if (gwRecord) {
                    gwResults.push({
                        entry: entry.entry,
                        player_name: entry.player_name,
                        entry_name: entry.entry_name,
                        event_total: gwRecord.points,
                        total: gwRecord.total_points
                    });
                }
            });
            
            gwResults.sort((a, b) => b.total - a.total);
            gwResults.forEach((item, index) => {
                item.rank = index + 1;
            });
            
            gwStandings[gw] = gwResults;
        }
        
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ max_gw: maxGw, standings: gwStandings }),
        };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};

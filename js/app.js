let compiledData = { max_gw: 0, standings: {} };
let currentGW = 1;
let currentStandings = [];
const LEAGUE_ID = '1340599';

async function fetchData() {
    // In production (Netlify), use the Netlify function endpoint
    const url = `/.netlify/functions/standings`;

    try {
        const response = await fetch(url);
        compiledData = await response.json();

        // Populate dropdown
        const gwSelect = document.getElementById('gwSelect');
        gwSelect.innerHTML = '';

        for (let i = 1; i <= compiledData.max_gw; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = `Gameweek ${i}`;
            gwSelect.appendChild(option);
        }

        // Default to the latest gameweek
        if (compiledData.max_gw > 0) {
            currentGW = compiledData.max_gw;
            gwSelect.value = currentGW;
            loadGWData(currentGW);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to fetch data.');
    }
}

function loadGWData(gw) {
    currentGW = gw;
    currentStandings = [...(compiledData.standings[gw] || [])];
    renderTable(currentStandings);
}

function renderTable(data) {
    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = '';

    data.forEach(player => {
        const row = `<tr>
            <td>${player.rank}</td>
            <td>${player.player_name}</td>
            <td>${player.entry_name}</td>
            <td>${player.event_total}</td>
            <td>${player.total}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

document.getElementById('loadBtn').addEventListener('click', fetchData);

document.getElementById('gwSelect').addEventListener('change', (e) => {
    loadGWData(e.target.value);
});

document.getElementById('sortTotal').addEventListener('click', () => {
    currentStandings.sort((a, b) => b.total - a.total);
    renderTable(currentStandings);
});

document.getElementById('sortGW').addEventListener('click', () => {
    currentStandings.sort((a, b) => b.event_total - a.event_total);
    renderTable(currentStandings);
});

// Load data automatically on page load
fetchData();

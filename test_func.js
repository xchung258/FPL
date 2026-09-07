const { handler } = require('./netlify/functions/standings.js');

async function test() {
    console.log("Invoking function...");
    const result = await handler({}, {});
    console.log("Result status:", result.statusCode);
    if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        console.log("Successfully fetched data for max_gw:", data.max_gw);
        console.log("Number of standings for GW 1:", data.standings["1"] ? data.standings["1"].length : 0);
    } else {
        console.error("Function failed:", result.body);
    }
}

test();

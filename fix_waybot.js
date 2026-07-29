const fs = require('fs');

const files = ['index.html', 'js/app.js'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Network Name
    content = content.replace(/Solana/g, 'Robinhood Chain');
    content = content.replace(/solana/g, 'robinhoodchain');

    // Pump.fun to Pons Family text
    content = content.replace(/Pump\.fun/g, 'Pons Family');
    
    // pump.fun URLs
    content = content.replace(/pump\.fun\/coin\//g, 'ponsfamily.com/launchpad/');
    content = content.replace(/pump\.fun/g, 'ponsfamily.com');

    fs.writeFileSync(file, content);
});

console.log('Replaced Solana with Robinhood Chain and Pump.fun with Pons Family in Waybot');

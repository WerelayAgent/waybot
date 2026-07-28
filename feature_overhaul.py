import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replacements = {
    # Float Chips
    'round-up +$0.73': 'swept dust +$0.73',
    'DCA $50 / week': 'Ape-in $50 / day',
    'dip −3% → buy': 'dump −30% → snipe',
    
    # Feature 1
    '<h3>Round-ups</h3>': '<h3>Dust Sweeper</h3>',
    '<p>Spare change from everything you spend, swept into fractional shares from your basket.</p>': '<p>Spare SOL dust from your transactions is automatically swept into high-potential new memecoins.</p>',
    'coffee $4.27 → <b class="signal">+$0.73 into WIF</b>': 'dust $0.05 SOL → <b class="signal">swept into WIF</b>',
    
    # Feature 2
    '<h3>Recurring DCA</h3>': '<h3>Constant Ape-In</h3>',
    '<p>You set the amount. The agent picks the moment inside your window, and never skips a leg.</p>': '<p>You set the daily amount. The agent snipes the best entry point inside your window, and never misses a dip.</p>',
    '$50 / week → <b class="signal">agent picks the moment</b>': '$50 / day → <b class="signal">agent apes the bottom</b>',
    
    # Feature 3
    '<h3>Buy-the-dip</h3>': '<h3>Dip Sniper</h3>',
    '<p>The agent buys drawdowns, and sizes each one by how deep it goes. Not a single rigid threshold.</p>': '<p>The agent snipes panic dumps, sizing each buy by how deep the red candle goes. Perfect for Solana volatility.</p>',
    'deeper dip → <b class="signal">bigger buy</b>': 'deeper dump → <b class="signal">bigger snipe</b>',
    
    # Feature 4
    '<h3>Themed baskets</h3>': '<h3>Meme Cult Baskets</h3>',
    '<p>Mag7, dividend payers, AI. Ready-made sets, held at target weights and rebalanced for you.</p>': '<p>WIF, BONK, POPCAT, MOTHER. Ready-made cult sets, held at target weights and aggressively rebalanced.</p>',
    '<div class="f-demo basket-logos">\n          <img src="assets/svg/apple.svg" alt="Apple"><img src="assets/svg/microsoft.svg" alt="Microsoft"><img src="assets/svg/nvidia.svg" alt="Nvidia"><img src="assets/svg/amazon.svg" alt="Amazon" class="inv"><img src="assets/svg/google.svg" alt="Google"><img src="assets/svg/meta.svg" alt="Meta"><img src="assets/svg/tesla.svg" alt="Tesla">\n        </div>': '<div class="f-demo basket-logos" style="display: flex; gap: 12px; font-weight: bold; color: var(--signal); font-size: 13px;">\n          <span>$WIF</span> <span>$BONK</span> <span>$POPCAT</span> <span>$MOTHER</span> <span>$MEW</span>\n        </div>',
    
    # Architecture
    'Uniswap V3/V4 + 1inch': 'Raydium + Pump.fun Bonding Curve + Jupiter Aggregator',
    
    # Hero Sub
    'sweeping round-ups, running DCA without skips, sizing dip-buys to the drawdown, holding baskets at weight': 'sweeping dust, running constant ape-ins, sizing dip-snipes to the dump, holding cult baskets at target weights'
}

if __name__ == '__main__':
    replace_in_file('C:\\Tools\\project crypto\\waybot\\index.html', replacements)
    print("Replacements complete!")

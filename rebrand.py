import os
import re

def rebrand_files():
    replacements = {
        'Waymark': 'Waybot Agent',
        'waymarkmoney': 'waybotagent',
        'waymark': 'waybot',
        '$WAY': '$WAYBOT',
        'Robinhood Chain': 'Solana',
        'robinhood chain': 'solana',
        'Robinhood Markets': 'Solana Foundation',
        'Robinhood': 'Pump.fun',
        'robinhood': 'solana',
        'tokenized stocks': 'Pump.fun memecoins',
        'a stock': 'a memecoin',
        'stocks': 'memecoins',
        '0x5b0c34cf165eb4d69c010e3a7394711c996f7777': 'coming soon on pump.fun',
        'chainId 4663': 'chainId 101',
        'rpc.mainnet.chain.robinhood.com': 'api.mainnet-beta.solana.com',
        'USDG': 'SOL',
        'AAPL': 'WIF',
        'NVDA': 'POPCAT',
        'TSLA': 'BONK'
    }

    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith(('.html', '.js', '.css')) and f != 'rebrand.py' and f != 'scrape.py':
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                    
                    original_content = content
                    for old, new in replacements.items():
                        # We use simple replace. Order matters slightly (e.g. 'Robinhood Chain' before 'Robinhood')
                        content = content.replace(old, new)

                    if content != original_content:
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        print(f'Rebranded: {path}')
                except Exception as e:
                    print(f'Failed on {path}: {e}')

if __name__ == '__main__':
    rebrand_files()

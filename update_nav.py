import os

def update_nav_and_wallet():
    replacements = {
        'Connect MetaMask': 'Connect Phantom',
        'MetaMask, Coinbase Wallet, Rabby or Trust': 'Phantom, Solflare, or Backpack',
        'https://flap.sh/solana/coming soon on pump.fun': 'https://pump.fun/'
    }

    for root, _, files in os.walk('.'):
        for f in files:
            if f.endswith(('.html', '.js')):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                    
                    original_content = content
                    for old, new in replacements.items():
                        content = content.replace(old, new)

                    if content != original_content:
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        print(f'Updated: {path}')
                except Exception as e:
                    print(f'Failed on {path}: {e}')

if __name__ == '__main__':
    update_nav_and_wallet()

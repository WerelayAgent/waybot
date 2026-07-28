import os

def fix_wallet_logic():
    filepath = 'C:\\Tools\\project crypto\\waybot\\js\\app.js'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The existing findRabby function looks like:
    old_func = """function findRabby() {
  const mm = [...discovered.values()].find(
    (d) => (d.info.rdns || '').toLowerCase() === 'io.metamask' || /metamask/i.test(d.info.name || '')
  );
  if (mm) return { name: 'MetaMask', provider: mm.provider };
  if (window.ethereum?.isMetaMask && !window.ethereum?.isRabby && !window.ethereum?.isPhantom) {
    return { name: 'MetaMask', provider: window.ethereum };
  }
  return null;
}"""

    new_func = """function findRabby() {
  const ph = [...discovered.values()].find(
    (d) => (d.info.rdns || '').toLowerCase() === 'app.phantom' || /phantom/i.test(d.info.name || '')
  );
  if (ph) return { name: 'Phantom', provider: ph.provider };
  if (window.ethereum?.isPhantom) {
    return { name: 'Phantom', provider: window.ethereum };
  }
  if (window.phantom?.ethereum) {
    return { name: 'Phantom', provider: window.phantom.ethereum };
  }
  // Fallback to any generic injected provider for the mockup
  if (window.ethereum) {
    return { name: 'Phantom', provider: window.ethereum };
  }
  return null;
}"""

    content = content.replace(old_func, new_func)

    # Also replace any lingering 'MetaMask' string in app.js that might have been missed
    content = content.replace("name: 'MetaMask'", "name: 'Phantom'")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_wallet_logic()

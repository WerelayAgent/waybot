import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import os

BASE_URL = 'https://waymark.money/'
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def ensure_dir(path):
    directory = os.path.dirname(path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)

def download_file(url, local_path):
    print(f"Downloading {url} -> {local_path}")
    ensure_dir(local_path)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req) as response:
            content = response.read()
            with open(local_path, 'wb') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def scrape_site():
    print("Scraping index.html...")
    req = urllib.request.Request(BASE_URL, headers={'User-Agent': USER_AGENT})
    html_content = urllib.request.urlopen(req).read().decode('utf-8')
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    tags_to_download = [
        ('link', 'href'),
        ('script', 'src'),
        ('img', 'src'),
        ('video', 'src'),
        ('source', 'src')
    ]
    
    for tag_name, attr in tags_to_download:
        for tag in soup.find_all(tag_name):
            url = tag.get(attr)
            if url and not url.startswith(('http', 'data:', '#')):
                # Resolve relative URL
                full_url = urllib.parse.urljoin(BASE_URL, url)
                # Clean up local path (remove query params)
                local_path = urllib.parse.urlparse(url).path
                local_path = local_path.lstrip('/')
                if not local_path:
                    continue
                    
                success = download_file(full_url, local_path)
                
                # We do not need to modify the HTML because the relative paths will match our local structure!
                # E.g. <link href="css/style.css"> will match our local css/style.css

    # Save index.html
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    print("Scraping complete.")

if __name__ == '__main__':
    scrape_site()

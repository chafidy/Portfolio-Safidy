import os
import subprocess
import sys

def install_rembg():
    try:
        import rembg
    except ImportError:
        print("Installing rembg...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rembg", "onnxruntime"])

install_rembg()
from rembg import remove

folder = r"e:\Safidy\Portfolio Safidy\assets\techno"
html_path = r"e:\Safidy\Portfolio Safidy\index.html"

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

for filename in os.listdir(folder):
    if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')) and not filename.startswith('nobg_'):
        print(f"Processing {filename}...")
        try:
            input_path = os.path.join(folder, filename)
            
            # The new filename will just be .png
            base_name = filename.rsplit('.', 1)[0]
            if filename.endswith('.svg.webp'):
                base_name = filename[:-9]
            
            # ensure unique name
            new_filename = f"{base_name}_nobg.png"
            output_path = os.path.join(folder, new_filename)
            
            with open(input_path, 'rb') as i:
                input_data = i.read()
            
            output_data = remove(input_data)
            
            with open(output_path, 'wb') as o:
                o.write(output_data)
            
            print(f"Saved {output_path}")
            
            # Update HTML
            html_content = html_content.replace(f"assets/techno/{filename}", f"assets/techno/{new_filename}")
            
            # If successful, delete the old one
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                os.remove(input_path)
                
        except Exception as e:
            print(f"Failed to process {filename}: {e}")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print("Finished processing and updated index.html")

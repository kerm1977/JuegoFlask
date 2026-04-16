from PIL import Image, ImageDraw, ImageFont
import os

def crear_icono(size, filename):
    # Crear imagen negra
    img = Image.new('RGB', (size, size), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Dibujar un borde azul
    border_width = size // 20
    draw.rectangle([0, 0, size-1, size-1], outline='#0dcaf0', width=border_width)
    
    text = "T"
    
    # Usamos una fuente por defecto del sistema
    try:
        font = ImageFont.truetype("arial.ttf", size // 2)
    except:
        font = ImageFont.load_default()
        
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except AttributeError:
        text_w, text_h = draw.textsize(text, font=font)

    x = (size - text_w) / 2
    y = (size - text_h) / 2.5
    
    draw.text((x, y), text, fill='#0dcaf0', font=font)
    
    # Guardar en la carpeta static
    filepath = os.path.join('static', filename)
    img.save(filepath)
    print(f"[+] Ícono creado correctamente: {filepath}")

if __name__ == "__main__":
    if not os.path.exists('static'):
        os.makedirs('static')
        
    crear_icono(192, 'icon-192.png')
    crear_icono(512, 'icon-512.png')
    print("¡Listo! Ahora Chrome aceptará la instalación Nativa.")
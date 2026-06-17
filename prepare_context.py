import os
from pathlib import Path

# Налаштування: що включаємо, а що ігноруємо
INCLUDE_DIRS = ['frontend/src', 'backend', 'data']
IGNORE_PATTERNS = [
    'node_modules', '.git', 'dist', 'build', '.env', '.env.local', 
    '.env.production', 'package-lock.json', '__pycache__', '.DS_Store',
    'vite.config.js.tsbuildinfo'
]
OUTPUT_FILE = 'PROJECT_CONTEXT.md'

def should_ignore(path):
    return any(ignore in str(path) for ignore in IGNORE_PATTERNS)

def generate_context():
    print(f"🔍 Збираю інформацію для нової нейромережі...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_file:
        out_file.write("# 🌿 GardenOS v2.0 - Контекст проекту для AI\n\n")
        out_file.write("Цей документ містить актуальний стан кодової бази та архітектури.\n\n")
        
        # 1. Структура файлів
        out_file.write("## 📂 Структура проекту (тільки важливі файли)\n```text\n")
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if not should_ignore(d)]
            files = [f for f in files if not should_ignore(f)]
            
            # Фільтруємо тільки наші папки
            if any(root.startswith(f"./{d}") or root == f".{d}" for d in INCLUDE_DIRS) or root == '.':
                level = root.replace('.', '').count(os.sep)
                indent = ' ' * 2 * level
                out_file.write(f"{indent}{os.path.basename(root)}/\n")
                sub_indent = ' ' * 2 * (level + 1)
                for f in files:
                    out_file.write(f"{sub_indent}{f}\n")
        out_file.write("```\n\n")

        # 2. Вміст файлів
        out_file.write("## 📄 Вміст ключових файлів\n\n")
        
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if not should_ignore(d)]
            files = [f for f in files if not should_ignore(f) and f.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.sql', '.py', '.txt'))]
            
            if any(root.startswith(f"./{d}") or root == f".{d}" for d in INCLUDE_DIRS) or root == '.':
                for file in files:
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                            out_file.write(f"### 📄 `{filepath}`\n")
                            out_file.write("```javascript\n" if file.endswith(('.js', '.jsx')) else "```\n")
                            out_file.write(content)
                            out_file.write("\n```\n\n")
                    except Exception as e:
                        print(f"⚠️ Не вдалося прочитати {filepath}: {e}")

    print(f"✅ Готово! Файл '{OUTPUT_FILE}' створено в корені проекту.")
    print(f"📏 Розмір файлу: {os.path.getsize(OUTPUT_FILE) / 1024:.2f} KB")

if __name__ == "__main__":
    generate_context()
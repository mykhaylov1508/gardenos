import os
import json
import re
import time
import requests

# --- НАЛАШТУВАННЯ ---
OLLAMA_URL = "http://localhost:11434/api/generate"
# Змініть на свою модель, якщо використовуєте іншу (напр., 'llama3', 'mistral')
MODEL_NAME = "gemma3:12b" 
DATA_DIR = "data"
CULTURES_DIR = os.path.join(DATA_DIR, "cultures")
PROMPT_FILE = os.path.join(DATA_DIR, "prompt_template.txt")
LIST_FILE = os.path.join(DATA_DIR, "cultures_list.txt")

def ensure_dirs():
    """Створює необхідні папки, якщо їх немає"""
    os.makedirs(CULTURES_DIR, exist_ok=True)

def load_prompt_template():
    """Завантажує шаблон промпту"""
    with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def load_cultures_list():
    """Завантажує список культур, ігноруючи порожні рядки"""
    with open(LIST_FILE, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]

def clean_json_response(response_text):
    """
    Очищає відповідь LLM від markdown-обгорток та зайвого тексту,
    залишаючи тільки валідний JSON об'єкт.
    """
    # Видаляємо ```json і ``` з початку і кінця
    text = re.sub(r'^```json\s*', '', response_text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.IGNORECASE | re.MULTILINE)
    
    # Знаходимо першу '{' і останню '}' (найнадійніший спосіб для LLM)
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def generate_culture_data(culture_name, prompt_template):
    """Відправляє запит до Ollama і повертає очищений JSON"""
    prompt = prompt_template.replace("{CULTURE_NAME}", culture_name)
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.5,        # Трохи вище, щоб уникнути зациклення на одних токенах
            "top_p": 0.9,
            "repeat_penalty": 1.15,    # Запобігає повторенню одних і тих самих фраз ("думаю, думаю...")
            "num_predict": 2000        # Жорстке обмеження довжини, щоб модель не зависала назавжди
        }
    }
    
    try:
        print(f"  🔄 Запит до Ollama ({MODEL_NAME})...")
        response = requests.post(OLLAMA_URL, json=payload, timeout=240)
        response.raise_for_status()
        
        result = response.json()
        raw_text = result.get("response", "")
        
        cleaned_json = clean_json_response(raw_text)
        
        # Перевірка валідності JSON
        data = json.loads(cleaned_json)
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Помилка мережі або Ollama: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"  ❌ Помилка парсингу JSON. Отриманий текст:\n{cleaned_json[:200]}...")
        return None

def main():
    print("🌱 GardenOS: Генерація бібліотеки рослин через Ollama")
    print("=" * 50)
    
    ensure_dirs()
    
    if not os.path.exists(PROMPT_FILE):
        print(f"❌ Файл промпту не знайдено: {PROMPT_FILE}")
        return
        
    if not os.path.exists(LIST_FILE):
        print(f"❌ Файл списку культур не знайдено: {LIST_FILE}")
        return

    prompt_template = load_prompt_template()
    cultures = load_cultures_list()
    
    print(f"📋 Знайдено {len(cultures)} культур для обробки.\n")
    
    success_count = 0
    skip_count = 0
    
    for culture in cultures:
        # Створюємо безпечне ім'я файлу (напр. "Томат" -> "tomat.json")
        safe_name = culture.lower().replace(" ", "_").replace("-", "_")
        filepath = os.path.join(CULTURES_DIR, f"{safe_name}.json")
        
        # Перевірка: якщо файл вже існує, пропускаємо (можливість відновлення)
        if os.path.exists(filepath):
            print(f"⏭️  Пропущено: {culture} (файл вже існує)")
            skip_count += 1
            continue
            
        print(f"🌿 Обробка: {culture}")
        data = generate_culture_data(culture, prompt_template)
        
        if data:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  ✅ Збережено: {filepath}")
            success_count += 1
        else:
            print(f"  ⚠️  Не вдалося згенерувати дані для: {culture}")
            
        # Невелика затримка, щоб не перевантажувати GPU і дати LLM "видихнути"
        time.sleep(2)
        
    print("\n" + "=" * 50)
    print(f"🎉 Готово! Успішно згенеровано: {success_count}, Пропущено: {skip_count}")
    print(f"📁 Перевір папку: {os.path.abspath(CULTURES_DIR)}")

if __name__ == "__main__":
    # Перевірка чи запущений Ollama
    try:
        requests.get("http://localhost:11434", timeout=2)
    except requests.exceptions.ConnectionError:
        print("❌ Помилка: Ollama не запущено! Спочатку виконай 'ollama serve' або відкрий Ollama app.")
        exit(1)
        
    main()
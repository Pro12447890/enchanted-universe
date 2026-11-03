# -*- coding: utf-8 -*-
"""Данные для страницы крафтов на сайте — без id, без имён файлов, без переводов.

Берёт уже собранный tools/craft-gallery/data.js (иконки в base64, названия,
рецепты) и делает компактный crafts-data.js:
  items:   id -> {icon, name}            (id нужен только как ключ, в разметку не идёт)
  recipes: [{station, grid:[[id|null]], result:{id,count}}]

Запуск: python tools/make-crafts.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(r"C:\MCreatorWorkspaces\enchanted_universe\tools\craft-gallery\data.js")
OUT = ROOT / "crafts-data.js"

STATIONS = {
    "crafting_shaped": "верстак",
    "crafting_shapeless": "верстак",
    "smelting": "печь",
}


def main():
    text = SOURCE.read_text(encoding="utf-8")
    data = json.loads(text[text.index("=") + 1:].strip().rstrip(";"))

    items = {}
    for item_id, value in data["items"].items():
        name = (value.get("names") or {}).get("ru_ru") or item_id.split(":")[-1].replace("_", " ")
        items[item_id] = {"icon": value["icon"], "name": name}

    recipes = []
    for recipe in data["recipes"]:
        kind = recipe.get("type", "")
        station = STATIONS.get(kind, "верстак")
        grid = recipe.get("grid") or [[None] * 3 for _ in range(3)]
        entry = {
            "station": station,
            "grid": grid,
            "result": recipe["result"],
        }
        if kind == "smelting":
            entry["station"] = "печь"
            entry["input"] = recipe.get("input")
        recipes.append(entry)

    payload = {"items": items, "recipes": recipes}
    OUT.write_text(
        "window.EU_CRAFTS = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8", newline="\n")
    print(f"предметов: {len(items)}, рецептов: {len(recipes)}, файл: {OUT.stat().st_size / 1024:.0f} КБ")


if __name__ == "__main__":
    main()

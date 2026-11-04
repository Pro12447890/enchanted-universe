# -*- coding: utf-8 -*-
"""Одноразовый патч i18n: подписи атмосферы, характеристика, наборы цветов."""
import io

PATH = r'C:\MCreatorWorkspaces\enchanted-universe-web\js\i18n.js'
text = io.open(PATH, encoding='utf-8').read()

RU_OLD = "      'atm.thick': 'плотная',\n"
RU_NEW = """      'atm.thick': 'плотная',
      'atm.stage.none': 'Нулевая',
      'atm.stage.faint': 'Слабая',
      'atm.stage.thin': 'Разрежённая',
      'atm.stage.avg': 'Средняя',
      'atm.stage.dense': 'Сильная',
      'atm.q.low': 'Почти',
      'atm.q.high': 'Довольно',
      'info.traits': 'Характеристика',
      'info.fold': 'Свернуть или развернуть блок «Тип … Кольца»',
      'trait.suit': 'Скафандр',
      'trait.suit.required': 'требуется',
      'trait.suit.none': 'не требуется',
      'trait.suit.unsealed': 'без герметизации',
      'trait.rad': 'Радиация',
      'trait.rad.none': 'не ощущается',
      'trait.rad.local': 'местами ощущается',
      'trait.rad.feel': 'ощущается',
      'trait.rad.strong': 'сильно влиятельна',
      'trait.hab': 'Благоприятность',
      'trait.hab.none': 'нулевая',
      'trait.hab.poor': 'плохая',
      'trait.hab.good': 'хорошая',
      'trait.hab.great': 'замечательная',
      'trait.hab.ideal': 'идеальная',
      'biome.set.title': 'Цвет биомов',
      'biome.set.green': 'зелёные',
      'biome.set.yellow': 'жёлтые',
      'biome.set.ice': 'ледяные',
      'biome.set.red': 'красные',
      'biome.set.water': 'водные',
      'biome.set.stone': 'каменистые',
"""

EN_OLD = "      'atm.thick': 'thick',\n"
EN_NEW = """      'atm.thick': 'thick',
      'atm.stage.none': 'None',
      'atm.stage.faint': 'Faint',
      'atm.stage.thin': 'Thin',
      'atm.stage.avg': 'Average',
      'atm.stage.dense': 'Dense',
      'atm.q.low': 'Nearly',
      'atm.q.high': 'Fairly',
      'info.traits': 'Traits',
      'info.fold': 'Collapse or expand the “Type … Rings” block',
      'trait.suit': 'Hardsuit',
      'trait.suit.required': 'required',
      'trait.suit.none': 'not required',
      'trait.suit.unsealed': 'no sealing needed',
      'trait.rad': 'Radiation',
      'trait.rad.none': 'not felt',
      'trait.rad.local': 'felt in places',
      'trait.rad.feel': 'felt',
      'trait.rad.strong': 'strongly affects',
      'trait.hab': 'Habitability',
      'trait.hab.none': 'none',
      'trait.hab.poor': 'poor',
      'trait.hab.good': 'good',
      'trait.hab.great': 'excellent',
      'trait.hab.ideal': 'ideal',
      'biome.set.title': 'Biome colours',
      'biome.set.green': 'green',
      'biome.set.yellow': 'yellow',
      'biome.set.ice': 'icy',
      'biome.set.red': 'red',
      'biome.set.water': 'aquatic',
      'biome.set.stone': 'stony',
"""

for old, new in ((RU_OLD, RU_NEW), (EN_OLD, EN_NEW)):
    count = text.count(old)
    if count != 1:
        raise SystemExit('anchor count %d for %r' % (count, old))
    text = text.replace(old, new)

io.open(PATH, 'w', encoding='utf-8').write(text)
print('i18n patched, chars', len(text))

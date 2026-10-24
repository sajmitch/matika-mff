# Matika

[Otevřít aplikaci](https://sajmitch.github.io/matika-mff/)

Mobilní studijní aplikace pro Lineární algebru 1 a Matematickou analýzu I. **432 kartiček, 260 výběrových otázek, 13 kapitol.**

- LA1: 257 karet a 152 otázek, kapitoly 1–7.
- MA I: 175 karet a 108 otázek, všech 6 kapitol dodaného PDF.
- Výběr více kapitol, definic, tvrzení, důkazů, postupů a příkladů; hledání pojmů a filtr „nové / ještě ne / umím“.
- Kartičky s odhalením odpovědi, hodnocením a krokem zpět. Kvíz na 10, 20 nebo všechny vybrané otázky, promíchané možnosti, vysvětlení a opakování obtížných.
- Ukládání pokroku a rozpracované sady, export a obnovení zálohy.
- Offline aplikace včetně matematických fontů a zdrojových PDF; bez účtu a backendu.

## Na iPhone

Otevři aplikaci v Safari → Sdílet → Přidat na plochu. První návštěvu nech načíst s připojením; poté jsou aplikace i skripta uložené pro offline použití. Pokud už byla na ploše předchozí verze, otevři ji jednou online a obnov stránku.

## Obsah a zdroje

Matematický obsah je redigovaný pouze z uživatelem dodaných skript:

1. **Libor Barto, Jiří Tůma: Lineární algebra**, verze 30. 9. 2025 (`skripta_la7.pdf`). Publikovaná kopie `skripta_la1.pdf` obsahuje prvních 251 stran, po kapitolu Determinant. Originální číslování stránek zůstává stejné.
2. **Martin Rmoutil: Matematická analýza I (NMTM101)**, 3. 10. 2023 (`MA1.pdf`, 87 PDF stran). Číslo tištěné stránky je číslo PDF stránky minus 4.

U každé položky `source.page` označuje skutečnou PDF stránku, `source.label` původní definici, větu nebo oddíl. Odkaz „Skripta“ v odpovědi míří na danou stránku. Karty zkracují a rozdělují výklad do samostatných otázek; důkazové karty zachovávají předpoklady a podstatné kroky. Úplný text a původní obrázky jsou dostupné v PDF. Kvízové nesprávné možnosti slouží jako jednoznačné kontrasty k doloženému tvrzení.

Obsah byl kontrolován proti zdrojům, včetně samostatnosti zadání, hypotéz, duplicit a matematické sazby. Nejde o oficiální materiál MFF ani záruku bezchybnosti. Konkrétní zkouškové požadavky určuje vyučující.

Web byl použit jen k ověření zařazení předmětů a hranice LA1, nikoli jako zdroj matematického výkladu: [studijní plán finanční matematiky 2026/27](https://www.mff.cuni.cz/cs/studenti/bc-a-mgr-studium/studijni-plany/2026-2027/matematika/bc/financni-matematika), [sylabus NMAG113](https://is.cuni.cz/studium/predmety/index.php?do=predmet&kod=NMAG113&stev_print=on). NMTM101 je součástí tohoto plánu, přestože předmluva skript zmiňuje učitelství.

## Pokrok a soukromí

Pokrok zůstává v `localStorage` tohoto zařízení. Kartičky a kvízy mají vlastní hodnocení. Výsledek kvízu nastaví „umím / ještě ne“, uživatel ho může přepsat. Procenta na úvodu se počítají z kartiček. Filtr stavu vychází z posledního hodnocení; spuštěná sada je pevný výběr bez opakování. Na konci lze vědomě spustit nové kolo obtížných položek.

Záloha je JSON, obnovuje novější hodnocení a historii. Neodesílá se na server. Vymazání dat prohlížeče může pokrok odstranit, proto je vhodné uložit zálohu. Verze 2 používá nová ID redigovaných otázek, takže automaticky nepřiřazuje hodnocení ze starého strojového obsahu. Původní uložená data nemaže.

## Lokální spuštění a testy

Aplikace nepotřebuje instalaci balíčků ani sestavení. Ve složce spusť:

```sh
python3 -m http.server 8765
```

Otevři `http://localhost:8765`. Pro automatické kontroly použij Node.js 18+:

```sh
npm test
```

Testy kontrolují všechny identifikátory, otázky, zdrojové rozsahy, možnosti odpovědí, sazbu všech 2 789 matematických úseků, kombinace filtrů, promíchání bez duplicit, import, sloučení historie a obsluhu PDF rozsahů offline. Kontroly interakcí v prohlížeči zahrnují mobilní rozložení, otočení a hodnocení karty, krok zpět, uložení po obnovení stránky, kvíz, filtry, export/import a načtení při vypnutém lokálním serveru.

## Struktura

- `content.json`: samostatné kapitoly, karty a kvízy.
- `app.js`: rozhraní a průchody učením.
- `core.js`: filtrování, stav, promíchání a validace záloh.
- `service-worker.js`: offline cache a PDF range odpovědi.
- `katex.js`, `math.css`: lokálně přibalený KaTeX 0.16.22 a fonty, licence v `KATEX-LICENSE.txt`.

Při změně offline souborů změň verzi `CACHE` v service workeru. GitHub Pages publikuje kořen větve `main`.

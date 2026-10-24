# Matika — Matematická analýza I a Lineární algebra 1

Mobilní webová studijní aplikace (PWA) z přiložených skript. V aplikaci jsou **pouze kapitoly 1–7 z lineární algebry**, tedy témata první části podle sylabu MFF UK k předmětu **NMAG113 (LA1)**; kapitoly 8–12 (navazující LA2) jsou odstraněné. Skripta lineární algebry `skripta_la1.pdf` jsou zkrácenou kopií prvních 251 stran původního souboru, takže odkazy na stránky zachovávají původní číslování.

- **481 kartiček**: 71 z analýzy, 410 z LA1.
- **481 kvízových položek**: 178 výběrových a 303 otevřených.
- Filtr více kapitol, typů látky a stavu (nové / umím / k opakování).
- Statistiky, offline cache, export/import pokroku (JSON).
- Žádné přihlášení, backend ani odesílání osobních studijních dat.
- Každá karta ukazuje zdrojovou stránku PDF.

**Důležitá výhrada ke kvalitě:** Obsah byl strojově vytěžen z PDF a rozdělen na studijní položky. **Nebyl jednotlivě matematicky a redakčně ověřen.** Zejména vzorce z PDF analýzy mohou být při textovém přepisu nepřesné: pro kontrolu používejte obrázek originálního výřezu / odkaz na stránku původních skript. Skripta analýzy jsou materiál ke kurzu NMTM101 a nemusí odpovídat všem požadavkům finanční matematiky.

## Publikování bez terminálu (GitHub.com)

1. Otevři https://github.com/new (přihlas se).
2. Repository name: `matika-pro-ni`. Visibility: **Public** (na GitHub Free je to pro Pages potřeba). **Nezaškrtávej Add a README file**, `.gitignore` nech **None**, licenci **None**.
3. Klikni **Create repository**.
4. Rozbal ZIP a otevři v Finderu složku `matika-github-pages`. Ve Finderu lze zobrazit i skrytý `.nojekyll` pomocí `Cmd+Shift+.`. Stiskni `Cmd+A` a přetáhni **obsah složky**, nikoli složku samotnou a nikoli ZIP, na GitHub do části **uploading an existing file**.
5. Zkontroluj, že se nahrává soubor `index.html` **do kořene**, vedle `app.js`, `content.json`, `MA1.pdf`, `skripta_la1.pdf`, a že je ve výčtu složka `assets`. Na konci klikni **Commit changes**.
6. V repozitáři klikni **Settings → Pages** (v levém menu) → sekce **Build and deployment** → **Source: Deploy from a branch** → **Branch: main** a **/(root)** → **Save**.
7. Až se web publikuje, pod **Settings → Pages** otevři **Visit site**. Pro účet `sajmitch` a daný název repozitáře vychází adresa `https://sajmitch.github.io/matika-pro-ni/`.
8. Na iPhonu v Safari otevři daný web → Sdílet → **Přidat na plochu** → zapni **Otevřít jako webovou aplikaci** → Přidat.

**Pozor na autorská práva**: Repozitář a stránky GitHub Pages jsou veřejně přístupné. Před zveřejněním kopií skript si ověř oprávnění k jejich dalšímu šíření.

## Lokální vyzkoušení

V kořeni projektu (tam, kde je `index.html`) spusť na Macu `python3 -m http.server 8000` a otevři v prohlížeči `http://localhost:8000`. Otevření `index.html` přes `file://` nemusí kvůli načítání JSON dat fungovat.

## Pokrok

Pokrok se ukládá v `localStorage` zařízení. Výsledky se mezi iPhonem a Macem nesynchronizují; zálohu exportuj/importuj z obrazovky Pokrok. Vymazání dat webové aplikace nebo její odinstalování může uložený pokrok smazat.

## Zdroje

- `MA1.pdf`: Martin Rmoutil, *Matematická analýza I*, 3. 10. 2023 (87 stran).
- `skripta_la1.pdf`: Libor Barto a Jiří Tůma, *Lineární algebra*, 30. 9. 2025, zkráceno na kapitoly 1–7 (251 stran).
- Sylabus: https://is.cuni.cz/studium/predmety/index.php?do=predmet&kod=NMAG113

Žádný matematický výklad nebyl doplněn z jiných online zdrojů; odkazy na sylabus slouží pouze k omezení rozsahu LA1.

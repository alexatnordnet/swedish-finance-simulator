# Svensk Livstidssimulator

En omfattande privatekonomisk livstidssimulator anpassad för svenska förhållanden. Simulatorn hjälper dig att planera din ekonomiska framtid genom att modellera inkomster, utgifter, skatter och pensioner enligt svenska regler.

## 🚀 Funktioner

### Nuvarande (MVP)
- ✅ Grundläggande livstidssimulering från nuvarande ålder till förväntad livslängd
- ✅ Svenska skatteregler 2025 (kommunalskatt, statlig skatt, ISK-skatt)
- ✅ Realvärdesberäkningar (dagens penningvärde)
- ✅ Transparent beräkningslogik
- ✅ Responsiv design med Tailwind CSS
- ✅ Export av data till CSV
- ✅ Validering och varningar

### Planerat (Framtida versioner)
- 🔄 Fullständig pensionssimulering (allmän pension, tjänstepension)
- 🔄 Löneväxling och dess konsekvenser
- 🔄 Bostadsförsäljning och reavinstskatt
- 🔄 Avancerade investeringsalternativ
- 🔄 Scenarioanalys och känslighetsanalys
- 🔄 Interaktiva grafer och visualiseringar
- 🔄 Detaljerad utgiftsmodellering

## 🛠️ Teknisk Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Deployment**: GitHub Pages

## 📋 Installation och Setup

### Förutsättningar
- Node.js 16+ 
- npm eller yarn

### Steg-för-steg

1. **Klona repositoriet**
   ```bash
   git clone https://github.com/alelin3/swedish-finance-simulator.git
   cd swedish-finance-simulator
   ```

2. **Installera beroenden**
   ```bash
   npm install
   ```

3. **Starta utvecklingsserver**
   ```bash
   npm run dev
   ```
   Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

4. **Bygg för produktion**
   ```bash
   npm run build
   ```

5. **Förhandsgranska produktionsbygge**
   ```bash
   npm run preview
   ```

## 🚀 Deployment till GitHub Pages

1. **Förbered repository**
   ```bash
   git remote add origin https://github.com/alelin3/swedish-finance-simulator.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Aktivera GitHub Pages**
   - Gå till repository Settings på GitHub
   - Scrolla ned till "Pages" 
   - Välj "Deploy from a branch"
   - Välj "gh-pages" branch
   - Klicka "Save"

## 📁 Projektstruktur

```
src/
├── components/           # React komponenter
│   ├── input/           # Inmatningskomponenter  
│   ├── output/          # Resultatkomponenter
│   └── common/          # Återanvändbara komponenter
├── engine/              # Simuleringsmotor
│   ├── core/           # Kärnlogik
│   ├── modules/        # Beräkningsmoduler
│   └── swedish-parameters/ # Svenska parametrar
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitioner
├── utils/              # Hjälpfunktioner
└── App.tsx             # Huvudkomponent
```

## 🔧 Konfiguration

### Miljövariabler
Inga miljövariabler krävs för den grundläggande versionen. All data lagras lokalt i webbläsaren.

### Anpassa parametrar
Svenska skatte- och pensionsparametrar finns i:
- `src/engine/swedish-parameters/TaxParameters2025.ts`

## 📊 Användning

1. **Fyll i dina uppgifter**
   - Personliga data (ålder, kön, pensionsålder)
   - Inkomstuppgifter (lön, tillväxt)
   - Utgifter (levnadskostnader)
   - Tillgångar (sparande, ISK)

2. **Granska resultat**
   - Översikt med nyckeltal
   - Årliga projektioner 
   - Detaljerade beräkningar

3. **Exportera data**
   - CSV-export för vidare analys
   - Spara/ladda scenarier (kommer i framtida version)

## 🧮 Beräkningsmetodik

Simulatorn använder en **real prognosmodell** enligt Pensionsmyndighetens standard:
- Alla belopp i dagens penningvärde
- Inflation satt till 0% i prognosen 
- Real avkastning 3,5% (aktier/fonder)
- Svenska skatteregler 2025

### Skattberäkningar
- **Kommunalskatt**: 32,41% (riksgenomsnitt)
- **Statlig skatt**: 20% över brytpunkt (643,100 kr/år under 66 år)
- **ISK-skatt**: 0,888% effektiv skatt 2025
- **Pensionsavgift**: 7% av pensionsgrundande inkomst

## ⚠️ Viktiga begränsningar

- **Inte finansiell rådgivning**: Använd endast för planering
- **Förenklade antaganden**: Verkliga utfall kan avvika
- **Begränsad pensionsmodellering**: MVP-version inkluderar ej fullständig pensionssimulering
- **Inga garantier**: Prognoser är osäkra

## 🤝 Bidrag

Bidrag välkomnas! Vänligen:

1. Forka repositoriet
2. Skapa en feature branch (`git checkout -b feature/ny-funktion`)
3. Commita dina ändringar (`git commit -am 'Lägg till ny funktion'`)
4. Pusha till branchen (`git push origin feature/ny-funktion`)
5. Öppna en Pull Request

### Utvecklingsriktlinjer
- Följ TypeScript strict mode
- Använd svenska kommentarer för affärslogik
- Lägg till tester för nya beräkningar
- Dokumentera svenska parametrar med källor

## 📚 Resurser och Källor

- [Pensionsmyndighetens prognosstandard](https://www.pensionsmyndigheten.se)
- [Skatteverkets beloppsgränser 2025](https://www.skatteverket.se)
- [SCB statistik medellivslängd](https://www.scb.se)
- [Konsumentverkets referensvärden](https://www.konsumentverket.se)

## 📄 Licens

MIT License - se [LICENSE](LICENSE) fil för detaljer.

## 📞 Support

För frågor eller problem:
- Öppna en [GitHub Issue](https://github.com/alelin3/swedish-finance-simulator/issues)
- Diskutera i [GitHub Discussions](https://github.com/alelin3/swedish-finance-simulator/discussions)

## 🗺️ Roadmap

### Version 1.0 (Q2 2025)
- [x] MVP med grundläggande simulering
- [ ] Fullständig pensionsmodellering
- [ ] Löneväxling
- [ ] Bostadssimulering

### Version 1.1 (Q3 2025)  
- [ ] Interaktiva grafer
- [ ] Scenarioanalys
- [ ] Förbättrad UX

### Version 2.0 (Q4 2025)
- [ ] Familjesimulering
- [ ] Avancerade investeringar
- [ ] API-integration för automatiska uppdateringar

---

**Byggt med ❤️ för svenska sparare och investerare**
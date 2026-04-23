const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
`          } catch (error) {
              console.error("AI Analysis failed:", error);
              setAnalysis("Fehler bei der Analyse. Bitte versuche es später erneut.");
          } finally {`,
`          } catch (error: any) {
              console.error("AI Analysis failed:", error);
              setAnalysis("Fehler bei der Analyse (" + String(error?.message || error) + ")");
          } finally {`
);

fs.writeFileSync('App.tsx', code);
console.log("Updated error handling");

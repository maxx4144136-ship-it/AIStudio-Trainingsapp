const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
`          ))}
          <div className="h-24 w-full opacity-0 pointer-events-none"></div>
      </main>`,
`          ))}
          </div>
          <div className="h-24 w-full opacity-0 pointer-events-none"></div>
      </main>`
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed missing closing div in HistoryView");

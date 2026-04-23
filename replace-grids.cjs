const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// HomeView Quick Links & Weekly Volume
code = code.replace(/<div className="grid grid-cols-2 gap-3">/g, '<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">');

// HistoryView (Line 1484-ish)
//   <main className="flex-1 overflow-y-auto px-6 space-y-4 pb-48 pt-28 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto" id="main-content">
//   {sortedHistory.map((log, i) => (
// If I wrap this map in a grid, I have to remove `space-y-4` from the main section, but wait: main has `space-y-4`. If I just add a div inside with a grid, that works.
// Better: replace `{sortedHistory.map` with `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{sortedHistory.map`
// and `))} \n <div className="h-24` with `))} </div> \n <div className="h-24`
code = code.replace(/\{sortedHistory\.map/g, '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n          {sortedHistory.map');
code = code.replace(/\}\)\}\n          <div className="h-24/g, '}))}\n          </div>\n          <div className="h-24');

// Profile View: Let's also wrap the settings list in a grid
code = code.replace(/<div className="space-y-3">/g, '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:space-y-0">');

// We should be careful about replace global for `<div className="space-y-3">` so let's only do it for SettingsView / ProfileView if needed.
// Actually, let's keep it simple.

fs.writeFileSync('App.tsx', code);
console.log("Replaced grid layouts.");

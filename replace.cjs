const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/max-w-md/g, 'max-w-md md:max-w-2xl lg:max-w-4xl');

// Additionally, for HomeView grid layout, let's make it more responsive.
// Search for: <div className="grid grid-cols-2 gap-3"> (inside HomeView, around Weekly Volume & Quick Links)
// We can make them grid-cols-2 md:grid-cols-4 lg:grid-cols-4 or so.
code = code.replace(/<div className="grid grid-cols-2 gap-3">/g, '<div className="grid grid-cols-2 md:grid-cols-4 gap-3">');

// For HistoryView, we can make it a grid on larger screens.
// Search for: <main className="flex-1 overflow-y-auto px-6 space-y-4 pb-48 pt-28 max-w-md mx-auto" id="main-content">
// Below that is the map. Instead of just space-y-4, let's wrap the map in a responsive grid.
// Let's hold off on specific grid wrapping unless we just add md:grid md:grid-cols-2 to it, but `space-y-4` clashes with grid.
// Instead of replacing blindly, let's just do the max-w replace for now.

fs.writeFileSync('App.tsx', code);
console.log("Replaced max-w-md successfully.");

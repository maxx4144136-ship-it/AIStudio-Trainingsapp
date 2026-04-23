const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// In SelectionView, change the category wrapper space-y-2 to grid grid-cols-1 md:grid-cols-2 gap-2
code = code.replace(
`<div className="space-y-2">
                        {categoryExercises.sort((a,b)=> calculateExercisePriority(a.id) - calculateExercisePriority(b.id)).map(ex => {`,
`<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryExercises.sort((a,b)=> calculateExercisePriority(a.id) - calculateExercisePriority(b.id)).map(ex => {`
);

// Look at the active workout view rendering: ActiveWorkoutView
// In ActiveWorkoutView, each exercise is tracked.
// We should perhaps leave the active workout view stacked single column because it's a list.

fs.writeFileSync('App.tsx', code);
console.log("Made exercises in selection view grid for tablet/pc.");

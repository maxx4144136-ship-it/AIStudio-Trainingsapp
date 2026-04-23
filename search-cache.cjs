const fs = require('fs');
const path = require('path');

function searchDir(dir, term) {
    let results = [];
    try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
            const fullPath = path.join(dir, f);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                results = results.concat(searchDir(fullPath, term));
            } else if (stat.isFile()) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes(term)) {
                        results.push(fullPath);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
    return results;
}

const res = searchDir('node_modules/.vite', 'TrainingView');
console.log("Vite Cache:", res);
const res2 = searchDir('dist', 'TrainingView');
console.log("Dist Cache:", res2);

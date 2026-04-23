const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const componentStr = `
const NumberStepper = ({ value, onChange, step, label, isDecimal, className }: any) => {
    const [localStr, setLocalStr] = React.useState(value == null || isNaN(value) ? "" : String(value).replace('.', ','));

    React.useEffect(() => {
        const parsed = parseFloat(localStr.replace(',', '.'));
        if (value !== parsed && !(isNaN(value) && isNaN(parsed))) {
            setLocalStr(value == null || isNaN(value) ? "" : String(value).replace('.', ','));
        }
    }, [value]);

    const handleChange = (e: any) => {
        let v = e.target.value;
        v = v.replace(/[^0-9.,]/g, '');
        const commaCount = (v.match(/[.,]/g) || []).length;
        if (commaCount > 1) return;
        
        setLocalStr(v);
        const parsed = parseFloat(v.replace(',', '.'));
        onChange(isNaN(parsed) ? 0 : parsed);
    };

    const applyStep = (dir: number) => {
        let current = parseFloat(localStr.replace(',', '.')) || 0;
        let next = current + (dir * step);
        next = Math.round(next * 100) / 100;
        if (next < 0 && label !== 'RIR') next = 0;
        setLocalStr(String(next).replace('.', ','));
        onChange(next);
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <button onClick={() => applyStep(1)} className="w-8 flex items-center justify-center text-on-surface-variant hover:text-[#3b82f6] active:scale-95 py-1 min-h-[24px]">
                <span className="material-symbols-outlined text-[20px] leading-none">keyboard_arrow_up</span>
            </button>
            <div className="flex items-baseline gap-1 my-[-4px]">
                <input 
                    type="text" 
                    inputMode={isDecimal ? "decimal" : "numeric"}
                    value={localStr}
                    onChange={handleChange}
                    className={className || "w-16 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0 leading-none h-8"} 
                    placeholder="-"
                />
                {label && <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">{label}</span>}
            </div>
            <button onClick={() => applyStep(-1)} className="w-8 flex items-center justify-center text-on-surface-variant hover:text-[#3b82f6] active:scale-95 py-1 min-h-[24px]">
                <span className="material-symbols-outlined text-[20px] leading-none">keyboard_arrow_down</span>
            </button>
        </div>
    );
};
`;

code = code.replace(
    '// --- EXTERNALIZED VIEWS ---',
    componentStr + '\n// --- EXTERNALIZED VIEWS ---'
);

fs.writeFileSync('App.tsx', code);
console.log('Injected NumberStepper');

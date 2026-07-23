const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.tsx', 'utf8');

// Remove Quotes Grid
code = code.replace(/\{\/\* Quotes Grid \*\/\}[\s\S]*?<TablePagination[\s\S]*?\/>\s*<\/div>/g, '');

// Remove TableActionMenu and TablePagination imports
code = code.replace(/import \{ TableActionMenu \}.*\n/g, '');
code = code.replace(/import \{ TablePagination \}.*\n/g, '');

// Remove unused state variables and their setters
code = code.replace(/const \[quotesPage, setQuotesPage\].*\n/g, '');
code = code.replace(/const \[quotesPageSize, setQuotesPageSize\].*\n/g, '');
code = code.replace(/const \[searchTerm, setSearchTerm\].*\n/g, '');

// Remove their usages in useEffects or handlers
code = code.replace(/setQuotesPage\(1\);\n/g, '');
code = code.replace(/setSearchTerm\(e.target.value\)/g, '');

// Remove filteredQuotes logic
code = code.replace(/\/\/ ─── Filter servicesGrid[\s\S]*?return true;\n  \}\);\n/g, '');

// Remove pagination logic
code = code.replace(/const totalQuoteCount[\s\S]*?quotesPage \* quotesPageSize\n  \);\n/g, '');

// Remove status badge logic
code = code.replace(/\/\/ ─── Status badge helper[\s\S]*?return map\[status\].*\n  \};\n/g, '');

// Fix any empty useEffect bodies left by setQuotesPage(1)
code = code.replace(/useEffect\(\(\) => \{\s*\}, \[.*?\]\);\n/g, '');

fs.writeFileSync('frontend/src/pages/Dashboard.tsx', code);

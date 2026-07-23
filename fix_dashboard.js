const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.tsx', 'utf8');

// Remove Quotes Grid
code = code.replace(/\{\/\* Quotes Grid \*\/\}.*?<TablePagination[\s\S]*?\/>\s*<\/div>/g, '');

// Remove TableActionMenu and TablePagination imports
code = code.replace(/import \{ TableActionMenu \}.*\n/g, '');
code = code.replace(/import \{ TablePagination \}.*\n/g, '');

// Remove unused state variables
code = code.replace(/const \[quotesPage, setQuotesPage\].*\n/g, '');
code = code.replace(/const \[quotesPageSize, setQuotesPageSize\].*\n/g, '');
code = code.replace(/const \[searchTerm, setSearchTerm\].*\n/g, 'const [searchTerm] = useState("");\n');

// Remove filteredQuotes and statusBadge logic
code = code.replace(/\/\/ ─── Filter servicesGrid[\s\S]*?return true;\n  \}\);\n/g, '');
code = code.replace(/const totalQuoteCount[\s\S]*?quotesPage \* quotesPageSize\n  \);\n/g, '');
code = code.replace(/\/\/ ─── Status badge helper[\s\S]*?return map\[status\].*\n  \};\n/g, '');

fs.writeFileSync('frontend/src/pages/Dashboard.tsx', code);

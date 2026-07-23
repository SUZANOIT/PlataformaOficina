const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.tsx', 'utf8');

// Remove the leftover pagination calculations
code = code.replace(/const totalQuoteCount[\s\S]*?quotesPage \* quotesPageSize,\n  \);\n/g, '');

// Fix setSearchTerm and others inside useEffect
code = code.replace(/setSearchTerm\(''\);\n/g, '');

// Also remove the imports if any are still broken
code = code.replace(/import \{ TablePagination \}.*\n/g, '');
code = code.replace(/import \{ TableActionMenu \}.*\n/g, '');

fs.writeFileSync('frontend/src/pages/Dashboard.tsx', code);
